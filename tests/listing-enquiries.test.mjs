import test from 'node:test';
import assert from 'node:assert/strict';
import { createListingEnquiry, getListingEnquiry, updateListingEnquiry, assertEnquiryEligible, consumeEnquiryLimit, validateEnquiryInput } from '../functions/enquiries.js';
import { demoEnquiryThreads, readDemoEnquiries, saveDemoEnquiry, sendDemoEnquiryMessage, updateDemoEnquiry, updateDemoEnquiryThread } from '../src/features/enquiries/enquiryStore.js';
import { matchesInboxFilter } from '../src/features/support/utils/threadFilters.js';

const APP = 'artifacts/book-and-buy-v1';
const product = { id: 'car-1', name: '2024 Toyota Corolla', listingType: 'vehicle', transactionMode: 'checkout', listingAvailability: 'available', price: 250000, active: true };
const workspace = { ownerId: 'owner', slug: 'dealer', brandName: 'Dealer', website: { published: true }, products: [product] };
const input = { slug: 'dealer', productId: 'car-1', requestId: 'request-1', customerName: ' Alex Buyer ', email: 'ALEX@example.com', phone: '+27 82 123 4567', message: 'Is this still available?', intent: 'enquiry' };
const auth = { uid: 'owner', token: {} };

function store(initial = workspace) {
  const docs = new Map([
    [`${APP}/users/owner/config/settings`, structuredClone(initial)],
    [`${APP}/public/data/workspaces/dealer`, { ownerId: 'owner', published: true }]
  ]);
  const snapshot = path => ({ exists: docs.has(path), data: () => structuredClone(docs.get(path)) });
  const ref = path => ({ path, get: async () => snapshot(path), collection: name => ({ doc: id => ref(`${path}/${name}/${id}`) }) });
  return { docs, doc: ref, runTransaction: async handler => {
    const writes = [];
    const tx = {
      get: async reference => snapshot(reference.path),
      create: (reference, value) => { if (docs.has(reference.path)) throw new Error('Duplicate create'); writes.push([reference.path, value]); },
      set: (reference, value) => writes.push([reference.path, value]),
      update: (reference, value) => { if (!docs.has(reference.path)) throw new Error('Missing update'); writes.push([reference.path, { ...docs.get(reference.path), ...value }]); }
    };
    const result = await handler(tx);
    writes.forEach(([path, value]) => docs.set(path, structuredClone(value)));
    return result;
  } };
}
const enquiries = db => [...db.docs].filter(([path]) => path.includes('/listingEnquiries/')).map(([, row]) => row);
const memoryStorage = () => { const records = new Map(); return { getItem: key => records.get(key) || null, setItem: (key, value) => records.set(key, value) }; };

test('guest enquiry input is bounded and never accepts a guest-supplied owner or price', () => {
  const result = validateEnquiryInput({ ...input, ownerId: 'intruder', askingPrice: 1, clientUid: 'fake' });
  assert.equal(result.customerName, 'Alex Buyer');
  assert.equal(result.email, 'alex@example.com');
  assert.equal(result.ownerId, undefined); assert.equal(result.askingPrice, undefined); assert.equal(result.clientUid, undefined);
  for (const patch of [{ email: 'bad' }, { customerName: 'X' }, { phone: 'no telephone' }, { message: 'x'.repeat(3001) }, { productId: '../car' }, { intent: 'finance' }]) assert.throws(() => validateEnquiryInput({ ...input, ...patch }));
});

test('specialist listings enforce enquiry mode and reject stale, sold, hidden and presence-only offers', () => {
  assert.equal(assertEnquiryEligible(workspace, product.id), product);
  for (const patch of [{ active: false }, { status: 'draft' }, { listingAvailability: 'sold' }, { listingAvailability: 'reserved' }, { listingType: 'physical', transactionMode: 'checkout' }]) assert.throws(() => assertEnquiryEligible({ ...workspace, products: [{ ...product, ...patch }] }, product.id));
  assert.throws(() => assertEnquiryEligible({ ...workspace, website: { profileMode: 'presence' } }, product.id));
  assert.throws(() => assertEnquiryEligible(workspace, 'missing'));
});

test('public submission atomically creates a private enquiry and its Inbox thread from server catalogue facts', async () => {
  const db = store();
  const result = await createListingEnquiry({ ...input, ownerId: 'attacker', askingPrice: '1' }, { ip: '127.0.0.2' }, db);
  const [record] = enquiries(db);
  assert.equal(result.id, record.id); assert.equal(record.ownerId, 'owner'); assert.equal(record.askingPrice, '250000'); assert.equal(record.status, 'new');
  assert.equal(record.clientUid, undefined);
  const thread = db.docs.get(`${APP}/clientThreads/${record.threadId}`);
  assert.equal(thread.enquiryId, record.id); assert.equal(thread.clientEmail, 'alex@example.com'); assert.equal(thread.unread, true);
  assert.equal(thread.ownerNotes, undefined); assert.equal(thread.clientUid, undefined);
  assert.equal(db.docs.get(`${APP}/clientThreads/${record.threadId}/messages/enquiry-${record.id}`).body, input.message);
});

test('retries create one enquiry and one thread, while changed request content is rejected', async () => {
  const db = store();
  const first = await createListingEnquiry(input, { ip: '127.0.0.2' }, db);
  const retry = await createListingEnquiry(input, { ip: '127.0.0.2' }, db);
  assert.equal(retry.id, first.id); assert.equal(retry.duplicate, true); assert.equal(enquiries(db).length, 1);
  assert.equal([...db.docs].filter(([path]) => path.includes('/securityRateLimits/')).every(([, value]) => value.count === 1), true);
  await assert.rejects(createListingEnquiry({ ...input, message: 'Changed message' }, { ip: '127.0.0.2' }, db), /request has changed/);
  db.docs.get(`${APP}/users/owner/config/settings`).website.published = false;
  await assert.rejects(createListingEnquiry(input, { ip: '127.0.0.2' }, db), /no longer published/);
});

test('limits reject excess guest submissions without any partial thread or enquiry writes', async () => {
  const db = store();
  for (let index = 0; index < 5; index += 1) await createListingEnquiry({ ...input, requestId: `request-${index}` }, { ip: '127.0.0.2' }, db);
  const count = db.docs.size;
  await assert.rejects(createListingEnquiry({ ...input, requestId: 'request-six' }, { ip: '127.0.0.2' }, db), /Too many enquiries/);
  assert.equal(db.docs.size, count); assert.equal(enquiries(db).length, 5);
  assert.deepEqual(consumeEnquiryLimit({ startedAt: 1, count: 5 }, 1001, 5, 1000), { startedAt: 1001, count: 1, expiresAt: 2001 });
});

test('private follow-up is owner isolated, revision checked and excluded from client thread data', async () => {
  const db = store();
  const { id } = await createListingEnquiry(input, { ip: '127.0.0.2' }, db);
  const record = enquiries(db)[0];
  const data = { ownerId: 'owner', id, requestId: 'save-1', expectedRevision: 0, status: 'contacted', ownerNotes: 'Call Friday morning.' };
  await assert.rejects(getListingEnquiry({ ownerId: 'owner', id }, { uid: 'other' }, db), /verified business owner/);
  await assert.rejects(getListingEnquiry({ ownerId: 'owner', id, threadId: 'wrong' }, auth, db), /not found/);
  await assert.rejects(updateListingEnquiry(data, { uid: 'other' }, db), /verified business owner/);
  const result = await updateListingEnquiry(data, auth, db);
  assert.equal(result.enquiry.revision, 1); assert.equal(result.enquiry.ownerNotes, data.ownerNotes);
  const thread = db.docs.get(`${APP}/clientThreads/${record.threadId}`);
  assert.equal(thread.enquiryStatus, 'contacted'); assert.equal(thread.ownerNotes, undefined);
  assert.equal((await updateListingEnquiry(data, auth, db)).duplicate, true);
  await assert.rejects(updateListingEnquiry({ ...data, requestId: 'save-2', status: 'closed' }, auth, db), /changed elsewhere/);
  assert.equal((await getListingEnquiry({ ownerId: 'owner', id }, auth, db)).enquiry.status, 'contacted');
});

test('device-only demo enquiries appear in Inbox, preserve replies and support private follow-up', () => {
  const storage = memoryStorage();
  const saved = saveDemoEnquiry(input, product, storage);
  assert.equal(saveDemoEnquiry(input, product, storage).id, saved.id);
  let [thread] = demoEnquiryThreads('dealer', storage);
  assert.equal(matchesInboxFilter(thread, 'enquiries'), true); assert.equal(thread.messages[0].from, 'client');
  updateDemoEnquiryThread('dealer', thread.id, { unread: false }, storage);
  sendDemoEnquiryMessage('dealer', thread.id, { body: 'Friday is available.', type: 'text' }, storage);
  updateDemoEnquiry('dealer', saved.id, { status: 'contacted', ownerNotes: 'Viewing pending', expectedRevision: 0 }, storage);
  [thread] = demoEnquiryThreads('dealer', storage);
  assert.equal(thread.unread, false); assert.equal(thread.enquiryStatus, 'contacted'); assert.equal(thread.messages.length, 2);
  assert.equal(thread.ownerNotes, undefined); assert.equal(readDemoEnquiries('dealer', storage)[0].ownerNotes, 'Viewing pending');
  assert.deepEqual(readDemoEnquiries('different-workspace', storage), []);
  assert.throws(() => updateDemoEnquiry('dealer', saved.id, { status: 'closed', expectedRevision: 0 }, storage), /changed elsewhere/);
});

test('demo persistence failures never return a successful submission', () => {
  const brokenStorage = { getItem: () => null, setItem: () => { throw new Error('Storage full'); } };
  assert.throws(() => saveDemoEnquiry(input, product, brokenStorage), /Storage full/);
  assert.throws(() => saveDemoEnquiry(input, { ...product, listingAvailability: 'sold' }, memoryStorage()), /no longer available/);
});
