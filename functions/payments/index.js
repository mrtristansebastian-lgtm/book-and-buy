const admin = require('firebase-admin');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { PAYMENT_SETTINGS_ENCRYPTION_KEY, decryptJson, encryptJson } = require('./crypto');
const { createGatewayPayment } = require('./gatewayFactory');
const {
  assertSafeCents,
  assertWorkspaceAdmin,
  cleanCredentials,
  cleanString,
  credentialFieldLabels,
  getFunctionBaseUrl,
  getGatewayConfig,
  getMissingRequiredCredentialFields,
  gatewayDisplayNames,
  normalizeCurrency,
  normalizeGatewayType,
  pathRefs,
  publicGatewayDoc,
  requireAppId,
  requireBusinessId
} = require('./shared');
const webhooks = require('./webhooks');
const { cappedMaxInstances } = require('../runtimeOptions');

const serverTimestamp = () => admin.firestore.FieldValue.serverTimestamp();
const paymentCallableOptions = {
  region: 'us-central1',
  timeoutSeconds: 30,
  memory: '512MiB',
  concurrency: 20,
  maxInstances: cappedMaxInstances(process.env.BUILD_A_BOOKING_PAYMENT_MAX_INSTANCES, 1)
};

const savePaymentGatewaySettings = onCall({
  ...paymentCallableOptions,
  secrets: [PAYMENT_SETTINGS_ENCRYPTION_KEY]
}, async (request) => {
  try {
    const appId = requireAppId(request.data?.appId);
    const businessId = requireBusinessId(request.data?.businessId);
    const gatewayType = normalizeGatewayType(request.data?.gatewayType);
    const enabled = Boolean(request.data?.enabled);
    const mode = cleanString(request.data?.mode, 12) === 'live' ? 'live' : 'test';

    await assertWorkspaceAdmin({ appId, businessId, auth: request.auth });

    const credentials = cleanCredentials(gatewayType, request.data?.credentials || {});
    const refs = pathRefs(appId, businessId, gatewayType);
    if (enabled) {
      const existingSecretSnap = await refs.secretGatewayRef.get();
      const existingCredentials = decryptJson(existingSecretSnap.data()?.encryptedCredentials || {});
      const mergedCredentials = { ...existingCredentials, ...credentials };
      const missingRequiredFields = getMissingRequiredCredentialFields(gatewayType, mergedCredentials);
      if (missingRequiredFields.length) {
        const labels = missingRequiredFields
          .map((field) => credentialFieldLabels[field] || field)
          .join(', ');
        throw new HttpsError(
          'failed-precondition',
          `${gatewayDisplayNames[gatewayType] || gatewayType} needs ${labels} before it can be enabled.`
        );
      }
    }

    const batch = admin.firestore().batch();

    if (Object.keys(credentials).length) {
      batch.set(refs.secretGatewayRef, {
        gatewayType,
        encryptedCredentials: encryptJson(credentials),
        credentialFields: Object.keys(credentials),
        updatedBy: request.auth.uid,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    const hasCredentials = Object.keys(credentials).length > 0;
    batch.set(refs.publicGatewayRef, {
      gatewayType,
      enabled,
      mode,
      providerName: request.data?.providerName || gatewayType,
      ...(hasCredentials ? publicGatewayDoc(credentials) : {}),
      ...(hasCredentials ? { configured: true } : {}),
      updatedBy: request.auth.uid,
      updatedAt: serverTimestamp()
    }, { merge: true });

    await batch.commit();
    return { ok: true, gatewayType, enabled, mode };
  } catch (error) {
    console.error('savePaymentGatewaySettings failed', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error?.message || 'Payment settings could not be saved.');
  }
});

const initiatePayment = onCall({
  ...paymentCallableOptions,
  secrets: [PAYMENT_SETTINGS_ENCRYPTION_KEY]
}, async (request) => {
  try {
    const appId = requireAppId(request.data?.appId);
    const businessId = requireBusinessId(request.data?.businessId);
    const gatewayType = normalizeGatewayType(request.data?.gatewayType);
    if (gatewayType === 'manual_eft' || gatewayType === 'cash') {
      throw new HttpsError(
        'failed-precondition',
        'Manual payment methods are tracked on bookings and do not create hosted checkout sessions.'
      );
    }
    const amountInCents = assertSafeCents(request.data?.amountInCents);
    const currency = normalizeCurrency(request.data?.currency || 'ZAR');
    const bookingId = cleanString(request.data?.bookingId, 180);
    const description = cleanString(request.data?.description, 240) || 'Build A Booking payment';
    const customerEmail = cleanString(request.data?.customerEmail, 220).toLowerCase();
    const customerName = cleanString(request.data?.customerName, 160);

    if (!request.auth?.uid && !bookingId) {
      throw new HttpsError('unauthenticated', 'Sign in or provide a booking reference before starting checkout.');
    }

    const { publicConfig, credentials } = await getGatewayConfig({ appId, businessId, gatewayType });
    const refs = pathRefs(appId, businessId, gatewayType);
    const paymentAttemptRef = refs.userRef.collection('payment_attempts').doc();
    const paymentId = paymentAttemptRef.id;
    const baseUrl = getFunctionBaseUrl(request);
    const successUrl = cleanString(request.data?.successUrl, 1000) ||
      `https://build-a-booking.web.app/#/dashboard/bookings?payment=${encodeURIComponent(paymentId)}&status=success`;
    const cancelUrl = cleanString(request.data?.cancelUrl, 1000) ||
      `https://build-a-booking.web.app/#/dashboard/bookings?payment=${encodeURIComponent(paymentId)}&status=cancelled`;

    const metadata = {
      appId,
      businessId,
      bookingId,
      paymentId,
      amountInCents: String(amountInCents),
      currency
    };

    await paymentAttemptRef.set({
      appId,
      businessId,
      gatewayType,
      bookingId,
      amountInCents,
      currency,
      description,
      customerEmail,
      customerName,
      status: 'initiated',
      mode: publicConfig.mode || 'test',
      createdBy: request.auth?.uid || 'public-booking-page',
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const checkout = await createGatewayPayment({
      gatewayType,
      credentials,
      request,
      payment: {
        appId,
        businessId,
        bookingId,
        paymentId,
        amountInCents,
        currency,
        description,
        customerEmail,
        customerName,
        mode: publicConfig.mode || 'test',
        successUrl,
        cancelUrl,
        baseUrl,
        metadata
      }
    });

    await paymentAttemptRef.set({
      status: 'checkout_ready',
      checkoutUrl: checkout.checkoutUrl,
      providerReference: checkout.providerReference || '',
      rawProviderResponse: checkout.rawProviderResponse || {},
      updatedAtMs: Date.now(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    return {
      ok: true,
      paymentId,
      gatewayType,
      checkoutUrl: checkout.checkoutUrl,
      providerReference: checkout.providerReference || ''
    };
  } catch (error) {
    console.error('initiatePayment failed', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error?.message || 'Payment could not be started.');
  }
});

const markManualBookingPaid = onCall({
  ...paymentCallableOptions
}, async (request) => {
  try {
    const appId = requireAppId(request.data?.appId);
    const businessId = requireBusinessId(request.data?.businessId);
    const bookingId = cleanString(request.data?.bookingId, 180);
    if (!bookingId) {
      throw new HttpsError('invalid-argument', 'bookingId is required.');
    }

    const paymentMethod = cleanString(request.data?.paymentMethod || 'manual_eft', 40).toLowerCase();
    if (!['manual_eft', 'cash', 'manual'].includes(paymentMethod)) {
      throw new HttpsError('invalid-argument', 'Only cash and manual EFT can be marked paid manually.');
    }

    const amountRaw = Number(request.data?.amountInCents || 0);
    const requestedAmount = Number.isSafeInteger(amountRaw) && amountRaw >= 0 ? amountRaw : 0;
    const currency = normalizeCurrency(request.data?.currency || 'ZAR');

    await assertWorkspaceAdmin({ appId, businessId, auth: request.auth });

    const refs = pathRefs(appId, businessId, paymentMethod === 'manual' ? 'manual_eft' : paymentMethod);
    const bookingRef = refs.userRef.collection('bookings').doc(bookingId);
    const processedRef = refs.userRef.collection('processed_transactions').doc(`manual_${bookingId}`);

    await admin.firestore().runTransaction(async (transaction) => {
      const bookingSnap = await transaction.get(bookingRef);
      if (!bookingSnap.exists) {
        throw new HttpsError('not-found', 'Booking not found.');
      }

      const booking = bookingSnap.data() || {};
      const alreadyPaid = booking.paymentStatus === 'paid';
      const finalAmount = requestedAmount ||
        Number(booking.amountInCents || booking.amountPaidInCents || 0) ||
        0;

      transaction.set(bookingRef, {
        paymentStatus: 'paid',
        paymentMethod,
        paymentGateway: paymentMethod,
        paymentProviderName: paymentMethod === 'cash' ? 'Cash' : 'Manual EFT',
        manualPayment: true,
        amountPaidInCents: finalAmount,
        currency,
        paidAt: serverTimestamp(),
        updatedAtMs: Date.now(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      const processedSnap = await transaction.get(processedRef);
      if (!alreadyPaid && !processedSnap.exists) {
        transaction.set(processedRef, {
          gatewayType: paymentMethod,
          eventId: `manual_${bookingId}`,
          paymentId: '',
          bookingId,
          amountInCents: finalAmount,
          currency,
          providerReference: booking.paymentReference || bookingId,
          rawEvent: {
            source: 'manual-mark-paid',
            uid: request.auth.uid
          },
          processedAt: serverTimestamp()
        });

        transaction.set(refs.financeSummaryRef, {
          totalRevenueInCents: admin.firestore.FieldValue.increment(finalAmount),
          paidTransactionCount: admin.firestore.FieldValue.increment(1),
          manualRevenueInCents: admin.firestore.FieldValue.increment(finalAmount),
          manualPaymentCount: admin.firestore.FieldValue.increment(1),
          currency,
          lastPaymentAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    });

    return { ok: true, bookingId, paymentStatus: 'paid' };
  } catch (error) {
    console.error('markManualBookingPaid failed', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error?.message || 'Booking could not be marked paid.');
  }
});

module.exports = {
  initiatePayment,
  markManualBookingPaid,
  savePaymentGatewaySettings,
  ...webhooks
};
