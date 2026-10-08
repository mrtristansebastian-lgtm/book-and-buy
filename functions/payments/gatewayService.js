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
  paymentAttemptRef,
  paymentSettingsRef,
  patchWorkspaceGatewaySummary,
  resolveSourceFromPayload
} from './store.js';
import { getPublicPaymentOptions } from './publicOptions.js';
import { getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { readWorkspace,writeWorkspace } from '../workspaceStore.js';
import { reservationRef } from '../inventoryService.js';
import { settleVerifiedPayment } from './settlement.js';
import { paymentAppId, canonicalPayment, validatePaymentReturnUrls, paymentAttemptKey, paymentReturnUrl, configuredPaymentOrigins } from './paymentPolicy.js';
import { assertPublishedWorkspace } from '../commercePolicy.js';

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
  const appId = paymentAppId(payload.appId);
  const ownerId = authUid || payload.ownerId;
  if (!ownerId) throw new Error('Authentication required.');

  const gatewayType = payload.gatewayType;
  if (!Object.hasOwn(NAMES,gatewayType)) throw new Error('Choose a supported payment gateway.');

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
    ...(gatewayType === 'paypal' ? {clientId:publicKey} : {publicKey}),
    secretCiphertext: enc.ciphertext,
    secretIv: enc.iv,
    updatedAt: Date.now(),
    updatedBy: ownerId
  };
  if (gatewayType === 'paypal' && payload.webhookId) {
    if (!/^[a-zA-Z0-9-]{1,128}$/.test(payload.webhookId)) throw new Error('Invalid PayPal webhook ID.');
    doc.webhookId = payload.webhookId;
  }

  if (payload.webhookSecret) {
    const wh = encryptSecret(String(payload.webhookSecret));
    doc.webhookSecretCiphertext = wh.ciphertext;
    doc.webhookSecretIv = wh.iv;
  }

  await paymentSettingsRef(appId, ownerId, gatewayType).set(doc, { merge: true });

  const credentialSummary = {
    publicKeyLast4: last4(publicKey),
    secretKeyConfigured: true,
    webhookConfigured: Boolean(payload.webhookSecret || payload.webhookId)
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
  const appId = paymentAppId(payload.appId);
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

export { getPublicPaymentOptions };

/** Resolve trusted return origins from deployment config and verified domain records. */
async function paymentOrigins(db,appId,ownerId) {
  const projectId = getApp().options.projectId || process.env.GCLOUD_PROJECT;
  const origins = configuredPaymentOrigins(process.env,projectId);
  const domain = await db.doc(`artifacts/${appId}/users/${ownerId}/private/customDomain`).get();
  if (domain.exists && domain.data().status === 'connected') origins.push(`https://${domain.data().domain}`);
  return origins;
}
export async function initiatePayment(payload = {}) {
  const appId = paymentAppId(payload.appId); const db = getFirestore();
  if (!ONLINE.has(payload.gatewayType)) throw new Error('Choose a supported online payment gateway.');
  const slug = payload.slug || payload.publicSlug;
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(slug || '')) throw new Error('A published business address is required.');
  const found = await findOwnerBySlug(appId,slug); if (!found?.ownerId || found.workspace?.published === false) throw new Error('Business not found.');
  const ownerId = found.ownerId;
  if (payload.ownerId && payload.ownerId !== ownerId || payload.businessId && payload.businessId !== ownerId) throw new Error('Business ownership does not match.');
  const {sourceType,sourceId} = resolveSourceFromPayload(payload);
  if (!['order','booking'].includes(sourceType) || !/^[a-zA-Z0-9_-]{1,128}$/.test(sourceId || '')) throw new Error('A valid transaction is required.');
  if (payload.requestId && !/^[a-zA-Z0-9_-]{1,128}$/.test(payload.requestId)) throw new Error('Invalid payment request identifier.');
  const urls = validatePaymentReturnUrls(payload.successUrl,payload.cancelUrl,await paymentOrigins(db,appId,ownerId),Boolean(process.env.FUNCTIONS_EMULATOR));
  const requestId = payload.requestId || 'legacy-checkout';
  const attemptId = paymentAttemptKey(ownerId,sourceType,sourceId,payload.gatewayType,requestId);
  const attemptRef = db.doc(`artifacts/${appId}/users/${ownerId}/payment_attempts/${attemptId}`);
  const fingerprint = createHash('sha256').update(JSON.stringify({ sourceType,sourceId,gatewayType:payload.gatewayType,...urls })).digest('hex');
  const preparation = await db.runTransaction(async (tx) => {
    const [{workspace,exists},previous] = await Promise.all([readWorkspace(db,ownerId,tx),tx.get(attemptRef)]);
    if (!exists) throw new Error('Business unavailable.');
    const profile = await tx.get(db.doc(`artifacts/${appId}/public/data/workspaces/${slug}`));
    assertPublishedWorkspace(workspace,profile.exists ? profile.data() : null,slug,ownerId);
    if (previous.exists) {
      const prior = previous.data(); if (prior.fingerprint !== fingerprint) throw new Error('Payment request identifier already used.');
      if (prior.status === 'paid') throw new Error('This payment has already completed.');
      if (prior.status === 'creating' && Date.now() - prior.updatedAt < 30000) throw new Error('This payment is being prepared. Retry shortly.');
    }
    const source = (workspace[sourceType === 'order' ? 'orders' : 'bookings'] || []).find((item) => item.id === sourceId);
    const amount = canonicalPayment(source,workspace,{ ...payload,sourceType });
    if (source.paymentAttemptId && source.paymentAttemptId !== attemptId) throw new Error('A payment has already started for this transaction. Use its original checkout.');
    if (sourceType === 'order') { const hold = await tx.get(reservationRef(db,ownerId,sourceId)); if (!hold.exists || hold.data().status !== 'reserved' || hold.data().expiresAtMs <= Date.now()) throw new Error('The inventory hold has expired. Create a new order.'); }
    if (previous.data()?.redirectUrl) return { replay:previous.data() };
    const attempt = { id:attemptId,ownerId,slug,sourceType,sourceId,gatewayType:payload.gatewayType,...amount,fingerprint,status:'creating',createdAt:previous.data()?.createdAt || Date.now(),updatedAt:Date.now() };
    const field = sourceType === 'order' ? 'orders' : 'bookings';
    writeWorkspace(tx,db,ownerId,workspace,{...workspace,[field]:workspace[field].map((item) => item.id === sourceId ? {...item,paymentAttemptId:attemptId,revision:(item.revision || 0)+1} : item)});
    tx.set(attemptRef,attempt); return { attempt,source,workspace };
  });
  if (preparation.replay) return { ok:true,redirectUrl:preparation.replay.redirectUrl,attemptId,providerRef:preparation.replay.providerRef };
  const {attempt,source,workspace} = preparation;
  try {
    const gateway = await loadDecryptedGateway(appId,ownerId,payload.gatewayType);
    const successUrl = paymentReturnUrl(urls.successUrl,attemptId,payload.gatewayType);
    const description = source.serviceName || source.workspaceName || `${workspace.brandName || 'Business'} payment`;
    const common = { amountInCents:attempt.amountInCents,currency:attempt.currency,description,successUrl,cancelUrl:urls.cancelUrl,idempotencyKey:attemptId };
    const metadata = {attemptId,sourceType,sourceId,ownerId,appId};
    let provider;
    if (payload.gatewayType === 'stripe') provider = await createStripeCheckoutSession({ ...common,secretKey:gateway.secretKey,customerEmail:source.clientEmail || '',metadata });
    else if (payload.gatewayType === 'paypal') provider = await createPayPalOrder({ ...common,clientId:gateway.clientId,secretKey:gateway.secretKey,mode:gateway.mode,customId:attemptId });
    else provider = await createPaystackTransaction({ ...common,secretKey:gateway.secretKey,email:source.clientEmail,callbackUrl:successUrl,metadata,reference:attemptId });
    if (!provider?.url || !provider.id) throw new Error('Provider did not return a checkout.');
    await db.runTransaction(async (tx) => { const saved = await tx.get(attemptRef); tx.update(attemptRef,{status:saved.data()?.status === 'paid' ? 'paid' : 'redirected',providerRef:provider.id,redirectUrl:provider.url,updatedAt:Date.now()}); });
    return {ok:true,redirectUrl:provider.url,attemptId,providerRef:provider.id};
  } catch (error) { await db.runTransaction(async (tx) => { const saved = await tx.get(attemptRef); if (saved.data()?.status !== 'paid') tx.update(attemptRef,{status:'failed',updatedAt:Date.now()}); }); throw error; }
}
export async function confirmPaymentReturn(payload = {}) {
  const appId = paymentAppId(payload.appId);
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(payload.attemptId || '')) throw new Error('A valid payment attempt is required.');
  const found = payload.slug ? await findOwnerBySlug(appId,payload.slug) : null;
  const ownerId = found?.ownerId || payload.ownerId || payload.businessId;
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(ownerId || '')) throw new Error('A valid business is required.');
  const snap = await paymentAttemptRef(appId,ownerId,payload.attemptId).get(); if (!snap.exists) throw new Error('Payment attempt not found.');
  const attempt = snap.data(); const gatewayType = payload.gatewayType || attempt.gatewayType;
  const providedRef = payload.providerRef || payload.session_id || payload.token || payload.reference;
  if (gatewayType !== attempt.gatewayType || providedRef && providedRef !== attempt.providerRef) throw new Error('Payment provider reference does not match.');
  if (attempt.status === 'paid') return {ok:true,paid:true,attemptId:payload.attemptId,inventoryException:attempt.inventoryException === true};
  const gateway = await loadDecryptedGateway(appId,ownerId,gatewayType);
  let evidence = null;
  if (gatewayType === 'stripe') {
    const session = await retrieveStripeCheckoutSession({secretKey:gateway.secretKey,sessionId:attempt.providerRef});
    if (session.payment_status === 'paid') evidence = {providerPaymentId:session.payment_intent || session.id,providerRef:session.id,amountInCents:session.amount_total,currency:session.currency,sourceType:session.metadata?.sourceType,sourceId:session.metadata?.sourceId};
  } else if (gatewayType === 'paypal') {
    const captured = await capturePayPalOrder({clientId:gateway.clientId,secretKey:gateway.secretKey,mode:gateway.mode,orderId:attempt.providerRef,idempotencyKey:attempt.id});
    const captures = (captured.purchase_units || []).flatMap((unit) => unit.payments?.captures || []);
    if (captured.status === 'COMPLETED' && captures.length === 1 && captures[0].status === 'COMPLETED') evidence = {providerPaymentId:captures[0].id,providerRef:captured.id,amountInCents:Math.round(Number(captures[0].amount?.value) * 100),currency:captures[0].amount?.currency_code};
  } else if (gatewayType === 'paystack') {
    const txn = await verifyPaystackTransaction({secretKey:gateway.secretKey,reference:attempt.providerRef});
    if (txn.status === 'success') evidence = {providerPaymentId:txn.reference,providerRef:txn.reference,amountInCents:txn.amount,currency:txn.currency,sourceType:txn.metadata?.sourceType,sourceId:txn.metadata?.sourceId};
  }
  if (!evidence) return {ok:false,paid:false,reason:'Payment not completed yet.'};
  return settleVerifiedPayment({appId,ownerId,attemptId:payload.attemptId,gatewayType,...evidence});
}
export async function applyWebhookPaid(data) { return settleVerifiedPayment(data); }
