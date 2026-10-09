import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function loader(overrides = {}) {
  const modules = new Map();
  const load = (path) => {
    const file = new URL(path, import.meta.url);
    if (modules.has(file.href)) return modules.get(file.href);
    const source = readFileSync(file, 'utf8');
    const { outputText } = ts.transpileModule(source, { compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022
    } });
    const module = { exports: {} };
    modules.set(file.href, module.exports);
    const scopedRequire = (id) => {
      if (id in overrides) return overrides[id];
      if (id.endsWith('.css')) return {};
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
const { normalizeService, normalizeServiceVariant, normalizeServiceCost, isValidOptionalServiceCost } = load('../src/utils/services.js');
const { buildPublicWorkspaceSnapshot } = load('../src/shared/firebase/publicSnapshot.ts');

test('service costs preserve unknown and explicit zero, with numeric private costs on the saved catalog', () => {
  for (const unknown of [undefined, null, '', '   ']) {
    assert.equal(isValidOptionalServiceCost(unknown), true);
    assert.equal(normalizeServiceCost(unknown), '');
  }
  for (const [input, expected] of [[0, 0], ['0', 0], [125.5, 125.5], [' 125.50 ', 125.5]]) {
    assert.equal(isValidOptionalServiceCost(input), true);
    assert.equal(normalizeServiceCost(input), expected);
    assert.equal(normalizeService({ name: 'Haircut', cost: input }).cost, expected);
    assert.equal(normalizeServiceVariant({ name: 'Classic', cost: input }).cost, expected);
  }
  const saved = normalizeService({ name: 'Haircut', cost: '45.50', variants: [
    { id: 'inherit', name: 'Classic', cost: '' }, { id: 'free', name: 'Complimentary', cost: '0' }
  ] });
  assert.equal(saved.cost, 45.5);
  assert.equal(saved.variants[0].cost, '', 'Blank option can inherit the main cost');
  assert.equal(saved.variants[1].cost, 0, 'Known zero must not inherit the main cost');
});

test('service cost validation rejects negatives, non-numbers and non-finite inputs', () => {
  for (const invalid of [-1, '-1.00', NaN, Infinity, 'Infinity', 'abc', '12abc', {}, [], false, true]) {
    assert.equal(isValidOptionalServiceCost(invalid), false, String(invalid));
    assert.equal(normalizeServiceCost(invalid), '', 'Unsafe costs never become known zero');
  }
});

function findElement(tree, predicate) {
  if (Array.isArray(tree)) return tree.map((node) => findElement(node, predicate)).find(Boolean);
  if (!React.isValidElement(tree)) return undefined;
  return predicate(tree) ? tree : findElement(tree.props.children, predicate);
}

test('saving the service editor blocks invalid main and option costs, but accepts blank and zero', async () => {
  const blankComponent = () => null;
  const componentStub = new Proxy({}, { get: () => blankComponent });
  let saved = 0;
  const messages = [];
  const loadSheet = loader({
    react: { ...React, useEffect() {}, useMemo: (factory) => factory(), useRef: () => ({ current: null }),
      useState: (initial) => [typeof initial === 'function' ? initial() : initial, (value) => messages.push(value)] },
    '../../workspace/WorkspaceContext': { useWorkspace: () => ({ workspace: { currency: 'R' } }) },
    '../../../shared/firebase/integrations': {},
    '../../../shared/ui/useDialogFocus': { useDialogFocus() {} },
    '../../../config/businessCategories': { isValidExploreCategoryPair: () => true },
    '../../../shared/ui/Button': componentStub,
    '../../../shared/ui/SetupPicker': componentStub,
    '../../media/ImageCropModal': componentStub,
    ...Object.fromEntries(['Category', 'Configuration', 'Details', 'Duration', 'Photo', 'Review', 'Type', 'Variants', 'When']
      .map((step) => [`./ServiceEditor${step}Step`, componentStub]))
  });
  const { ServiceEditorSheet } = loadSheet('../src/features/services/components/ServiceEditorSheet.jsx');
  const save = async (cost, optionCost) => {
    messages.length = 0;
    const tree = ServiceEditorSheet({ open: true, variant: 'page', onSave: () => saved++, draft: {
      id: 'service', name: 'Haircut', scheduleType: 'appointment', duration: '60', price: '100', cost,
      variants: [{ id: 'option', name: 'Classic', minDuration: '60', price: '150', cost: optionCost }]
    } });
    await findElement(tree, (node) => node.props.action === 'save').props.onClick();
  };
  await save('-1', '0');
  assert.equal(saved, 0);
  assert.ok(messages.some((message) => String(message).includes('booking cost')));
  await save('0', 'Infinity');
  assert.equal(saved, 0);
  assert.ok(messages.some((message) => String(message).includes('Classic')));
  await save('', '');
  await save('0', '0');
  await save('45.50', '25');
  assert.equal(saved, 3);
});

test('published catalogs exclude private costs and snapshots while retaining visible options and prices', () => {
  const productVariant = { id: 'p-option', title: 'Large', optionValues: { Size: 'Large' }, price: 250,
    stockAvailable: 5, cost: 125, costBasisInCents: 12500, unitCostInCents: 12500, lineCostInCents: 25000 };
  const serviceVariant = { id: 's-option', name: 'Classic', price: 150, minDuration: 60,
    cost: 75, costBasisInCents: 7500 };
  const snapshot = buildPublicWorkspaceSnapshot({ ownerId: 'owner', slug: 'shop',
    products: [{ id: 'p', name: 'Apron', price: 200, cost: 100, costBasisInCents: 10000, variants: [productVariant] }],
    services: [{ id: 's', name: 'Haircut', price: 100, cost: 45, costBasisInCents: 4500, variants: [serviceVariant] }]
  });
  const serialized = JSON.stringify({ products: snapshot.products, services: snapshot.services });
  assert.doesNotMatch(serialized, /"(?:cost|costBasisInCents|unitCostInCents|lineCostInCents)"/);
  assert.deepEqual(snapshot.products[0].variants[0].optionValues, { Size: 'Large' });
  assert.equal(snapshot.products[0].variants[0].price, 250);
  assert.equal(snapshot.products[0].variants[0].stockAvailable, 5);
  assert.equal(snapshot.services[0].variants[0].price, 150);
  assert.equal(snapshot.services[0].variants[0].minDuration, 60);
  assert.equal(productVariant.cost, 125, 'Projection must not mutate private owner data');
  assert.equal(serviceVariant.cost, 75);
});
