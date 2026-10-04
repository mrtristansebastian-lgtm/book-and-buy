import test from 'node:test';
import assert from 'node:assert/strict';
import { activityStatusLabel, customerOrderSummary, customerOrderTitle } from '../src/features/client-app/customerActivity.js';

test('customer history uses product identity rather than the customer name', () => {
  const order = { clientName: 'Aisha Naidoo', items: [{ name: 'Bread Box', quantity: 2 }, { name: 'Apron', quantity: 1 }] };
  assert.equal(customerOrderTitle(order), 'Bread Box + 1 more');
  assert.equal(customerOrderSummary(order), '2 × Bread Box · 1 × Apron');
  assert.equal(customerOrderTitle({ clientName: 'Aisha Naidoo' }), 'Product order');
});

test('activity wording supports legacy payment/status keys without changing domain values', () => {
  assert.equal(activityStatusLabel('manual_pending'), 'Awaiting payment');
  assert.equal(activityStatusLabel('reschedule_requested'), 'Reschedule requested');
  assert.equal(activityStatusLabel('waitlist'), 'Waitlisted');
  assert.equal(activityStatusLabel('paid'), 'Paid');
  assert.equal(activityStatusLabel('future_status'), 'Future status');
  assert.equal(activityStatusLabel(), '');
});

test('incomplete order lines remain readable without inventing a quantity', () => {
  const order = { items: [{ productName: ' Kitchen Notes ', quantity: '' }, { name: '', quantity: 3 }] };
  assert.equal(customerOrderTitle(order), 'Kitchen Notes');
  assert.equal(customerOrderSummary(order), 'Kitchen Notes');
});
