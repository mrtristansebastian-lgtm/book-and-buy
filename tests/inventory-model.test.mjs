import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInventoryRows,
  flattenInventoryRows,
  getInventoryStockState,
  getInventoryThreshold,
  inventoryCategories,
  inventoryCsv,
  matchesInventoryFilter,
  paginatedInventory,
  parseInventoryQuantity,
  selectInventoryRows,
  selectInventoryUnits,
  summarizeInventory
} from '../src/features/products/inventoryModel.js';

const product = (id, stockAvailable, extra = {}) => ({ id, name: id, sku: `SKU-${id}`, stockAvailable, ...extra });

test('whole quantities accept numeric legacy strings without treating blank or malformed data as zero', () => {
  for (const value of [0, 3, Number.MAX_SAFE_INTEGER, '0', ' 003 ', '9007199254740991']) {
    assert.equal(parseInventoryQuantity(value), Number(value));
  }
  for (const value of ['', ' ', null, undefined, true, false, [], {}, -1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1, '1e3', '1.0', '-2', '1,000', '2 units', '9007199254740992']) {
    assert.equal(parseInventoryQuantity(value), null, `Invalid quantity ${String(value)}`);
  }
});

test('threshold default, inheritance and a deliberate zero threshold are distinct', () => {
  assert.equal(getInventoryThreshold(), 3);
  assert.equal(getInventoryThreshold({ lowStockThreshold: '' }, 12), 12);
  assert.equal(getInventoryThreshold({ lowStockThreshold: '0' }, 12), 0);
  assert.equal(getInventoryThreshold({ lowStockThreshold: '7' }, 12), 7);
  assert.equal(getInventoryThreshold({ lowStockThreshold: -1 }, 12), 12);
  assert.equal(getInventoryThreshold({ lowStockThreshold: Infinity }, -1), 3);
});

test('stock states distinguish depleted, low, healthy and unknown at exact boundaries', () => {
  assert.equal(getInventoryStockState(''), 'unset');
  assert.equal(getInventoryStockState(0), 'out');
  assert.equal(getInventoryStockState(3), 'low');
  assert.equal(getInventoryStockState(4), 'healthy');
  assert.equal(getInventoryStockState(0, 0), 'out');
  assert.equal(getInventoryStockState(1, 0), 'healthy');
  assert.equal(getInventoryStockState(12, 12), 'low');
  assert.equal(getInventoryStockState(13, 12), 'healthy');
});

test('a depleted variant remains a warning even when another variant has a large quantity', () => {
  const source = product('coat', 9000, {
    variants: [
      { id: 'small', title: 'Small', sku: 'COAT-S', stockAvailable: '0' },
      { id: 'large', title: 'Large', sku: 'COAT-L', stockAvailable: '250000' }
    ]
  });
  const [row] = buildInventoryRows([source]);
  assert.equal(row.stockState, 'out');
  assert.equal(row.totalStockQty, 250000);
  assert.equal(row.unitCount, 2);
  assert.equal(row.attentionCount, 1);
  assert.deepEqual(row.counts, { out: 1, low: 0, healthy: 1, unset: 0 });
  assert.equal(row.units[0].source, source.variants[0]);
  assert.equal(row.units[0].variantId, 'small');
  assert.equal(row.product, source);
  assert.equal(matchesInventoryFilter(row, 'out'), true);
  assert.equal(matchesInventoryFilter(row, 'healthy'), false);
});

test('each variant uses its override or inherits the product low-stock threshold', () => {
  const [row] = buildInventoryRows([product('coffee', 99, {
    lowStockThreshold: '10',
    variants: [
      { id: 'bag', stockAvailable: 8, lowStockThreshold: '' },
      { id: 'box', stockAvailable: 8, lowStockThreshold: 5 },
      { id: 'jar', stockAvailable: 1, lowStockThreshold: 0 }
    ]
  })]);
  assert.deepEqual(row.units.map((unit) => [unit.lowStockThreshold, unit.stockState]), [[10, 'low'], [5, 'healthy'], [0, 'healthy']]);
  assert.equal(row.stockState, 'low');
  assert.equal(row.totalStockQty, 17);
});

test('unknown variant quantities never produce a made-up complete product total', () => {
  const [row] = buildInventoryRows([product('shoe', 200, {
    variants: [
      { id: 'red', sku: 'SH-R', stockAvailable: '45' },
      { id: 'blue', sku: '', stockAvailable: '' },
      { id: 'green', stockAvailable: 'broken' }
    ]
  })]);
  assert.equal(row.totalStockQty, null);
  assert.equal(row.totalStockText, null);
  assert.equal(row.knownStockQty, 45);
  assert.equal(row.knownStockText, '45');
  assert.equal(row.quantityComplete, false);
  assert.equal(row.stockState, 'unset');
  assert.equal(row.missingSkuCount, 2);
  assert.deepEqual(row.counts, { out: 0, low: 0, healthy: 1, unset: 2 });
});

test('summary counts stock lines separately and keeps partially known totals explicit', () => {
  const rows = buildInventoryRows([
    product('sold', 0), product('low', 3), product('ready', 1000), product('unknown', ''),
    product('sizes', 50000, { variants: [{ id: 'xs', stockAvailable: 2 }, { id: 'xl', stockAvailable: 30 }] })
  ]);
  const summary = summarizeInventory(rows);
  assert.equal(summary.productCount, 5);
  assert.equal(summary.unitCount, 6);
  assert.deepEqual(summary.counts, { out: 1, low: 2, healthy: 2, unset: 1 });
  assert.equal(summary.attentionCount, 3);
  assert.equal(summary.attentionProducts, 3);
  assert.equal(summary.outProducts, 1);
  assert.equal(summary.lowProducts, 2);
  assert.equal(summary.healthyProducts, 1);
  assert.equal(summary.unsetProducts, 1);
  assert.equal(summary.knownStockQty, 1035);
  assert.equal(summary.quantityComplete, false);
  assert.equal(summary.totalStockQty, null);
  assert.equal(summary.totalStockText, null);
});

test('large whole quantities are exact, and aggregate overflow never silently rounds', () => {
  const max = Number.MAX_SAFE_INTEGER;
  const rows = buildInventoryRows([product('huge', '', {
    variants: [{ id: 'a', stockAvailable: max }, { id: 'b', stockAvailable: max }]
  })]);
  assert.equal(rows[0].knownStockText, '18014398509481982');
  assert.equal(rows[0].totalStockText, '18014398509481982');
  assert.equal(rows[0].knownStockQty, null);
  assert.equal(rows[0].totalStockQty, null);
  assert.equal(rows[0].hasQuantityOverflow, true);
  assert.equal(rows[0].quantityComplete, true);
  assert.equal(summarizeInventory(rows).knownStockText, '18014398509481982');
});

test('blank quantities are separate from genuinely zero stock even when everything is unknown', () => {
  const rows = buildInventoryRows([product('a', ''), product('b', null)]);
  const summary = summarizeInventory(rows);
  assert.equal(summary.counts.out, 0);
  assert.equal(summary.counts.unset, 2);
  assert.equal(summary.attentionCount, 0);
  assert.equal(summary.knownStockQty, 0);
  assert.equal(summary.quantityComplete, false);
  assert.equal(summary.totalStockQty, null);
});

test('quantities for paused variants and archived products still count as held inventory', () => {
  const rows = buildInventoryRows([product('archive', 8, {
    status: 'archived', variants: [{ id: 'a', available: false, stockAvailable: 8, sku: 'A' }]
  })]);
  assert.equal(rows[0].status, 'archived');
  assert.equal(rows[0].units[0].available, false);
  assert.equal(rows[0].totalStockQty, 8);
  assert.equal(summarizeInventory(rows).unitCount, 1);
});

test('SKU and option search finds variants, supports several terms and folded accents', () => {
  const rows = buildInventoryRows([
    product('cafe', '', { name: 'Café espresso', category: 'Drinks', variants: [{ id: 'v', sku: 'ESP-RED-42', optionValues: { Size: '250 ml', Colour: 'Red' }, stockAvailable: 5 }] }),
    product('tea', 8, { name: 'Green tea', category: 'Drinks' })
  ]);
  assert.deepEqual(selectInventoryRows(rows, { query: 'cafe red 250' }).map((row) => row.id), ['cafe']);
  assert.deepEqual(selectInventoryRows(rows, { query: 'ESP-red-42' }).map((row) => row.id), ['cafe']);
  assert.deepEqual(selectInventoryRows(rows, { query: 'drinks nonexistent' }), []);
});

test('filters are based on per-line stock, with zero and low separate and no-SKU covering variants', () => {
  const rows = buildInventoryRows([
    product('a', 0), product('b', 2), product('c', 30), product('d', ''),
    product('mixed', '', { variants: [{ id: 'a', stockAvailable: 0 }, { id: 'b', stockAvailable: 2, sku: 'B' }] })
  ]);
  const ids = (filterId) => selectInventoryRows(rows, { filterId, sort: 'name' }).map((row) => row.id);
  assert.deepEqual(ids('out'), ['a', 'mixed']);
  assert.deepEqual(ids('low'), ['b', 'mixed']);
  assert.deepEqual(ids('attention'), ['a', 'b', 'mixed']);
  assert.deepEqual(ids('healthy'), ['c']);
  assert.deepEqual(ids('unset'), ['d']);
  assert.deepEqual(ids('nosku'), ['mixed']);
});

test('category selection composes with query and attention filters', () => {
  const rows = buildInventoryRows([
    product('a', 2, { name: 'Shorts 2', category: 'Clothing' }),
    product('b', 2, { name: 'Shorts 10', category: 'Clothing' }),
    product('c', 20, { name: 'Shorts 1', category: 'Clothing' }),
    product('d', 2, { name: 'Cable', category: 'Electronics' }), product('e', 1)
  ]);
  assert.deepEqual(inventoryCategories(rows), [{ value: 'Clothing', label: 'Clothing', count: 3 }, { value: 'Electronics', label: 'Electronics', count: 1 }]);
  assert.deepEqual(selectInventoryRows(rows, { category: 'Clothing', filterId: 'low', query: 'shorts', sort: 'name' }).map((row) => row.id), ['a', 'b']);
});

test('attention sort prioritizes depleted lines, while stable ties never reorder the source array', () => {
  const rows = buildInventoryRows([product('ready', 200), product('unset', ''), product('low', 2), product('out', 0)]);
  const original = rows.map((row) => row.id);
  assert.deepEqual(selectInventoryRows(rows).map((row) => row.id), ['out', 'low', 'unset', 'ready']);
  assert.deepEqual(rows.map((row) => row.id), original);
  const tied = buildInventoryRows([product('b', 5, { name: 'Same' }), product('a', 5, { name: 'Same' })]);
  assert.deepEqual(selectInventoryRows(tied, { sort: 'name' }).map((row) => row.id), ['a', 'b']);
});

test('quantity sorts place unknown totals after known ones and compare huge sums exactly', () => {
  const rows = buildInventoryRows([
    product('unknown', ''), product('small', 5), product('big', Number.MAX_SAFE_INTEGER),
    product('bigger', '', { variants: [{ id: 'a', stockAvailable: Number.MAX_SAFE_INTEGER }, { id: 'b', stockAvailable: 1 }] })
  ]);
  assert.deepEqual(selectInventoryRows(rows, { sort: 'quantity-low' }).map((row) => row.id), ['small', 'big', 'bigger', 'unknown']);
  assert.deepEqual(selectInventoryRows(rows, { sort: 'quantity-high' }).map((row) => row.id), ['bigger', 'big', 'small', 'unknown']);
});

test('empty inventory has useful zero counts and an empty first page', () => {
  const rows = buildInventoryRows();
  assert.deepEqual(rows, []);
  assert.equal(summarizeInventory(rows).productCount, 0);
  assert.equal(summarizeInventory(rows).knownStockQty, 0);
  assert.deepEqual(paginatedInventory(rows), { items: [], page: 1, pageSize: 25, pageCount: 1, total: 0, from: 0, to: 0 });
});

test('large catalogs only mount the requested bounded page and clamp stale pages after filtering', () => {
  const rows = buildInventoryRows(Array.from({ length: 20003 }, (_, index) => product(`item-${index}`, index)));
  const page = paginatedInventory(rows, { page: 801, pageSize: 25 });
  assert.equal(page.pageCount, 801);
  assert.equal(page.from, 20001);
  assert.equal(page.to, 20003);
  assert.equal(page.items.length, 3);
  assert.equal(page.items[0].id, 'item-20000');
  const filtered = paginatedInventory(rows.slice(0, 2), { page: 801, pageSize: 25 });
  assert.equal(filtered.page, 1);
  assert.equal(filtered.items.length, 2);
  assert.equal(paginatedInventory(rows, { page: -1, pageSize: 500000 }).items.length, 100);
});

test('flat table rows identify each variant and preserve the exact editable record', () => {
  const source = product('shirt', 999, { category: 'Clothing', status: 'draft', variants: [
    { id: 'red', title: 'Red / M', sku: 'RED-M', stockAvailable: 0 },
    { id: 'blue', title: 'Blue / L', sku: 'BLUE-L', stockAvailable: 25 }
  ] });
  const rows = buildInventoryRows([source, product('plain', 7)]);
  const units = flattenInventoryRows(rows);
  assert.equal(units.length, 3);
  assert.equal(new Set(units.map((unit) => unit.id)).size, 3);
  assert.deepEqual(units.map((unit) => [unit.productId, unit.variantId, unit.name, unit.variantTitle, unit.quantity]), [
    ['shirt', 'red', 'shirt', 'Red / M', 0], ['shirt', 'blue', 'shirt', 'Blue / L', 25], ['plain', null, 'plain', '', 7]
  ]);
  assert.equal(units[0].source, source.variants[0]);
  assert.equal(units[0].product, source);
  assert.equal(units[0].category, 'Clothing');
  assert.equal(units[0].status, 'draft');
});

test('flat SKU search finds only the matching variant while product names find every variant', () => {
  const units = flattenInventoryRows(buildInventoryRows([product('shirt', 0, { name: 'Cotton shirt', variants: [
    { id: 'red', title: 'Red / M', sku: 'RED-M', stockAvailable: 2 },
    { id: 'blue', title: 'Blue / L', sku: 'BLUE-L', stockAvailable: 25 }
  ] })]));
  assert.deepEqual(selectInventoryUnits(units, { query: 'red-m' }).map((unit) => unit.variantId), ['red']);
  assert.deepEqual(selectInventoryUnits(units, { query: 'cotton' }).map((unit) => unit.variantId).sort(), ['blue', 'red']);
  assert.equal(selectInventoryUnits(units, { query: 'cotton red', filterId: 'healthy' }).length, 0);
  assert.deepEqual(selectInventoryUnits(units, { filterId: 'low' }).map((unit) => unit.variantId), ['red']);
});

test('flat quantity sort, missing SKU filter and pagination remain per line', () => {
  const units = flattenInventoryRows(buildInventoryRows([product('variants', 0, { variants: [
    { id: 'unset', sku: 'Z', stockAvailable: '' },
    { id: 'low', sku: '', stockAvailable: 2 },
    { id: 'ready', sku: 'A', stockAvailable: 25 }
  ] })]));
  assert.deepEqual(selectInventoryUnits(units, { sort: 'quantity-high' }).map((unit) => unit.variantId), ['ready', 'low', 'unset']);
  assert.deepEqual(selectInventoryUnits(units, { sort: 'quantity-low' }).map((unit) => unit.variantId), ['low', 'ready', 'unset']);
  assert.deepEqual(selectInventoryUnits(units, { filterId: 'nosku' }).map((unit) => unit.variantId), ['low']);
  assert.deepEqual(selectInventoryUnits(units, { sort: 'sku' }).map((unit) => unit.variantId), ['ready', 'unset', 'low']);
  assert.equal(paginatedInventory(units, { pageSize: 2, page: 2 }).items[0].variantId, 'ready');
});

test('CSV exports every provided filtered line with quotes and honest blank quantities', () => {
  const units = flattenInventoryRows(buildInventoryRows([
    product('a', '', { name: 'Coffee, "dark"\nroast', category: 'Drinks', lowStockThreshold: 12 }),
    product('b', 0, { name: 'Tea' })
  ]));
  const csv = inventoryCsv(units);
  assert.ok(csv.startsWith('"Product","Variant","SKU","Category","Product status","Quantity","Low-stock warning threshold","Stock status"\r\n'));
  assert.ok(csv.includes('"Coffee, ""dark""\nroast","","SKU-a","Drinks","active","","12","Quantity unset"\r\n'));
  assert.ok(csv.includes('"Tea","","SKU-b","","active","0","3","Out of stock"\r\n'));
  const filtered = selectInventoryUnits(units, { filterId: 'out' });
  assert.ok(!inventoryCsv(filtered).includes('Coffee'));
  assert.ok(inventoryCsv(filtered).includes('Tea'));
});

test('CSV neutralizes spreadsheet formulas including whitespace/control prefixes in text cells', () => {
  const dangerous = ['=SUM(A1)', '+1+1', '-2+2', '@SUM(A1)', '  =SUM(A1)', '\t=SUM(A1)', ' \tSKU', '\n@danger'];
  for (const value of dangerous) {
    const csv = inventoryCsv([{ name: value, variantTitle: value, sku: value, category: value, status: value, quantity: '', lowStockThreshold: 0, stockState: 'unset' }]);
    assert.ok(csv.includes(`"'${value}"`), `Formula prefix escaped: ${JSON.stringify(value)}`);
    assert.equal(csv.split(`"'${value}"`).length - 1, 5);
  }
  assert.ok(inventoryCsv([{ name: 'Normal SKU', quantity: 3, lowStockThreshold: 0, stockState: 'healthy' }]).includes('"Normal SKU","","","","","3","0","In stock"'));
});
