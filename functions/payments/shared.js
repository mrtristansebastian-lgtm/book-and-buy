const admin = require('firebase-admin');
const { HttpsError } = require('firebase-functions/v2/https');
const { decryptJson } = require('./crypto');

const GATEWAYS = Object.freeze(['stripe', 'payfast', 'yoco', 'paystack', 'manual_eft', 'cash']);

const gatewayDisplayNames = Object.freeze({
  stripe: 'Stripe',
  payfast: 'Payfast',
  yoco: 'Yoco',
  paystack: 'Paystack',
  manual_eft: 'Manual EFT',
  cash: 'Cash'
});

const allowedCredentialFields = Object.freeze({
  stripe: ['publishableKey', 'secretKey', 'webhookSecret'],
  payfast: ['merchantId', 'merchantKey', 'passphrase'],
  yoco: ['publicKey', 'secretKey', 'webhookSecret'],
  paystack: ['publicKey', 'secretKey'],
  manual_eft: ['accountHolder', 'bankName', 'accountNumber', 'branchCode', 'accountType', 'referencePrefix', 'instructions'],
  cash: ['instructions']
});

const requiredCredentialFields = Object.freeze({
  stripe: ['secretKey', 'webhookSecret'],
  payfast: ['merchantId', 'merchantKey'],
  yoco: ['secretKey', 'webhookSecret'],
  paystack: ['secretKey'],
  manual_eft: ['accountHolder', 'bankName', 'accountNumber'],
  cash: []
});

const credentialFieldLabels = Object.freeze({
  accountHolder: 'account holder',
  accountNumber: 'account number',
  bankName: 'bank name',
  merchantId: 'merchant ID',
  merchantKey: 'merchant key',
  secretKey: 'secret key',
  webhookSecret: 'webhook secret'
});

const cleanString = (value, max = 500) => String(value || '').trim().slice(0, max);

const normalizeGatewayType = (value) => {
  const gatewayType = cleanString(value, 40).toLowerCase();
  if (!GATEWAYS.includes(gatewayType)) {
    throw new HttpsError('invalid-argument', 'Unsupported payment gateway.');
  }
  return gatewayType;
};

const assertSafeCents = (value) => {
  const cents = Number(value);
  if (!Number.isSafeInteger(cents) || cents <= 0) {
    throw new HttpsError('invalid-argument', 'amountInCents must be a positive integer.');
  }
  return cents;
};

const normalizeCurrency = (value = 'ZAR') => {
  const currency = cleanString(value || 'ZAR', 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new HttpsError('invalid-argument', 'Currency must be a valid three-letter code.');
  }
  return currency;
};

const centsToDecimal = (cents) => (Number(cents) / 100).toFixed(2);

const maskSecret = (value) => {
  const next = cleanString(value, 500);
  if (!next) return '';
  const tail = next.slice(-4);
  return `**** ${tail}`;
};

const cleanCredentials = (gatewayType, credentials = {}) => {
  const allowed = allowedCredentialFields[gatewayType] || [];
  return allowed.reduce((acc, field) => {
    const value = cleanString(credentials[field], 2000);
    if (value) acc[field] = value;
    return acc;
  }, {});
};

const getMissingRequiredCredentialFields = (gatewayType, credentials = {}) => (
  (requiredCredentialFields[gatewayType] || []).filter((field) => !cleanString(credentials[field], 2000))
);

const publicGatewayDoc = (credentials = {}) => ({
  credentialSummary: Object.entries(credentials).reduce((acc, [key, value]) => {
    if (key.toLowerCase().includes('secret') || key.toLowerCase().includes('key') || key === 'passphrase' || key === 'accessToken') {
      acc[key] = maskSecret(value);
    } else {
      acc[key] = cleanString(value, 260);
    }
    return acc;
  }, {})
});

const requireBusinessId = (value) => {
  const businessId = cleanString(value, 160);
  if (!businessId) throw new HttpsError('invalid-argument', 'businessId is required.');
  return businessId;
};

const requireAppId = (value) => {
  const appId = cleanString(value || 'build-a-booking-v2', 160);
  if (!appId) throw new HttpsError('invalid-argument', 'appId is required.');
  return appId;
};

const getDb = () => admin.firestore();

const pathRefs = (appId, businessId, gatewayType = '') => {
  const userRef = getDb().collection('artifacts').doc(appId).collection('users').doc(businessId);
  return {
    userRef,
    publicGatewayRef: gatewayType ? userRef.collection('payment_settings').doc(gatewayType) : null,
    secretGatewayRef: gatewayType
      ? userRef.collection('private').doc('payment_gateway_secrets').collection('gateways').doc(gatewayType)
      : null,
    financeSummaryRef: userRef.collection('finance').doc('summary')
  };
};

const isWorkspaceAdmin = async ({ appId, businessId, auth }) => {
  if (!auth?.uid) return false;
  if (auth.uid === businessId) return true;

  const claims = auth.token || {};
  if (claims.role === 'admin') {
    if (claims.businessId === businessId) return true;
    if (Array.isArray(claims.businessIds) && claims.businessIds.includes(businessId)) return true;
  }

  const email = cleanString(claims.email, 220).toLowerCase();
  if (!email) return false;
  const staffSnap = await getDb()
    .collection('artifacts').doc(appId)
    .collection('staffAccess').doc(email)
    .collection('workspaces').doc(businessId)
    .get();
  const staff = staffSnap.data() || {};
  return staffSnap.exists && staff.status === 'active' && staff.role === 'admin';
};

const assertWorkspaceAdmin = async ({ appId, businessId, auth }) => {
  const allowed = await isWorkspaceAdmin({ appId, businessId, auth });
  if (!allowed) {
    throw new HttpsError('permission-denied', 'Only the workspace owner or an admin can manage payments.');
  }
};

const getGatewayConfig = async ({ appId, businessId, gatewayType }) => {
  const refs = pathRefs(appId, businessId, gatewayType);
  const [publicSnap, secretSnap] = await Promise.all([
    refs.publicGatewayRef.get(),
    refs.secretGatewayRef.get()
  ]);

  const publicConfig = publicSnap.data() || {};
  if (!publicSnap.exists || publicConfig.enabled !== true) {
    throw new HttpsError('failed-precondition', `${gatewayDisplayNames[gatewayType]} is not enabled for this workspace.`);
  }

  const secretPayload = secretSnap.data()?.encryptedCredentials || {};
  const credentials = decryptJson(secretPayload);
  return { publicConfig, credentials };
};

const getFunctionBaseUrl = (request) => {
  const configured = process.env.PAYMENT_FUNCTION_BASE_URL || process.env.WEBHOOK_BASE_URL;
  if (configured) return configured.replace(/\/$/, '');
  const host = request?.rawRequest?.headers?.host || request?.headers?.host || '';
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
  return host ? `${protocol}://${host}` : '';
};

const webhookUrl = ({ baseUrl, endpoint, appId, businessId }) => {
  const params = new URLSearchParams({ appId, businessId });
  return `${baseUrl}/${endpoint}?${params.toString()}`;
};

const updateSuccessfulPayment = async ({
  appId,
  businessId,
  gatewayType,
  eventId,
  paymentId,
  bookingId,
  amountInCents,
  currency,
  providerReference,
  rawEvent = {}
}) => {
  const db = getDb();
  const refs = pathRefs(appId, businessId, gatewayType);
  const processedRef = refs.userRef.collection('processed_transactions').doc(`${gatewayType}_${eventId}`);
  const attemptRef = paymentId ? refs.userRef.collection('payment_attempts').doc(paymentId) : null;
  const bookingRef = bookingId ? refs.userRef.collection('bookings').doc(bookingId) : null;

  await db.runTransaction(async (transaction) => {
    const processedSnap = await transaction.get(processedRef);
    if (processedSnap.exists) return;

    const attemptSnap = attemptRef ? await transaction.get(attemptRef) : null;
    const attempt = attemptSnap?.data?.() || {};
    const finalBookingId = bookingId || attempt.bookingId || '';
    const finalBookingRef = finalBookingId ? refs.userRef.collection('bookings').doc(finalBookingId) : null;
    const finalAmount = Number.isSafeInteger(amountInCents) && amountInCents > 0
      ? amountInCents
      : Number(attempt.amountInCents || 0);
    const finalCurrency = normalizeCurrency(currency || attempt.currency || 'ZAR');

    if (!Number.isSafeInteger(finalAmount) || finalAmount <= 0) {
      throw new Error('Verified payment is missing a valid amount.');
    }

    transaction.set(processedRef, {
      gatewayType,
      eventId,
      paymentId: paymentId || attemptSnap?.id || '',
      bookingId: finalBookingId || '',
      amountInCents: finalAmount,
      currency: finalCurrency,
      providerReference: providerReference || '',
      rawEvent,
      processedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    if (attemptRef) {
      transaction.set(attemptRef, {
        status: 'paid',
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        providerReference: providerReference || '',
        updatedAtMs: Date.now(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    if (bookingRef || finalBookingRef) {
      transaction.set(bookingRef || finalBookingRef, {
        paymentStatus: 'paid',
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        paymentGateway: gatewayType,
        paymentAttemptId: paymentId || attemptSnap?.id || '',
        providerReference: providerReference || '',
        amountPaidInCents: finalAmount,
        currency: finalCurrency,
        updatedAtMs: Date.now(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    transaction.set(refs.financeSummaryRef, {
      totalRevenueInCents: admin.firestore.FieldValue.increment(finalAmount),
      paidTransactionCount: admin.firestore.FieldValue.increment(1),
      currency: finalCurrency,
      lastPaymentAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });
};

module.exports = {
  GATEWAYS,
  allowedCredentialFields,
  assertSafeCents,
  assertWorkspaceAdmin,
  centsToDecimal,
  cleanCredentials,
  cleanString,
  credentialFieldLabels,
  gatewayDisplayNames,
  getFunctionBaseUrl,
  getGatewayConfig,
  getMissingRequiredCredentialFields,
  maskSecret,
  normalizeCurrency,
  normalizeGatewayType,
  pathRefs,
  publicGatewayDoc,
  requireAppId,
  requireBusinessId,
  requiredCredentialFields,
  updateSuccessfulPayment,
  webhookUrl
};
