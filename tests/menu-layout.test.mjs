import test from 'node:test';
import assert from 'node:assert/strict';
import { menuPageSize } from '../src/features/dashboard/utils/menuLayout.js';

test('desktop can fit all categories without reserving an unnecessary pager', () => {
  assert.equal(menuPageSize({ height: 760, groupHeight: 102, footerHeight: 130, count: 5 }), 5);
});
test('short mobile and enlarged text reserve measured footer and accessible page controls', () => {
  assert.equal(menuPageSize({ height: 490, groupHeight: 102, footerHeight: 170, count: 5 }), 2);
  assert.equal(menuPageSize({ height: 490, groupHeight: 155, footerHeight: 210, count: 5 }), 1);
  assert.equal(menuPageSize({ height: 200, groupHeight: 102, footerHeight: 170, count: 5 }), 1);
});
