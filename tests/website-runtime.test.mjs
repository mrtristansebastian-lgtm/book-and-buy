import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { randomUUID, createHash } from 'node:crypto';
import { publishWebsite, rollbackWebsite, getPublicWebsite, publicWebsiteGateway, saveWebsiteDraft, getWebsiteDraft, listWebsiteDraftVersions, getWebsiteDraftVersion, createWebsitePreview, executePublicWebsiteAction, enforceWebsiteRequestLimit } from '../functions/websiteRuntime.js';

const APP = process.env.APP_ID || 'book-and-buy-v1';
const base = `artifacts/${APP}`;
const html = '<!doctype html><html><head><title>Tea shop</title></head><body><section class="custom-grid"><article data-bb-product-id="tea"><h3 data-bb-bind="product.name">Tea</h3><p data-bb-bind="product.price">R 10</p><button data-bb-action="product.open">Choose</button></article></section><script>document.body.dataset.customScript="ran"</script></body></html>';
const auth = { uid: 'website-test-owner', token: { email_verified: true, firebase: { sign_in_provider: 'password' } } };
const workspace = () => ({ ownerId: auth.uid, slug: 'website-test-shop', brandName: 'Tea shop', currency: 'R', products: [{ id: 'tea', name: 'Tea', price: 10, active: true, status: 'active', stockAvailable: 5 }], services: [], website: {}, paymentGateways: [{ gatewayType: 'cash', enabled: true }], sectionRevisions: { products: 1 }, checkout: {} });

function fakeBucket(onSave) {
  const files = new Map(); let saveCalls = 0;
  return { files, get saveCalls() { return saveCalls; }, file(path) { return {
    async save(bytes, options) {
      saveCalls++; assert.equal(options.preconditionOpts.ifGenerationMatch, 0);
      if (files.has(path)) { const error = new Error('Already exists'); error.code = 412; throw error; }
      files.set(path, Buffer.from(bytes)); await onSave?.(path);
    },
    async download() { if (!files.has(path)) throw new Error('Missing bundle'); return [Buffer.from(files.get(path))]; }
  }; } };
}
function fixture({ onSave } = {}) {
  const docs = new Map([[`${base}/users/${auth.uid}/config/settings`, workspace()], [`${base}/public/data/workspaces/website-test-shop`, { ownerId: auth.uid, published: true }]]);
  const snap = path => ({ id: path.split('/').at(-1), exists: docs.has(path), data: () => docs.has(path) ? structuredClone(docs.get(path)) : undefined });
  let queue = Promise.resolve();
  const db = {
    doc(path) { return { path, get: async () => snap(path), collection(name) { return { doc: id => db.doc(`${path}/${name}/${id}`) }; } }; },
    collection(path) { const query = { where: () => query, orderBy: () => query, limit: () => query, get: async () => ({ docs: [...docs.keys()].filter(key => key.startsWith(path + '/') && key.slice(path.length + 1).indexOf('/') < 0).map(snap) }) }; return query; },
    runTransaction(callback) {
      const task = queue.then(async () => {
        const writes = []; let wrote = false;
        const tx = { async get(ref) { assert.equal(wrote, false, 'Firestore reads precede writes'); return ref.path ? snap(ref.path) : ref.get(); }, set(ref, data) { wrote = true; writes.push([ref.path, data]); }, create(ref, data) { assert.equal(docs.has(ref.path), false); wrote = true; writes.push([ref.path, data]); } };
        const result = await callback(tx); for (const [path, row] of writes) docs.set(path, row); return result;
      }); queue = task.catch(() => {}); return task;
    }
  };
  const bucket = fakeBucket(path => onSave?.({ docs, path }));
  return { docs, db, bucket };
}
function configured(t) { const old = process.env.WEBSITE_PUBLIC_BASE_URL, oldApp = process.env.APP_PUBLIC_BASE_URL; process.env.WEBSITE_PUBLIC_BASE_URL = 'https://storefront.example.test'; process.env.APP_PUBLIC_BASE_URL = 'https://owner.example.test'; t.after(() => { if (old === undefined) delete process.env.WEBSITE_PUBLIC_BASE_URL; else process.env.WEBSITE_PUBLIC_BASE_URL = old; if (oldApp === undefined) delete process.env.APP_PUBLIC_BASE_URL; else process.env.APP_PUBLIC_BASE_URL = oldApp; }); }
const input = extra => ({ workspaceId: auth.uid, requestId: randomUUID(), expectedRevision: null, project: { html, name: 'Tea shop' }, ...extra });

test('publication replay returns one immutable revision and conflicting reuse cannot change it', async t => {
  configured(t); const f = fixture(); const request = input();
  const [first, duplicate] = await Promise.all([publishWebsite(request, auth, f), publishWebsite(request, auth, f)]);
  assert.deepEqual(first, duplicate); assert.equal(f.bucket.files.size, 1);
  const revisions = [...f.docs.keys()].filter(path => path.includes('/websiteRevisions/')); assert.equal(revisions.length, 1);
  const receipt = f.docs.get(`${base}/users/${auth.uid}/websitePublicationReceipts/${request.requestId}`);
  assert.deepEqual(receipt.result, first);
  assert.deepEqual(await publishWebsite(request, auth, f), first);
  await assert.rejects(publishWebsite({ ...request, project: { ...request.project, name: 'Changed' } }, auth, f), /already used/);
  assert.equal(f.docs.get(`${base}/users/${auth.uid}/private/website`).revision, first.revision);
});

test('publication replay wins when another retry commits after the initial receipt read', async t => {
  configured(t); const f = fixture(), request = input();
  const doc = f.db.doc.bind(f.db); let intercepted = false, committed;
  f.db.doc = path => {
    const ref = doc(path);
    if (!path.endsWith('/websitePublicationReceipts/' + request.requestId)) return ref;
    return { ...ref, async get() {
      const snapshot = await ref.get();
      if (!intercepted) { intercepted = true; committed = await publishWebsite(request, auth, f); }
      return snapshot;
    } };
  };
  assert.deepEqual(await publishWebsite(request, auth, f), committed);
  assert.equal(f.bucket.saveCalls, 1);
});

test('publication revalidates catalog and readiness transactionally after the asset upload', async t => {
  configured(t);
  const f = fixture({ onSave: ({ docs }) => { const current = docs.get(`${base}/users/${auth.uid}/config/settings`); current.products[0].price = 99; current.sectionRevisions.products++; } });
  await assert.rejects(publishWebsite(input(), auth, f), /changed during publication/);
  assert.equal(f.docs.has(`${base}/users/${auth.uid}/private/website`), false);
  const gated = fixture({ onSave: ({ docs }) => { docs.get(`${base}/users/${auth.uid}/config/settings`).checkout.taxEnabled = true; } });
  await assert.rejects(publishWebsite(input(), auth, gated), /Tax calculation/);
  assert.equal(gated.docs.has(`${base}/users/${auth.uid}/private/website`), false);
});

test('publication rejects local assets, foreign ownership and stale revisions before advancing live state', async t => {
  configured(t); const f = fixture();
  await assert.rejects(publishWebsite(input({ project: { html: html.replace('</body>', '<img src="blob:https://local.test/image"></body>') } }), auth, f), /browser-local asset/);
  await assert.rejects(publishWebsite(input({ project: { html: html.replace('</body>', '<img src="&#98;lob&colon;https://local.test/image"></body>') } }), auth, f), /browser-local asset/);
  await assert.rejects(publishWebsite(input({ project: { html: html.replace('</head>', '<style>.photo{background:url(\\62 lob:https://local.test/image)}</style></head>') } }), auth, f), /browser-local asset/);
  await assert.rejects(publishWebsite(input({ workspaceId: 'someone-else' }), auth, f), /does not belong/);
  await assert.rejects(publishWebsite(input(), null, f), /Sign in/);
  const first = await publishWebsite(input(), auth, f);
  await assert.rejects(publishWebsite(input(), auth, f), /newer website/);
  assert.equal(f.bucket.files.size, 1);
  assert.equal(f.docs.get(`${base}/users/${auth.uid}/private/website`).revision, first.revision);
});

test('public reads and rollback verify bundle integrity and rollback preserves owner/site boundaries', async t => {
  configured(t); const f = fixture(); const first = await publishWebsite(input(), auth, f);
  const second = await publishWebsite(input({ expectedRevision: first.revision, project: { html: html.replace('Tea shop</title>', 'New tea shop</title>') } }), auth, f);
  assert.equal((await getPublicWebsite({ siteId: first.siteId }, f)).revision, second.revision);
  const target = f.docs.get(`${base}/users/${auth.uid}/websiteRevisions/${first.revision}`);
  const original = Buffer.from(f.bucket.files.get(target.bundlePath));
  f.bucket.files.set(target.bundlePath, Buffer.from('{"html":"tampered"}'));
  await assert.rejects(rollbackWebsite({ revision: first.revision, expectedRevision: second.revision }, auth, f), /integrity check/);
  assert.equal(f.docs.get(`${base}/users/${auth.uid}/private/website`).revision, second.revision);
  f.bucket.files.set(target.bundlePath, original);
  await rollbackWebsite({ revision: first.revision, expectedRevision: second.revision }, auth, f);
  assert.equal((await getPublicWebsite({ siteId: first.siteId }, f)).revision, first.revision);
  f.bucket.files.set(target.bundlePath, Buffer.from('tampered'));
  await assert.rejects(getPublicWebsite({ siteId: first.siteId }, f), /integrity check/);
});

test('rollback revalidates catalog/settings after downloading a valid revision', async t => {
  configured(t); const f = fixture(); const first = await publishWebsite(input(), auth, f);
  const second = await publishWebsite(input({ expectedRevision: first.revision }), auth, f);
  const download = f.bucket.file.bind(f.bucket);
  f.bucket.file = path => { const file = download(path); return { ...file, async download() { const data = await file.download(); f.docs.get(`${base}/users/${auth.uid}/config/settings`).brandName = 'Changed while downloading'; return data; } }; };
  await assert.rejects(rollbackWebsite({ revision: first.revision, expectedRevision: second.revision }, auth, f), /changed during rollback/);
  assert.equal(f.docs.get(`${base}/users/${auth.uid}/private/website`).revision, second.revision);
});

test('dedicated website gateway rejects opaque/cross-origin mutation requests before commerce runs', async t => {
  configured(t);
  for (const origin of ['null', 'https://foreign.example.test', undefined]) {
    const req = { method: 'POST', get: () => origin, is: () => true, body: { siteId: 'anything', action: 'checkout.create', payload: {} } };
    let code, response; const res = { set() {}, status(value) { code = value; return this; }, json(value) { response = value; return this; } };
    await publicWebsiteGateway(req, res); assert.ok([400,403].includes(code)); assert.match(response.error, /published website|Invalid website request/);
  }
});

test('published custom websites send specialist enquiries into the existing Inbox with trusted scope and request IP', async t => {
  configured(t); const f = fixture();
  const ws = f.docs.get(`${base}/users/${auth.uid}/config/settings`);
  ws.products = [{ id: 'car', name: '2024 Toyota Corolla', listingType: 'vehicle', transactionMode: 'enquiry', price: 250000, active: true, listingAvailability: 'available' }];
  f.docs.set(`${base}/public/data/websites/enquiry-site`, { siteId: 'enquiry-site', revision: 'live-revision', contractVersion: 1, ownerId: auth.uid, slug: ws.slug });
  const payload = { productId: 'car', requestId: 'website-enquiry-request', customerName: 'Buyer', email: 'buyer@example.test', phone: '', message: 'Can I view it?', intent: 'viewing', countryCode: 'ZA' };
  let response, status = 200;
  const req = { method: 'POST', ip: '192.0.2.15', get: () => 'https://storefront.example.test', is: () => true, body: { siteId: 'enquiry-site', action: 'enquiry.create', payload } };
  const res = { set() {}, status(value) { status = value; return this; }, json(value) { response = value; return this; } };
  await publicWebsiteGateway(req, res, f);
  assert.equal(status, 200); assert.equal(response.ok, true);
  const enquiry = f.docs.get(`${base}/users/${auth.uid}/listingEnquiries/${response.id}`);
  assert.equal(enquiry.productId, 'car'); assert.equal(enquiry.ownerId, auth.uid); assert.equal(enquiry.askingPrice, '250000');
  assert.equal(f.docs.get(`${base}/clientThreads/${enquiry.threadId}`).enquiryId, enquiry.id);
  assert.equal(f.docs.get(`${base}/clientThreads/${enquiry.threadId}/messages/enquiry-${enquiry.id}`).from, 'client');
  const ipHash = createHash('sha256').update('ip:192.0.2.15').digest('hex');
  assert.equal(f.docs.get(`${base}/securityRateLimits/listing-${ipHash}`).count, 1);
  assert.deepEqual(await executePublicWebsiteAction({ siteId: 'enquiry-site', action: 'enquiry.create', payload }, { ...f, ip: req.ip }), { ok: true, id: response.id, duplicate: true });
  await assert.rejects(executePublicWebsiteAction({ siteId: 'enquiry-site', action: 'enquiry.create', payload: { ...payload, ownerId: 'another-owner' } }, f), /cannot choose a business/);
  await assert.rejects(executePublicWebsiteAction({ siteId: 'enquiry-site', action: 'enquiry.create', payload: { ...payload, askingPrice: '1' } }, f), /Unsupported listing enquiry field/);
  ws.website.profileMode = 'presence';
  await assert.rejects(executePublicWebsiteAction({ siteId: 'enquiry-site', action: 'enquiry.create', payload: { ...payload, requestId: 'another-request' } }, f), /profile and contact details only/);
  const token = 'p'.repeat(32);
  f.docs.set(`${base}/publicWebsitePreviews/${createHash('sha256').update(token).digest('hex')}`, { siteId: 'enquiry-site', revision: 'live-revision', contractVersion: 1, ownerId: auth.uid, slug: ws.slug, preview: true, expiresAt: Date.now() + 60000 });
  await assert.rejects(executePublicWebsiteAction({ previewToken: token, action: 'enquiry.create', payload }, f), /read-only/);
  assert.equal([...f.docs.keys()].filter(path => path.includes('/listingEnquiries/')).length, 1);
});

test('live catalog patches keep custom DOM/layouts and restore only visibility changed by runtime', () => {
  class Node {
    constructor(attrs = {}, children = []) { this.attrs = { ...attrs }; this.children = children; this.dataset = {}; this.hidden = false; this.textContent = ''; this.tagName = 'DIV'; this.style = { transform: 'rotate(2deg)' }; this.className = 'custom-designer-card'; }
    getAttribute(key) { return this.attrs[key] ?? null; } hasAttribute(key) { return Object.hasOwn(this.attrs,key); } setAttribute(key,value) { this.attrs[key]=value; } removeAttribute(key) { delete this.attrs[key]; }
    querySelectorAll(selector) { return selector === '[data-bb-bind]' ? this.children.filter(row => row.hasAttribute('data-bb-bind')) : []; }
    cloneNode() { return new Node(this.attrs,this.children.map(row => row.cloneNode())); }
  }
  const name = new Node({ 'data-bb-bind': 'product.name' }), price = new Node({ 'data-bb-bind': 'product.price' }), card = new Node({ 'data-bb-product-id': 'tea' }, [name,price]);
  const originalChildren = card.children, originalStyle = card.style; const listeners = {}; const parent = { postMessage() {} }; const port = { start() {} };
  const window = { addEventListener(type,listener) { listeners[type]=listener; }, dispatchEvent() {} };
  let sections = [], cards = [card];
  const document = { addEventListener() {}, querySelectorAll(selector) { return selector === '[data-bb-product-id]' ? cards : selector === '[data-bb-catalog="products"]' ? sections : []; } };
  runInNewContext(readFileSync(new URL('../public/storefront/runtime-sdk.js',import.meta.url),'utf8'), { window,document,parent,CustomEvent: class { constructor(type,init) { this.type=type;this.detail=init.detail; } },setTimeout,clearTimeout });
  window.BookBuyRuntimeInstaller();
  listeners.message({ source: {}, data: { type: 'bookbuy-runtime-connect' }, ports: [port] }); assert.equal(port.onmessage,undefined);
  listeners.message({ source: parent, data: { type: 'bookbuy-runtime-connect' }, ports: [port] });
  const update = products => port.onmessage({ data: { type: 'catalog-update', catalog: { products,services:[],currency:'R' } } });
  update([{ id:'tea',name:'New tea',price:'R 12.50' }]); assert.equal(name.textContent,'New tea'); assert.equal(price.textContent,'R 12.50');
  assert.equal(card.children,originalChildren); assert.equal(card.style,originalStyle); assert.equal(card.className,'custom-designer-card');
  update([]); assert.equal(card.hidden,true); update([{id:'tea',name:'Tea',price:10}]); assert.equal(card.hidden,false);
  card.hidden=true; update([]); update([{id:'tea',name:'Tea',price:10}]); assert.equal(card.hidden,true,'Designer-owned hidden state survives catalog updates');
  const grid = { append(node) { cards.push(node); } };
  const template = { parentElement:grid,content:{ firstElementChild:new Node({'data-bb-product-id':''},[new Node({'data-bb-bind':'product.name'}),new Node({'data-bb-bind':'product.price'})]) } };
  const section = { querySelector(selector) { return selector === 'template[data-bb-template]' ? template : grid; },querySelectorAll() { return cards; } };
  sections = [section];
  update([{id:'tea',name:'Tea',price:10},{id:'coffee',name:'Coffee',price:20}]);
  assert.equal(cards.length,2); assert.equal(cards[0],card); assert.equal(cards[1].getAttribute('data-bb-product-id'),'coffee'); assert.equal(cards[1].children[0].textContent,'Coffee');
  const customCoffee = cards[1];
  update([{id:'tea',name:'Tea',price:10},{id:'coffee',name:'Fresh coffee',price:22}]);
  assert.equal(cards.length,2); assert.equal(cards[1],customCoffee); assert.equal(cards[1].children[0].textContent,'Fresh coffee');
});

test('dedicated hosting permits generated inline scripts while retaining an opaque sandbox and blocked form submits', () => {
  const config = JSON.parse(readFileSync(new URL('../firebase.json',import.meta.url),'utf8'));
  const storefront = config.hosting.find(row => row.target === 'storefront');
  const policy = storefront.headers[0].headers.find(row => row.key === 'Content-Security-Policy').value;
  assert.match(policy,/script-src[^;]*'unsafe-inline'/); assert.match(policy,/connect-src 'self'/); assert.match(policy,/form-action 'none'/);
  const shell = readFileSync(new URL('../public/storefront/index.html',import.meta.url),'utf8'); assert.match(shell,/sandbox="allow-scripts"/); assert.doesNotMatch(shell,/allow-same-origin/);
});

const emulatorEnabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const draftInput = extra => ({ workspaceId: auth.uid, requestId: randomUUID(), expectedRevision: 0, project: { id: 'tea-design', html, name: 'Tea shop', files: { 'index.html': html }, assets: { 'logo.png': { previewUrl: 'data:image/png;base64,aGVsbG8=', mime: 'image/png', size: 5 } } }, ...extra });
test('cloud drafts preserve source files/assets, replay interrupted saves and reject competing device revisions', async () => {
  const f = fixture(), request = draftInput();
  const [saved, duplicate] = await Promise.all([saveWebsiteDraft(request, auth, f), saveWebsiteDraft(request, auth, f)]);
  assert.deepEqual(saved, duplicate); assert.equal(saved.revision, 1); assert.equal(f.bucket.files.size, 1);
  const loaded = await getWebsiteDraft({ workspaceId: auth.uid }, auth, f);
  assert.equal(loaded.project.files['index.html'], html); assert.equal(loaded.project.assets['logo.png'].url, 'data:image/png;base64,aGVsbG8=');
  assert.deepEqual(f.docs.get(`${base}/users/${auth.uid}/websiteDraftReceipts/${request.requestId}`).result, saved);
  await assert.rejects(saveWebsiteDraft(draftInput(), auth, f), /cloud draft changed/);
  await assert.rejects(saveWebsiteDraft({ ...request, project: { ...request.project, name: 'Different' } }, auth, f), /already used/);
  const next = await saveWebsiteDraft(draftInput({ expectedRevision: 1, project: { ...request.project, html: html.replace('Tea shop</title>', 'Better tea</title>') } }), auth, f);
  assert.equal(next.revision, 2); assert.equal((await listWebsiteDraftVersions({ projectId: request.project.id }, auth, f)).length, 2);
  const previous = await getWebsiteDraftVersion({ projectId: request.project.id, versionId: saved.versionId }, auth, f);
  assert.equal(previous.project.html, html); assert.equal((await getWebsiteDraft({}, auth, f)).revision, 2);
  await assert.rejects(getWebsiteDraftVersion({ projectId: 'other-project', versionId: saved.versionId }, auth, f), /unavailable/);
  await assert.rejects(getWebsiteDraft({ workspaceId: 'foreign' }, auth, f), /does not belong/);
  await assert.rejects(saveWebsiteDraft(request, null, f), /Sign in/);
});

test('incomplete draft connections remain editable while invalid paths/local asset references cannot sync', async () => {
  const f = fixture(); const invalidHtml = html.replace('data-bb-product-id="tea"', 'data-bb-product-id="missing"');
  const request = draftInput({ project: { id: 'incomplete', html: invalidHtml } });
  const saved = await saveWebsiteDraft(request, auth, f); assert.match(saved.issues[0].message, /active Book/);
  assert.equal((await getWebsiteDraft({ projectId: 'incomplete' }, auth, f)).project.html, invalidHtml);
  await assert.rejects(saveWebsiteDraft(draftInput({ project: { id: 'bad-path', html, files: { '../private.txt': 'sensitive' } } }), auth, f), /invalid source/);
  await assert.rejects(saveWebsiteDraft(draftInput({ project: { id: 'local-image', html, assets: { 'picture.png': { url: 'blob:https://app.test/image' } } } }), auth, f), /durable/);
});

test('shared previews never replace live publication and cannot mutate commerce even through the public API', async t => {
  configured(t); const f = fixture();
  const live = await publishWebsite(input(), auth, f);
  const request = input({ project: { html: html.replace('Tea shop</title>', 'Preview tea</title>'), name: 'Preview' } });
  const preview = await createWebsitePreview(request, auth, f); assert.deepEqual(await createWebsitePreview(request, auth, f), preview);
  const previewToken = new URL(preview.url).searchParams.get('preview');
  const read = await getPublicWebsite({ previewToken }, f); assert.equal(read.preview, true); assert.match(read.html, /Preview tea/);
  assert.equal((await getPublicWebsite({ siteId: live.siteId }, f)).revision, live.revision);
  for (const action of ['checkout.create', 'booking.create', 'payment.start', 'payment.confirm', 'checkout.status']) await assert.rejects(executePublicWebsiteAction({ previewToken, action, payload: {} }, f), /read-only/);
  const pointer = [...f.docs.entries()].find(([path]) => path.includes('/publicWebsitePreviews/'))[1]; pointer.expiresAt = Date.now() - 1;
  await assert.rejects(getPublicWebsite({ previewToken }, f), /expired/);
});

test('public checkout status requires the original checkout capability and exposes no customer/private fields', async t => {
  configured(t); const f = fixture(); const live = await publishWebsite(input(), auth, f);
  const order = { id: 'order-confirmation', status: 'accepted', paymentStatus: 'paid', amountInCents: 1000, currency: 'R', clientEmail: 'private@example.com', costBasisInCents: 400 };
  f.docs.get(`${base}/users/${auth.uid}/config/settings`).orders = [order];
  f.docs.set(`${base}/users/${auth.uid}/websiteCheckoutCapabilities/order-${order.id}`, { sourceType: 'order', sourceId: order.id, token: 'private-receipt' });
  const payload = { sourceType: 'order', sourceId: order.id, statusToken: 'private-receipt' };
  const response = await executePublicWebsiteAction({ siteId: live.siteId, action: 'checkout.status', payload }, f);
  assert.equal(response.paymentStatus, 'paid'); assert.equal(response.clientEmail, undefined); assert.equal(response.costBasisInCents, undefined);
  await assert.rejects(executePublicWebsiteAction({ siteId: live.siteId, action: 'checkout.status', payload: { ...payload, statusToken: 'guessed' } }, f), /does not match/);
});

test('rollback retries recover completed state while competing later publication is protected', async t => {
  configured(t); const f = fixture(); const first = await publishWebsite(input(), auth, f); const second = await publishWebsite(input({ expectedRevision: first.revision }), auth, f);
  const request = { revision: first.revision, expectedRevision: second.revision, requestId: randomUUID() };
  const restored = await rollbackWebsite(request, auth, f); assert.deepEqual(await rollbackWebsite(request, auth, f), restored);
  const third = await publishWebsite(input({ expectedRevision: first.revision }), auth, f);
  assert.deepEqual(await rollbackWebsite(request, auth, f), restored); assert.equal((await getPublicWebsite({ siteId: third.siteId }, f)).revision, third.revision);
  await assert.rejects(rollbackWebsite({ revision: first.revision }, auth, f), /current website revision/);
});

test('website rate bounds reject overload and reset without persisting raw IP addresses', async () => {
  const f = fixture(), now = 120000;
  for (let count = 0; count < 120; count++) await enforceWebsiteRequestLimit('203.0.113.1', f.db, now);
  await assert.rejects(enforceWebsiteRequestLimit('203.0.113.1', f.db, now), /Too many/);
  await enforceWebsiteRequestLimit('203.0.113.1', f.db, now + 60000);
  assert.equal([...f.docs.keys()].some(path => path.includes('203.0.113.1')), false);
});
test('publishing fails closed when dedicated host isolation is missing or points to the owner app', async t => {
  configured(t); const f = fixture(); delete process.env.APP_PUBLIC_BASE_URL;
  await assert.rejects(publishWebsite(input(), auth, f), /owner app HTTPS origin/);
  process.env.APP_PUBLIC_BASE_URL = process.env.WEBSITE_PUBLIC_BASE_URL;
  await assert.rejects(publishWebsite(input(), auth, f), /separate origin/);
  assert.equal(f.bucket.files.size, 0);
});
test('verified custom domains resolve the owner live pointer and cannot select a foreign site or stale route', async t => {
  configured(t); const f = fixture(), live = await publishWebsite(input(), auth, f), domain = 'shop.publicbrand.co.za';
  const key = createHash('sha256').update(domain).digest('hex');
  f.docs.set(`customDomainRoutes/${key}`, { appId: APP, domain, ownerId: auth.uid, slug: 'website-test-shop', active: true });
  f.docs.set(`${base}/users/${auth.uid}/private/customDomain`, { domain, status: 'connected' });
  assert.equal((await getPublicWebsite({ domain }, f)).siteId, live.siteId);
  await assert.rejects(getPublicWebsite({ domain, siteId: 'foreign-site' }, f), /different website/);
  f.docs.get(`${base}/users/${auth.uid}/private/customDomain`).status = 'provisioning';
  await assert.rejects(getPublicWebsite({ domain }, f), /not connected/);
});

test('emulator: drafts and preview transactions preserve recovery and owner isolation', { skip: !emulatorEnabled }, async t => {
  configured(t); const require = createRequire(new URL('../functions/package.json', import.meta.url));
  const { getApps, initializeApp } = require('firebase-admin/app'); const { getFirestore } = require('firebase-admin/firestore');
  if (!getApps().length) initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-book-buy' });
  const db = getFirestore(), uid = 'draft-' + randomUUID(), owner = { ...auth, uid }, deps = { db, bucket: fakeBucket() };
  await db.doc(`${base}/users/${uid}/config/settings`).set({ ...workspace(), ownerId: uid, slug: uid });
  await db.doc(`${base}/public/data/workspaces/${uid}`).set({ ownerId: uid, published: true });
  const request = draftInput({ workspaceId: uid }); const [first, retry] = await Promise.all([saveWebsiteDraft(request, owner, deps), saveWebsiteDraft(request, owner, deps)]); assert.deepEqual(first, retry);
  await assert.rejects(saveWebsiteDraft({ ...request, requestId: randomUUID() }, owner, deps), /cloud draft changed/);
  assert.equal((await getWebsiteDraft({ workspaceId: uid }, owner, deps)).revision, 1);
  await assert.rejects(getWebsiteDraft({ workspaceId: uid }, { ...owner, uid: uid + '-intruder' }, deps), /does not belong/);
  const preview = await createWebsitePreview(input({ workspaceId: uid }), owner, deps); const previewToken = new URL(preview.url).searchParams.get('preview');
  await assert.rejects(executePublicWebsiteAction({ previewToken, action: 'booking.create', payload: {} }, deps), /read-only/);
});
test('emulator: concurrent publication, immutable revisions and rollback use real Firestore transactions', { skip: !emulatorEnabled }, async t => {
  configured(t); const require = createRequire(new URL('../functions/package.json',import.meta.url));
  const { getApps,initializeApp } = require('firebase-admin/app'); const { getFirestore } = require('firebase-admin/firestore');
  if (!getApps().length) initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-book-buy' });
  const db = getFirestore(); const uid = 'website-' + randomUUID(); const slug = uid; const owner = { ...auth,uid }; const bucket = fakeBucket(); const deps={db,bucket};
  await db.doc(`${base}/users/${uid}/config/settings`).set({ ...workspace(),ownerId:uid,slug });
  await db.doc(`${base}/public/data/workspaces/${slug}`).set({ownerId:uid,published:true});
  const request=input({workspaceId:uid}); const results=await Promise.all([publishWebsite(request,owner,deps),publishWebsite(request,owner,deps)]); assert.deepEqual(results[0],results[1]);
  const next=await publishWebsite(input({workspaceId:uid,expectedRevision:results[0].revision}),owner,deps);
  await rollbackWebsite({workspaceId:uid,revision:results[0].revision,expectedRevision:next.revision},owner,deps);
  assert.equal((await getPublicWebsite({siteId:next.siteId},deps)).revision,results[0].revision);
  assert.equal((await db.collection(`${base}/users/${uid}/websiteRevisions`).get()).size,2);
});
