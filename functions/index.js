/**
 * Cloud Functions — payment gateways + existing scaffolds.
 * Deploy with Firebase when the project is attached.
 */
import { getApps, initializeApp } from 'firebase-admin/app';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import {
  getPublicPaymentOptions as getPublicPaymentOptionsHelper,
  saveAndVerifyPaymentGateway,
  disconnectPaymentGateway as disconnectPaymentGatewayFn,
  initiatePayment as initiatePaymentFn,
  confirmPaymentReturn as confirmPaymentReturnFn,
  handleStripeWebhook,
  handlePaystackWebhook,
  handlePayPalWebhook
} from './payments/index.js';
import { placeMarketOrder, updateMarketOrder } from './marketOrders.js';
import { buildPublicAvailability } from './availability.js';
import { fetchPlaceReviews } from './places.js';
import { getRescheduleContext, respondToReschedule, writeGuardedBooking } from './rescheduling.js';
import { manageCustomDomain, resolveCustomDomain } from './domains.js';
import { getFirestore } from 'firebase-admin/firestore';
if (!getApps().length) initializeApp();

const googlePlacesApiKey = defineSecret('GOOGLE_PLACES_API_KEY');
// Review requests wait on Google's API; fractional CPU avoids unnecessary regional quota usage.
const googlePlacesCallOptions = { secrets: [googlePlacesApiKey], cpu: 'gcf_gen1', memory: '256MiB', concurrency: 1, maxInstances: 5 };

const APP_ID = process.env.APP_ID || 'book-and-buy-v1';

function requireAuth(request) {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  return request.auth.uid;
}

function wrapError(error) {
  const message = error?.message || 'Request failed';
  if (error instanceof HttpsError) throw error;
  throw new HttpsError('failed-precondition', message);
}

export const health = onCall(async () => ({ ok: true, app: 'book-and-buy' }));
export const manageBusinessDomain = onCall({ timeoutSeconds: 60, maxInstances: 5 }, (request) => manageCustomDomain(request.data || {}, request.auth));
export const resolveBusinessDomain = onCall({ maxInstances: 10 }, (request) => resolveCustomDomain(request.data || {}));

export const getBookingRescheduleContext = onCall(async (request) => { try { return await getRescheduleContext(request.data || {}, request.auth); } catch (error) { throw new HttpsError(error.code || 'failed-precondition', error.message); } });
export const respondToBookingReschedule = onCall(async (request) => { try { return await respondToReschedule(request.data || {}, request.auth); } catch (error) { throw new HttpsError(error.code || 'failed-precondition', error.message); } });
export const createOwnerBookingRequest = onCall(async (request) => { try { return await writeGuardedBooking(request.data || {}, request.auth); } catch (error) { throw new HttpsError(error.code || 'failed-precondition', error.message); } });
export const createPublicBookingRequest = onCall(async (request) => { try { return await writeGuardedBooking(request.data || {}, request.auth, undefined, true); } catch (error) { throw new HttpsError(error.code || 'failed-precondition', error.message); } });

export const getPublicPaymentOptions = onCall(async (request) => {
  try {
    return getPublicPaymentOptionsHelper(request.data || {});
  } catch (error) {
    wrapError(error);
  }
});

export const savePaymentGatewaySettings = onCall(async (request) => {
  try {
    const uid = requireAuth(request);
    return await saveAndVerifyPaymentGateway(
      { appId: APP_ID, ...(request.data || {}) },
      uid
    );
  } catch (error) {
    wrapError(error);
  }
});

export const disconnectPaymentGateway = onCall(async (request) => {
  try {
    const uid = requireAuth(request);
    return await disconnectPaymentGatewayFn({ appId: APP_ID, ...(request.data || {}) }, uid);
  } catch (error) {
    wrapError(error);
  }
});

export const initiatePayment = onCall(async (request) => {
  try {
    return await initiatePaymentFn({ appId: APP_ID, ...(request.data || {}) });
  } catch (error) {
    wrapError(error);
  }
});

export const confirmPaymentReturn = onCall(async (request) => {
  try {
    return await confirmPaymentReturnFn({ appId: APP_ID, ...(request.data || {}) });
  } catch (error) {
    wrapError(error);
  }
});

export const createPublicProductOrder = onCall(async (request) => {
  try {
    return await placeMarketOrder(request.data || {}, request.auth);
  } catch (error) {
    wrapError(error);
  }
});

export const getPublicServiceAvailability = onCall(async (request) => {
  try {
    return buildPublicAvailability(request.data || {});
  } catch (error) {
    wrapError(error);
  }
});

export const updateOwnerProductOrder = onCall(async (request) => {
  try { return await updateMarketOrder(request.data || {}, request.auth); }
  catch (error) { wrapError(error); }
});

export const getGooglePlaceReviews = onCall(googlePlacesCallOptions, async (request) => {
  try {
    requireAuth(request);
    return await fetchPlaceReviews({
      placeId: request.data?.placeId,
      apiKey: googlePlacesApiKey?.value() || ''
    });
  } catch (error) {
    wrapError(error);
  }
});

async function publishedReviewSettings(slug) {
  if (!/^[a-z0-9-]{1,63}$/.test(String(slug || ''))) throw new HttpsError('invalid-argument', 'A published business address is required.');
  const snapshot = await getFirestore().doc(`artifacts/${APP_ID}/public/data/workspaces/${slug}`).get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'Business page not found.');
  return snapshot.data().website || {};
}
// Google review quotes remain response-only, never copied into workspace storage.
export const getPublicGoogleReviews = onCall({ ...googlePlacesCallOptions, enforceAppCheck: true, maxInstances: 5 }, async (request) => {
  const website = await publishedReviewSettings(request.data?.slug);
  if (!website.googleReviewsEnabled || !website.googlePlaceId) return { ok: true, reviews: [] };
  return fetchPlaceReviews({ placeId: website.googlePlaceId, apiKey: googlePlacesApiKey.value() });
});

/** HTTP webhooks — configure per-merchant or platform forwarding with ownerId/slug query. */
export const stripeWebhook = onRequest({ cors: false }, async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }
    const rawBody =
      typeof req.rawBody === 'string'
        ? req.rawBody
        : Buffer.isBuffer(req.rawBody)
          ? req.rawBody.toString('utf8')
          : JSON.stringify(req.body || {});
    const result = await handleStripeWebhook({
      appId: APP_ID,
      ownerId: req.query.ownerId,
      slug: req.query.slug,
      rawBody,
      signature: req.get('stripe-signature')
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

export const paystackWebhook = onRequest({ cors: false }, async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }
    const rawBody =
      typeof req.rawBody === 'string'
        ? req.rawBody
        : Buffer.isBuffer(req.rawBody)
          ? req.rawBody.toString('utf8')
          : JSON.stringify(req.body || {});
    const result = await handlePaystackWebhook({
      appId: APP_ID,
      ownerId: req.query.ownerId,
      slug: req.query.slug,
      rawBody,
      signature: req.get('x-paystack-signature')
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

export const paypalWebhook = onRequest({ cors: false }, async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }
    const result = await handlePayPalWebhook({
      appId: APP_ID,
      ownerId: req.query.ownerId,
      slug: req.query.slug,
      event: req.body
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

