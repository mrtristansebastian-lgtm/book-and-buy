import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { placeMarketOrder, updateMarketOrder } from '../functions/marketOrders.js';
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
if (enabled && !getApps().length) initializeApp({ projectId: 'demo-book-buy' });
test('market orders persist canonically, retry once and enforce ownership, revision and shipping', { skip: !enabled }, async () => {
  const db = getFirestore(); const ownerId = 'market-test-owner'; const slug = 'market-test-shop';
  const base = 'artifacts/book-and-buy-v1'; const settings = db.doc(`${base}/users/${ownerId}/config/settings`);
  await settings.set({ slug, brandName: 'Test shop', products: [{ id: 'p', name: 'Product', price: 30, active: true }], orders: [], website: { markets: [{ id: 'ZA', countryCode: 'ZA', enabled: true, catalogMode: 'all', shippingProfileIds: ['flat'] }], shippingProfiles: [{ id: 'flat', enabled: true, productMode: 'all', rateCents: 500 }] } });
  await db.doc(`${base}/public/data/workspaces/${slug}`).set({ ownerId, slug, published: true });
  const input = { slug, requestId: crypto.randomUUID(), paymentMethod: 'cash', items: [{ productId: 'p', quantity: 2, unitPriceCents: 1 }], client: { clientName: 'Client', clientEmail: 'client@example.test', country: 'ZA', shippingAddress: 'Test address' } };
  const [first, duplicate] = await Promise.all([placeMarketOrder(input, null, db), placeMarketOrder(input, null, db)]);
  assert.equal(first.id, duplicate.id); assert.equal(first.amountInCents, 6500);
  assert.equal((await settings.get()).data().orders.length, 1);
  await assert.rejects(placeMarketOrder({ ...input, items: [{ productId: 'p', quantity: 3 }] }, null, db), /already used/);
  await assert.rejects(placeMarketOrder({ ...input, requestId: crypto.randomUUID(), client: { ...input.client, country: 'US' } }, null, db), /does not sell/);
  const auth = { uid: ownerId, token: { email: 'owner@example.test', email_verified: true } };
  const update = { ownerId, id: first.id, expectedRevision: 1, patch: { status: 'accepted', amountInCents: 1 } };
  await assert.rejects(updateMarketOrder(update, { uid: 'stranger', token: { email: 'stranger@example.test', email_verified: true } }, db), /administrator/);
  const accepted = await updateMarketOrder(update, auth, db); assert.equal(accepted.amountInCents, 6500); assert.equal(accepted.status, 'accepted');
  await assert.rejects(updateMarketOrder(update, auth, db), /changed/);
  await settings.set({ website: { markets: [{ id: 'ZA', countryCode: 'ZA', enabled: false }] } }, { merge: true });
  await assert.rejects(placeMarketOrder({ ...input, requestId: crypto.randomUUID() }, null, db), /does not sell/);
});
test('security rules deny direct order/booking writes and unauthenticated owner data reads', { skip: !enabled }, async () => {
  const endpoint = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/demo-book-buy/databases/(default)/documents`;
  const uid = 'market-test-owner'; const now = Math.floor(Date.now() / 1000);
  const token = [ { alg: 'none', typ: 'JWT' }, { iss: 'https://securetoken.google.com/demo-book-buy', aud: 'demo-book-buy', sub: uid, user_id: uid, iat: now, exp: now + 3600, email: 'owner@example.test', email_verified: true, firebase: { sign_in_provider: 'password' } } ].map((part) => Buffer.from(JSON.stringify(part)).toString('base64url')).join('.') + '.';
  const path = `/artifacts/book-and-buy-v1/users/${uid}/config/settings`;
  const unauthorized = await fetch(endpoint + path); assert.equal(unauthorized.status, 403);
  for (const field of ['orders', 'bookings']) {
    const response = await fetch(`${endpoint}${path}?updateMask.fieldPaths=${field}`, { method: 'PATCH', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ fields: { [field]: { arrayValue: { values: [] } } } }) });
    assert.equal(response.status, 403, await response.text());
  }
  const allowed = await fetch(`${endpoint}${path}?updateMask.fieldPaths=brandName`, { method: 'PATCH', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ fields: { brandName: { stringValue: 'Permitted owner edit' } } }) });
  assert.equal(allowed.status, 403, await allowed.text());
});
