import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const cache = new Map();
function load(path) {
  const file = new URL(path, import.meta.url);
  if (cache.has(file.href)) return cache.get(file.href);
  const module = { exports: {} };
  cache.set(file.href, module.exports);
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  new Function('module', 'exports', 'require', code)(module, module.exports, id => {
    if (!id.startsWith('.')) return require(id);
    const base = new URL(id, file);
    return load([base, new URL(`${base.href}.js`)].find(existsSync).href);
  });
  return module.exports;
}

const { createDemoWorkspace, hydrateDemoWorkspace } = load('../src/data/demoWorkspace.js');
const { DEMO_SCENARIO_SCHEMA, upgradeDemoScenario } = load('../src/data/demoScenario.js');
const { removeRetiredDemoEvents } = load('../src/data/demoScenario.js');
const { createBlankWorkspace } = load('../src/data/blankWorkspace.js');
const { buildFinanceLedger } = load('../src/features/finance/utils/financeLedger.js');
const now = Date.parse('2026-10-11T12:00:00Z');

const { groupsForExploreMode, categoriesInGroup } = load('../src/config/businessCategories.js');
const { isFoodPresenceCategory } = load('../functions/businessCapabilities.js');
const { validateListing, getListingType } = load('../functions/listingTypes.js');
const { createShowcaseAnalytics } = load('../src/data/demoShowcaseActivity.js');
const { syncShowcaseEnquiries } = load('../src/features/showcase/showcasePersistence.js');

function assertFreshDemo(demo) {
  assert.equal(demo.isDemo, true);
  assert.equal(demo.demoScenarioSchema, 7);
  assert.equal(demo.brandName, 'Book & Buy Showcase');
  assert.equal(demo.products.length, 121);
  assert.equal(demo.services.length, 35);
  assert.equal(demo.services.filter(service => service.scheduleType === 'appointment').length, 23);
  assert.equal(demo.services.filter(service => service.scheduleType === 'class_session').length, 12);
  assert.ok(demo.services.every(service => !service.catalogTemplateId.endsWith('_event')));
  assert.equal(demo.staff.length, 25);
  assert.equal(demo.clients.length, 24);
  assert.equal(demo.orders.length, 24);
  assert.equal(demo.bookings.length, 37);
  assert.equal(demo.threads.length, 12);
  assert.equal(demo.listingEnquiries.length, 1);
  assert.equal(buildFinanceLedger(demo).length, 61);
  assert.equal(demo.products.some(product => getListingType(product) === 'equipment'), false);
  for (const product of demo.products) assert.equal(validateListing(product), '', product.id);
  const supported = groupsForExploreMode('buy').flatMap(group => categoriesInGroup(group.id)).filter(category => !isFoodPresenceCategory(category.id));
  for (const category of supported) assert.ok(demo.products.some(product => product.exploreSubcategoryId === category.id), category.id);
}

test('fresh showcase covers supported retail categories and linked activity without machinery', () => {
  assert.equal(DEMO_SCENARIO_SCHEMA, 7);
  const demo = createDemoWorkspace(now);
  assertFreshDemo(demo);
  assert.strictEqual(hydrateDemoWorkspace(demo), demo);
  assert.deepEqual(createDemoWorkspace(now), demo, 'One generation clock makes fixtures deterministic');
  const another = createDemoWorkspace(now);
  demo.products[0].name = 'Changed';
  assert.notEqual(another.products[0].name, 'Changed');
});

test('real owner data is isolated from demo migration and catalogue withdrawal', () => {
  const owner = { ...createBlankWorkspace(), isDemo: false, demoScenarioSchema: 6,
    products: [{ id: 'real-product', exploreSubcategoryId: 'equipment_construction' }],
    orders: [{ id: 'real-order', amountInCents: 12000 }] };
  const before = structuredClone(owner);
  assert.strictEqual(hydrateDemoWorkspace(owner), owner);
  assert.strictEqual(upgradeDemoScenario(owner, createDemoWorkspace(now)), owner);
  assert.deepEqual(owner, before);
  const unmarked = { ...owner };
  delete unmarked.isDemo;
  assert.strictEqual(hydrateDemoWorkspace(unmarked), unmarked);
});

test('event withdrawal preserves demo edits and receipt snapshots without touching owner data', () => {
  const fresh = createDemoWorkspace(now);
  const event = { id: 'showcase-service-martial_arts-event', name: 'Retired demo event', catalogTemplateId: 'service_category_martial_arts_event', scheduleType: 'class_session' };
  const linked = fresh.bookings.find(booking => booking.serviceId === 'showcase-service-martial_arts-spot');
  const before = { ...fresh, demoServiceFormatsSchema: undefined, website: { ...fresh.website, aboutBody: 'My story', bookSubtext: 'Explore 23 Slots, 12 Spots and 16 Events. Each example explains its specs, timing and booking flow.' },
    services: [...fresh.services.map(service => service.id === 'showcase-service-beauty_hair-slot' ? { ...service, name: 'My haircut' } : service), event],
    bookings: fresh.bookings.map(booking => booking.id === linked.id ? { ...booking, serviceId: event.id, amountInCents: 12345, amountPaidInCents: 12345 } : booking),
    threads: [...fresh.threads, { id: 'retired-thread', serviceId: event.id }] };
  const unchanged = structuredClone(before);
  const next = removeRetiredDemoEvents(before, fresh);
  assert.equal(next.services.length, 35);
  assert.equal(next.services.find(service => service.id === 'showcase-service-beauty_hair-slot').name, 'My haircut');
  assert.equal(next.website.aboutBody, 'My story'); assert.match(next.website.bookSubtext, /23 Slots and 12 Spots/);
  assert.equal(next.threads.some(thread => thread.id === 'retired-thread'), false);
  const receipt = next.bookings.find(booking => booking.id === linked.id);
  assert.equal(receipt.serviceId, linked.serviceId); assert.equal(receipt.amountPaidInCents, 12345);
  assert.equal(receipt.amountInCents, 12345); assert.equal(buildFinanceLedger(next).length, 61);
  assert.strictEqual(removeRetiredDemoEvents(next, fresh), next);
  assert.deepEqual(before, unchanged);
  const owner = { ...before, isDemo: false };
  assert.strictEqual(removeRetiredDemoEvents(owner, fresh), owner);
});

test('obsolete demo schemas migrate once, including schema six', () => {
  for (const revision of [undefined, 1, 2, 3, 4, 5, 6]) {
    const stored = { isDemo: true, demoScenarioSchema: revision, products: [{ id: 'old' }],
      threads: [{ id: 'old-thread' }], brandName: 'Previous sample' };
    const before = structuredClone(stored);
    const upgraded = hydrateDemoWorkspace(stored);
    assertFreshDemo(upgraded);
    assert.strictEqual(hydrateDemoWorkspace(upgraded), upgraded);
    assert.deepEqual(stored, before);
  }
});

test('current showcase edits and deliberate deletions survive refresh', () => {
  const current = createDemoWorkspace(now);
  const edited = { ...current, brandName: 'My edits', products: [{ id: 'custom', name: 'My product' }],
    services: [], staff: [], clients: [], orders: [], bookings: [], threads: [] };
  assert.strictEqual(hydrateDemoWorkspace(edited), edited);
  assert.strictEqual(upgradeDemoScenario(edited, current), edited);
  for (const cached of [null, undefined]) assertFreshDemo(hydrateDemoWorkspace(cached));
});

test('cached machinery examples and enquiries are withdrawn while retail edits survive', () => {
  const current = createDemoWorkspace(now);
  const tool = current.products.find(product => product.exploreSubcategoryId === 'equipment_tools');
  const oldTool = { ...tool, listingType: 'equipment', transactionMode: 'enquiry', category: 'Equipment & machinery' };
  const retired = { id: 'showcase-product-equipment_construction', exploreSubcategoryId: 'equipment_construction' };
  const edited = { ...current, demoCatalogRevision: undefined,
    products: [{ id: 'my-item', name: 'Keep this edit', category: 'Custom' }, oldTool, retired],
    listingEnquiries: [...current.listingEnquiries, { id: 'retired-enquiry', productId: retired.id }],
    threads: [...current.threads, { id: 'retired-thread', productId: retired.id }] };
  const before = structuredClone(edited);
  const hydrated = hydrateDemoWorkspace(edited);
  assert.equal(hydrated.products.some(product => product.id === retired.id), false);
  assert.equal(hydrated.products.find(product => product.id === tool.id).listingType, 'physical');
  assert.equal(hydrated.products.find(product => product.id === tool.id).transactionMode, 'checkout');
  assert.equal(hydrated.products.find(product => product.id === 'my-item').name, 'Keep this edit');
  assert.equal(hydrated.listingEnquiries.some(record => record.productId === retired.id), false);
  assert.equal(hydrated.threads.some(record => record.productId === retired.id), false);
  assert.strictEqual(hydrateDemoWorkspace(hydrated), hydrated);
  assert.deepEqual(edited, before);
  const storage = new Map();
  const adapter = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) };
  syncShowcaseEnquiries(edited, { storage: adapter });
  syncShowcaseEnquiries(hydrated, { storage: adapter });
  assert.equal(JSON.parse(storage.get('bb.demo.listing-enquiries.v1:example')).some(record => record.productId === retired.id), false);
});

test('sample traffic is explicit, deterministic and unavailable to owner accounts', () => {
  const demo = createDemoWorkspace(now);
  const sample = createShowcaseAnalytics(demo, now);
  assert.equal(sample.sessions.length, 600);
  assert.equal(new Set(sample.sessions.map(session => session.visitorId)).size, 320);
  assert.deepEqual(createShowcaseAnalytics(demo, now), sample);
  for (const key of ['sessions', 'events', 'carts']) assert.deepEqual(createShowcaseAnalytics({ ...demo, isDemo: false }, now)[key], []);
});

test('retail expansion adds new examples once without resurrecting deleted entries or rewriting receipts', () => {
  const fresh = createDemoWorkspace(now);
  const previous = { ...fresh, demoRetailSchema: undefined,
    products: fresh.products.filter(product => !['showcase-product-appliances_kitchen', 'showcase-product-fashion_mens'].includes(product.id)),
    website: { ...fresh.website, aboutBody: 'Keep my story' } };
  previous.products[0] = { ...previous.products[0], price: 777, category: 'My collection' };
  const before = structuredClone(previous);
  const upgraded = hydrateDemoWorkspace(previous);
  assert.equal(upgraded.demoRetailSchema, 1);
  assert.ok(upgraded.products.some(product => product.id === 'showcase-product-appliances_kitchen'));
  assert.equal(upgraded.products.some(product => product.id === 'showcase-product-fashion_mens'), false);
  assert.equal(upgraded.products[0].price, 777);
  assert.equal(upgraded.products[0].category, 'My collection');
  assert.equal(upgraded.website.aboutBody, 'Keep my story');
  assert.deepEqual(upgraded.orders, previous.orders);
  assert.deepEqual(upgraded.bookings, previous.bookings);
  assert.deepEqual(previous, before);
  assert.strictEqual(hydrateDemoWorkspace(upgraded), upgraded);
  const deleted = { ...upgraded, products: upgraded.products.filter(product => product.id !== 'showcase-product-appliances_kitchen') };
  assert.strictEqual(hydrateDemoWorkspace(deleted), deleted);
});
