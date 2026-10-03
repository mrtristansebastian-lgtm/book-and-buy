import test from 'node:test';
import assert from 'node:assert/strict';
import { shippingAmount, validateTeamProfile } from '../src/features/settings/settingsValidation.js';

test('team profiles require a name and validate optional email', () => {
  assert.ok(validateTeamProfile({ name: '  ' }));
  assert.ok(validateTeamProfile({ name: 'Alex', email: 'not-an-email' }));
  assert.equal(validateTeamProfile({ name: 'Alex', email: '' }), '');
  assert.equal(validateTeamProfile({ name: 'Alex', email: ' alex@example.com ' }), '');
});
test('shipping amounts reject unsafe, negative and non-finite values', () => {
  assert.equal(shippingAmount('12.34'), 1234);
  assert.equal(shippingAmount('0'), 0);
  assert.equal(shippingAmount('', true), null);
  for (const value of ['', '-1', 'NaN', 'Infinity', '1e30']) assert.equal(shippingAmount(value), undefined);
});
