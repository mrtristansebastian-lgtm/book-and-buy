import { getFirestore } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { readWorkspace, settingsRef } from './workspaceStore.js';
import { assertId, domainError } from './workspaceDomain.js';
const APP = process.env.APP_ID || 'book-and-buy-v1';
const root = owner => `artifacts/${APP}/users/${owner}`;
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const reviewId = (ownerId, data) => digest([ownerId, data.kind, data.purchaseId, data.itemId]);
const publicReview = row => ({ id: row.id, quote: row.quote, rating: row.rating, name: row.name, itemName: row.itemName, itemId: row.itemId, kind: row.kind, source: 'bookbuy', verifiedPurchase: true, createdAt: row.createdAt });
function customer(auth) { if (!auth?.uid || auth.token?.email_verified !== true) domainError('Sign in with your verified customer account to review a purchase.', 'unauthenticated'); }
function reviewAuthor(row, auth) { if (row && row.customerUid !== auth.uid) domainError('This purchase already has a review from its original customer account.', 'permission-denied'); }
export function reviewPurchase(workspace, data, auth) {
  customer(auth);
  if (workspace.website?.platformReviewsEnabled !== true) domainError('This business has not enabled Book & Buy reviews.', 'failed-precondition');
  if (!['order', 'booking'].includes(data.kind)) domainError('Choose a product order or service booking.');
  assertId(data.purchaseId, 'Purchase'); assertId(data.itemId, 'Purchased item');
  const record = (data.kind === 'order' ? workspace.orders : workspace.bookings)?.find(row => row.id === data.purchaseId);
  const owns = record && (record.clientUid ? record.clientUid === auth.uid : String(record.clientEmail || '').toLowerCase() === String(auth.token.email || '').toLowerCase());
  if (!owns || !record.clientUid && !record.clientEmail || record.paymentStatus !== 'paid' || ['cancelled', 'canceled', 'refunded', 'declined'].includes(record.status)) domainError('Only the verified customer of a paid purchase can review it.', 'permission-denied');
  const item = data.kind === 'order' ? record.items?.find(row => row.productId === data.itemId) : record.serviceId === data.itemId && record;
  if (!item || data.kind === 'booking' && record.status !== 'completed') domainError('This item has not been purchased or the service is not complete.', 'failed-precondition');
  return { name: String(record.clientName || 'Customer').trim().split(/\s+/)[0].slice(0, 60), itemName: String(item.name || record.serviceName || 'Purchased service').slice(0, 120) };
}
async function business(db, slug) { assertId(slug, 'Business'); const publicDoc = await db.doc(`artifacts/${APP}/public/data/workspaces/${slug}`).get(); const ownerId = publicDoc.data()?.ownerId; if (!publicDoc.exists || publicDoc.data()?.published === false || !ownerId) domainError('Published business not found.', 'not-found'); assertId(ownerId); return ownerId; }
export async function getPurchaseReview(data, auth, db = getFirestore()) {
  customer(auth); const ownerId = await business(db, data.slug); if (ownerId === auth.uid) domainError('Business owners cannot review their own business.', 'permission-denied');
  const { workspace } = await readWorkspace(db, ownerId); const purchase = reviewPurchase(workspace, data, auth);
  const id = reviewId(ownerId, data), row = (await db.doc(`${root(ownerId)}/platformReviews/${id}`).get()).data();
  reviewAuthor(row, auth);
  return { eligible: true, ...purchase, review: row ? { ...publicReview(row), revision: row.revision } : null };
}
export async function submitPurchaseReview(data, auth, db = getFirestore()) {
  customer(auth); const ownerId = await business(db, data.slug); if (ownerId === auth.uid) domainError('Business owners cannot review their own business.', 'permission-denied');
  if (!Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5 || typeof data.quote !== 'string' || data.quote.trim().length < 3 || data.quote.trim().length > 2000) domainError('Choose 1–5 stars and write a review between 3 and 2,000 characters.');
  const quote = data.quote.trim(), id = reviewId(ownerId, data), ref = db.doc(`${root(ownerId)}/platformReviews/${id}`), fingerprint = digest([data.rating, quote]);
  return db.runTransaction(async tx => {
    const { workspace } = await readWorkspace(db, ownerId, tx), previous = (await tx.get(ref)).data(); const purchase = reviewPurchase(workspace, data, auth);
    reviewAuthor(previous, auth);
    if (previous?.fingerprint === fingerprint && previous.status === 'published') return { ok: true, review: { ...publicReview(previous), revision: previous.revision } };
    if ((data.expectedRevision ?? 0) !== (previous?.revision || 0)) domainError('Your review changed. Reopen it before saving.', 'aborted');
    const review = { id, ownerId, customerUid: auth.uid, purchaseId: data.purchaseId, kind: data.kind, itemId: data.itemId, ...purchase, quote, rating: data.rating, fingerprint, status: 'published', revision: (previous?.revision || 0) + 1, createdAt: previous?.createdAt || Date.now(), updatedAt: Date.now() };
    tx.set(ref, review); return { ok: true, review: { ...publicReview(review), revision: review.revision } };
  });
}
export async function getPublicPlatformReviews(data, _auth, db = getFirestore()) {
  const ownerId = await business(db, data.slug), workspace = (await settingsRef(db, ownerId).get()).data() || {};
  if (workspace.website?.platformReviewsEnabled !== true) return { ok: true, reviews: [] };
  const rows = await db.collection(`${root(ownerId)}/platformReviews`).orderBy('createdAt', 'desc').limit(50).get();
  const reviews = rows.docs.map(row => row.data()).filter(row => row.status === 'published' && (!data.itemId || row.itemId === data.itemId)).map(publicReview);
  return { ok: true, reviews };
}
