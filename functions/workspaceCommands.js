import { createHash } from 'node:crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { applyWorkspaceChanges, assertId, assertOwner, domainError, SETTINGS_COVERAGE, readinessIssues } from './workspaceDomain.js';
import { ENTITY_COLLECTIONS, readWorkspace, settingsRef, writeWorkspace } from './workspaceStore.js';
import { publicBranches } from './branchesDomain.js';
import { publicProfileStory } from './profileStoryDomain.js';
const APP = process.env.APP_ID || 'book-and-buy-v1';
const ordered = value => Array.isArray(value) ? value.map(ordered) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])])) : value;
const hash = value => createHash('sha256').update(JSON.stringify(ordered(value))).digest('hex');
export async function getOwnerWorkspace(data, auth, db = getFirestore()) {
  const ownerId = data.ownerId || data.workspaceId || auth?.uid; assertOwner(ownerId, auth);
  const { workspace, exists } = await readWorkspace(db, ownerId);
  return exists ? { ...workspace, ownerId, id: ownerId, isDemo: false } : null;
}
export async function patchOwnerWorkspace(data, auth, db = getFirestore(), { source = 'owner' } = {}) {
  const ownerId = data.ownerId || auth?.uid; assertOwner(ownerId, auth); assertId(data.requestId, 'Request');
  const receiptRef = db.doc(`artifacts/${APP}/users/${ownerId}/workspaceReceipts/${data.requestId}`);
  const fingerprint = hash(data.changes);
  return db.runTransaction(async tx => {
    const { workspace, exists } = await readWorkspace(db, ownerId, tx);
    const receipt = await tx.get(receiptRef);
    if (receipt.exists) {
      if (receipt.data().fingerprint !== fingerprint) domainError('This request identifier was already used.', 'already-exists');
      return { ok: true, workspace: { ...workspace, ownerId, isDemo: false }, revisions: workspace.sectionRevisions, duplicate: true };
    }
    const next = applyWorkspaceChanges(workspace, data.changes, { initial: !exists });
    next.ownerId = ownerId; next.isDemo = false; next.mutationEpoch = (workspace.mutationEpoch || 0) + 1;
    writeWorkspace(tx, db, ownerId, workspace, next, { source });
    tx.create(receiptRef, { fingerprint, createdAt: Date.now(), revisions: next.sectionRevisions });
    tx.set(db.doc(`artifacts/${APP}/users/${ownerId}/commandAudit/${data.requestId}`), { actor: auth.uid, operation: 'workspace.patch', sections: data.changes.map(row => row.section), revisions: next.sectionRevisions, at: Date.now() });
    return { ok: true, workspace: next, revisions: next.sectionRevisions };
  });
}
// Explicit public DTO. Never publish whole website/staff/schedule objects.
const PROFILE_KEYS = ['brandName', 'slug', 'tagline', 'welcomeMessage', 'phone', 'email', 'currency', 'timezone', 'primaryColor', 'headingColor', 'bodyColor', 'backgroundColor', 'fontFamily', 'nativeAccent', 'headingFontFamily', 'bodyFontFamily', 'buttonFontFamily', 'brandNameFontFamily'];
const WEBSITE_KEYS = ['pages', 'sections', 'sectionOrder', 'headline', 'subcopy', 'ctaLabel', 'buyCtaLabel', 'homeHeadline', 'homeSubtext', 'categoryId', 'profileCategory', 'profileLocation', 'venueMode', 'locationLat', 'locationLng', 'countryCode', 'region', 'city', 'servesCountries', 'heroImageUrl', 'logoUrl', 'bookHeadline', 'bookSubtext', 'buyHeadline', 'buySubtext', 'aboutTitle', 'aboutEyebrow', 'aboutBody', 'aboutImageUrl', 'visionTitle', 'visionBody', 'visionImageUrl', 'missionTitle', 'missionBody', 'missionImageUrl', 'aboutPages', 'styleTokens', 'reasonsTitle', 'reasonsEyebrow', 'reasonsBody', 'reasonsMarkerStyle', 'reasons', 'venueTitle', 'venueEyebrow', 'venueBody', 'venueIcon', 'venueImages', 'mapTitle', 'mapEyebrow', 'mapBody', 'mapIcon', 'address', 'mapEmbedUrl', 'mapLinkUrl', 'googlePlaceId', 'googleReviewsEnabled', 'platformReviewsEnabled', 'reviewsTitle', 'reviewsEyebrow', 'reviewsBody', 'reviewsIcon', 'reviews', 'offerTitle', 'offerBookCta', 'offerBuyCta', 'bookStripTitle', 'bookStripBody', 'bookStripCta', 'bookFaqTitle', 'bookFaqEyebrow', 'bookFaqBody', 'bookFaqIcon', 'bookFaq', 'markets', 'shippingProfiles'];
const pick = (value, keys) => Object.fromEntries(keys.filter(key => value?.[key] !== undefined).map(key => [key, value[key]]));
const CATALOG_KEYS = ['id', 'name', 'description', 'price', 'compareAtPrice', 'currency', 'priceType', 'quoteBased', 'category', 'mainCategory', 'productType', 'tags', 'collections', 'stockAvailable', 'stockLabel', 'hideStockOnCard', 'imageUrls', 'photoURL', 'image', 'imageUrl', 'active', 'status', 'options', 'duration', 'minDuration', 'fixedDuration', 'scheduleType', 'bookingType', 'capacity', 'sessionStartDate', 'sessionStartTime', 'sessionEndDate', 'sessionEndTime', 'sessions', 'sessionLabel', 'staffIds', 'sortOrder'];
export function publicProfile(workspace, ownerId) {
  const catalog = rows => (rows || []).filter(row => row.active !== false && !['draft', 'archived'].includes(row.status)).map(row => ({ ...pick(row, CATALOG_KEYS), variants: (row.variants || []).filter(item => item.available !== false).map(item => pick(item, ['id', 'name', 'title', 'description', 'optionValues', 'price', 'compareAtPrice', 'available', 'stockAvailable', 'minDuration', 'imageUrl'])) }));
  return { ...pick(workspace, PROFILE_KEYS), ownerId, published: true, publishedAt: Date.now(), website: { ...pick(workspace.website, WEBSITE_KEYS), ...publicProfileStory(workspace.website), branches: publicBranches(workspace.website?.branches), published: true }, products: catalog(workspace.products), services: catalog(workspace.services), staff: (workspace.staff || []).filter(row => row.active !== false).map(row => pick(row, ['id', 'name', 'role', 'photoURL', 'avatarUrl'])), features: pick(workspace.features, ['faqEnabled', 'collectClientName', 'collectClientEmail', 'collectClientPhone', 'collectClientNotes']), policies: pick(workspace.policies, ['cancellation', 'terms', 'privacy']), availabilityRules: pick(workspace.availabilityRules, ['businessOpenTime', 'businessCloseTime', 'openWeekdays', 'closedDates', 'weekdayHours', 'maxAdvanceBookingDays', 'maxAdvanceBookingUntil', 'bookingNotice', 'cancellationWindow', 'reschedulingAllowed']), commerceVersion: 1 };
}
export async function publishBusinessProfile(data, auth, db = getFirestore()) {
  const ownerId = data.ownerId || auth?.uid; assertOwner(ownerId, auth);
  return db.runTransaction(async tx => {
    const { workspace, exists } = await readWorkspace(db, ownerId, tx);
    if (!exists || !workspace.brandName || !/^[a-z0-9-]{1,63}$/.test(workspace.slug || '')) domainError('Save your business name and address before publishing.', 'failed-precondition');
    const issues = readinessIssues(workspace); if (issues.length) domainError(issues.map(row => row.message).join(' '), 'failed-precondition');
    const ref = db.doc(`artifacts/${APP}/public/data/workspaces/${workspace.slug}`); const existing = await tx.get(ref);
    if (existing.exists && existing.data().ownerId !== ownerId) domainError('This profile address belongs to another business.', 'already-exists');
    const snapshot = publicProfile(workspace, ownerId);
    tx.set(ref, snapshot);
    writeWorkspace(tx, db, ownerId, workspace, { ...workspace, publishedAt: snapshot.publishedAt, website: { ...workspace.website, published: true } });
    return { ok: true, slug: workspace.slug, publishedAt: snapshot.publishedAt };
  });
}
export async function getWorkspaceReadiness(data, auth, db = getFirestore()) {
  const workspace = await getOwnerWorkspace(data, auth, db); return { coverage: SETTINGS_COVERAGE, issues: readinessIssues(workspace || {}), ready: Boolean(workspace) && !readinessIssues(workspace).length };
}
export async function abortWorkspaceMigration(data, auth, db = getFirestore()) {
  const ownerId = data.ownerId || auth?.uid; assertOwner(ownerId, auth); assertId(data.requestId, 'Migration');
  return db.runTransaction(async tx => {
    const ref = settingsRef(db, ownerId); const snapshot = await tx.get(ref); const workspace = snapshot.data();
    if (!workspace || workspace.storageMode === 'collections' || workspace.migration?.id !== data.requestId || workspace.migration.status !== 'paused') domainError('Only this paused migration can be cancelled.', 'failed-precondition');
    tx.update(ref, { migration: { ...workspace.migration, status: 'aborted', endedAt: Date.now() } });
    return { ok: true, storageMode: 'legacy' };
  });
}
export async function migrateWorkspaceCollections(data, auth, db = getFirestore()) {
  const ownerId = data.ownerId || auth?.uid; assertOwner(ownerId, auth); assertId(data.requestId, 'Migration');
  const ref = settingsRef(db, ownerId);
  const source = await db.runTransaction(async tx => {
    const snapshot = await tx.get(ref); if (!snapshot.exists) domainError('Workspace not found.', 'not-found');
    const workspace = snapshot.data();
    if (workspace.storageMode === 'collections') return null;
    if (workspace.migration?.status === 'paused' && workspace.migration.id !== data.requestId) domainError('Another migration is in progress.', 'aborted');
    const resuming = workspace.migration?.status === 'paused' && workspace.migration.id === data.requestId;
    const epoch = resuming ? workspace.migration.epoch : Math.max(workspace.migration?.epoch || 0, workspace.storageEpoch || 0) + 1;
    tx.update(ref, { migration: { id: data.requestId, epoch, status: 'paused', startedAt: resuming ? workspace.migration.startedAt : Date.now() } });
    return { workspace, epoch };
  });
  if (!source) return { ok: true, alreadyMigrated: true };
  const { workspace, epoch } = source;
  // Writes are paused, so retries may safely backfill the same immutable epoch.
  const records = Object.entries(ENTITY_COLLECTIONS).flatMap(([field, collection]) => (workspace[field] || []).map(row => ({ field, collection, row })));
  for (let start = 0; start < records.length; start += 200) {
    const batch = db.batch();
    for (const { collection, row } of records.slice(start, start + 200)) { assertId(row.id); batch.set(db.doc(`artifacts/${APP}/users/${ownerId}/${collection}/${row.id}`), { ...row, _storageEpoch: epoch }); }
    await batch.commit();
  }
  const manifest = {};
  for (const [field, collection] of Object.entries(ENTITY_COLLECTIONS)) {
    const rows = await db.collection(`artifacts/${APP}/users/${ownerId}/${collection}`).where('_storageEpoch', '==', epoch).get();
    const expected = [...(workspace[field] || [])].sort((a, b) => a.id.localeCompare(b.id));
    const actual = rows.docs.map(doc => { const { _storageEpoch, ...row } = doc.data(); return row; }).sort((a, b) => a.id.localeCompare(b.id));
    if (hash(expected) !== hash(actual)) domainError(`Migration verification failed for ${field}. Writes remain paused.`, 'data-loss');
    manifest[field] = { count: actual.length, hash: hash(actual) };
  }
  await db.runTransaction(async tx => {
    const current = (await tx.get(ref)).data();
    if (current.migration?.id !== data.requestId || current.migration.status !== 'paused') domainError('Migration changed.', 'aborted');
    tx.update(ref, { storageMode: 'collections', storageEpoch: epoch, mutationEpoch: (current.mutationEpoch || 0) + 1, migration: { ...current.migration, status: 'complete', manifest, completedAt: Date.now() } });
  });
  return { ok: true, storageMode: 'collections', epoch, manifest };
}

// Refresh public commerce data independently of the saved website design.
export async function syncPublicBusinessProfile(ownerId, db = getFirestore()) {
  return db.runTransaction(async tx => {
    const { workspace, exists } = await readWorkspace(db, ownerId, tx);
    if (!exists || !workspace.website?.published || !workspace.slug) return { updated: false };
    const ref = db.doc(`artifacts/${APP}/public/data/workspaces/${workspace.slug}`);
    const current = await tx.get(ref);
    if (!current.exists || current.data().ownerId !== ownerId) return { updated: false };
    const profile = publicProfile(workspace, ownerId);
    profile.publishedAt = current.data().publishedAt;
    profile.updatedAt = Date.now();
    tx.set(ref, profile);
    return { updated: true };
  });
}
