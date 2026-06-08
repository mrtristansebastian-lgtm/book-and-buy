import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  cleanPublicSlug,
  sanitizePublicPaymentOption
} = require('./publicOptions.js');

test('hosted public payment options expose display fields without credential summaries', () => {
  const option = sanitizePublicPaymentOption('stripe', {
    enabled: true,
    configured: true,
    mode: 'live',
    providerName: 'Stripe',
    credentialSummary: {
      publishableKey: 'public_key_should_not_be_returned',
      secretKey: 'secret_value_should_not_be_returned',
      webhookSecret: 'webhook_value_should_not_be_returned'
    }
  });

  assert.deepEqual(option, {
    id: 'stripe',
    gatewayType: 'stripe',
    name: 'Stripe',
    enabled: true,
    configured: true,
    mode: 'live',
    credentialSummary: {},
    instructions: ''
  });
});

test('manual public payment options preserve only customer-facing EFT fields', () => {
  const option = sanitizePublicPaymentOption('manual_eft', {
    enabled: true,
    mode: 'test',
    providerName: 'Bank transfer',
    credentialSummary: {
      accountHolder: 'Build A Booking',
      bankName: 'Launch Bank',
      accountNumber: '123456789',
      branchCode: '000000',
      accountType: 'Cheque',
      referencePrefix: 'BAB',
      instructions: 'Use your booking reference.',
      secretKey: 'should_not_be_returned'
    }
  });

  assert.equal(option.id, 'manual_eft');
  assert.equal(option.name, 'Bank transfer');
  assert.equal(option.configured, true);
  assert.equal(option.credentialSummary.secretKey, undefined);
  assert.equal(option.credentialSummary.accountNumber, '123456789');
  assert.equal(option.instructions, 'Use your booking reference.');
});

test('disabled and unconfigured hosted payment options stay hidden', () => {
  assert.equal(sanitizePublicPaymentOption('stripe', { enabled: false, configured: true }), null);
  assert.equal(sanitizePublicPaymentOption('yoco', { enabled: true, configured: false }), null);
  assert.equal(sanitizePublicPaymentOption('unknown', { enabled: true, configured: true }), null);
});

test('public booking slugs are normalized and validated', () => {
  assert.equal(cleanPublicSlug('Your-Business'), 'your-business');
  assert.throws(() => cleanPublicSlug('../private'), /valid booking page slug/i);
  assert.throws(() => cleanPublicSlug(''), /valid booking page slug/i);
});
