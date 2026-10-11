import * as customerReviews from './reviews.js';
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
import { createListingEnquiry, getListingEnquiry, updateListingEnquiry } from './enquiries.js';
import { getLivePublicServiceAvailability } from './availability.js';
import { getPublicCommerceContext as commerceContext, quotePublicCommerce as commerceQuote } from './commerceRuntime.js';
import { adjustInventory as inventoryAdjustment, expireInventoryReservations } from './inventoryService.js';
import * as workspaceCommands from './workspaceCommands.js';
import { readWorkspace } from './workspaceStore.js';
import { assertOwner } from './workspaceDomain.js';
import * as butler from './butler.js';
import * as websites from './websiteRuntime.js';
import { createAIGateway } from './ai/index.js';
import { safeProviderDetails } from './ai/connection.js';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { fetchPlaceReviews } from './places.js';
import { getRescheduleContext, respondToReschedule, writeGuardedBooking } from './rescheduling.js';
import { manageCustomDomain, resolveCustomDomain } from './domains.js';
import { getFirestore } from 'firebase-admin/firestore';
if (!getApps().length) initializeApp();

const googlePlacesApiKey = defineSecret('GOOGLE_PLACES_API_KEY');
// Review requests wait on Google's API; fractional CPU avoids unnecessary regional quota usage.
const googlePlacesCallOptions = { secrets: [googlePlacesApiKey], cpu: 'gcf_gen1', memory: '256MiB', concurrency: 1, maxInstances: 5 };

const APP_ID = process.env.APP_ID || 'book-and-buy-v1';
const paymentSecrets = [defineSecret('PAYMENT_SETTINGS_ENCRYPTION_KEY')];

function requireAuth(request) {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  assertOwner(request.auth.uid, request.auth);
  return request.auth.uid;
}

function wrapError(error) {
  const message = error?.message || 'Request failed';
  if (error instanceof HttpsError) throw error;
  const codes = ['invalid-argument', 'aborted', 'already-exists', 'permission-denied', 'unauthenticated', 'not-found', 'resource-exhausted', 'unavailable', 'data-loss', 'cancelled'];
  throw new HttpsError(codes.includes(error?.code) ? error.code : 'failed-precondition', message, error.details ? safeProviderDetails(error.details) : undefined);
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

export const savePaymentGatewaySettings = onCall({ secrets: paymentSecrets }, async (request) => {
  try {
    const uid = requireAuth(request);
    return await saveAndVerifyPaymentGateway(
      { ...(request.data || {}), appId: APP_ID },
      uid
    );
  } catch (error) {
    wrapError(error);
  }
});

export const disconnectPaymentGateway = onCall(async (request) => {
  try {
    const uid = requireAuth(request);
    return await disconnectPaymentGatewayFn({ ...(request.data || {}), appId: APP_ID }, uid);
  } catch (error) {
    wrapError(error);
  }
});

export const initiatePayment = onCall({ secrets: paymentSecrets }, async (request) => {
  try {
    return await initiatePaymentFn({ ...(request.data || {}), appId: APP_ID });
  } catch (error) {
    wrapError(error);
  }
});

export const confirmPaymentReturn = onCall({ secrets: paymentSecrets }, async (request) => {
  try {
    return await confirmPaymentReturnFn({ ...(request.data || {}), appId: APP_ID });
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

export const createPublicListingEnquiry = onCall({ maxInstances: 10 }, async (request) => {
  try { return await createListingEnquiry(request.data || {}, { ip: request.rawRequest?.ip, uid: request.auth?.uid }); }
  catch (error) { wrapError(error); }
});
export const getOwnerListingEnquiry = onCall(async (request) => {
  try { return await getListingEnquiry(request.data || {}, request.auth); }
  catch (error) { wrapError(error); }
});
export const updateOwnerListingEnquiry = onCall(async (request) => {
  try { return await updateListingEnquiry(request.data || {}, request.auth); }
  catch (error) { wrapError(error); }
});

export const getPublicServiceAvailability = onCall(async (request) => {
  try {
    return await getLivePublicServiceAvailability(request.data || {});
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
export const stripeWebhook = onRequest({ secrets: paymentSecrets, cors: false }, async (req, res) => {
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

export const paystackWebhook = onRequest({ secrets: paymentSecrets, cors: false }, async (req, res) => {
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

export const paypalWebhook = onRequest({ secrets: paymentSecrets, cors: false }, async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }
    const result = await handlePayPalWebhook({
      appId: APP_ID,
      ownerId: req.query.ownerId,
      slug: req.query.slug,
      event: req.body,
      headers: { transmissionId: req.get('paypal-transmission-id'), transmissionTime: req.get('paypal-transmission-time'), transmissionSig: req.get('paypal-transmission-sig'), certUrl: req.get('paypal-cert-url'), authAlgo: req.get('paypal-auth-algo') }
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

const ownerCall = (handler, options = {}) => onCall({ timeoutSeconds: 120, cpu: 'gcf_gen1', memory: '256MiB', concurrency: 1, maxInstances: 3, ...options }, async request => {
  try { return await handler(request.data || {}, request.auth); } catch (error) { wrapError(error); }
});
// Firebase verifies end-user tokens inside the callable; Cloud Run must let requests reach it.
// Both handlers enforce verified ownership before reading or writing any workspace data.
export const getOwnerWorkspace = ownerCall(workspaceCommands.getOwnerWorkspace, { invoker: 'public' });
export const patchOwnerWorkspace = ownerCall(workspaceCommands.patchOwnerWorkspace, { invoker: 'public' });
export const publishBusinessProfile = ownerCall(workspaceCommands.publishBusinessProfile);
export const getWorkspaceReadiness = ownerCall(workspaceCommands.getWorkspaceReadiness);
export const migrateWorkspaceCollections = ownerCall(workspaceCommands.migrateWorkspaceCollections);
export const abortWorkspaceMigration = ownerCall(workspaceCommands.abortWorkspaceMigration);
export const adjustInventory = ownerCall(inventoryAdjustment);
export const getPublicCommerceContext = ownerCall(commerceContext);
export const quotePublicCommerce = ownerCall(commerceQuote);
export const getButlerState = ownerCall(butler.getButlerState);
export const executeButlerTool = ownerCall(async (data, auth) => {
  const uid = data.workspaceId || auth?.uid; assertOwner(uid, auth);
  return butler.executeButlerTool({ uid, workspaceId: uid, name: data.name, arguments: data.arguments || {}, mode: data.mode || 'butler', requestId: data.requestId });
});
export const applyButlerPreview = ownerCall(butler.applyButlerPreview);
export const dismissButlerPreview = ownerCall(butler.dismissButlerPreview);
export const saveButlerAutomation = ownerCall(butler.saveButlerAutomation);
export const publishWebsite = ownerCall(websites.publishWebsite);
export const getWebsitePublishStatus = ownerCall(websites.getWebsitePublishStatus);
export const rollbackWebsite = ownerCall(websites.rollbackWebsite);
export const getPublicWebsite = ownerCall(websites.getPublicWebsite);
export const saveWebsiteDraft = ownerCall(websites.saveWebsiteDraft);
export const getWebsiteDraft = ownerCall(websites.getWebsiteDraft);
export const listWebsiteDraftVersions = ownerCall(websites.listWebsiteDraftVersions);
export const getWebsiteDraftVersion = ownerCall(websites.getWebsiteDraftVersion);
export const createWebsitePreview = ownerCall(websites.createWebsitePreview);
export const websiteGateway = onRequest({ secrets: paymentSecrets, cors: false, timeoutSeconds: 60, maxInstances: 20 }, websites.publicWebsiteGateway);

const includedProviders = String(process.env.AI_INCLUDED_PROVIDERS || '').split(',').map(value => value.trim());
const aiSecretNames = ['AI_SETTINGS_ENCRYPTION_KEY', ...includedProviders.includes('openai') ? ['OPENAI_API_KEY'] : [], ...includedProviders.includes('anthropic') ? ['ANTHROPIC_API_KEY'] : [], ...process.env.AI_CHATGPT_OAUTH_ENABLED === 'true' && process.env.CHATGPT_TOKEN_AUTH_METHOD === 'client_secret_basic' ? ['OPENAI_CLIENT_SECRET'] : []];
const aiSecrets = aiSecretNames.map(name => defineSecret(name));
const ai = createAIGateway({
  authorizeWorkspace: async ({ uid, workspaceId, db }) => {
    assertOwner(workspaceId, { uid, token: { email_verified: true } });
    if (!(await readWorkspace(db, uid)).exists) throw new HttpsError('failed-precondition', 'Save your business workspace first.');
  },
  resolveContext: butler.getButlerContext,
  executeTool: butler.executeButlerTool
});
const aiCall = handler => onCall({ secrets: aiSecrets, timeoutSeconds: 300, maxInstances: 10 }, async (request, response) => {
  try {
    if (request.auth?.token.firebase?.sign_in_provider === 'password' && !request.auth.token.email_verified) throw new HttpsError('permission-denied', 'Verify your email to connect and use AI.');
    return await handler(request, response);
  } catch (error) { wrapError(error); }
});
export const listAIConnections = aiCall(ai.listConnections);
export const saveAIConnection = aiCall(ai.saveConnection);
export const disconnectAIConnection = aiCall(ai.disconnectConnection);
export const selectAIBillingSource = aiCall(ai.selectBilling);
export const listAIModels = aiCall(ai.listModels);
export const startChatGPTConnection = aiCall(ai.startChatGPT);
export const getPendingChatGPTConnection = aiCall(ai.getPendingChatGPT);
export const confirmChatGPTConnection = aiCall(ai.confirmChatGPT);
export const acknowledgeChatGPTPlanUsage = aiCall(ai.acknowledgePlanUsage);
export const runAI = aiCall(ai.run);
export const getAIRun = aiCall(ai.getRun);
export const cancelAIRun = aiCall(ai.cancelRun);
export const listAIConversations = aiCall(ai.listConversations);
export const getAIConversation = aiCall(ai.getConversation);
export const deleteAIConversation = aiCall(ai.deleteConversation);
export const chatGPTConnectionCallback = onRequest({ secrets: aiSecrets, cors: false, maxInstances: 10 }, ai.chatGPTCallback);
export const recoverInterruptedAIRuns = onSchedule({ schedule: 'every 5 minutes', secrets: aiSecrets, timeoutSeconds: 300, maxInstances: 1 }, () => ai.reconcileInterruptedRuns());
export const cleanupAIConnectionRequests = onSchedule({ schedule: 'every 60 minutes', timeoutSeconds: 120, maxInstances: 1 }, () => ai.cleanupOAuthStates());
export const cleanupDeletedAIConversations = onSchedule({ schedule: 'every 5 minutes', timeoutSeconds: 300, maxInstances: 1 }, () => ai.cleanupDeletedConversations());

export const expireStockHolds = onSchedule('every 1 minutes', async () => {
  const db = getFirestore();
  const reservations = await db.collectionGroup('inventoryReservations').where('status', '==', 'reserved').where('expiresAtMs', '<=', Date.now()).orderBy('expiresAtMs').limit(500).get();
  const owners = new Set(reservations.docs.filter(doc => doc.data().expiresAtMs <= Date.now()).map(doc => doc.ref.parent.parent.id));
  for (const ownerId of owners) await expireInventoryReservations({ ownerId }, db);
});
export const butlerAutomationTick = onSchedule('every 5 minutes', () => butler.runButlerAutomations());
export const butlerWorkspaceEvent = onDocumentWritten(`artifacts/${APP_ID}/users/{ownerId}/config/settings`, async event => {
  if (!event.data?.after.exists) return;
  await workspaceCommands.syncPublicBusinessProfile(event.params.ownerId);
  if (event.data.after.data().lastCommandSource === 'automation') return;
  return butler.runButlerAutomations({ eventOwnerId: event.params.ownerId, eventId: event.id });
});


const reviewCall = handler => onCall({ enforceAppCheck: true, maxInstances: 5 }, async request => { try { return await handler(request.data || {}, request.auth); } catch (error) { throw wrapError(error); } });
export const getPurchaseReview = reviewCall(customerReviews.getPurchaseReview);
export const submitPurchaseReview = reviewCall(customerReviews.submitPurchaseReview);
export const getPublicPlatformReviews = reviewCall(customerReviews.getPublicPlatformReviews);
