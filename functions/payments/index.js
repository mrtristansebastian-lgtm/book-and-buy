const admin = require('firebase-admin');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { PAYMENT_SETTINGS_ENCRYPTION_KEY, decryptJson, encryptJson } = require('./crypto');
const { createGatewayPayment } = require('./gatewayFactory');
const {
  assertWorkspaceAdmin,
  cleanString,
  credentialFieldLabels,
  getFunctionBaseUrl,
  getGatewayConfig,
  getMissingRequiredCredentialFields,
  gatewayDisplayNames,
  pathRefs,
  publicGatewayDoc
} = require('./shared');
const { readPublicPaymentOptions } = require('./publicOptions');
const {
  validateInitiatePaymentPayload,
  validateManualPaymentPayload,
  validatePublicPaymentOptionsPayload,
  validateSaveGatewaySettingsPayload
} = require('./validators');
const { assertRateLimit } = require('../security');
const webhooks = require('./webhooks');
const { cappedMaxInstances } = require('../runtimeOptions');

const serverTimestamp = () => admin.firestore.FieldValue.serverTimestamp();
const paymentCpu = process.env.BUILD_A_BOOKING_FUNCTION_CPU === '1' ? 1 : 'gcf_gen1';
const paymentCallableOptions = {
  region: 'us-central1',
  timeoutSeconds: 30,
  memory: '256MiB',
  cpu: paymentCpu,
  concurrency: paymentCpu === 'gcf_gen1' ? 1 : 20,
  maxInstances: cappedMaxInstances(process.env.BUILD_A_BOOKING_PAYMENT_MAX_INSTANCES, 1)
};

const getPublicPaymentOptions = onCall(paymentCallableOptions, async (request) => {
  try {
    const { appId, publicSlug } = validatePublicPaymentOptionsPayload(request.data);
    await assertRateLimit({
      db: admin.firestore(),
      appId,
      workspaceSlug: publicSlug,
      action: 'public_payment_options',
      request
    });
    return await readPublicPaymentOptions({
      appId,
      publicSlug
    });
  } catch (error) {
    console.error('getPublicPaymentOptions failed', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Payment options could not be loaded.');
  }
});

const savePaymentGatewaySettings = onCall({
  ...paymentCallableOptions,
  secrets: [PAYMENT_SETTINGS_ENCRYPTION_KEY]
}, async (request) => {
  try {
    const {
      appId,
      businessId,
      gatewayType,
      enabled,
      mode,
      providerName,
      credentials
    } = validateSaveGatewaySettingsPayload(request.data);

    await assertWorkspaceAdmin({ appId, businessId, auth: request.auth });

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
      providerName,
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
    const {
      appId,
      businessId,
      gatewayType,
      amountInCents,
      currency,
      bookingId,
      description,
      customerEmail,
      customerName,
      successUrl: requestedSuccessUrl,
      cancelUrl: requestedCancelUrl
    } = validateInitiatePaymentPayload(request.data, request.auth);

    const { publicConfig, credentials } = await getGatewayConfig({ appId, businessId, gatewayType });
    const refs = pathRefs(appId, businessId, gatewayType);
    const paymentAttemptRef = refs.userRef.collection('payment_attempts').doc();
    const paymentId = paymentAttemptRef.id;
    const baseUrl = getFunctionBaseUrl(request);
    const successUrl = requestedSuccessUrl ||
      `https://build-a-booking.web.app/#/dashboard/bookings?payment=${encodeURIComponent(paymentId)}&status=success`;
    const cancelUrl = requestedCancelUrl ||
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
    const {
      appId,
      businessId,
      bookingId,
      paymentMethod,
      requestedAmount,
      currency
    } = validateManualPaymentPayload(request.data);

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
  getPublicPaymentOptions,
  initiatePayment,
  markManualBookingPaid,
  savePaymentGatewaySettings,
  ...webhooks
};
