import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  validateInitiatePaymentPayload,
  validateManualPaymentPayload,
  validatePublicPaymentOptionsPayload,
  validateSaveGatewaySettingsPayload
} = require('./validators.js');

test('public payment option payload validates app namespace and slug aliases', () => {
  assert.deepEqual(validatePublicPaymentOptionsPayload({
    slug: 'Your-Business'
  }), {
    appId: 'build-a-booking-v2',
    publicSlug: 'your-business'
  });

  assert.throws(
    () => validatePublicPaymentOptionsPayload({ appId: 'build-a-booking-v2', publicSlug: '../private' }),
    /valid booking page slug/i
  );
});

test('payment settings payload keeps only allowed credentials and normalizes mode', () => {
  const payload = validateSaveGatewaySettingsPayload({
    appId: 'build-a-booking-v2',
    businessId: 'owner_123',
    gatewayType: 'stripe',
    enabled: true,
    mode: 'live',
    providerName: 'Launch Stripe',
    credentials: {
      publishableKey: 'pk_test_public',
      secretKey: 'sk_test_secret',
      webhookSecret: 'whsec_launch',
      privateNote: 'must be ignored'
    }
  });

  assert.equal(payload.gatewayType, 'stripe');
  assert.equal(payload.mode, 'live');
  assert.equal(payload.providerName, 'Launch Stripe');
  assert.deepEqual(payload.credentials, {
    publishableKey: 'pk_test_public',
    secretKey: 'sk_test_secret',
    webhookSecret: 'whsec_launch'
  });
});

test('hosted payment start payload rejects manual gateways and unauthenticated missing booking reference', () => {
  assert.throws(
    () => validateInitiatePaymentPayload({
      appId: 'build-a-booking-v2',
      businessId: 'owner_123',
      gatewayType: 'cash',
      amountInCents: 100,
      currency: 'ZAR'
    }, null),
    /Manual payment methods/
  );

  assert.throws(
    () => validateInitiatePaymentPayload({
      appId: 'build-a-booking-v2',
      businessId: 'owner_123',
      gatewayType: 'paystack',
      amountInCents: 100,
      currency: 'ZAR'
    }, null),
    /Sign in or provide a booking reference/
  );
});

test('hosted payment start payload normalizes currency, email, and fallback description', () => {
  const payload = validateInitiatePaymentPayload({
    appId: 'build-a-booking-v2',
    businessId: 'owner_123',
    gatewayType: 'paystack',
    bookingId: 'booking_123',
    amountInCents: 100,
    currency: 'zar',
    customerEmail: ' CLIENT@EXAMPLE.COM ',
    customerName: ' Launch Client '
  }, null);

  assert.equal(payload.currency, 'ZAR');
  assert.equal(payload.customerEmail, 'client@example.com');
  assert.equal(payload.customerName, 'Launch Client');
  assert.equal(payload.description, 'Build A Booking payment');
});

test('manual payment payload allows manual methods only', () => {
  const payload = validateManualPaymentPayload({
    appId: 'build-a-booking-v2',
    businessId: 'owner_123',
    bookingId: 'booking_123',
    paymentMethod: 'manual',
    amountInCents: 4500,
    currency: 'zar'
  });

  assert.equal(payload.paymentMethod, 'manual');
  assert.equal(payload.requestedAmount, 4500);
  assert.equal(payload.currency, 'ZAR');

  assert.throws(
    () => validateManualPaymentPayload({
      appId: 'build-a-booking-v2',
      businessId: 'owner_123',
      bookingId: 'booking_123',
      paymentMethod: 'stripe'
    }),
    /Only cash and manual EFT/
  );
});
