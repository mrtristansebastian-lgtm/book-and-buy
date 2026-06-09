import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const Module = require('node:module');
const { createGatewayPayment } = require('./gatewayFactory.js');

const basePayment = (overrides = {}) => ({
  appId: 'build-a-booking-v2',
  businessId: 'owner_launch_qa',
  bookingId: 'booking_launch_qa',
  paymentId: `pay_${overrides.gatewayType || 'test'}_123`,
  amountInCents: 12500,
  currency: 'ZAR',
  description: 'Launch QA booking',
  customerEmail: 'client@example.com',
  customerName: 'Launch Client',
  mode: 'test',
  successUrl: 'https://build-a-booking.web.app/#/payment/success',
  cancelUrl: 'https://build-a-booking.web.app/#/payment/cancel',
  metadata: {
    appId: 'build-a-booking-v2',
    businessId: 'owner_launch_qa',
    bookingId: 'booking_launch_qa',
    paymentId: `pay_${overrides.gatewayType || 'test'}_123`
  },
  ...overrides
});

const request = {
  rawRequest: {
    headers: {
      host: 'us-central1-build-a-booking.cloudfunctions.net'
    }
  }
};

const withMockedFetch = async (handler, assertion) => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    return handler(url, options);
  };
  try {
    await assertion(calls);
  } finally {
    globalThis.fetch = originalFetch;
  }
};

test('stripe checkout uses server credentials and idempotent payment reference', async () => {
  const originalLoad = Module._load;
  let capturedSession = null;
  Module._load = function patchedLoad(requestName, parent, isMain) {
    if (requestName === 'stripe') {
      return function Stripe(secretKey) {
        assert.equal(secretKey, 'sk_test_launch');
        return {
          checkout: {
            sessions: {
              create: async (payload, options) => {
                capturedSession = { payload, options };
                return {
                  id: 'cs_test_launch',
                  url: 'https://checkout.stripe.test/session/cs_test_launch',
                  payment_status: 'unpaid'
                };
              }
            }
          }
        };
      };
    }
    return originalLoad.call(this, requestName, parent, isMain);
  };

  try {
    const result = await createGatewayPayment({
      gatewayType: 'stripe',
      credentials: { secretKey: 'sk_test_launch' },
      request,
      payment: basePayment({ gatewayType: 'stripe', paymentId: 'pay_stripe_123' })
    });

    assert.equal(result.checkoutUrl, 'https://checkout.stripe.test/session/cs_test_launch');
    assert.equal(result.providerReference, 'cs_test_launch');
    assert.equal(capturedSession.options.idempotencyKey, 'pay_stripe_123');
    assert.equal(capturedSession.payload.client_reference_id, 'pay_stripe_123');
    assert.equal(capturedSession.payload.line_items[0].price_data.unit_amount, 12500);
    assert.equal(capturedSession.payload.line_items[0].price_data.currency, 'zar');
  } finally {
    Module._load = originalLoad;
  }
});

test('paystack checkout initializes with authorization header and booking metadata', async () => {
  await withMockedFetch(async (url, options) => {
    assert.equal(url, 'https://api.paystack.co/transaction/initialize');
    assert.equal(options.headers.Authorization, 'Bearer sk_paystack_launch');
    const body = JSON.parse(options.body);
    assert.equal(body.email, 'client@example.com');
    assert.equal(body.amount, 12500);
    assert.equal(body.currency, 'ZAR');
    assert.equal(body.reference, 'pay_paystack_123');
    assert.equal(body.metadata.bookingId, 'booking_launch_qa');
    return {
      ok: true,
      json: async () => ({
        status: true,
        data: {
          authorization_url: 'https://checkout.paystack.test/pay/pay_paystack_123',
          reference: 'pay_paystack_123'
        }
      })
    };
  }, async () => {
    const result = await createGatewayPayment({
      gatewayType: 'paystack',
      credentials: { secretKey: 'sk_paystack_launch' },
      request,
      payment: basePayment({ gatewayType: 'paystack', paymentId: 'pay_paystack_123' })
    });

    assert.equal(result.checkoutUrl, 'https://checkout.paystack.test/pay/pay_paystack_123');
    assert.equal(result.providerReference, 'pay_paystack_123');
  });
});

test('yoco checkout sends hosted checkout payload without exposing credentials', async () => {
  await withMockedFetch(async (url, options) => {
    assert.equal(url, 'https://payments.yoco.com/api/checkouts');
    assert.equal(options.headers.Authorization, 'Bearer sk_yoco_launch');
    const body = JSON.parse(options.body);
    assert.equal(body.amount, 12500);
    assert.equal(body.currency, 'ZAR');
    assert.equal(body.metadata.paymentId, 'pay_yoco_123');
    assert.equal(body.successUrl, 'https://build-a-booking.web.app/#/payment/success');
    assert.equal(body.cancelUrl, 'https://build-a-booking.web.app/#/payment/cancel');
    return {
      ok: true,
      json: async () => ({
        id: 'chk_yoco_launch',
        redirectUrl: 'https://checkout.yoco.test/chk_yoco_launch'
      })
    };
  }, async () => {
    const result = await createGatewayPayment({
      gatewayType: 'yoco',
      credentials: { secretKey: 'sk_yoco_launch' },
      request,
      payment: basePayment({ gatewayType: 'yoco', paymentId: 'pay_yoco_123' })
    });

    assert.equal(result.checkoutUrl, 'https://checkout.yoco.test/chk_yoco_launch');
    assert.equal(result.providerReference, 'chk_yoco_launch');
  });
});

test('payfast checkout builds sandbox URL with signed return, cancel, and notify fields', async () => {
  const result = await createGatewayPayment({
    gatewayType: 'payfast',
    credentials: {
      merchantId: '10000100',
      merchantKey: 'merchant_key_launch',
      passphrase: 'launch-passphrase'
    },
    request,
    payment: basePayment({ gatewayType: 'payfast', paymentId: 'pay_payfast_123' })
  });

  const url = new URL(result.checkoutUrl);
  assert.equal(url.origin + url.pathname, 'https://sandbox.payfast.co.za/eng/process');
  assert.equal(url.searchParams.get('merchant_id'), '10000100');
  assert.equal(url.searchParams.get('merchant_key'), 'merchant_key_launch');
  assert.equal(url.searchParams.get('m_payment_id'), 'pay_payfast_123');
  assert.equal(url.searchParams.get('amount'), '125.00');
  assert.equal(url.searchParams.get('custom_str1'), 'build-a-booking-v2');
  assert.equal(url.searchParams.get('custom_str2'), 'owner_launch_qa');
  assert.equal(url.searchParams.get('custom_str3'), 'booking_launch_qa');
  assert.match(url.searchParams.get('notify_url'), /payfastWebhook/);
  assert.match(url.searchParams.get('signature'), /^[a-f0-9]{32}$/);
  assert.equal(result.providerReference, 'pay_payfast_123');
});

test('hosted checkout refuses missing required credentials before network calls', async () => {
  await assert.rejects(
    () => createGatewayPayment({
      gatewayType: 'paystack',
      credentials: {},
      request,
      payment: basePayment({ gatewayType: 'paystack' })
    }),
    /Paystack is missing secretKey/
  );
});
