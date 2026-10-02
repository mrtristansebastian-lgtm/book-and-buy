import test from 'node:test';
import assert from 'node:assert/strict';
import { filterManagedCatalog } from '../src/utils/catalogSearch.js';

const rows = [
  { id: 'one', name: 'Studio Apron', category: 'Kitchen', status: 'active', variants: [{ title: 'Natural', sku: 'APR-SM-NAT' }] },
  { id: 'two', name: 'Bread Box', category: 'Kitchen', status: 'draft' },
  { id: 'three', name: 'Consultation', active: false },
  { id: 'four', name: 'Baking lesson', active: true }
];
test('catalog search matches all words across names, category and variant SKU', () => {
  assert.deepEqual(filterManagedCatalog(rows, ' kitchen NAT ').map((row) => row.id), ['one']);
  assert.deepEqual(filterManagedCatalog(rows, 'apr-sm').map((row) => row.id), ['one']);
  assert.deepEqual(filterManagedCatalog(rows, 'unknown'), []);
});
test('catalog status preserves hidden, draft and active records without mutation', () => {
  assert.deepEqual(filterManagedCatalog(rows, '', 'active').map((row) => row.id), ['one', 'four']);
  assert.deepEqual(filterManagedCatalog(rows, '', 'hidden').map((row) => row.id), ['two', 'three']);
  assert.equal(filterManagedCatalog(rows).length, 4);
  assert.equal(rows[0].variants[0].sku, 'APR-SM-NAT');
});
