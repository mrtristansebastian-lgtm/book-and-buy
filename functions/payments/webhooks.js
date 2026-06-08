const crypto = require('crypto');
const { onRequest } = require('firebase-functions/v2/https');
const { PAYMENT_SETTINGS_ENCRYPTION_KEY, hmacHex, safeCompareHex } = require('./crypto');
const { payfastSignature, queryString } = require('./gatewayFactory');
const {
  cleanString,
  getGatewayConfig,
  normalizeCurrency,
  normalizeGatewayType,
  requireAppId,
  requireBusinessId,
  updateSuccessfulPayment
} = require('./shared');

const parseJsonBody = (req) => {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const raw = req.rawBody || Buffer.from('');
  if (!raw.length) return {};
  try {
    return JSON.parse(raw.toString('utf8'));
  } catch {
    return {};
  }
};

const parseUrlEncodedBody = (req) => {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const params = new URLSearchParams((req.rawBody || Buffer.from('')).toString('utf8'));
  return Array.from(params.entries()).reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});
};

const centsFromDecimal = (value) => {
  const normalized = Number.parseFloat(String(value || '0').replace(',', '.'));
  if (!Number.isFinite(normalized) || normalized <= 0) return 0;
  return Math.round(normalized * 100);
};

const getTenant = (req) => ({
  appId: requireAppId(req.query?.appId),
  businessId: requireBusinessId(req.query?.businessId)
});

const sendOk = (res, body = { received: true }) => res.status(200).json(body);
const sendDenied = (res, message = 'Invalid signature') => res.status(401).json({ ok: false, message });

const wrapWebhook = (gatewayType, handler) => onRequest({
  region: 'us-central1',
  cors: false,
  maxInstances: 1,
  secrets: [PAYMENT_SETTINGS_ENCRYPTION_KEY]
}, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const tenant = getTenant(req);
    const gateway = normalizeGatewayType(gatewayType);
    const { credentials } = await getGatewayConfig({ ...tenant, gatewayType: gateway });
    const result = await handler({ req, credentials, ...tenant, gatewayType: gateway });
    if (!result?.paid) {
      sendOk(res, { received: true, ignored: true });
      return;
    }
    if (!cleanString(result.eventId, 240)) {
      throw new Error('Verified payment webhook did not include a stable event id.');
    }

    await updateSuccessfulPayment({
      ...tenant,
      gatewayType: gateway,
      eventId: result.eventId,
      paymentId: result.paymentId,
      bookingId: result.bookingId,
      amountInCents: result.amountInCents,
      currency: result.currency,
      providerReference: result.providerReference,
      rawEvent: result.rawEvent
    });
    sendOk(res);
  } catch (error) {
    console.error(`${gatewayType} webhook failed`, error);
    if (error?.message === 'INVALID_SIGNATURE') {
      sendDenied(res);
      return;
    }
    res.status(400).json({ ok: false, message: error?.message || 'Webhook failed' });
  }
});

const stripeWebhook = wrapWebhook('stripe', async ({ req, credentials }) => {
  const Stripe = require('stripe');
  const signature = req.headers['stripe-signature'];
  const webhookSecret = cleanString(credentials.webhookSecret, 2000);
  if (!signature || !webhookSecret) throw new Error('INVALID_SIGNATURE');
  const stripe = new Stripe(cleanString(credentials.secretKey, 2000));
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
  } catch {
    throw new Error('INVALID_SIGNATURE');
  }

  const object = event.data?.object || {};
  const metadata = object.metadata || {};
  const paid = event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded';
  return {
    paid,
    eventId: event.id,
    paymentId: object.client_reference_id || metadata.paymentId || object.id,
    bookingId: metadata.bookingId || '',
    amountInCents: Number(object.amount_total || object.amount_received || metadata.amountInCents || 0),
    currency: normalizeCurrency(object.currency || metadata.currency || 'ZAR'),
    providerReference: object.payment_intent || object.id,
    rawEvent: { id: event.id, type: event.type }
  };
});

const paystackWebhook = wrapWebhook('paystack', async ({ req, credentials }) => {
  const signature = cleanString(req.headers['x-paystack-signature'], 500);
  const expected = hmacHex('sha512', credentials.secretKey, req.rawBody || Buffer.from(''));
  if (!safeCompareHex(expected, signature)) throw new Error('INVALID_SIGNATURE');
  const body = parseJsonBody(req);
  const data = body.data || {};
  return {
    paid: body.event === 'charge.success' && data.status === 'success',
    eventId: cleanString(body.event) + '_' + cleanString(data.id || data.reference, 120),
    paymentId: cleanString(data.reference, 160),
    bookingId: cleanString(data.metadata?.bookingId, 160),
    amountInCents: Number(data.amount || data.metadata?.amountInCents || 0),
    currency: normalizeCurrency(data.currency || data.metadata?.currency || 'ZAR'),
    providerReference: cleanString(data.id || data.reference, 180),
    rawEvent: { event: body.event, reference: data.reference }
  };
});

const payfastWebhook = wrapWebhook('payfast', async ({ req, credentials }) => {
  const body = parseUrlEncodedBody(req);
  const receivedSignature = cleanString(body.signature, 500).toLowerCase();
  const expectedSignature = payfastSignature(body, cleanString(credentials.passphrase, 500)).toLowerCase();
  if (!safeCompareHex(expectedSignature, receivedSignature)) throw new Error('INVALID_SIGNATURE');

  const validateHost = cleanString(body.test_mode) === '1'
    ? 'https://sandbox.payfast.co.za/eng/query/validate'
    : 'https://www.payfast.co.za/eng/query/validate';
  try {
    const validateResponse = await fetch(validateHost, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: queryString(body)
    });
    const validateText = await validateResponse.text();
    if (!validateResponse.ok || !validateText.includes('VALID')) {
      throw new Error('INVALID_SIGNATURE');
    }
  } catch (error) {
    console.error('Payfast validation postback failed', error);
    throw error;
  }

  return {
    paid: cleanString(body.payment_status).toUpperCase() === 'COMPLETE',
    eventId: cleanString(body.pf_payment_id || body.m_payment_id, 180),
    paymentId: cleanString(body.m_payment_id, 160),
    bookingId: cleanString(body.custom_str3, 160),
    amountInCents: centsFromDecimal(body.amount_gross),
    currency: 'ZAR',
    providerReference: cleanString(body.pf_payment_id, 180),
    rawEvent: { pf_payment_id: body.pf_payment_id, payment_status: body.payment_status }
  };
});

const yocoWebhook = wrapWebhook('yoco', async ({ req, credentials }) => {
  const signature = cleanString(req.headers['webhook-signature'] || req.headers['x-yoco-signature'], 1000);
  const webhookSecret = cleanString(credentials.webhookSecret || credentials.secretKey, 2000);
  const id = cleanString(req.headers['webhook-id'], 300);
  const timestamp = cleanString(req.headers['webhook-timestamp'], 80);
  if (!signature || !webhookSecret || !id || !timestamp) throw new Error('INVALID_SIGNATURE');
  const timestampMs = Number(timestamp) * 1000;
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 3 * 60 * 1000) {
    throw new Error('INVALID_SIGNATURE');
  }

  const rawText = (req.rawBody || Buffer.from('')).toString('utf8');
  const signedPayload = `${id}.${timestamp}.${rawText}`;
  const secretBytes = webhookSecret.startsWith('whsec_')
    ? Buffer.from(webhookSecret.split('_')[1], 'base64')
    : Buffer.from(webhookSecret, 'utf8');
  const expected = crypto.createHmac('sha256', secretBytes).update(signedPayload).digest('base64');
  const incomingSignatures = signature
    .split(' ')
    .map((part) => part.includes(',') ? part.split(',')[1] : part)
    .filter(Boolean);
  if (!incomingSignatures.some((incoming) => Buffer.from(incoming).length === Buffer.from(expected).length && crypto.timingSafeEqual(Buffer.from(incoming), Buffer.from(expected)))) {
    throw new Error('INVALID_SIGNATURE');
  }

  const body = parseJsonBody(req);
  const data = body.payload || body.data || body;
  const metadata = data.metadata || data.checkout?.metadata || {};
  const status = cleanString(data.status || data.paymentStatus || body.type, 80).toLowerCase();
  return {
    paid: status.includes('success') || status.includes('paid') || cleanString(body.type).includes('succeeded'),
    eventId: cleanString(body.id || data.id || data.checkoutId || data.paymentId, 180),
    paymentId: cleanString(metadata.paymentId || data.metadata?.paymentId || data.id, 160),
    bookingId: cleanString(metadata.bookingId, 160),
    amountInCents: Number(data.amount || data.amountInCents || metadata.amountInCents || 0),
    currency: normalizeCurrency(data.currency || metadata.currency || 'ZAR'),
    providerReference: cleanString(data.id || data.paymentId || data.checkoutId, 180),
    rawEvent: { id: body.id || data.id, type: body.type || data.status }
  };
});

module.exports = {
  payfastWebhook,
  paystackWebhook,
  stripeWebhook,
  yocoWebhook
};
