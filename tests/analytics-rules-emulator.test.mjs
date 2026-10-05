import test from 'node:test';
import assert from 'node:assert/strict';

const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const project = 'demo-book-buy';
const documentRoot = `projects/${project}/databases/(default)/documents`;
const endpoint = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/${documentRoot}`;
const encode = value => typeof value === 'string' ? { stringValue: value } : typeof value === 'boolean' ? { booleanValue: value } :
  typeof value === 'number' ? { integerValue: String(value) } : Array.isArray(value) ? { arrayValue: { values: value.map(encode) } } :
  { mapValue: { fields: fields(value) } };
const fields = row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, encode(value)]));
const token = uid => {
  const now = Math.floor(Date.now() / 1000);
  return [{ alg: 'none', typ: 'JWT' }, { iss: `https://securetoken.google.com/${project}`, aud: project,
    sub: uid, user_id: uid, iat: now, exp: now + 3600, email: `${uid}@example.test`, email_verified: true,
    firebase: { sign_in_provider: 'password' } }].map(part => Buffer.from(JSON.stringify(part)).toString('base64url')).join('.') + '.';
};
const headers = actor => ({ 'content-type': 'application/json', ...(actor ? { authorization: `Bearer ${token(actor)}` } : {}) });
const read = (path, actor) => fetch(`${endpoint}/${path}`, { headers: headers(actor), signal: AbortSignal.timeout(15000) });
const query = (collection, ownerId, timestampField, start, actor = ownerId) => fetch(`${endpoint}/artifacts/book-and-buy-v1:runQuery`, {
  method: 'POST', headers: headers(actor), signal: AbortSignal.timeout(15000),
  body: JSON.stringify({ structuredQuery: { from: [{ collectionId: collection }],
    where: { compositeFilter: { op: 'AND', filters: [
      { fieldFilter: { field: { fieldPath: 'ownerId' }, op: 'EQUAL', value: encode(ownerId) } },
      { fieldFilter: { field: { fieldPath: timestampField }, op: 'GREATER_THAN_OR_EQUAL', value: start } }
    ] } }, orderBy: [{ field: { fieldPath: timestampField }, direction: 'DESCENDING' }], limit: 1001 } })
});
const patch = (path, data) => fetch(`${endpoint}/${path}`, { method: 'PATCH', headers: headers(),
  body: JSON.stringify({ fields: fields(data) }), signal: AbortSignal.timeout(15000) });
const commit = (path, data, timestampField) => fetch(`${endpoint}:commit`, { method: 'POST', headers: headers(),
  body: JSON.stringify({ writes: [{ update: { name: `${documentRoot}/${path}`, fields: fields(data) },
    updateTransforms: [{ fieldPath: timestampField, setToServerValue: 'REQUEST_TIME' }] }] }), signal: AbortSignal.timeout(15000) });
const ok = async response => assert.equal(response.status, 200, await response.text());
const denied = async response => assert.equal(response.status, 403, await response.text());

test('analytics rules retain discovery and commerce metadata, enforce create-only retries and scope reads to the owner', { skip: !enabled }, async () => {
  const suffix = crypto.randomUUID();
  const ownerId = `analytics-owner-${suffix}`;
  const now = Date.now();
  const identity = { analyticsVersion: 2, visitorId: `visitor_${suffix}`, visitorFirstSeenAt: now - 1000,
    isReturningVisitor: false, source: 'places' };
  const payloads = [
    { type: 'discovery_visit', discoveryAction: 'impression', discoveryTarget: 'business', discoverySurface: 'places' },
    { type: 'discovery_visit', discoveryAction: 'impression', discoveryTarget: 'product', discoverySurface: 'buy', itemKind: 'product', productId: 'p1', source: 'direct' },
    { type: 'discovery_visit', discoveryAction: 'impression', discoveryTarget: 'service', discoverySurface: 'book', itemKind: 'service', serviceId: 's1', source: 'direct' },
    { type: 'page_view', path: '/test-shop/home', discoverySurface: 'places' },
    { type: 'product_view', commerceVersion: 1, interaction: 'view', itemKind: 'product', productId: 'p1', itemName: 'Product', discoverySurface: 'buy' },
    { type: 'product_view', commerceVersion: 1, interaction: 'view', itemKind: 'service', serviceId: 's1', itemName: 'Service', discoverySurface: 'book' },
    { type: 'add_to_cart', commerceVersion: 1, itemKind: 'service', serviceId: 's1', quantity: 2, valueCents: 1000, discoverySurface: 'book' },
    { type: 'begin_checkout', valueCents: 1000, discoverySurface: 'buy' },
    { type: 'purchase', orderId: 'real-order', bookingCount: 1, discoverySurface: 'buy' },
    { type: 'message_lead', discoverySurface: 'places' }
  ];
  for (const [index, extra] of payloads.entries()) {
    const path = `artifacts/book-and-buy-v1/analyticsEvents/audit_${suffix}_${index}`;
    const data = { ...identity, ownerId, slug: 'test-shop', sessionId: `session_${suffix}`, at: now,
      discoveryVersion: 1, path: '/test-shop/buy', ...extra };
    await ok(await patch(path, data));
    const stored = await read(path, ownerId);
    assert.equal(stored.status, 200, await stored.clone().text());
    assert.deepEqual((await stored.json()).fields, fields(data), 'New metadata survives the accepted Firestore write');
    await denied(await patch(path, data));
    await denied(await read(path, 'different-analytics-owner'));
    await denied(await read(path));
  }
  const scoped = await query('analyticsEvents', ownerId, 'at', encode(now));
  assert.equal(scoped.status, 200, await scoped.clone().text());
  assert.equal((await scoped.json()).filter(row => row.document).length, payloads.length,
    'The owner-scoped range query used by Reports can read every saved event');
  await denied(await query('analyticsEvents', ownerId, 'at', encode(now), 'different-analytics-owner'));
  const invalid = { ...identity, visitorId: 'invalid', ownerId, slug: 'test-shop', sessionId: `session_${suffix}`, at: now,
    type: 'discovery_visit', discoveryVersion: 1, discoverySurface: 'places', discoveryAction: 'impression', discoveryTarget: 'business' };
  await denied(await patch(`artifacts/book-and-buy-v1/analyticsEvents/invalid_${suffix}`, invalid));
});

test('analytics session and cart rules preserve ownership, anonymous identity and server timestamps', { skip: !enabled }, async () => {
  const suffix = crypto.randomUUID();
  const ownerId = `analytics-owner-${suffix}`;
  const now = Date.now();
  const sessionId = `session_${suffix}`;
  const sessionPath = `artifacts/book-and-buy-v1/analyticsSessions/${sessionId}`;
  const session = { sessionId, ownerId, slug: 'test-shop', analyticsVersion: 2, visitorId: `visitor_${suffix}`,
    visitorFirstSeenAt: now - 1000, isReturningVisitor: false, source: 'places', startedAt: now, lastSeenAt: now,
    path: '/test-shop/home', referrer: '', country: '', region: '', city: '', device: 'desktop', isBot: false };
  await ok(await commit(sessionPath, session, 'updatedAt'));
  await ok(await commit(sessionPath, { ...session, lastSeenAt: now + 1 }, 'updatedAt'));
  await denied(await commit(sessionPath, { ...session, ownerId: 'different-owner' }, 'updatedAt'));
  await denied(await commit(sessionPath, { ...session, visitorId: `different_${suffix}` }, 'updatedAt'));
  await denied(await read(sessionPath, 'different-owner'));
  await ok(await read(sessionPath, ownerId));
  await ok(await query('analyticsSessions', ownerId, 'startedAt', encode(now)));

  const cartId = `cart_${sessionId}`;
  const cartPath = `artifacts/book-and-buy-v1/analyticsCarts/${cartId}`;
  const cart = { cartId, sessionId, ownerId, slug: 'test-shop', status: 'checkout', valueCents: 1000,
    items: [{ kind: 'service', serviceId: 's1', quantity: 1, unitPriceCents: 1000 }], updatedAt: now };
  await ok(await commit(cartPath, cart, 'serverUpdatedAt'));
  await ok(await commit(cartPath, { ...cart, status: 'converted', items: [], updatedAt: now + 1 }, 'serverUpdatedAt'));
  await denied(await commit(cartPath, { ...cart, ownerId: 'different-owner' }, 'serverUpdatedAt'));
  await denied(await commit(cartPath, { ...cart, sessionId: `different_${suffix}` }, 'serverUpdatedAt'));
  await denied(await read(cartPath, 'different-owner'));
  await ok(await read(cartPath, ownerId));
  await ok(await query('analyticsCarts', ownerId, 'serverUpdatedAt', { timestampValue: new Date(now - 1000).toISOString() }));
  await denied(await query('analyticsCarts', ownerId, 'serverUpdatedAt', { timestampValue: new Date(now - 1000).toISOString() }, 'different-owner'));
});
