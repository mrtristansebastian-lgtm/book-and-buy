import { getFirestore } from 'firebase-admin/firestore';
import { decryptSecret } from './encrypt.js';
import { pathJoin } from './publicOptions.js';

export function settingsDocRef(appId, ownerId) {
  return getFirestore().doc(pathJoin('artifacts', appId, 'users', ownerId, 'config', 'settings'));
}

export function paymentSettingsRef(appId, ownerId, gatewayId) {
  return getFirestore().doc(
    pathJoin('artifacts', appId, 'users', ownerId, 'payment_settings', gatewayId)
  );
}

export function paymentAttemptRef(appId, ownerId, attemptId) {
  return getFirestore().doc(
    pathJoin('artifacts', appId, 'users', ownerId, 'payment_attempts', attemptId)
  );
}

export async function findOwnerBySlug(appId, slug) {
  const snap = await getFirestore()
    .doc(pathJoin('artifacts', appId, 'public', 'data', 'workspaces', slug))
    .get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  return {
    ownerId: data.ownerId,
    workspace: data,
    slug
  };
}

export async function loadOwnerSettings(appId, ownerId) {
  const snap = await settingsDocRef(appId, ownerId).get();
  return snap.exists ? snap.data() || {} : {};
}

export async function loadDecryptedGateway(appId, ownerId, gatewayType) {
  const snap = await paymentSettingsRef(appId, ownerId, gatewayType).get();
  if (!snap.exists) throw new Error(`${gatewayType} is not connected for this business.`);
  const data = snap.data() || {};
  if (!data.secretCiphertext || !data.secretIv) {
    throw new Error(`${gatewayType} secrets are missing. Reconnect in Settings → Payments.`);
  }
  const secretKey = decryptSecret(data.secretCiphertext, data.secretIv);
  let webhookSecret = '';
  if (data.webhookSecretCiphertext && data.webhookSecretIv) {
    webhookSecret = decryptSecret(data.webhookSecretCiphertext, data.webhookSecretIv);
  }
  return {
    ...data,
    secretKey,
    publicKey: data.publicKey || data.clientId || '',
    clientId: data.clientId || data.publicKey || '',
    webhookSecret
  };
}

export async function patchWorkspaceGatewaySummary(appId, ownerId, gatewayType, summaryPatch) {
  const ref = settingsDocRef(appId, ownerId);
  await getFirestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() || {} : {};
    const list = Array.isArray(data.paymentGateways) ? [...data.paymentGateways] : [];
    const idx = list.findIndex((item) => item.gatewayType === gatewayType);
    const next = {
      gatewayType,
      enabled: true,
      mode: 'test',
      configured: true,
      providerName: gatewayType,
      credentialSummary: {},
      ...(idx >= 0 ? list[idx] : {}),
      ...summaryPatch,
      gatewayType,
      credentialSummary: {
        ...(idx >= 0 ? list[idx].credentialSummary || {} : {}),
        ...(summaryPatch.credentialSummary || {})
      },
      updatedAt: Date.now()
    };
    if (idx >= 0) list[idx] = next;
    else list.push(next);
    tx.set(ref, { ...data, paymentGateways: list }, { merge: true });
  });
}

export async function markSourcePaid({
  appId,
  ownerId,
  sourceType,
  sourceId,
  providerPaymentId,
  gatewayType
}) {
  if (!sourceId) return { ok: false, reason: 'missing sourceId' };
  const ref = settingsDocRef(appId, ownerId);
  const field = sourceType === 'order' ? 'orders' : 'bookings';
  await getFirestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() || {} : {};
    const list = Array.isArray(data[field]) ? [...data[field]] : [];
    const idx = list.findIndex((item) => item.id === sourceId);
    if (idx < 0) return;
    list[idx] = {
      ...list[idx],
      paymentStatus: 'paid',
      paidAt: Date.now(),
      providerPaymentId: providerPaymentId || list[idx].providerPaymentId || '',
      paymentGateway: gatewayType || list[idx].paymentGateway || list[idx].paymentMethod
    };
    tx.set(ref, { ...data, [field]: list }, { merge: true });
  });
  return { ok: true };
}

export function resolveSourceFromPayload(payload = {}) {
  const sourceType =
    payload.sourceType ||
    (payload.orderId ? 'order' : 'booking');
  const sourceId =
    payload.sourceId || payload.orderId || payload.bookingId || '';
  return { sourceType, sourceId };
}
