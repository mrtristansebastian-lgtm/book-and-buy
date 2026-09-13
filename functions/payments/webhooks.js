import { createHmac } from 'crypto';
import { safeEqual } from './encrypt.js';
import { applyWebhookPaid } from './gatewayService.js';
import { findOwnerBySlug, loadDecryptedGateway } from './store.js';

/**
 * Stripe: prefer Checkout return confirm; webhook uses merchant webhook secret when stored.
 * Body must be raw string for signature verification.
 */
export async function handleStripeWebhook({
  appId,
  ownerId,
  slug,
  rawBody,
  signature,
  webhookSecret
}) {
  let resolvedOwner = ownerId;
  if (!resolvedOwner && slug) {
    const found = await findOwnerBySlug(appId, slug);
    resolvedOwner = found?.ownerId;
  }
  if (!resolvedOwner) throw new Error('ownerId or slug required for Stripe webhook.');

  let secret = webhookSecret;
  if (!secret) {
    const gateway = await loadDecryptedGateway(appId, resolvedOwner, 'stripe');
    secret = gateway.webhookSecret;
  }
  if (!secret) {
    throw new Error('Stripe webhook signing secret not connected for this business.');
  }

  // Lightweight verification: stripe-signature header t=…,v1=…
  const parts = Object.fromEntries(
    String(signature || '')
      .split(',')
      .map((chunk) => chunk.trim().split('='))
      .filter((pair) => pair.length === 2)
  );
  const signed = `${parts.t}.${rawBody}`;
  const expected = createHmac('sha256', secret).update(signed, 'utf8').digest('hex');
  if (!safeEqual(expected, parts.v1 || '')) {
    throw new Error('Invalid Stripe webhook signature.');
  }

  const event = JSON.parse(rawBody);
  if (event.type !== 'checkout.session.completed') {
    return { ok: true, ignored: true, type: event.type };
  }
  const session = event.data?.object || {};
  return applyWebhookPaid({
    appId,
    ownerId: resolvedOwner,
    gatewayType: 'stripe',
    providerPaymentId: session.payment_intent || session.id,
    attemptId: session.metadata?.attemptId,
    sourceType: session.metadata?.sourceType,
    sourceId: session.metadata?.sourceId
  });
}

export async function handlePaystackWebhook({ appId, ownerId, slug, rawBody, signature }) {
  let resolvedOwner = ownerId;
  if (!resolvedOwner && slug) {
    const found = await findOwnerBySlug(appId, slug);
    resolvedOwner = found?.ownerId;
  }
  if (!resolvedOwner) throw new Error('ownerId or slug required for Paystack webhook.');

  const gateway = await loadDecryptedGateway(appId, resolvedOwner, 'paystack');
  const hash = createHmac('sha512', gateway.secretKey).update(rawBody).digest('hex');
  if (!safeEqual(hash, signature || '')) {
    throw new Error('Invalid Paystack webhook signature.');
  }

  const event = JSON.parse(rawBody);
  if (event.event !== 'charge.success') {
    return { ok: true, ignored: true, type: event.event };
  }
  const data = event.data || {};
  return applyWebhookPaid({
    appId,
    ownerId: resolvedOwner,
    gatewayType: 'paystack',
    providerPaymentId: data.reference,
    attemptId: data.metadata?.attemptId,
    sourceType: data.metadata?.sourceType,
    sourceId: data.metadata?.sourceId
  });
}

export async function handlePayPalWebhook({ appId, ownerId, slug, event }) {
  let resolvedOwner = ownerId;
  if (!resolvedOwner && slug) {
    const found = await findOwnerBySlug(appId, slug);
    resolvedOwner = found?.ownerId;
  }
  if (!resolvedOwner) throw new Error('ownerId or slug required for PayPal webhook.');

  // Full PayPal transmission verification needs cert download; confirmPaymentReturn is primary.
  // Accept CHECKOUT.ORDER.APPROVED / PAYMENT.CAPTURE.COMPLETED when body maps to attempt.
  const type = event?.event_type || '';
  if (
    !['CHECKOUT.ORDER.APPROVED', 'PAYMENT.CAPTURE.COMPLETED', 'CHECKOUT.ORDER.COMPLETED'].includes(
      type
    )
  ) {
    return { ok: true, ignored: true, type };
  }
  const resource = event.resource || {};
  const customId =
    resource.custom_id ||
    resource.purchase_units?.[0]?.custom_id ||
    resource.supplementary_data?.related_ids?.order_id;
  return applyWebhookPaid({
    appId,
    ownerId: resolvedOwner,
    gatewayType: 'paypal',
    providerPaymentId: resource.id,
    attemptId: customId
  });
}
