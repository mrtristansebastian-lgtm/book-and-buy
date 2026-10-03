import test from 'node:test';
import assert from 'node:assert/strict';
import { shippingDisplayName } from '../functions/marketPolicy.js';

test('shipping labels use the customer-facing name, never the internal name', () => {
  assert.equal(shippingDisplayName({ name: 'Internal warehouse', customerFacingName: ' Express delivery ' }), 'Express delivery');
  assert.equal(shippingDisplayName({ name: 'Internal warehouse' }), 'Delivery');
  assert.equal(shippingDisplayName({ customerFacingName: '   ' }), 'Delivery');
  assert.equal(shippingDisplayName(undefined), 'Delivery');
});
