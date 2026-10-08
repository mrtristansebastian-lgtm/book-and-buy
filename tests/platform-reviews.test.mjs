import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { reviewPurchase, submitPurchaseReview, getPurchaseReview, getPublicPlatformReviews } from '../functions/reviews.js';
import { applyWorkspaceChanges } from '../functions/workspaceDomain.js';
const auth = { uid: 'customer', token: { email: 'buyer@example.com', email_verified: true } };
const workspace = () => ({ website: { platformReviewsEnabled: true }, orders: [{ id: 'order', clientUid: 'customer', clientEmail: 'buyer@example.com', clientName: 'Ava Customer', paymentStatus: 'paid', status: 'accepted', items: [{ productId: 'tea', name: 'Tea' }] }], bookings: [{ id: 'booking', clientUid: 'customer', clientName: 'Ava Customer', paymentStatus: 'paid', status: 'completed', serviceId: 'service', serviceName: 'Consultation' }] });
const data = { kind: 'order', purchaseId: 'order', itemId: 'tea' };
test('only the authenticated verified purchaser of a paid item can review it', () => {
  assert.equal(reviewPurchase(workspace(), data, auth).name, 'Ava');
  for (const credentials of [null, { ...auth, uid: 'attacker' }, { ...auth, token: { ...auth.token, email_verified: false } }]) assert.throws(() => reviewPurchase(workspace(), data, credentials));
  for (const patch of [{ paymentStatus: 'unpaid' }, { paymentStatus: 'refunded' }, { status: 'cancelled' }]) { const value = workspace(); Object.assign(value.orders[0], patch); assert.throws(() => reviewPurchase(value, data, auth)); }
  assert.throws(() => reviewPurchase(workspace(), { ...data, itemId: 'forged' }, auth));
  const disabled = workspace(); disabled.website.platformReviewsEnabled = false; assert.throws(() => reviewPurchase(disabled, data, auth));
  disabled.website.platformReviewsEnabled = 'false'; assert.throws(() => reviewPurchase(disabled, data, auth));
  assert.throws(() => applyWorkspaceChanges({}, [{ section: 'website', expectedRevision: 0, patch: { website: { platformReviewsEnabled: 'true' } } }]));
});
test('services require completion and verified email fallback never overrides a bound purchaser UID', () => {
  const booking = { kind: 'booking', purchaseId: 'booking', itemId: 'service' }; assert.equal(reviewPurchase(workspace(), booking, auth).itemName, 'Consultation');
  const pending = workspace(); pending.bookings[0].status = 'confirmed'; assert.throws(() => reviewPurchase(pending, booking, auth));
  const legacy = workspace(); legacy.orders[0].clientUid = ''; assert.equal(reviewPurchase(legacy, data, auth).name, 'Ava');
  legacy.orders[0].clientUid = 'different-account'; assert.throws(() => reviewPurchase(legacy, data, auth));
});
test('legacy purchases retain one review bound to the original customer account', async () => {
  const owner = 'legacy-business', slug = 'legacy-shop', root = `artifacts/book-and-buy-v1/users/${owner}`;
  const legacy = workspace(); legacy.orders[0].clientUid = '';
  const documents = new Map([[`${root}/config/settings`, legacy], [`artifacts/book-and-buy-v1/public/data/workspaces/${slug}`, { ownerId: owner, published: true }]]);
  const db = { doc(path) { return { path, async get() { return { exists: documents.has(path), data: () => structuredClone(documents.get(path)) }; } }; },
    runTransaction: fn => fn({ get: ref => ref.get(), set: (ref, row) => documents.set(ref.path, structuredClone(row)) }) };
  const input = { ...data, slug, rating: 4, quote: 'My original purchase review.' };
  const first = await submitPurchaseReview(input, auth, db);
  const recreatedAccount = { ...auth, uid: 'recreated-customer' };
  await assert.rejects(getPurchaseReview({ ...data, slug }, recreatedAccount, db), { code: 'permission-denied' });
  await assert.rejects(submitPurchaseReview(input, recreatedAccount, db), { code: 'permission-denied' });
  await assert.rejects(submitPurchaseReview({ ...input, quote: 'A duplicate review.' }, recreatedAccount, db), { code: 'permission-denied' });
  assert.equal((await submitPurchaseReview(input, auth, db)).review.id, first.review.id);
  assert.equal([...documents.keys()].filter(path => path.includes('/platformReviews/')).length, 1);
});
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, getApps } = require('firebase-admin/app'), { getFirestore } = require('firebase-admin/firestore');
const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
if (enabled && !getApps().length) initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-book-buy-agent' });
function emulatorAuth(uid) {
  const project = process.env.GCLOUD_PROJECT || 'demo-book-buy-agent', now = Math.floor(Date.now() / 1000);
  return [{ alg: 'none', typ: 'JWT' }, { iss: `https://securetoken.google.com/${project}`, aud: project,
    sub: uid, user_id: uid, iat: now, exp: now + 3600, email: auth.token.email, email_verified: true,
    firebase: { sign_in_provider: 'password' } }].map(part => Buffer.from(JSON.stringify(part)).toString('base64url')).join('.') + '.';
}
test('emulator platform reviews retry once, reject stale edits, redact purchase identities and obey live disabling', { skip: !enabled }, async () => {
  const db = getFirestore(), owner = `reviews-${randomUUID()}`, slug = `reviews-${randomUUID()}`, root = `artifacts/book-and-buy-v1/users/${owner}`;
  const settings = db.doc(`${root}/config/settings`); await settings.set(workspace()); await db.doc(`artifacts/book-and-buy-v1/public/data/workspaces/${slug}`).set({ ownerId: owner, published: true });
  const input = { ...data, slug, rating: 4, quote: 'Lovely tea, arrived quickly.' };
  const first = await Promise.all([submitPurchaseReview(input, auth, db), submitPurchaseReview(input, auth, db)]); assert.equal(first[0].review.id, first[1].review.id); assert.equal((await db.collection(`${root}/platformReviews`).get()).size, 1);
  const recordUrl = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${process.env.GCLOUD_PROJECT || 'demo-book-buy-agent'}/databases/(default)/documents/${root}/platformReviews/${first[0].review.id}`;
  for (const actor of [undefined, auth.uid, owner]) {
    const response = await fetch(recordUrl, { headers: actor ? { authorization: `Bearer ${emulatorAuth(actor)}` } : {}, signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 403, 'Private review records cannot be read by browser sessions');
  }
  const forgedWrite = await fetch(recordUrl, { method: 'PATCH', headers: { authorization: `Bearer ${emulatorAuth(auth.uid)}`, 'content-type': 'application/json' }, body: JSON.stringify({ fields: { rating: { integerValue: '5' } } }), signal: AbortSignal.timeout(15000) });
  assert.equal(forgedWrite.status, 403, 'Browser writes cannot bypass purchase verification');
  await assert.rejects(submitPurchaseReview({ ...input, rating: 6 }, auth, db));
  await assert.rejects(submitPurchaseReview({ ...input, quote: 'Forged' }, { ...auth, uid: 'attacker' }, db));
  await assert.rejects(submitPurchaseReview({ ...input, quote: 'Stale edit' }, auth, db), { code: 'aborted' });
  const fetched = await getPurchaseReview({ ...data, slug }, auth, db); assert.equal(fetched.review.revision, 1);
  await submitPurchaseReview({ ...input, quote: 'Updated honest experience.', expectedRevision: 1 }, auth, db);
  const publicResult = await getPublicPlatformReviews({ slug }, null, db); assert.equal(publicResult.reviews[0].verifiedPurchase, true); assert.equal(publicResult.reviews[0].quote, 'Updated honest experience.');
  assert.equal(publicResult.reviews[0].source, 'bookbuy');
  assert.equal(publicResult.reviews[0].customerUid, undefined); assert.equal(publicResult.reviews[0].purchaseId, undefined); assert.equal(publicResult.reviews[0].ownerId, undefined);
  const legacy = workspace(); legacy.orders[0].clientUid = ''; await settings.update({ orders: legacy.orders });
  const recreatedAccount = { ...auth, uid: 'recreated-customer' };
  await assert.rejects(getPurchaseReview({ ...data, slug }, recreatedAccount, db), { code: 'permission-denied' });
  await assert.rejects(submitPurchaseReview({ ...input, quote: 'Second review with the same verified email.' }, recreatedAccount, db), { code: 'permission-denied' });
  await assert.rejects(submitPurchaseReview({ ...input, quote: 'Updated honest experience.', expectedRevision: 2 }, recreatedAccount, db), { code: 'permission-denied' });
  assert.equal((await db.collection(`${root}/platformReviews`).get()).size, 1);
  await assert.rejects(submitPurchaseReview(input, { uid: owner, token: { email_verified: true } }, db), { code: 'permission-denied' });
  await settings.update({ 'website.platformReviewsEnabled': false }); assert.equal((await getPublicPlatformReviews({ slug }, null, db)).reviews.length, 0);
  await assert.rejects(submitPurchaseReview(input, auth, db), { code: 'failed-precondition' });
});
