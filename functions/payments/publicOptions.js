const admin = require('firebase-admin');
const { HttpsError } = require('firebase-functions/v2/https');
const {
  cleanString,
  gatewayDisplayNames,
  pathRefs,
  requireAppId
} = require('./shared');

const paymentGatewayIds = ['stripe', 'payfast', 'yoco', 'paystack', 'manual_eft', 'cash'];
const manualGatewayIds = new Set(['manual_eft', 'cash']);
const hostedGatewayIds = new Set(['stripe', 'payfast', 'yoco', 'paystack']);
const publicSlugPattern = /^[a-z0-9][a-z0-9-]{0,159}$/;
const manualCredentialSummaryFields = ['accountHolder', 'bankName', 'accountNumber', 'branchCode', 'accountType', 'referencePrefix', 'instructions'];

const cleanPublicSlug = (value) => {
  const publicSlug = cleanString(value, 160).toLowerCase();
  if (!publicSlug || !publicSlugPattern.test(publicSlug)) {
    throw new HttpsError('invalid-argument', 'A valid booking page slug is required.');
  }
  return publicSlug;
};

const sanitizeManualCredentialSummary = (credentialSummary = {}) => (
  manualCredentialSummaryFields.reduce((acc, field) => {
    const value = cleanString(credentialSummary[field], field === 'instructions' ? 1000 : 260);
    if (value) acc[field] = value;
    return acc;
  }, {})
);

const sanitizePublicPaymentOption = (gatewayId, data = {}) => {
  if (!paymentGatewayIds.includes(gatewayId) || data.enabled !== true) return null;
  const isManual = manualGatewayIds.has(gatewayId);
  const isHosted = hostedGatewayIds.has(gatewayId);
  if (isHosted && data.configured !== true) return null;
  const credentialSummary = isManual ? sanitizeManualCredentialSummary(data.credentialSummary || {}) : {};
  return {
    id: gatewayId,
    gatewayType: gatewayId,
    name: gatewayId === 'cash' ? 'Pay on site' : (cleanString(data.providerName, 80) || gatewayDisplayNames[gatewayId] || gatewayId),
    enabled: true,
    configured: isHosted ? true : data.configured !== false,
    mode: cleanString(data.mode, 12) === 'live' ? 'live' : 'test',
    credentialSummary,
    instructions: credentialSummary.instructions || ''
  };
};

const readPublicPaymentOptions = async ({ appId: rawAppId, publicSlug: rawPublicSlug }) => {
  const appId = requireAppId(rawAppId);
  const publicSlug = cleanPublicSlug(rawPublicSlug);
  const publicWorkspaceRef = admin.firestore()
    .collection('artifacts').doc(appId)
    .collection('public').doc('data')
    .collection('workspaces').doc(publicSlug);
  const publicWorkspaceSnap = await publicWorkspaceRef.get();
  if (!publicWorkspaceSnap.exists) {
    return { ok: true, publicSlug, options: [], manualPaymentOptions: [] };
  }

  const publicWorkspace = publicWorkspaceSnap.data() || {};
  const businessId = cleanString(publicWorkspace.ownerId, 160);
  if (!businessId) {
    return { ok: true, publicSlug, options: [], manualPaymentOptions: [] };
  }

  const refs = pathRefs(appId, businessId);
  const optionSnaps = await Promise.all(paymentGatewayIds.map(async (gatewayId) => {
    const snap = await refs.userRef.collection('payment_settings').doc(gatewayId).get();
    return { gatewayId, data: snap.exists ? snap.data() || {} : null };
  }));
  const options = optionSnaps
    .map(({ gatewayId, data }) => data ? sanitizePublicPaymentOption(gatewayId, data) : null)
    .filter(Boolean);

  return {
    ok: true,
    publicSlug,
    options,
    manualPaymentOptions: options.filter(option => manualGatewayIds.has(option.id))
  };
};

module.exports = {
  cleanPublicSlug,
  manualGatewayIds,
  readPublicPaymentOptions,
  sanitizePublicPaymentOption
};
