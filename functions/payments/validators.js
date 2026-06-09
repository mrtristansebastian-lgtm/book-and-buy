const { HttpsError } = require('firebase-functions/v2/https');
const {
  assertSafeCents,
  cleanCredentials,
  cleanString,
  normalizeCurrency,
  normalizeGatewayType,
  requireAppId,
  requireBusinessId
} = require('./shared');
const { cleanPublicSlug } = require('./publicOptions');

const normalizeGatewayMode = (value) => (cleanString(value, 12) === 'live' ? 'live' : 'test');

const assertHostedGateway = (gatewayType) => {
  if (gatewayType === 'manual_eft' || gatewayType === 'cash') {
    throw new HttpsError(
      'failed-precondition',
      'Manual payment methods are tracked on bookings and do not create hosted checkout sessions.'
    );
  }
};

const validatePublicPaymentOptionsPayload = (data = {}) => ({
  appId: requireAppId(data.appId),
  publicSlug: cleanPublicSlug(data.publicSlug || data.slug)
});

const validateSaveGatewaySettingsPayload = (data = {}) => {
  const gatewayType = normalizeGatewayType(data.gatewayType);
  return {
    appId: requireAppId(data.appId),
    businessId: requireBusinessId(data.businessId),
    gatewayType,
    enabled: Boolean(data.enabled),
    mode: normalizeGatewayMode(data.mode),
    providerName: data.providerName || gatewayType,
    credentials: cleanCredentials(gatewayType, data.credentials || {})
  };
};

const validateInitiatePaymentPayload = (data = {}, auth = null) => {
  const gatewayType = normalizeGatewayType(data.gatewayType);
  assertHostedGateway(gatewayType);
  const bookingId = cleanString(data.bookingId, 180);
  if (!auth?.uid && !bookingId) {
    throw new HttpsError('unauthenticated', 'Sign in or provide a booking reference before starting checkout.');
  }
  return {
    appId: requireAppId(data.appId),
    businessId: requireBusinessId(data.businessId),
    gatewayType,
    amountInCents: assertSafeCents(data.amountInCents),
    currency: normalizeCurrency(data.currency || 'ZAR'),
    bookingId,
    description: cleanString(data.description, 240) || 'Build A Booking payment',
    customerEmail: cleanString(data.customerEmail, 220).toLowerCase(),
    customerName: cleanString(data.customerName, 160),
    successUrl: cleanString(data.successUrl, 1000),
    cancelUrl: cleanString(data.cancelUrl, 1000)
  };
};

const validateManualPaymentPayload = (data = {}) => {
  const bookingId = cleanString(data.bookingId, 180);
  if (!bookingId) {
    throw new HttpsError('invalid-argument', 'bookingId is required.');
  }

  const paymentMethod = cleanString(data.paymentMethod || 'manual_eft', 40).toLowerCase();
  if (!['manual_eft', 'cash', 'manual'].includes(paymentMethod)) {
    throw new HttpsError('invalid-argument', 'Only cash and manual EFT can be marked paid manually.');
  }

  const amountRaw = Number(data.amountInCents || 0);
  const requestedAmount = Number.isSafeInteger(amountRaw) && amountRaw >= 0 ? amountRaw : 0;

  return {
    appId: requireAppId(data.appId),
    businessId: requireBusinessId(data.businessId),
    bookingId,
    paymentMethod,
    requestedAmount,
    currency: normalizeCurrency(data.currency || 'ZAR')
  };
};

module.exports = {
  assertHostedGateway,
  normalizeGatewayMode,
  validateInitiatePaymentPayload,
  validateManualPaymentPayload,
  validatePublicPaymentOptionsPayload,
  validateSaveGatewaySettingsPayload
};
