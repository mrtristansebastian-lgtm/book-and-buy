import { createHash, randomBytes } from 'node:crypto';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { HttpsError } from 'firebase-functions/v2/https';
import { validateWebsiteBindings, validateWebsiteRequest } from './websiteContract.js';
import { getPublicCommerceContext, quotePublicCommerce, publicCommerceCatalog } from './commerceRuntime.js';
import { getLivePublicServiceAvailability } from './availability.js';
import { marketReadiness, getMarkets } from './marketPolicy.js';
import { placeMarketOrder } from './marketOrders.js';
import { writeGuardedBooking } from './rescheduling.js';
import { initiatePayment, confirmPaymentReturn } from './payments/index.js';
import { assertOwner, readinessIssues } from './workspaceDomain.js';
import { readWorkspace } from './workspaceStore.js';
import { normalizeDomain } from './domainValidation.js';

const APP = process.env.APP_ID || 'book-and-buy-v1';
const fail = (code, message) => { throw new HttpsError(code, message); };
const siteRef = (db, siteId) => db.doc(`artifacts/${APP}/public/data/websites/${siteId}`);
const ownerRef = (db, uid) => db.doc(`artifacts/${APP}/users/${uid}/private/website`);
const revisionRef = (db, uid, revision) => db.doc(`artifacts/${APP}/users/${uid}/websiteRevisions/${revision}`);
const publishRequestRef = (db, uid, requestId) => db.doc(`artifacts/${APP}/users/${uid}/websitePublicationReceipts/${requestId}`);
const id = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
const requireOwner = auth => { if (!auth?.uid) fail('unauthenticated', 'Sign in to publish your website.'); assertOwner(auth.uid, auth); return auth.uid; };
function publicBaseUrl() {
  const value = process.env.WEBSITE_PUBLIC_BASE_URL;
  if (!value) fail('failed-precondition', 'Website hosting is not configured yet. Your draft remains saved.');
  let url; try { url = new URL(value); } catch { fail('failed-precondition', 'Configure the dedicated HTTPS website hosting origin.'); }
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) fail('failed-precondition', 'Configure the dedicated HTTPS website hosting origin.');
  const appUrl = process.env.APP_PUBLIC_BASE_URL;
  if (!appUrl) fail('failed-precondition', 'Configure the owner app HTTPS origin before publishing generated websites.');
  let appOrigin; try { const parsed = new URL(appUrl); if (parsed.protocol !== 'https:' || parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.username || parsed.password) throw new Error(); appOrigin = parsed.origin; } catch { fail('failed-precondition', 'Configure a valid owner app HTTPS origin.'); }
  if (appOrigin === url.origin) fail('failed-precondition', 'Generated websites must use a separate origin from the owner app.');
  return url.origin;
}

const draftRef = (db, uid, projectId) => db.doc(`artifacts/${APP}/users/${uid}/websiteDrafts/${projectId}`);
const draftVersionRef = (db, uid, versionId) => db.doc(`artifacts/${APP}/users/${uid}/websiteDraftVersions/${versionId}`);
async function draftWorkspace(db, uid, workspaceId, tx) {
  const { workspace } = await readWorkspace(db, uid, tx);
  if (workspaceId && ![uid, workspace.id, workspace.slug].filter(Boolean).includes(workspaceId)) fail('permission-denied', 'This draft does not belong to your business.');
  return workspace;
}
function safeProject(project) {
  if (!project || !id(project.id) || typeof project.html !== 'string' || project.html.length > 2_000_000) fail('invalid-argument', 'Choose a valid website draft smaller than 2 MB of source.');
  const files = {};
  for (const [path, contents] of Object.entries(project.files || {})) {
    if (path.length > 240 || path.startsWith('/') || path.includes('\\') || path.split('/').some(part => !part || part === '.' || part === '..') || typeof contents !== 'string') fail('invalid-argument', 'The project contains an invalid source file.');
    files[path] = contents;
  }
  const assets = {};
  for (const [path, asset] of Object.entries(project.assets || {})) {
    const url = asset?.previewUrl || asset?.url;
    if (path.length > 240 || path.startsWith('/') || path.includes('\\') || path.split('/').some(part => !part || part === '.' || part === '..') || typeof url !== 'string' || !/^(data:[^,]*,|https:\/\/)/i.test(url)) fail('invalid-argument', 'Save imported assets as durable image, font or file data before syncing.');
    assets[path] = { url, previewUrl: url, mime: String(asset.mime || '').slice(0, 120), size: Number(asset.size) || 0, name: String(asset.name || path).slice(0, 240) };
  }
  if (Object.keys(files).length + Object.keys(assets).length > 250) fail('invalid-argument', 'A cloud project supports at most 250 files.');
  const normalized = { id: project.id, name: String(project.name || 'Untitled project').slice(0, 120), html: project.html, files: Object.keys(files).length ? files : null, assets: Object.keys(assets).length ? assets : null, entryFile: String(project.entryFile || 'index.html').slice(0, 240), prompt: String(project.prompt || '').slice(0, 4000) };
  if (Buffer.byteLength(JSON.stringify(normalized)) > 8_000_000) fail('resource-exhausted', 'Cloud drafts must be smaller than 8 MB. Optimize large assets before syncing.');
  return normalized;
}
function draftIssues(project, workspace) {
  try { validateWebsiteBindings(project.html, publicCommerceCatalog({ ...workspace, website: { ...workspace.website, markets: undefined } })); return []; }
  catch (error) { return [{ message: error.message }]; }
}
async function immutableSave(bucket, path, bytes) {
  try { await bucket.file(path).save(bytes, { resumable: false, preconditionOpts: { ifGenerationMatch: 0 }, metadata: { contentType: 'application/json', cacheControl: 'private,no-store' } }); }
  catch (error) { if (![409, 412].includes(Number(error.code))) throw error; const [existing] = await bucket.file(path).download(); if (digest(existing) !== digest(bytes)) fail('already-exists', 'This save request was already used for different source.'); }
}
async function readDraftBundle(pointer, uid, bucket) {
  if (pointer.ownerId !== uid || !id(pointer.projectId) || !id(pointer.versionId) || pointer.bundlePath !== `websiteDrafts/${APP}/${uid}/${pointer.projectId}/${pointer.versionId}.json`) fail('data-loss', 'The saved draft location is invalid.');
  const [bytes] = await bucket.file(pointer.bundlePath).download();
  if (bytes.length > 8_000_000 || digest(bytes) !== pointer.sha256) fail('data-loss', 'The saved draft failed its integrity check.');
  let bundle; try { bundle = JSON.parse(bytes.toString()); } catch { fail('data-loss', 'The saved draft could not be read.'); }
  return safeProject(bundle.project);
}
export async function saveWebsiteDraft(data, auth, dependencies = {}) {
  const uid = requireOwner(auth), db = dependencies.db || getFirestore(), bucket = dependencies.bucket || getStorage().bucket();
  if (!id(data.requestId) || !Number.isSafeInteger(data.expectedRevision) || data.expectedRevision < 0) fail('invalid-argument', 'Provide a stable save identifier and the current draft revision.');
  const project = safeProject(data.project), workspace = await draftWorkspace(db, uid, data.workspaceId);
  const versionId = digest(`${APP}:${uid}:${data.requestId}`).slice(0, 40), versionRef = draftVersionRef(db, uid, versionId), receiptRef = db.doc(`artifacts/${APP}/users/${uid}/websiteDraftReceipts/${data.requestId}`);
  const fingerprint = digest(canonicalJSON({ project, expectedRevision: data.expectedRevision }));
  const replay = (await receiptRef.get()).data();
  if (replay) { if (replay.fingerprint !== fingerprint) fail('already-exists', 'This save identifier was already used for different source.'); return replay.result; }
  const bytes = Buffer.from(JSON.stringify({ contractVersion: 1, project }));
  if (bytes.length > 8_000_000) fail('resource-exhausted', 'Cloud drafts must be smaller than 8 MB. Optimize large assets before syncing.');
  const path = `websiteDrafts/${APP}/${uid}/${project.id}/${versionId}.json`;
  await immutableSave(bucket, path, bytes);
  return db.runTransaction(async tx => {
    const existing = (await tx.get(receiptRef)).data();
    if (existing) { if (existing.fingerprint !== fingerprint) fail('already-exists', 'This save identifier was already used for different source.'); return existing.result; }
    const current = (await tx.get(draftRef(db, uid, project.id))).data();
    if ((current?.revision || 0) !== data.expectedRevision) fail('aborted', 'This cloud draft changed on another device. Your local draft is kept. Review the cloud version before saving again.');
    const live = await draftWorkspace(db, uid, data.workspaceId, tx);
    const savedAt = Date.now(), issues = draftIssues(project, live), result = { projectId: project.id, revision: data.expectedRevision + 1, versionId, savedAt, issues };
    const pointer = { ...result, ownerId: uid, name: project.name, label: String(data.label || 'Saved draft').slice(0, 120), bundlePath: path, sha256: digest(bytes), fingerprint, result };
    tx.create(versionRef, pointer); tx.set(draftRef(db, uid, project.id), pointer); tx.create(receiptRef, { fingerprint, result });
    tx.set(db.doc(`artifacts/${APP}/users/${uid}/private/builderDraft`), { projectId: project.id });
    return result;
  });
}
export async function getWebsiteDraft(data, auth, dependencies = {}) {
  const uid = requireOwner(auth), db = dependencies.db || getFirestore(); await draftWorkspace(db, uid, data.workspaceId);
  const projectId = data.projectId || (await db.doc(`artifacts/${APP}/users/${uid}/private/builderDraft`).get()).data()?.projectId;
  if (!projectId) return { project: null, revision: 0 };
  if (!id(projectId)) fail('invalid-argument', 'Choose a valid website project.');
  const pointer = (await draftRef(db, uid, projectId).get()).data(); if (!pointer) return { project: null, revision: 0 };
  return { ...pointer.result, project: await readDraftBundle(pointer, uid, dependencies.bucket || getStorage().bucket()) };
}
export async function listWebsiteDraftVersions(data, auth, dependencies = {}) {
  const uid = requireOwner(auth), db = dependencies.db || getFirestore(); await draftWorkspace(db, uid, data.workspaceId);
  if (!id(data.projectId)) fail('invalid-argument', 'Choose a valid website project.');
  const rows = await db.collection(`artifacts/${APP}/users/${uid}/websiteDraftVersions`).where('projectId', '==', data.projectId).orderBy('savedAt', 'desc').limit(30).get();
  return rows.docs.map(row => { const value = row.data(); return { id: row.id, revision: value.revision, label: value.label, createdAt: value.savedAt, issues: value.issues || [] }; });
}
export async function getWebsiteDraftVersion(data, auth, dependencies = {}) {
  const uid = requireOwner(auth), db = dependencies.db || getFirestore(); await draftWorkspace(db, uid, data.workspaceId);
  if (!id(data.versionId) || !id(data.projectId)) fail('invalid-argument', 'Choose a saved website version.');
  const pointer = (await draftVersionRef(db, uid, data.versionId).get()).data();
  if (!pointer || pointer.projectId !== data.projectId) fail('not-found', 'This saved version is unavailable.');
  return { ...pointer.result, project: await readDraftBundle(pointer, uid, dependencies.bucket || getStorage().bucket()) };
}
export async function createWebsitePreview(data, auth, dependencies = {}) {
  const uid = requireOwner(auth), db = dependencies.db || getFirestore(), bucket = dependencies.bucket || getStorage().bucket(); publicBaseUrl();
  if (!id(data.requestId)) fail('invalid-argument', 'A stable preview identifier is required.');
  const { workspace, catalog } = await ownerWorkspace(db, uid, data.workspaceId);
  const manifest = validatePublication(data.project?.html, workspace, catalog);
  const fingerprint = digest(canonicalJSON({ project: data.project, workspaceId: data.workspaceId || uid }));
  const receiptRef = publishRequestRef(db, uid, `preview-${data.requestId}`), existing = (await receiptRef.get()).data();
  if (existing) return checkReplay(existing, fingerprint);
  const token = randomBytes(24).toString('base64url'), revision = digest(`${uid}:${data.requestId}`).slice(0, 40);
  const siteId = createHash('sha256').update(`${APP}:${uid}`).digest('hex').slice(0, 32), path = `websiteBundles/${APP}/${uid}/${siteId}/${revision}.json`;
  const bytes = Buffer.from(JSON.stringify({ contractVersion: 1, html: data.project.html, manifest, name: String(data.project.name || 'Preview').slice(0, 120) }));
  if (bytes.length > 2_500_000) fail('invalid-argument', 'Optimize this preview bundle to less than 2.5 MB.');
  await immutableSave(bucket, path, bytes);
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000, result = { kind: 'preview', url: `${publicBaseUrl()}/?preview=${token}`, expiresAt };
  const pointer = { ownerId: uid, siteId, slug: workspace.slug, revision, bundlePath: path, sha256: digest(bytes), contractVersion: 1, expiresAt, preview: true };
  return db.runTransaction(async tx => {
    const replay = (await tx.get(receiptRef)).data(); if (replay) return checkReplay(replay, fingerprint);
    const live = await ownerWorkspace(db, uid, data.workspaceId, tx); validatePublication(data.project.html, live.workspace, live.catalog);
    if (publicationState(live.workspace) !== publicationState(workspace)) fail('aborted', 'Your catalog or settings changed. Create the preview again.');
    tx.create(db.doc(`artifacts/${APP}/publicWebsitePreviews/${digest(token)}`), pointer);
    tx.create(receiptRef, { fingerprint, result }); return result;
  });
}
function result(pointer) { return { status: 'published', siteId: pointer.siteId, revision: pointer.revision, url: `${publicBaseUrl()}/?site=${encodeURIComponent(pointer.siteId)}`, publishedAt: pointer.publishedAtMs }; }
async function ownerWorkspace(db, uid, workspaceId, tx) {
  const { workspace: settings } = await readWorkspace(db, uid, tx);
  if (!settings?.slug) fail('failed-precondition', 'Publish your business profile before publishing its website.');
  if (workspaceId && ![uid, settings.id, settings.slug].filter(Boolean).includes(workspaceId)) fail('permission-denied', 'This website does not belong to your business.');
  const profileRef = db.doc(`artifacts/${APP}/public/data/workspaces/${settings.slug}`);
  const publicProfile = (await (tx ? tx.get(profileRef) : profileRef.get())).data();
  if (publicProfile?.ownerId !== uid || publicProfile?.published === false) fail('permission-denied', 'Publish a business profile owned by your signed-in account.');
  const workspace = { ...settings, ownerId: uid };
  if (workspace.website?.published === false) fail('failed-precondition', 'Publish your business profile before publishing its website.');
  const issues = readinessIssues(workspace);
  if (issues.length) fail('failed-precondition', issues.map(issue => issue.message).join(' '));
  const catalog = publicCommerceCatalog({ ...workspace, website: { ...workspace.website, markets: undefined } });
  return { settings, workspace, catalog };
}

const digest = value => createHash('sha256').update(value).digest('hex');
const canonicalJSON = value => JSON.stringify(value, (_, row) => row && typeof row === 'object' && !Array.isArray(row) && Object.getPrototypeOf(row) === Object.prototype ? Object.fromEntries(Object.entries(row).sort(([a], [b]) => a.localeCompare(b))) : row);
function publicationState(workspace) {
  return digest(canonicalJSON(Object.fromEntries(['slug', 'brandName', 'currency', 'timezone', 'products', 'services', 'website', 'paymentGateways', 'features', 'checkout', 'availabilityRules', 'staffAvailability', 'staff', 'policies', 'sectionRevisions', 'storageMode', 'storageEpoch', 'migration'].map(key => [key, workspace[key] ?? null]))));
}
function validatePublication(html, workspace, catalog) {
  if (typeof html !== 'string' || !/<html[\s>]/i.test(html)) fail('invalid-argument', 'Provide a complete website document.');
  // Blob references are device-local. Reject them anywhere, including CSS/JS/imports.
  const decoded = html.replace(/&#x([a-f0-9]+);?|&#(\d+);?|&colon;/gi, (_, hex, decimal) => hex || decimal ? String.fromCodePoint(Math.min(parseInt(hex || decimal, hex ? 16 : 10), 0x10ffff)) : ':').replace(/\\([a-f0-9]{1,6})\s?/gi, (_, hex) => String.fromCodePoint(Math.min(parseInt(hex, 16), 0x10ffff)));
  if (/\bblob\s*:/i.test(decoded)) fail('failed-precondition', 'This website contains a browser-local asset URL. Embed its asset data or use a durable HTTPS asset before publishing.');
  if (getMarkets(workspace.website).filter(market => market.enabled).some(market => marketReadiness(workspace, market).shippingIssues > 0)) fail('failed-precondition', 'Complete shipping settings for your enabled markets before publishing.');
  try { return validateWebsiteBindings(html, catalog); } catch (error) { fail('failed-precondition', error.message); }
}
async function readBundle(pointer, bucket) {
  if (!id(pointer.ownerId) || !id(pointer.siteId) || !id(pointer.revision) || pointer.bundlePath !== `websiteBundles/${APP}/${pointer.ownerId}/${pointer.siteId}/${pointer.revision}.json`) fail('data-loss', 'The website bundle location is invalid.');
  const [bytes] = await bucket.file(pointer.bundlePath).download();
  if (bytes.length > 2_500_000 || digest(bytes) !== pointer.sha256) fail('data-loss', 'The website bundle failed its integrity check.');
  let bundle;
  try { bundle = JSON.parse(bytes.toString()); } catch { fail('data-loss', 'The website bundle could not be read.'); }
  if (bundle.contractVersion !== 1 || typeof bundle.html !== 'string') fail('data-loss', 'The website bundle uses an unsupported contract.');
  return bundle;
}
function checkReplay(receipt, fingerprint) {
  if (receipt?.fingerprint !== fingerprint) fail('already-exists', 'This publication request was already used for a different website.');
  return receipt.result || result(receipt.pointer);
}

export async function publishWebsite(data, auth, dependencies = {}) {
  const uid = requireOwner(auth), db = dependencies.db || getFirestore();
  publicBaseUrl();
  if (!id(data.requestId)) fail('invalid-argument', 'A stable publication request identifier is required.');
  if (data.expectedRevision !== undefined && data.expectedRevision !== null && !id(data.expectedRevision)) fail('invalid-argument', 'Choose a valid current publication revision.');
  const project = data.project;
  const fingerprint = digest(canonicalJSON({ html: project?.html, name: String(project?.name || 'Website').slice(0, 120), workspaceId: data.workspaceId || uid, expectedRevision: data.expectedRevision ?? null }));
  const receiptRef = publishRequestRef(db, uid, data.requestId);
  const receipt = (await receiptRef.get()).data();
  if (receipt) return checkReplay(receipt, fingerprint);
  const { settings, workspace, catalog } = await ownerWorkspace(db, uid, data.workspaceId);
  const manifest = validatePublication(project?.html, workspace, catalog);
  const checkedState = publicationState(workspace);
  const admission = await db.runTransaction(async tx => {
    const replay = (await tx.get(receiptRef)).data();
    if (replay) return { replay: checkReplay(replay, fingerprint) };
    const previous = (await tx.get(ownerRef(db, uid))).data();
    if (data.expectedRevision !== undefined && data.expectedRevision !== (previous?.revision || null)) fail('aborted', 'A newer website was published. Reload its status before publishing.');
    return { previous };
  });
  if (admission.replay) return admission.replay;
  const { previous } = admission;
  const siteId = previous?.siteId || createHash('sha256').update(`${APP}:${uid}`).digest('hex').slice(0, 32);
  const bundle = { contractVersion: 1, html: project.html, manifest, name: String(project.name || 'Website').slice(0, 120) };
  const bytes = Buffer.from(JSON.stringify(bundle));
  if (bytes.length > 2_500_000) fail('invalid-argument', 'The published website bundle must be smaller than 2.5 MB. Optimize large images before publishing.');
  const revision = digest(`${APP}:${uid}:${data.requestId}`).slice(0, 40);
  const path = `websiteBundles/${APP}/${uid}/${siteId}/${revision}.json`;
  const bucket = dependencies.bucket || getStorage().bucket();
  try { await bucket.file(path).save(bytes, { resumable: false, preconditionOpts: { ifGenerationMatch: 0 }, metadata: { contentType: 'application/json', cacheControl: 'private,no-store' } }); }
  catch (error) {
    if (Number(error.code) !== 412 && Number(error.code) !== 409) throw error;
    const [saved] = await bucket.file(path).download();
    if (digest(saved) !== digest(bytes)) fail('already-exists', 'This publication request was already used for a different website.');
  }
  const pointer = { ownerId: uid, slug: settings.slug, siteId, revision, bundlePath: path, sha256: createHash('sha256').update(bytes).digest('hex'), contractVersion: 1, publishedAtMs: Date.now(), updatedAt: FieldValue.serverTimestamp() };
  return db.runTransaction(async tx => {
    const replay = (await tx.get(receiptRef)).data();
    if (replay) return checkReplay(replay, fingerprint);
    const current = (await tx.get(ownerRef(db, uid))).data();
    if ((current?.revision || null) !== (previous?.revision || null)) fail('aborted', 'Another publication completed first. Reload and try again.');
    const live = await ownerWorkspace(db, uid, data.workspaceId, tx);
    validatePublication(project.html, live.workspace, live.catalog);
    if (publicationState(live.workspace) !== checkedState) fail('aborted', 'Your catalog or settings changed during publication. Review the updated connections and publish again.');
    tx.create(revisionRef(db, uid, revision), pointer);
    tx.set(ownerRef(db, uid), pointer);
    tx.set(siteRef(db, siteId), pointer);
    tx.create(receiptRef, { fingerprint, pointer, result: result(pointer), createdAt: FieldValue.serverTimestamp() });
    return result(pointer);
  });
}

export async function getWebsitePublishStatus(data, auth, dependencies = {}) {
  const uid = requireOwner(auth), db = dependencies.db || getFirestore();
  const pointer = (await ownerRef(db, uid).get()).data();
  if (!pointer) { try { publicBaseUrl(); return { status: 'draft', configured: true }; } catch (error) { return { status: 'draft', configured: false, reason: error.message }; } }
  const history = await db.collection(`artifacts/${APP}/users/${uid}/websiteRevisions`).orderBy('publishedAtMs', 'desc').limit(20).get();
  return { ...result(pointer), revisions: history.docs.map(doc => ({ revision: doc.id, publishedAt: doc.data().publishedAtMs })) };
}

export async function rollbackWebsite(data, auth, dependencies = {}) {
  const uid = requireOwner(auth), db = dependencies.db || getFirestore();
  if (!id(data.revision)) fail('invalid-argument', 'Choose an existing published revision.');
  if (!id(data.expectedRevision)) fail('invalid-argument', 'Load the current website revision before rolling back.');
  publicBaseUrl();
  const fingerprint = digest(canonicalJSON({ revision: data.revision, expectedRevision: data.expectedRevision }));
  const receiptRef = data.requestId ? publishRequestRef(db, uid, data.requestId) : null;
  if (receiptRef && !id(data.requestId)) fail('invalid-argument', 'Choose a valid rollback request identifier.');
  const replay = receiptRef ? (await receiptRef.get()).data() : null;
  if (replay) return checkReplay(replay, fingerprint);
  const checked = await ownerWorkspace(db, uid, data.workspaceId);
  const target = (await revisionRef(db, uid, data.revision).get()).data();
  if (!target || target.ownerId !== uid) fail('not-found', 'That published revision is unavailable.');
  const bundle = await readBundle(target, dependencies.bucket || getStorage().bucket());
  validatePublication(bundle.html, checked.workspace, checked.catalog);
  await db.runTransaction(async tx => {
    const replay = receiptRef ? (await tx.get(receiptRef)).data() : null;
    if (replay) { checkReplay(replay, fingerprint); return; }
    const current = (await tx.get(ownerRef(db, uid))).data();
    if (!current || (data.expectedRevision != null && data.expectedRevision !== current.revision)) fail('aborted', 'The live website changed. Reload its status before rolling back.');
    if (current.siteId !== target.siteId) fail('permission-denied', 'That revision belongs to a different website.');
    const revision = (await tx.get(revisionRef(db, uid, data.revision))).data();
    if (revision?.sha256 !== target.sha256 || revision?.bundlePath !== target.bundlePath) fail('aborted', 'The selected revision changed during the integrity check.');
    const live = await ownerWorkspace(db, uid, data.workspaceId, tx);
    validatePublication(bundle.html, live.workspace, live.catalog);
    if (publicationState(live.workspace) !== publicationState(checked.workspace)) fail('aborted', 'Your catalog or settings changed during rollback. Review the updated connections and try again.');
    const pointer = { ...target, updatedAt: FieldValue.serverTimestamp() };
    tx.set(ownerRef(db, uid), pointer); tx.set(siteRef(db, target.siteId), pointer);
    if (receiptRef) tx.create(receiptRef, { fingerprint, result: result(target), createdAt: FieldValue.serverTimestamp() });
  });
  return result(target);
}

export async function resolveWebsiteDomain(domain, dependencies = {}) {
  try { domain = normalizeDomain(domain); } catch { fail('not-found', 'This domain is not connected to a website.'); }
  const db = dependencies.db || getFirestore(), route = (await db.doc(`customDomainRoutes/${digest(domain)}`).get()).data();
  if (!route?.active || route.appId !== APP || !id(route.ownerId)) fail('not-found', 'This domain is not connected to a website.');
  const [connection, pointer] = await Promise.all([db.doc(`artifacts/${APP}/users/${route.ownerId}/private/customDomain`).get(), ownerRef(db, route.ownerId).get()]);
  if (connection.data()?.status !== 'connected' || connection.data()?.domain !== domain || pointer.data()?.slug !== route.slug || pointer.data()?.ownerId !== route.ownerId) fail('not-found', 'This domain is not connected to a published website.');
  return pointer.data();
}
async function readPublicSite(siteId, dependencies = {}, previewToken = '', domain = '') {
  const domainPointer = domain ? await resolveWebsiteDomain(domain, dependencies) : null;
  if (domainPointer) { if (siteId && siteId !== domainPointer.siteId) fail('permission-denied', 'This domain belongs to a different website.'); siteId = domainPointer.siteId; }
  if (!previewToken && !id(siteId) || previewToken && !/^[a-zA-Z0-9_-]{32}$/.test(previewToken)) fail('invalid-argument', 'Choose a valid website.');
  const db = dependencies.db || getFirestore();
  const pointer = (await (previewToken ? db.doc(`artifacts/${APP}/publicWebsitePreviews/${digest(previewToken)}`) : siteRef(db, siteId)).get()).data();
  if (domainPointer && pointer?.ownerId !== domainPointer.ownerId) fail('permission-denied', 'This preview belongs to a different website.');
  if (previewToken && (!pointer?.preview || pointer.expiresAt <= Date.now())) fail('not-found', 'This preview link expired. Ask the owner for a new preview.');
  if (!pointer?.revision || pointer.contractVersion !== 1) fail('not-found', 'This website is not published.');
  const profile = (await db.doc(`artifacts/${APP}/public/data/workspaces/${pointer.slug}`).get()).data();
  if (profile?.ownerId !== pointer.ownerId || profile.published === false) fail('not-found', 'This business is not published.');
  return pointer;
}
export async function getPublicWebsite(data, dependencies = {}) {
  const pointer = await readPublicSite(data.siteId, dependencies, data.previewToken, data.domain);
  const bundle = await readBundle(pointer, dependencies.bucket || getStorage().bucket());
  return { siteId: pointer.siteId, revision: pointer.revision, slug: pointer.slug, preview: pointer.preview === true, expiresAt: pointer.expiresAt || null, ...bundle };
}
async function checkoutCapability(db, pointer, sourceType, record) {
  const sourceId = record.id || record[sourceType]?.id;
  if (!id(sourceId)) fail('internal', 'The checkout did not return a valid confirmation.');
  const ref = db.doc(`artifacts/${APP}/users/${pointer.ownerId}/websiteCheckoutCapabilities/${sourceType}-${sourceId}`);
  const statusToken = await db.runTransaction(async tx => { const prior = (await tx.get(ref)).data(); if (prior) return prior.token; const token = randomBytes(24).toString('base64url'); tx.create(ref, { sourceType, sourceId, token, createdAt: Date.now() }); return token; });
  return { ...record, statusToken };
}

export async function executePublicWebsiteAction(data, dependencies = {}) {
  const pointer = await readPublicSite(data.siteId, dependencies, data.previewToken, data.domain);
  const db = dependencies.db || getFirestore();
  const payload = validateWebsiteRequest(data.action, data.payload || {});
  if (pointer.preview && !['catalog.get', 'quote.get', 'availability.get'].includes(data.action)) fail('failed-precondition', 'This shared preview is read-only. Publish the website to accept orders and bookings.');
  const scoped = { ...payload, slug: pointer.slug };
  if (data.action === 'catalog.get') return getPublicCommerceContext(scoped, db);
  if (data.action === 'quote.get') return quotePublicCommerce(scoped, undefined, db);
  if (data.action === 'availability.get') return getLivePublicServiceAvailability(scoped, db);
  if (data.action === 'booking.create') return checkoutCapability(db, pointer, 'booking', await writeGuardedBooking(scoped, undefined, db, true));
  if (data.action === 'checkout.create') return checkoutCapability(db, pointer, 'order', await placeMarketOrder(scoped, undefined, db));
  if (data.action === 'checkout.status') {
    if (!['order', 'booking'].includes(payload.sourceType) || !id(payload.sourceId) || !id(payload.statusToken)) fail('permission-denied', 'Use the private confirmation from your checkout to view its status.');
    const capability = (await db.doc(`artifacts/${APP}/users/${pointer.ownerId}/websiteCheckoutCapabilities/${payload.sourceType}-${payload.sourceId}`).get()).data();
    if (!capability?.token || digest(capability.token) !== digest(payload.statusToken)) fail('permission-denied', 'This confirmation does not match the checkout.');
    const { workspace } = await readWorkspace(db, pointer.ownerId); const current = workspace[payload.sourceType === 'order' ? 'orders' : 'bookings']?.find(row => row.id === payload.sourceId);
    if (!current) fail('not-found', 'This checkout is unavailable.');
    return { id: current.id, status: current.status, paymentStatus: current.paymentStatus, amountInCents: current.amountInCents, currency: current.currency, inventoryStatus: current.inventoryStatus || null, inventoryExpiresAtMs: current.inventoryExpiresAtMs || null };
  }
  if (data.action === 'payment.start') { const origin = data.domain ? `https://${normalizeDomain(data.domain)}` : publicBaseUrl(); return initiatePayment({ ...scoped, appId: APP, successUrl: `${origin}/?site=${pointer.siteId}`, cancelUrl: `${origin}/?site=${pointer.siteId}` }); }
  if (data.action === 'payment.confirm') return confirmPaymentReturn({ ...scoped, appId: APP });
  fail('invalid-argument', 'This action is handled by the website cart or selection dialog.');
}

// Dedicated Hosting origin rewrites /api/website here. Never enable broad CORS.
export async function enforceWebsiteRequestLimit(key, db = getFirestore(), now = Date.now()) {
  const ref = db.doc(`artifacts/${APP}/websiteRequestLimits/${digest(`${key}:${Math.floor(now / 60000)}`)}`);
  await db.runTransaction(async tx => { const current = (await tx.get(ref)).data(); if ((current?.count || 0) >= 120) fail('resource-exhausted', 'Too many website requests. Wait a minute and try again.'); tx.set(ref, { count: (current?.count || 0) + 1, expiresAt: new Date(now + 120000) }); });
}
export async function publicWebsiteGateway(req, res) {
  res.set('Cache-Control', 'no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  try {
    const origin = req.get('origin');
    const base = publicBaseUrl(); let domain = '';
    if (origin && origin !== base) {
      let parsed; try { parsed = new URL(origin); } catch { fail('permission-denied', 'Use the published website to make this request.'); }
      if (parsed.protocol !== 'https:' || parsed.origin !== origin || parsed.origin === new URL(process.env.APP_PUBLIC_BASE_URL).origin) fail('permission-denied', 'Use the published website to make this request.');
      try { await resolveWebsiteDomain(parsed.hostname); domain = parsed.hostname; } catch { fail('permission-denied', 'Use the published website to make this request.'); }
    }
    if (req.method === 'GET') { const requested = String(req.query.domain || ''); if (requested && requested !== new URL(base).hostname) domain = requested; await enforceWebsiteRequestLimit(String(req.ip || 'unknown')); return res.json(await getPublicWebsite({ siteId: String(req.query.siteId || ''), previewToken: String(req.query.previewToken || ''), domain })); }
    if (req.method !== 'POST' || !req.is('application/json') || !origin || JSON.stringify(req.body).length > 45000) fail('invalid-argument', 'Invalid website request.');
    await enforceWebsiteRequestLimit(String(req.ip || 'unknown'));
    return res.json(await executePublicWebsiteAction({ ...(req.body || {}), domain }));
  } catch (error) { const message = typeof error.code === 'number' || /websiteBundles\/|websiteDrafts\/|artifacts\/|ENOTFOUND|ECONN|bucket|credential|access token/i.test(error.message || '') ? 'The website could not complete this request. Please try again.' : error.message || 'Website request failed.'; res.status(error.code === 'not-found' ? 404 : error.code === 'unauthenticated' ? 401 : error.code === 'permission-denied' ? 403 : error.code === 'resource-exhausted' ? 429 : 400).json({ error: message }); }
}
