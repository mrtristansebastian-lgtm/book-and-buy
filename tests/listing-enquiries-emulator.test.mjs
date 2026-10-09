import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { createListingEnquiry, getListingEnquiry, updateListingEnquiry } from '../functions/enquiries.js';
import { publicWebsiteGateway, executePublicWebsiteAction } from '../functions/websiteRuntime.js';

const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const project = process.env.GCLOUD_PROJECT || 'demo-book-buy-agent';
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
if (enabled && !getApps().length) initializeApp({ projectId: project });
const root = 'artifacts/book-and-buy-v1';
const endpoint = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${project}/databases/(default)/documents`;
const encode = value => typeof value === 'string' ? { stringValue: value } : typeof value === 'boolean' ? { booleanValue: value } : typeof value === 'number' ? { integerValue: String(value) } : { mapValue: { fields: fields(value) } };
const fields = row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, encode(value)]));
const token = ({ uid = 'client', email = 'buyer@example.test', verified = true } = {}) => {
  const now = Math.floor(Date.now() / 1000);
  return [{ alg: 'none', typ: 'JWT' }, { iss: `https://securetoken.google.com/${project}`, aud: project, sub: uid, user_id: uid, iat: now, exp: now + 3600, email, email_verified: verified, firebase: { sign_in_provider: 'password' } }].map(part => Buffer.from(JSON.stringify(part)).toString('base64url')).join('.') + '.';
};
const headers = actor => ({ 'content-type': 'application/json', ...(actor ? { authorization: `Bearer ${token(actor)}` } : {}) });
const read = (path, actor) => fetch(`${endpoint}/${path}`, { headers: headers(actor), signal: AbortSignal.timeout(15000) });
const patch = (path, value, actor) => fetch(`${endpoint}/${path}`, { method: 'PATCH', headers: headers(actor), body: JSON.stringify({ fields: fields(value) }), signal: AbortSignal.timeout(15000) });
const expectStatus = async (response, expected) => assert.equal(response.status, expected, await response.text());

async function fixture() {
  const db = getFirestore();
  const suffix = crypto.randomUUID();
  const ownerId = `enquiry-owner-${suffix}`;
  const slug = `dealer-${suffix}`;
  const product = { id: 'car', name: 'Toyota Corolla', listingType: 'vehicle', transactionMode: 'checkout', listingAvailability: 'available', price: 250000, active: true };
  const settings = db.doc(`${root}/users/${ownerId}/config/settings`);
  await settings.set({ ownerId, slug, website: { published: true }, products: [product] });
  await db.doc(`${root}/public/data/workspaces/${slug}`).set({ ownerId, published: true });
  return { db, ownerId, slug, settings, auth: { uid: ownerId, token: {} }, input: { slug, productId: 'car', requestId: crypto.randomUUID(), customerName: 'Buyer', email: `buyer-${suffix}@example.test`, phone: '+27 82 123 4567', intent: 'viewing', message: 'Can I view it on Saturday?' }, ip: `test-${suffix}` };
}

test('real Firestore enquiry retries create one private record and one Inbox conversation with all reads before writes', { skip: !enabled }, async () => {
  const f = await fixture();
  const results = await Promise.all([createListingEnquiry(f.input, { ip: f.ip }, f.db), createListingEnquiry(f.input, { ip: f.ip }, f.db)]);
  assert.equal(results[0].id, results[1].id);
  const records = await f.db.collection(`${root}/users/${f.ownerId}/listingEnquiries`).get();
  assert.equal(records.size, 1);
  const enquiry = records.docs[0].data();
  const thread = await f.db.doc(`${root}/clientThreads/${enquiry.threadId}`).get();
  assert.equal(thread.data().enquiryId, enquiry.id); assert.equal(thread.data().clientUid, undefined);
  assert.equal((await thread.ref.collection('messages').get()).size, 1);
  await assert.rejects(createListingEnquiry({ ...f.input, message: 'Changed request' }, { ip: f.ip }, f.db), /request has changed/);
  await f.settings.update({ website: { published: false } });
  await assert.rejects(createListingEnquiry({ ...f.input, requestId: crypto.randomUUID() }, { ip: f.ip }, f.db), /no longer published/);
});

test('verified matching-email customers can find, read and reply to guest enquiry threads; private notes stay server-only', { skip: !enabled }, async () => {
  const f = await fixture();
  const { id } = await createListingEnquiry(f.input, { ip: f.ip }, f.db);
  const enquiry = (await getListingEnquiry({ ownerId: f.ownerId, id }, f.auth, f.db)).enquiry;
  await updateListingEnquiry({ ownerId: f.ownerId, id, requestId: crypto.randomUUID(), status: 'contacted', ownerNotes: 'Private: internal sales notes', expectedRevision: 0 }, f.auth, f.db);
  const actor = { email: f.input.email };
  const mixedCaseActor = { email: f.input.email.toUpperCase() };
  const path = `${root}/clientThreads/${enquiry.threadId}`;
  await expectStatus(await read(path, actor), 200);
  await expectStatus(await read(path, mixedCaseActor), 200);
  await expectStatus(await read(path), 403);
  await expectStatus(await read(path, { email: 'different@example.test' }), 403);
  await expectStatus(await read(path, { email: f.input.email, verified: false }), 403);
  const query = await fetch(`${endpoint}/${root}:runQuery`, {
    method: 'POST', headers: headers(mixedCaseActor), signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'clientThreads' }], where: { fieldFilter: { field: { fieldPath: 'clientEmail' }, op: 'IN', value: { arrayValue: { values: [encode(mixedCaseActor.email), encode(f.input.email)] } } } }, limit: 60 } })
  });
  assert.equal(query.status, 200, await query.clone().text());
  assert.equal((await query.json()).filter(row => row.document).length, 1);
  await expectStatus(await read(`${root}/users/${f.ownerId}/listingEnquiries/${id}`, actor), 403);
  await expectStatus(await read(`${root}/users/${f.ownerId}/listingEnquiries/${id}`, { uid: f.ownerId, email: 'owner@example.test' }), 403);
  await expectStatus(await patch(`${path}/messages/client-reply`, { type: 'text', from: 'client', body: 'Thanks, Saturday works.', at: Date.now() }, mixedCaseActor), 200);
  await expectStatus(await patch(`${path}/messages/client-forged-business`, { type: 'text', from: 'business', body: 'Pretending to be the business', at: Date.now() }, actor), 403);
  await expectStatus(await patch(`${path}/messages/owner-reply`, { type: 'text', from: 'business', body: 'Saturday is available.', at: Date.now() }, { uid: f.ownerId, email: 'owner@example.test' }), 200);
  const thread = (await f.db.doc(path).get()).data();
  assert.equal(thread.ownerNotes, undefined);
  await expectStatus(await patch(path, { ...thread, enquiryId: 'another-enquiry' }, actor), 403);
  await expectStatus(await patch(path, { ...thread, enquiryStatus: 'closed' }, actor), 403);
  await expectStatus(await patch(`${root}/clientThreads/forged-${id}`, { ...thread, id: `forged-${id}` }, actor), 403);
});

test('custom website gateway persists enquiries in real Firestore and rejects presence, preview and untrusted scope', { skip: !enabled }, async t => {
  const previousWebsite = process.env.WEBSITE_PUBLIC_BASE_URL, previousApp = process.env.APP_PUBLIC_BASE_URL;
  process.env.WEBSITE_PUBLIC_BASE_URL = 'https://storefront.example.test'; process.env.APP_PUBLIC_BASE_URL = 'https://owner.example.test';
  t.after(() => { if (previousWebsite === undefined) delete process.env.WEBSITE_PUBLIC_BASE_URL; else process.env.WEBSITE_PUBLIC_BASE_URL = previousWebsite; if (previousApp === undefined) delete process.env.APP_PUBLIC_BASE_URL; else process.env.APP_PUBLIC_BASE_URL = previousApp; });
  const f = await fixture(); const siteId = `site-${crypto.randomUUID()}`;
  const pointer = { siteId, ownerId: f.ownerId, slug: f.slug, contractVersion: 1, revision: 'live-revision' };
  await f.db.doc(`${root}/public/data/websites/${siteId}`).set(pointer);
  const { slug, ...payload } = f.input;
  let result, status = 200;
  const req = { method: 'POST', ip: f.ip, get: () => 'https://storefront.example.test', is: () => true, body: { siteId, action: 'enquiry.create', payload } };
  const res = { set() {}, status(code) { status = code; return this; }, json(value) { result = value; return this; } };
  await publicWebsiteGateway(req, res, { db: f.db });
  assert.equal(status, 200); assert.equal(result.ok, true);
  const enquiry = (await getListingEnquiry({ ownerId: f.ownerId, id: result.id }, f.auth, f.db)).enquiry;
  assert.equal((await f.db.doc(`${root}/clientThreads/${enquiry.threadId}`).get()).data().enquiryId, result.id);
  assert.equal((await f.db.doc(`${root}/securityRateLimits/listing-${createHash('sha256').update(`ip:${f.ip}`).digest('hex')}`).get()).data().count, 1);
  assert.equal((await executePublicWebsiteAction({ siteId, action: 'enquiry.create', payload }, { db: f.db, ip: f.ip })).duplicate, true);
  await assert.rejects(executePublicWebsiteAction({ siteId, action: 'enquiry.create', payload: { ...payload, slug: 'fake' } }, { db: f.db }), /cannot choose a business/);
  await f.settings.update({ website: { published: true, profileMode: 'presence' } });
  await assert.rejects(executePublicWebsiteAction({ siteId, action: 'enquiry.create', payload: { ...payload, requestId: crypto.randomUUID() } }, { db: f.db }), /profile and contact details only/);
  const token = 'q'.repeat(32);
  await f.db.doc(`${root}/publicWebsitePreviews/${createHash('sha256').update(token).digest('hex')}`).set({ ...pointer, preview: true, expiresAt: Date.now() + 60000 });
  await assert.rejects(executePublicWebsiteAction({ previewToken: token, action: 'enquiry.create', payload }, { db: f.db }), /read-only/);
  assert.equal((await f.db.collection(`${root}/users/${f.ownerId}/listingEnquiries`).get()).size, 1);
});
