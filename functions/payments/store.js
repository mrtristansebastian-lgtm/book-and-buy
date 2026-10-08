import { getFirestore } from 'firebase-admin/firestore';
import { decryptSecret } from './encrypt.js';
import { pathJoin } from './publicOptions.js';
import { settleVerifiedPayment } from './settlement.js';
import { readWorkspace,writeWorkspace } from '../workspaceStore.js';
import { paymentAppId } from './paymentPolicy.js';

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
  paymentAppId(appId);
  return (await readWorkspace(getFirestore(),ownerId)).workspace;
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
    const {workspace:data} = await readWorkspace(getFirestore(),ownerId,tx);
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
    writeWorkspace(tx,getFirestore(),ownerId,data,{ ...data,paymentGateways:list,sectionRevisions:{...data.sectionRevisions,payments:(data.sectionRevisions?.payments || 0)+1} });
  });
}

/** Compatibility entry point: every receipt requires a verified saved attempt. */
export async function markSourcePaid(evidence, db = getFirestore()) {
  return settleVerifiedPayment(evidence, db);
}

export function resolveSourceFromPayload(payload = {}) {
  const sourceType =
    payload.sourceType ||
    (payload.orderId ? 'order' : 'booking');
  const sourceId =
    payload.sourceId || payload.orderId || payload.bookingId || '';
  return { sourceType, sourceId };
}
