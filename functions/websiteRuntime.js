import { createHash } from 'node:crypto';
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
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.pathname !== '/') fail('failed-precondition', 'Configure the dedicated HTTPS website hosting origin.');
  return url.origin;
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
  const previous = (await ownerRef(db, uid).get()).data();
  if (data.expectedRevision !== undefined && data.expectedRevision !== (previous?.revision || null)) fail('aborted', 'A newer website was published. Reload its status before publishing.');
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
  if (!pointer) return { status: 'draft', configured: Boolean(process.env.WEBSITE_PUBLIC_BASE_URL) };
  const history = await db.collection(`artifacts/${APP}/users/${uid}/websiteRevisions`).orderBy('publishedAtMs', 'desc').limit(20).get();
  return { ...result(pointer), revisions: history.docs.map(doc => ({ revision: doc.id, publishedAt: doc.data().publishedAtMs })) };
}

export async function rollbackWebsite(data, auth, dependencies = {}) {
  const uid = requireOwner(auth), db = dependencies.db || getFirestore();
  if (!id(data.revision)) fail('invalid-argument', 'Choose an existing published revision.');
  publicBaseUrl();
  const checked = await ownerWorkspace(db, uid, data.workspaceId);
  const target = (await revisionRef(db, uid, data.revision).get()).data();
  if (!target || target.ownerId !== uid) fail('not-found', 'That published revision is unavailable.');
  const bundle = await readBundle(target, dependencies.bucket || getStorage().bucket());
  validatePublication(bundle.html, checked.workspace, checked.catalog);
  await db.runTransaction(async tx => {
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
  });
  return result(target);
}

async function readPublicSite(siteId, dependencies = {}) {
  if (!id(siteId)) fail('invalid-argument', 'Choose a valid website.');
  const db = dependencies.db || getFirestore();
  const pointer = (await siteRef(db, siteId).get()).data();
  if (!pointer?.revision || pointer.contractVersion !== 1) fail('not-found', 'This website is not published.');
  const profile = (await db.doc(`artifacts/${APP}/public/data/workspaces/${pointer.slug}`).get()).data();
  if (profile?.ownerId !== pointer.ownerId || profile.published === false) fail('not-found', 'This business is not published.');
  return pointer;
}
export async function getPublicWebsite(data, dependencies = {}) {
  const pointer = await readPublicSite(data.siteId, dependencies);
  const bundle = await readBundle(pointer, dependencies.bucket || getStorage().bucket());
  return { siteId: pointer.siteId, revision: pointer.revision, slug: pointer.slug, ...bundle };
}

export async function executePublicWebsiteAction(data, dependencies = {}) {
  const pointer = await readPublicSite(data.siteId, dependencies);
  const db = dependencies.db || getFirestore();
  const payload = validateWebsiteRequest(data.action, data.payload || {});
  const scoped = { ...payload, slug: pointer.slug };
  if (data.action === 'catalog.get') return getPublicCommerceContext(scoped, db);
  if (data.action === 'quote.get') return quotePublicCommerce(scoped, undefined, db);
  if (data.action === 'availability.get') return getLivePublicServiceAvailability(scoped, db);
  if (data.action === 'booking.create') return writeGuardedBooking(scoped, undefined, db, true);
  if (data.action === 'checkout.create') return placeMarketOrder(scoped, undefined, db);
  if (data.action === 'payment.start') return initiatePayment({ ...scoped, appId: APP, successUrl: `${publicBaseUrl()}/?site=${pointer.siteId}`, cancelUrl: `${publicBaseUrl()}/?site=${pointer.siteId}` });
  if (data.action === 'payment.confirm') return confirmPaymentReturn({ ...scoped, appId: APP });
  fail('invalid-argument', 'This action is handled by the website cart or selection dialog.');
}

// Dedicated Hosting origin rewrites /api/website here. Never enable broad CORS.
export async function publicWebsiteGateway(req, res) {
  res.set('Cache-Control', 'no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  try {
    const origin = req.get('origin');
    if (origin && origin !== publicBaseUrl()) fail('permission-denied', 'Use the published website to make this request.');
    if (req.method === 'GET') return res.json(await getPublicWebsite({ siteId: String(req.query.siteId || '') }));
    if (req.method !== 'POST' || !req.is('application/json') || !origin || JSON.stringify(req.body).length > 45000) fail('invalid-argument', 'Invalid website request.');
    return res.json(await executePublicWebsiteAction(req.body || {}));
  } catch (error) { res.status(error.code === 'not-found' ? 404 : error.code === 'unauthenticated' ? 401 : error.code === 'permission-denied' ? 403 : 400).json({ error: error.message || 'Website request failed.' }); }
}
