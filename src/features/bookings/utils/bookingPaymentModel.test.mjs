import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildManualPaymentCallablePayload,
  buildManualPaymentUpdate,
  isManualPaymentMarkable,
  resolveManualPaymentAmountInCents,
  resolveManualPaymentMethod
} from './bookingPaymentModel.js';

test('manual payment model builds the callable payload without changing backend names', () => {
  const booking = {
    id: 'booking-123',
    amountInCents: 25000,
    currency: 'ZAR',
    paymentMethod: 'manual_eft'
  };

  assert.equal(resolveManualPaymentMethod(booking), 'manual_eft');
  assert.equal(resolveManualPaymentAmountInCents(booking), 25000);
  assert.deepEqual(buildManualPaymentCallablePayload({
    appId: 'build-a-booking-v2',
    booking,
    workspaceOwnerId: 'owner-1'
  }), {
    appId: 'build-a-booking-v2',
    businessId: 'owner-1',
    bookingId: 'booking-123',
    paymentMethod: 'manual_eft',
    amountInCents: 25000,
    currency: 'ZAR'
  });
});

test('manual payment model derives local paid updates for demo/offline mode', () => {
  const update = buildManualPaymentUpdate({
    paymentMethod: 'cash',
    servicePrice: 'R 180',
    paymentProviderName: ''
  }, 12345);

  assert.equal(update.paymentStatus, 'paid');
  assert.equal(update.paymentMethod, 'cash');
  assert.equal(update.paymentGateway, 'cash');
  assert.equal(update.paymentProviderName, 'Cash');
  assert.equal(update.amountPaidInCents, 18000);
  assert.equal(update.paidAt, 12345);
});

test('manual payment model blocks hosted gateways from manual paid actions', () => {
  assert.equal(isManualPaymentMarkable({ paymentGateway: 'stripe', paymentStatus: 'unpaid' }), false);
  assert.equal(isManualPaymentMarkable({ paymentMethod: 'manual_eft', paymentStatus: 'manual_pending' }), true);
  assert.equal(isManualPaymentMarkable({ paymentStatus: 'paid', paymentMethod: 'cash' }), false);
});
