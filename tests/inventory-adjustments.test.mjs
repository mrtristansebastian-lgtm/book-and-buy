import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInventoryAdjustments } from '../src/features/products/inventoryAdjustments.js';
import { buildInventoryRows, flattenInventoryRows } from '../src/features/products/inventoryModel.js';

const inventory = (stockAvailable, extra = {}) => flattenInventoryRows(buildInventoryRows([
  { id: 'coffee', name: 'Coffee', sku: 'COF', stockAvailable, ...extra }
]));

test('set quantity initializes an unknown quantity without claiming it was previously zero', () => {
  const units = inventory('');
  const result = buildInventoryAdjustments(units, { mode: 'set', value: '20' });
  assert.equal(result.ok, true);
  assert.deepEqual(result.updates, [{ productId: 'coffee', variantId: null, expectedStockAvailable: '', patch: { stockAvailable: '20' } }]);
  assert.deepEqual(result.previews, [{ id: 'coffee:product', name: 'Coffee', variantTitle: '', before: null, after: 20 }]);
  assert.equal(units[0].source.stockAvailable, '');
});

test('add and remove build exact per-variant updates while leaving every source untouched', () => {
  const units = inventory(999, { variants: [
    { id: 'bag', title: '250 g', sku: 'COF-250', stockAvailable: ' 003 ' },
    { id: 'box', title: 'Box', sku: 'COF-BOX', stockAvailable: 10 }
  ] });
  const result = buildInventoryAdjustments(units, { mode: 'add', value: 4 });
  assert.equal(result.ok, true);
  assert.deepEqual(result.updates, [
    { productId: 'coffee', variantId: 'bag', expectedStockAvailable: ' 003 ', patch: { stockAvailable: '7' } },
    { productId: 'coffee', variantId: 'box', expectedStockAvailable: 10, patch: { stockAvailable: '14' } }
  ]);
  assert.deepEqual(result.previews.map((preview) => [preview.variantTitle, preview.before, preview.after]), [['250 g', 3, 7], ['Box', 10, 14]]);
  assert.deepEqual(units.map((unit) => unit.source.stockAvailable), [' 003 ', 10]);
  const removed = buildInventoryAdjustments(units, { mode: 'remove', value: 3 });
  assert.equal(removed.ok, true);
  assert.deepEqual(removed.previews.map((preview) => preview.after), [0, 7]);
});

test('blank, malformed, negative, fractional and unsafe adjustment values are rejected', () => {
  for (const value of ['', ' ', null, undefined, -1, 0.1, true, [], '1e3', '3.0', '2 apples', Number.MAX_SAFE_INTEGER + 1, '9007199254740992']) {
    const result = buildInventoryAdjustments(inventory(10), { mode: 'set', value });
    assert.equal(result.ok, false, `Invalid input ${String(value)}`);
    assert.ok(result.error.includes('whole quantity'));
    assert.equal(Object.hasOwn(result, 'updates'), false);
  }
});

test('zero is valid for all modes and a maximum safe set stays exact', () => {
  for (const mode of ['set', 'add', 'remove']) {
    const result = buildInventoryAdjustments(inventory(0), { mode, value: 0 });
    assert.equal(result.ok, true);
    assert.equal(result.updates[0].patch.stockAvailable, '0');
  }
  assert.equal(buildInventoryAdjustments(inventory(''), { mode: 'set', value: String(Number.MAX_SAFE_INTEGER) }).previews[0].after, Number.MAX_SAFE_INTEGER);
});

test('add and remove cannot use a missing or invalid starting quantity', () => {
  for (const starting of ['', undefined, null, 'broken', -1, 1.5]) {
    for (const mode of ['add', 'remove']) {
      const result = buildInventoryAdjustments(inventory(starting), { mode, value: 1 });
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('Use Set quantity first.'));
    }
  }
});

test('removing past zero rejects the complete batch even if earlier rows were valid', () => {
  const units = inventory(99, { variants: [
    { id: 'big', stockAvailable: 20 }, { id: 'small', title: 'Small bag', stockAvailable: 2 }
  ] });
  const result = buildInventoryAdjustments(units, { mode: 'remove', value: 3 });
  assert.deepEqual(result, { ok: false, error: 'Coffee · Small bag only has 2 units. Enter 2 or less.' });
  assert.deepEqual(units.map((unit) => unit.source.stockAvailable), [20, 2]);
});

test('addition overflow rejects the complete batch without rounded previews', () => {
  const units = inventory(99, { variants: [
    { id: 'normal', stockAvailable: 20 }, { id: 'max', stockAvailable: Number.MAX_SAFE_INTEGER }
  ] });
  const result = buildInventoryAdjustments(units, { mode: 'add', value: 1 });
  assert.equal(result.ok, false);
  assert.ok(result.error.includes('too large'));
  assert.equal(Object.hasOwn(result, 'updates'), false);
  assert.equal(Object.hasOwn(result, 'previews'), false);
  assert.equal(buildInventoryAdjustments(inventory(Number.MAX_SAFE_INTEGER - 1), { mode: 'add', value: 1 }).previews[0].after, Number.MAX_SAFE_INTEGER);
});

test('set preserves the raw optimistic-concurrency value including absent and null quantities', () => {
  for (const before of [null, undefined, '', '  ', 0, '000', 'broken']) {
    const result = buildInventoryAdjustments(inventory(before), { mode: 'set', value: 5 });
    assert.equal(result.ok, true);
    assert.equal(Object.hasOwn(result.updates[0], 'expectedStockAvailable'), true);
    assert.equal(result.updates[0].expectedStockAvailable, before);
  }
});

test('the current source value determines the preview even if a derived unit quantity is stale', () => {
  const units = inventory(10);
  units[0].source.stockAvailable = '12';
  const result = buildInventoryAdjustments(units, { mode: 'remove', value: 10 });
  assert.equal(result.ok, true);
  assert.equal(result.previews[0].before, 12);
  assert.equal(result.previews[0].after, 2);
  assert.equal(result.updates[0].expectedStockAvailable, '12');
});

test('missing selection, unknown action and duplicate write targets are rejected', () => {
  assert.equal(buildInventoryAdjustments([], { mode: 'set', value: 1 }).ok, false);
  assert.equal(buildInventoryAdjustments(null, { mode: 'set', value: 1 }).ok, false);
  assert.equal(buildInventoryAdjustments(inventory(3), { mode: 'multiply', value: 1 }).ok, false);
  const units = inventory(3);
  assert.equal(buildInventoryAdjustments([...units, ...units], { mode: 'add', value: 1 }).ok, false);
});

test('invalid row identity never silently updates product defaults instead of a variant', () => {
  const unit = inventory(4)[0];
  for (const broken of [{ ...unit, productId: '' }, { ...unit, source: null }, { ...unit, hasVariants: true, variantId: null }, { ...unit, variantId: 123 }]) {
    assert.equal(buildInventoryAdjustments([broken], { mode: 'set', value: 1 }).ok, false);
  }
});
