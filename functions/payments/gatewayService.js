import { encryptSecret, last4 } from './encrypt.js';
import {
  capturePayPalOrder,
  createPayPalOrder,
  createPaystackTransaction,
  createStripeCheckoutSession,
  retrieveStripeCheckoutSession,
  verifyPayPalKeys,
  verifyPaystackKeys,
  verifyPaystackTransaction,
  verifyStripeKeys
} from './providers.js';
import {
  findOwnerBySlug,
  loadDecryptedGateway,
  loadOwnerSettings,
  markSourcePaid,
  paymentAttemptRef,
  paymentSettingsRef,
  patchWorkspaceGatewaySummary,
  resolveSourceFromPayload
} from './store.js';
import { getPublicPaymentOptions, toIsoCurrency } from './publicOptions.js';

const ONLINE = new Set(['stripe', 'paypal', 'paystack']);
const NAMES = {
  stripe: 'Stripe',
  paypal: 'PayPal',
  paystack: 'Paystack',
  manual_eft: 'Manual EFT',
  cash: 'Cash'
};

/** Pure helper kept for local mirrors / tests. */
export function savePaymentGatewaySettings(input = {}) {
  const gatewayType = input.gatewayType;
  if (!gatewayType) throw new Error('gatewayType is required');
  const summary = input.credentialSummary || {};
  const needsKeys = ONLINE.has(gatewayType);
  const configured = needsKeys
    ? Boolean(summary.publicKeyLast4 || summary.secretKeyConfigured)
    : gatewayType === 'manual_eft'
      ? Boolean(summary.accountHolder || summary.bankName || summary.instructions)
      : true;
  return {
    ok: true,
    gatewayType,
    enabled: Boolean(input.enabled),
    mode: input.mode === 'live' ? 'live' : 'test',
    configured,
    credentialSummary: summary,
    updatedAt: Date.now()
  };
}

export async function saveAndVerifyPaymentGateway(payload = {}, authUid) {
  const appId = payload.appId || process.env.APP_ID || 'book-and-buy-v1';
  const ownerId = authUid || payload.ownerId;
  if (!ownerId) throw new Error('Authentication required.');

  const gatewayType = payload.gatewayType;
  if (!gatewayType) throw new Error('gatewayType is required');

  const mode = payload.mode === 'live' ? 'live' : 'test';
  const enabled = payload.enabled !== false;

  if (!ONLINE.has(gatewayType)) {
    const summary = payload.credentialSummary || {};
    const result = savePaymentGatewaySettings({
      gatewayType,
      enabled,
      mode,
      credentialSummary: summary
    });
    await patchWorkspaceGatewaySummary(appId, ownerId, gatewayType, {
      enabled,
      mode,
      configured: result.configured,
      providerName: NAMES[gatewayType],
      credentialSummary: summary
    });
    await paymentSettingsRef(appId, ownerId, gatewayType).set(
      {
        gatewayType,
        mode,
        enabled,
        credentialSummary: summary,
        updatedAt: Date.now(),
        updatedBy: ownerId
      },
      { merge: true }
    );
    return result;
  }

  const publicKey = String(payload.publicKey || payload.clientId || '').trim();
  const secretKey = String(payload.secretKey || '').trim();
  if (!secretKey) throw new Error('Secret key is required to connect.');
  if (!publicKey) {
    throw new Error(
      gatewayType === 'paypal' ? 'Client ID is required.' : 'Public / publishable key is required.'
    );
  }

  if (gatewayType === 'stripe') {
    await verifyStripeKeys({ secretKey, publicKey, mode });
  } else if (gatewayType === 'paypal') {
    await verifyPayPalKeys({ clientId: publicKey, secretKey, mode });
  } else if (gatewayType === 'paystack') {
    await verifyPaystackKeys({ secretKey, publicKey });
  }

  const enc = encryptSecret(secretKey);
  const doc = {
    gatewayType,
    mode,
    enabled,
    publicKey: gatewayType === 'paypal' ? undefined : publicKey,
    clientId: gatewayType === 'paypal' ? publicKey : undefined,
    secretCiphertext: enc.ciphertext,
    secretIv: enc.iv,
    updatedAt: Date.now(),
    updatedBy: ownerId
  };

  if (payload.webhookSecret) {
    const wh = encryptSecret(String(payload.webhookSecret));
    doc.webhookSecretCiphertext = wh.ciphertext;
    doc.webhookSecretIv = wh.iv;
  }

  await paymentSettingsRef(appId, ownerId, gatewayType).set(doc, { merge: true });

  const credentialSummary = {
    publicKeyLast4: last4(publicKey),
    secretKeyConfigured: true,
    webhookConfigured: Boolean(payload.webhookSecret)
  };

  await patchWorkspaceGatewaySummary(appId, ownerId, gatewayType, {
    enabled,
    mode,
    configured: true,
    providerName: NAMES[gatewayType],
    credentialSummary
  });

  return {
    ok: true,
    gatewayType,
    enabled,
    mode,
    configured: true,
    credentialSummary,
    updatedAt: Date.now()
  };
}

export async function disconnectPaymentGateway(payload = {}, authUid) {
  const appId = payload.appId || process.env.APP_ID || 'book-and-buy-v1';
  const ownerId = authUid || payload.ownerId;
  if (!ownerId) throw new Error('Authentication required.');
  const gatewayType = payload.gatewayType;
  if (!gatewayType) throw new Error('gatewayType is required');

  await paymentSettingsRef(appId, ownerId, gatewayType).delete().catch(() => {});
  await patchWorkspaceGatewaySummary(appId, ownerId, gatewayType, {
    enabled: false,
    configured: false,
    credentialSummary: {}
  });
  return { ok: true, gatewayType };
}

function amountFromSource(source, workspace) {
  if (source?.amountInCents != null) return Math.round(Number(source.amountInCents) || 0);
  if (source?.price != null) {
    const n = Number(source.price);
    if (Number.isFinite(n)) return Math.round(n * 100);
  }
  const service = (workspace.services || []).find((row) => row.id === source?.serviceId);
  if (service?.price != null) {
    const n = Number(service.price);
    if (Number.isFinite(n)) return Math.round(n * 100);
  }
  return 0;
}

export async function initiatePayment(payload = {}) {
  const appId = payload.appId || process.env.APP_ID || 'book-and-buy-v1';
  const gatewayType = payload.gatewayType;
  if (!ONLINE.has(gatewayType)) {
    throw new Error('Online payment gateway required (stripe, paypal, or paystack).');
  }

  const slug = payload.slug || payload.publicSlug;
  let ownerId = payload.businessId || payload.ownerId;
  let workspace = {};

  if (slug) {
    const found = await findOwnerBySlug(appId, slug);
    if (!found?.ownerId) throw new Error('Business not found for this public link.');
    ownerId = found.ownerId;
    workspace = (await loadOwnerSettings(appId, ownerId)) || found.workspace || {};
  } else if (ownerId) {
    workspace = await loadOwnerSettings(appId, ownerId);
  } else {
    throw new Error('slug or businessId is required.');
  }

  const { sourceType, sourceId } = resolveSourceFromPayload(payload);
  if (!sourceId) throw new Error('sourceId (booking or order id) is required.');

  const listKey = sourceType === 'order' ? 'orders' : 'bookings';
  const source = (workspace[listKey] || []).find((item) => item.id === sourceId);
  if (!source) throw new Error(`${sourceType} not found.`);

  const amountInCents =
    payload.amountInCents != null
      ? Math.round(Number(payload.amountInCents) || 0)
      : amountFromSource(source, workspace);
  if (amountInCents <= 0) {
    throw new Error('Amount must be greater than zero to start online payment.');
  }

  const gateway = await loadDecryptedGateway(appId, ownerId, gatewayType);
  const iso = toIsoCurrency(payload.currency || workspace.currency || source.currency || 'R');
  const description =
    payload.description ||
    source.serviceName ||
    source.workspaceName ||
    `${workspace.brandName || 'Business'} payment`;
  const customerEmail = payload.customerEmail || source.clientEmail || '';
  const successUrl = payload.successUrl;
  const cancelUrl = payload.cancelUrl;
  if (!successUrl || !cancelUrl) {
    throw new Error('successUrl and cancelUrl are required.');
  }

  const attemptId = `pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const successWithAttempt = successUrl.includes('?')
    ? `${successUrl}&attemptId=${encodeURIComponent(attemptId)}&gateway=${gatewayType}`
    : `${successUrl}?attemptId=${encodeURIComponent(attemptId)}&gateway=${gatewayType}`;

  let provider;
  if (gatewayType === 'stripe') {
    provider = await createStripeCheckoutSession({
      secretKey: gateway.secretKey,
      amountInCents,
      currency: iso,
      description,
      customerEmail,
      successUrl: successWithAttempt,
      cancelUrl,
      metadata: { attemptId, sourceType, sourceId, ownerId, appId }
    });
  } else if (gatewayType === 'paypal') {
    provider = await createPayPalOrder({
      clientId: gateway.clientId,
      secretKey: gateway.secretKey,
      mode: gateway.mode,
      amountInCents,
      currency: iso.toUpperCase(),
      description,
      successUrl: successWithAttempt,
      cancelUrl,
      customId: attemptId
    });
  } else {
    provider = await createPaystackTransaction({
      secretKey: gateway.secretKey,
      amountInCents,
      email: customerEmail || 'customer@example.com',
      currency: iso.toUpperCase(),
      description,
      callbackUrl: successWithAttempt,
      metadata: { attemptId, sourceType, sourceId, ownerId, appId }
    });
  }

  if (!provider?.url) throw new Error('Provider did not return a redirect URL.');

  await paymentAttemptRef(appId, ownerId, attemptId).set({
    id: attemptId,
    gatewayType,
    sourceType,
    sourceId,
    amountInCents,
    currency: iso,
    status: 'redirected',
    providerRef: provider.id || '',
    createdAt: Date.now(),
    ownerId,
    slug: slug || workspace.slug || ''
  });

  return {
    ok: true,
    redirectUrl: provider.url,
    attemptId,
    providerRef: provider.id || ''
  };
}

export async function confirmPaymentReturn(payload = {}) {
  const appId = payload.appId || process.env.APP_ID || 'book-and-buy-v1';
  const attemptId = payload.attemptId;
  const gatewayType = payload.gatewayType;
  const providerRef =
    payload.providerRef || payload.session_id || payload.token || payload.reference;

  let ownerId = payload.ownerId || payload.businessId;
  let attempt = null;

  if (payload.slug && !ownerId) {
    const found = await findOwnerBySlug(appId, payload.slug);
    ownerId = found?.ownerId;
  }

  if (!attemptId) throw new Error('attemptId is required to confirm payment.');
  if (!ownerId) throw new Error('Could not resolve business for this payment.');

  const snap = await paymentAttemptRef(appId, ownerId, attemptId).get();
  if (!snap.exists) throw new Error('Payment attempt not found.');
  attempt = { id: snap.id, ...snap.data() };

  const gw = gatewayType || attempt.gatewayType;
  const gateway = await loadDecryptedGateway(appId, ownerId, gw);
  const ref =
    gw === 'paypal'
      ? attempt.providerRef || providerRef
      : providerRef || attempt.providerRef;

  let paid = false;
  let providerPaymentId = ref;

  if (gw === 'stripe') {
    const session = await retrieveStripeCheckoutSession({
      secretKey: gateway.secretKey,
      sessionId: ref
    });
    paid = session.payment_status === 'paid' || session.status === 'complete';
    providerPaymentId = session.payment_intent || session.id;
  } else if (gw === 'paypal') {
    const captured = await capturePayPalOrder({
      clientId: gateway.clientId,
      secretKey: gateway.secretKey,
      mode: gateway.mode,
      orderId: ref
    });
    paid = ['COMPLETED', 'APPROVED'].includes(captured.status);
    providerPaymentId = captured.id;
  } else if (gw === 'paystack') {
    const txn = await verifyPaystackTransaction({
      secretKey: gateway.secretKey,
      reference: ref || attempt.providerRef
    });
    paid = txn.status === 'success';
    providerPaymentId = txn.reference || txn.id;
  }

  if (!paid) {
    return { ok: false, paid: false, reason: 'Payment not completed yet.' };
  }

  await markSourcePaid({
    appId,
    ownerId,
    sourceType: attempt.sourceType,
    sourceId: attempt.sourceId,
    providerPaymentId,
    gatewayType: gw
  });

  await paymentAttemptRef(appId, ownerId, attempt.id).set(
    {
      status: 'paid',
      paidAt: Date.now(),
      providerPaymentId
    },
    { merge: true }
  );

  return { ok: true, paid: true, attemptId: attempt.id, providerPaymentId };
}

export async function applyWebhookPaid({
  appId,
  ownerId,
  gatewayType,
  providerPaymentId,
  attemptId,
  sourceType,
  sourceId
}) {
  if (attemptId) {
    const snap = await paymentAttemptRef(appId, ownerId, attemptId).get();
    if (snap.exists) {
      const attempt = snap.data();
      await markSourcePaid({
        appId,
        ownerId,
        sourceType: attempt.sourceType,
        sourceId: attempt.sourceId,
        providerPaymentId,
        gatewayType
      });
      await paymentAttemptRef(appId, ownerId, attemptId).set(
        { status: 'paid', paidAt: Date.now(), providerPaymentId },
        { merge: true }
      );
      return { ok: true };
    }
  }
  if (sourceType && sourceId) {
    await markSourcePaid({
      appId,
      ownerId,
      sourceType,
      sourceId,
      providerPaymentId,
      gatewayType
    });
    return { ok: true };
  }
  return { ok: false, reason: 'Could not map webhook to a payment attempt.' };
}

export { getPublicPaymentOptions };
