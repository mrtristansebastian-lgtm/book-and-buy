import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import ts from 'typescript';
import { priceMarketOrder } from '../functions/marketOrders.js';

const require = createRequire(import.meta.url);
function loader(overrides = {}) {
  const modules = new Map();
  const load = (path) => {
    const file = new URL(path, import.meta.url);
    if (modules.has(file.href)) return modules.get(file.href);
    const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX
    } });
    const module = { exports: {} };
    modules.set(file.href, module.exports);
    const scopedRequire = (id) => {
      if (id in overrides) return overrides[id];
      if (!id.startsWith('.')) return require(id);
      const base = new URL(id, file);
      const target = [base, ...['.js', '.jsx', '.ts'].map((extension) => new URL(`${base.href}${extension}`))].find(existsSync);
      if (!target) throw new Error(`Cannot resolve ${id}`);
      return load(target.href);
    };
    new Function('module', 'exports', 'require', outputText)(module, module.exports, scopedRequire);
    return module.exports;
  };
  return load;
}

const load = loader();
const { normalizeProduct, normalizeProductVariant, buildVariantMatrix, buildInventoryUpdates,
  applyProductInventoryUpdates } = load('../src/utils/products.js');
const { buildPublicWorkspaceSnapshot } = load('../src/shared/firebase/publicSnapshot.ts');
const apiLoader = loader({
  '../../data/demoWorkspace': {}, '../../data/blankWorkspace': {}, '../../utils/services': {},
  '../../utils/orders': {}, '../../shared/firebase/ownerWorkspace': {}, '../../shared/firebase/callables': {},
  '../../utils/staffAccess': {}, '../../utils/staffAvailability': {}, './workspacePersistence': {},
  './demoFinancialSnapshots': {}
});
const { createWorkspaceApi } = apiLoader('../src/features/workspace/createWorkspaceApi.js');

const products = () => [{ id: 'shirt', name: 'Shirt', price: 250, status: 'active', cost: 100,
  sku: 'SHIRT', stockAvailable: 30, lowStockThreshold: 5, category: 'Clothes',
  customCatalogField: { keep: true }, options: [{ name: 'Size', values: ['Small', 'Large'] }],
  variants: [
    { id: 'small', title: 'Small', optionValues: { Size: 'Small' }, price: 250, sku: 'SHIRT-S', stockAvailable: 4, cost: 110 },
    { id: 'large', title: 'Large', optionValues: { Size: 'Large' }, price: 275, sku: 'SHIRT-L', stockAvailable: 20, lowStockThreshold: 8 }
  ] }, { id: 'mug', name: 'Mug', stockAvailable: 12, sku: 'MUG', price: 75, active: true }];

test('product warning defaults and variant overrides survive normalization and matrix refresh', () => {
  assert.equal(normalizeProduct({ name: 'Mug' }).lowStockThreshold, 3);
  for (const [input, expected] of [[0, 0], ['0', 0], [' 8 ', 8], [9000000, 9000000]]) {
    assert.equal(normalizeProduct({ name: 'Mug', lowStockThreshold: input }).lowStockThreshold, expected);
    assert.equal(normalizeProductVariant({ lowStockThreshold: input }).lowStockThreshold, expected);
  }
  for (const invalid of [undefined, null, '', ' ', -1, 1.5, '1.5', '3 items', NaN, Infinity, false, true, {}, [], Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(normalizeProduct({ name: 'Mug', lowStockThreshold: invalid }).lowStockThreshold, 3);
    assert.equal(normalizeProductVariant({ lowStockThreshold: invalid }).lowStockThreshold, '');
  }
  const saved = normalizeProduct(products()[0]);
  assert.equal(saved.variants[0].lowStockThreshold, '');
  assert.equal(saved.variants[1].lowStockThreshold, 8);
  const refreshed = buildVariantMatrix([{ name: 'Size', values: ['Small', 'Large', 'Medium'] }], saved.variants);
  assert.equal(refreshed[1].lowStockThreshold, 8);
  assert.equal(refreshed[2].lowStockThreshold, '', 'New variants inherit a future product threshold change');
});

test('editing sends only changed inventory fields, with an expected quantity for conflict checking', () => {
  const original = products()[0];
  const draft = { ...original, name: 'Ignored catalog rename', lowStockThreshold: '5',
    variants: original.variants.map((variant) => variant.id === 'small'
      ? { ...variant, stockAvailable: '9', cost: '110', sku: 'NEW-SKU' } : { ...variant }) };
  const updates = buildInventoryUpdates(draft, original);
  assert.deepEqual(updates, [{ productId: 'shirt', variantId: 'small',
    patch: { sku: 'NEW-SKU', stockAvailable: '9' }, expectedStockAvailable: 4 }]);
  assert.deepEqual(buildInventoryUpdates(original, original), []);
  assert.equal(original.variants[0].stockAvailable, 4);
});

test('numeric-looking SKUs and stock labels retain significant text while quantities compare numerically', () => {
  const original = { id: 'numeric-sku', sku: '001', stockLabel: '007', stockAvailable: '003', cost: '02.50',
    variants: [{ id: 'variant', sku: '0004', stockAvailable: '005' }] };
  const draft = { ...original, sku: '1', stockLabel: '7', stockAvailable: 3, cost: 2.5,
    variants: [{ ...original.variants[0], sku: '4', stockAvailable: 5 }] };
  const updates = buildInventoryUpdates(draft, original);
  assert.deepEqual(updates, [
    { productId: 'numeric-sku', variantId: null, patch: { sku: '1', stockLabel: '7' } },
    { productId: 'numeric-sku', variantId: 'variant', patch: { sku: '4' } }
  ]);
  assert.deepEqual(buildInventoryUpdates({ ...original, sku: ' 001 ', stockLabel: ' 007 ' }, original), []);
  const result = applyProductInventoryUpdates([original], updates);
  assert.equal(result.ok, true);
  assert.equal(result.products[0].sku, '1');
  assert.equal(result.products[0].stockLabel, '7');
  assert.equal(result.products[0].variants[0].sku, '4');
  const quantityResult = applyProductInventoryUpdates(result.products, [
    { productId: 'numeric-sku', variantId: 'variant', expectedStockAvailable: 5, patch: { stockAvailable: 6 } }
  ]);
  assert.equal(quantityResult.ok, true, 'Expected quantity compares numerically despite legacy leading zeros');
  assert.equal(quantityResult.products[0].variants[0].stockAvailable, 6);
});

test('an atomic inventory batch preserves catalog fields and untouched products and variants', () => {
  const original = products();
  const result = applyProductInventoryUpdates(original, [
    { productId: 'shirt', patch: { lowStockThreshold: '12', name: 'Cannot rename', price: 1, cost: '0' } },
    { productId: 'shirt', variantId: 'small', expectedStockAvailable: 4,
      patch: { stockAvailable: '1000000', lowStockThreshold: '', sku: ' NEW-S ', cost: '120.50' } }
  ]);
  assert.equal(result.ok, true);
  assert.equal(result.products[0].name, 'Shirt');
  assert.equal(result.products[0].price, 250);
  assert.equal(result.products[0].cost, 0);
  assert.equal(result.products[0].lowStockThreshold, 12);
  assert.equal(result.products[0].variants[0].stockAvailable, 1000000);
  assert.equal(result.products[0].variants[0].lowStockThreshold, '');
  assert.equal(result.products[0].variants[0].cost, 120.5);
  assert.equal(result.products[0].variants[0].sku, 'NEW-S');
  assert.equal(result.products[0].variants[0].price, 250);
  assert.equal(result.products[0].variants[1], original[0].variants[1]);
  assert.equal(result.products[1], original[1]);
  assert.equal(result.products[0].customCatalogField, original[0].customCatalogField);
  assert.equal(original[0].variants[0].stockAvailable, 4, 'Private source data is never mutated');
});

test('invalid or stale inventory batches change nothing, including an earlier valid line', () => {
  const original = products();
  for (const value of [-1, '1.5', 'abc', 'Infinity', Infinity, false, true, {}, [], Number.MAX_SAFE_INTEGER + 1]) {
    const result = applyProductInventoryUpdates(original, [
      { productId: 'mug', patch: { stockAvailable: 15 } },
      { productId: 'shirt', variantId: 'small', patch: { stockAvailable: value } }
    ]);
    assert.equal(result.ok, false, String(value));
    assert.equal(result.products, original);
  }
  for (const update of [
    { productId: 'missing', patch: { stockAvailable: 5 } },
    { productId: 'shirt', variantId: 'missing', patch: { stockAvailable: 5 } },
    { productId: 'shirt', variantId: 'small', expectedStockAvailable: 3, patch: { stockAvailable: 5 } },
    { productId: 'shirt', patch: { lowStockThreshold: -1 } },
    { productId: 'shirt', patch: { cost: '12abc' } }
  ]) assert.equal(applyProductInventoryUpdates(original, [update]).ok, false);
  const duplicate = applyProductInventoryUpdates(original, [
    { productId: 'mug', patch: { stockAvailable: 5 } }, { productId: 'mug', patch: { stockAvailable: 6 } }
  ]);
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.products, original);
  assert.equal(original[0].variants[0].stockAvailable, 4);
});

test('stock-clearing and threshold resets keep unknown quantities and inheritance distinct from zero', () => {
  const result = applyProductInventoryUpdates(products(), [
    { productId: 'shirt', patch: { lowStockThreshold: '' } },
    { productId: 'shirt', variantId: 'small', patch: { stockAvailable: '', lowStockThreshold: 0 } }
  ]);
  assert.equal(result.products[0].lowStockThreshold, 3);
  assert.equal(result.products[0].variants[0].stockAvailable, '');
  assert.equal(result.products[0].variants[0].lowStockThreshold, 0);
});

test('shipping edits retain untouched legacy dimensions and honour explicitly cleared values', () => {
  const original = [{ id: 'legacy', name: 'Box', size: '10×20×30 cm' }];
  const changed = applyProductInventoryUpdates(original, [{ productId: 'legacy', patch: { width: '25' } }]).products;
  assert.equal(changed[0].length, '10');
  assert.equal(changed[0].width, '25');
  assert.equal(changed[0].height, '30');
  assert.equal(changed[0].size, '10×25×30 cm');
  const cleared = applyProductInventoryUpdates(changed, [{ productId: 'legacy',
    patch: { length: '', width: '', height: '' } }]).products;
  assert.equal(cleared[0].length, '');
  assert.equal(cleared[0].width, '');
  assert.equal(cleared[0].height, '');
  assert.equal(cleared[0].size, '', 'A previous display label cannot repopulate cleared dimensions');
});

test('large mixed inventory batches update every chosen line without dropping variants or catalog data', () => {
  const catalog = Array.from({ length: 5000 }, (_, index) => ({ id: `product-${index}`, name: `Item ${index}`,
    price: index + 1, variants: [{ id: `variant-${index}`, stockAvailable: index, customField: index }] }));
  const result = applyProductInventoryUpdates(catalog, catalog.map((product, index) => ({
    productId: product.id, variantId: product.variants[0].id, expectedStockAvailable: index,
    patch: { stockAvailable: index + 1000000, lowStockThreshold: index % 5 }
  })));
  assert.equal(result.ok, true);
  assert.equal(result.products.length, 5000);
  assert.ok(result.products.every((product, index) => product.variants[0].stockAvailable === index + 1000000 &&
    product.variants[0].customField === index && product.price === index + 1));
  assert.equal(catalog[4999].variants[0].stockAvailable, 4999);
});

test('both demo and owner device caches roundtrip warning overrides and cleared quantities', () => {
  const storage = new Map();
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  try {
    const persistenceLoader = loader({ '../../data/demoWorkspace': { hydrateDemoWorkspace: (workspace) => workspace },
      '../../data/blankWorkspace': { createBlankWorkspace: () => ({ products: [] }) } });
    const { persistWorkspace, readInitialWorkspace } = persistenceLoader('../src/features/workspace/workspacePersistence.js');
    for (const isDemo of [true, false]) {
      const saved = applyProductInventoryUpdates(products(), [{ productId: 'shirt', variantId: 'small',
        patch: { stockAvailable: '', lowStockThreshold: 0 } }]).products;
      persistWorkspace({ products: saved, isDemo });
      const restored = readInitialWorkspace();
      assert.equal(restored.isDemo, isDemo);
      assert.equal(restored.products[0].lowStockThreshold, 5);
      assert.equal(restored.products[0].variants[0].lowStockThreshold, 0);
      assert.equal(restored.products[0].variants[0].stockAvailable, '');
    }
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  }
});

test('workspace inventory API merges functional state and reports validation without pretending to await a cloud save', async () => {
  const initial = { products: products(), isDemo: true, ownerId: 'owner', orders: [], bookings: [] };
  let current = initial;
  let queued;
  const errors = [];
  const api = createWorkspaceApi({ workspace: initial, setWorkspace: (updater) => { queued = updater; },
    onInventoryError: (error) => errors.push(error) });
  assert.deepEqual(api.updateInventory([{ productId: 'shirt', variantId: 'small',
    expectedStockAvailable: 4, patch: { stockAvailable: 7 } }]), { ok: true });
  current = { ...current, products: [{ ...current.products[0], name: 'Latest name',
    variants: current.products[0].variants.map((variant) => variant.id === 'large' ? { ...variant, stockAvailable: 30 } : variant)
  }, current.products[1]] };
  current = queued(current);
  assert.equal(current.products[0].name, 'Latest name');
  assert.equal(current.products[0].variants[0].stockAvailable, 7);
  assert.equal(current.products[0].variants[1].stockAvailable, 30);
  assert.equal(current.orders, initial.orders);
  assert.equal(current.bookings, initial.bookings);
  const rejected = api.updateInventory([{ productId: 'mug', patch: { stockAvailable: -1 } }]);
  assert.equal(rejected.ok, false);
  assert.match(rejected.error, /whole numbers/);

  api.updateInventory([{ productId: 'shirt', variantId: 'small', expectedStockAvailable: 4, patch: { stockAvailable: 10 } }]);
  const prior = current;
  current = queued(current);
  assert.equal(current, prior, 'An already queued change cannot overwrite a newer quantity');
  await Promise.resolve();
  assert.match(errors.at(-1), /quantity changed/);
});

test('catalog drafts retain private costs and thresholds, while catalog saves preserve newer inventory edits', async (t) => {
  const slots = [];
  let slotIndex = 0;
  let effects = [];
  let routeRest = [];
  const previousWindow = globalThis.window;
  globalThis.window = { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
  t.after(() => { if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow; });
  let catalog = products();
  let saved;
  const Card = () => null;
  const Editor = () => null;
  const Empty = () => null;
  const pageLoader = loader({
    react: { ...React, useEffect: (effect) => effects.push(effect), useMemo: (factory) => factory(), useRef: (initial) => {
      const index = slotIndex++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    }, useState: (initial) => {
      const index = slotIndex++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], (value) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    } },
    '../../workspace/WorkspaceContext': { useWorkspace: () => ({ products: catalog, workspace: { productCategories: [] },
      upsertProduct: (product) => { saved = product; } }) },
    '../../../app/routing': { workspacePagePath: (page) => `/dashboard/${page}`, navigate(path) { routeRest = path.split('/').slice(3); } },
    '../components/ProductCatalogCard': { ProductCatalogCard: Card },
    '../components/ProductEditorSheet': { ProductEditorSheet: Editor },
    '../components/ProductInfoSheet': { ProductInfoSheet: Empty },
    '../../../shared/ui/CatalogToolbar': { CatalogToolbar: Empty }
  });
  const { ProductsPage } = pageLoader('../src/features/products/pages/ProductsPage.jsx');
  const find = (tree, component) => {
    if (Array.isArray(tree)) return tree.map((child) => find(child, component)).find(Boolean);
    if (!React.isValidElement(tree)) return undefined;
    return tree.type === component ? tree : find(tree.props.children, component);
  };
  const render = () => {
    const pass = () => { slotIndex = 0; effects = []; const tree = ProductsPage({ routeRest }); effects.forEach((effect) => effect()); return tree; };
    pass();
    return pass();
  };
  find(render(), Card).props.onEdit(catalog[0]);
  const initialEditor = find(render(), Editor);
  assert.equal(initialEditor.props.draft.cost, 100);
  assert.equal(initialEditor.props.draft.lowStockThreshold, 5);
  initialEditor.props.onChange({ ...initialEditor.props.draft, price: '300',
    variants: initialEditor.props.draft.variants.map((variant) => ({ ...variant, price: '310' })) });
  // Inventory changes while a catalog draft is open, including clearing old values.
  catalog = [{ ...catalog[0], cost: 0, lowStockThreshold: 0, stockLabel: '', hideStockOnCard: true,
    variants: catalog[0].variants.map((variant) => variant.id === 'small'
      ? { ...variant, sku: '', stockAvailable: '', cost: 130, lowStockThreshold: 0, weight: 45 }
      : { ...variant, cost: '', lowStockThreshold: '' }) }, catalog[1]];
  await find(render(), Editor).props.onSave();
  assert.equal(saved.price, '300');
  assert.equal(saved.cost, 0);
  assert.equal(saved.lowStockThreshold, 0);
  assert.equal(saved.hideStockOnCard, true);
  assert.equal(saved.variants[0].price, '310', 'Catalog-owned price edits still apply');
  assert.equal(saved.variants[0].sku, '');
  assert.equal(saved.variants[0].stockAvailable, '');
  assert.equal(saved.variants[0].cost, 130);
  assert.equal(saved.variants[0].lowStockThreshold, 0);
  assert.equal(saved.variants[0].weight, 45);
  assert.equal(saved.variants[1].cost, '');
  assert.equal(saved.variants[1].lowStockThreshold, '');
});

test('warning thresholds and private costs persist in owner saves but never appear in published catalogs', async () => {
  const records = [];
  let confirmedWorkspace = null;
  const ownerLoader = loader({ 'firebase/firestore': {
    doc: (_db, ...path) => path
  }, 'firebase/functions': { httpsCallable: (_functions, name) => async (input) => {
    if (name === 'getOwnerWorkspace') return {data: confirmedWorkspace};
    assert.equal(name, 'patchOwnerWorkspace');
    const sectionRevisions = { ...(confirmedWorkspace?.sectionRevisions || {}) };
    const patch = {};
    for (const change of input.changes) {
      assert.equal(change.expectedRevision, sectionRevisions[change.section] || 0, 'The client must use the confirmed section revision');
      records.push({ payload: change.patch, section: change.section, expectedRevision: change.expectedRevision });
      Object.assign(patch, change.patch);
      sectionRevisions[change.section] = change.expectedRevision + 1;
    }
    confirmedWorkspace = { ...confirmedWorkspace, ...patch, ownerId: input.ownerId, sectionRevisions,
      schemaVersion: 2, mutationEpoch: (confirmedWorkspace?.mutationEpoch || 0) + 1 };
    return {data: {ok: true, workspace: confirmedWorkspace}};
  } }, './client': { getFirebase: () => ({ db: {}, functions: {} }) }, '../../config/appConfig': { APP_ID: 'test' },
  './paths': { ownerConfigPath: (_appId, ownerId, id) => ['owner', ownerId, id] } });
  const { saveOwnerWorkspaceToFirestore } = ownerLoader('../src/shared/firebase/ownerWorkspace.ts');
  const saved = applyProductInventoryUpdates(products(), [
    { productId: 'shirt', patch: { lowStockThreshold: 15 } },
    { productId: 'shirt', variantId: 'small', patch: { lowStockThreshold: 0, cost: 125 } }
  ]).products;
  const result = await saveOwnerWorkspaceToFirestore('owner', { products: saved, orders: [{ id: 'server' }], bookings: [], bookingRevision: 3 });
  assert.equal(result.ok, true);
  assert.deepEqual(result.workspace.sectionRevisions, { products: 1 });
  assert.equal(result.workspace.mutationEpoch, 1);
  assert.equal(records[0].section, 'products');
  assert.equal(records[0].expectedRevision, 0);
  const payload = JSON.parse(JSON.stringify(records[0].payload));
  assert.equal(payload.products[0].lowStockThreshold, 15);
  assert.equal(payload.products[0].variants[0].lowStockThreshold, 0);
  assert.equal(payload.products[0].variants[0].cost, 125);
  assert.equal(Object.hasOwn(payload, 'orders'), false);
  assert.equal(Object.hasOwn(payload, 'bookings'), false);
  assert.equal(Object.hasOwn(payload, 'bookingRevision'), false);
  const published = buildPublicWorkspaceSnapshot({ ownerId: 'owner', slug: 'shop', products: saved });
  assert.doesNotMatch(JSON.stringify(published.products), /"(?:cost|lowStockThreshold)"/);
  assert.equal(published.products[0].variants[0].stockAvailable, 4);
});

test('inventory warning thresholds do not change checkout stock validation or private cost snapshots', () => {
  const saved = applyProductInventoryUpdates(products(), [
    { productId: 'shirt', variantId: 'small', patch: { lowStockThreshold: 0, stockAvailable: 2, cost: 120 } }
  ]).products;
  const workspace = { products: saved, slug: 'shop', currency: 'R' };
  const data = { paymentMethod: 'cash', client: { clientName: 'Buyer', clientEmail: 'buyer@example.com' },
    items: [{ productId: 'shirt', variantId: 'small', quantity: 2 }] };
  const order = priceMarketOrder(workspace, data);
  assert.equal(order.subtotalCents, 50000);
  assert.equal(order.costBasisInCents, 24000);
  assert.throws(() => priceMarketOrder(workspace, { ...data, items: [{ ...data.items[0], quantity: 3 }] }), /enough stock/);
  assert.equal(saved[0].variants[0].stockAvailable, 2, 'Pricing does not manufacture inventory movements');
});
