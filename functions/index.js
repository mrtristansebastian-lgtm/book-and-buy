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
import { createPublicProductOrder as createPublicProductOrderHelper } from './orders.js';
import { buildPublicAvailability } from './availability.js';
import { fetchPlaceReviews } from './places.js';
export {
  socialToggleReaction,
  socialToggleSave,
  socialCreateComment,
  socialToggleCommentLike,
  socialDeleteComment,
  socialModerateComment,
  socialRecordShare,
  socialFollowBusiness,
  socialMarkNotificationsRead,
  socialUpsertPost,
  socialDeletePost,
  socialAggregatePost,
  socialProcessActivity,
  socialFanoutPost,
  socialSyncSearch,
  socialSearch
} from './social.js';

if (!getApps().length) initializeApp();

const socialDeployOnly = process.env.SOCIAL_DEPLOY_ONLY === 'true';
const googlePlacesApiKey = socialDeployOnly ? null : defineSecret('GOOGLE_PLACES_API_KEY');
const googlePlacesCallOptions = googlePlacesApiKey ? { secrets: [googlePlacesApiKey] } : {};

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
    return createPublicProductOrderHelper(request.data || {});
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

