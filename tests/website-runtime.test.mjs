import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { randomUUID } from 'node:crypto';
import { publishWebsite, rollbackWebsite, getPublicWebsite, publicWebsiteGateway } from '../functions/websiteRuntime.js';

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
    doc(path) { return { path, get: async () => snap(path) }; },
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
function configured(t) { const old = process.env.WEBSITE_PUBLIC_BASE_URL; process.env.WEBSITE_PUBLIC_BASE_URL = 'https://storefront.example.test'; t.after(() => { if (old === undefined) delete process.env.WEBSITE_PUBLIC_BASE_URL; else process.env.WEBSITE_PUBLIC_BASE_URL = old; }); }
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
