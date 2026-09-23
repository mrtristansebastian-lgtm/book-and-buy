import { createHash } from 'node:crypto';
import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getFunctions } from 'firebase-admin/functions';
import { getMessaging } from 'firebase-admin/messaging';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import {
  cleanSocialId,
  cleanSocialValue,
  rankExplorePost,
  stableSocialKey,
  verifyCloudflareWebhook
} from './socialCore.js';

if (!getApps().length) initializeApp();

const db = getFirestore();
const APP_ID = process.env.APP_ID || 'book-and-buy-v1';
const ROOT = `artifacts/${APP_ID}`;
const PAGE_SIZE = 24;
const callableOptions = {
  enforceAppCheck: String(process.env.SOCIAL_ENFORCE_APP_CHECK || '').toLowerCase() === 'true',
  invoker: 'public'
};

function requireAuth(request) {
  const uid = String(request.auth?.uid || '');
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');
  return uid;
}

function isPlatformAdmin(request) {
  const token = request.auth?.token || {};
  return token.platformAdmin === true || token.role === 'platform_admin';
}

function requirePlatformAdmin(request) {
  const uid = requireAuth(request);
  if (!isPlatformAdmin(request)) throw new HttpsError('permission-denied', 'Platform administrator access required.');
  return uid;
}

async function enforcePlatformRate(request, action, { limit = 120, windowMs = 60_000 } = {}) {
  const forwarded = String(request.rawRequest?.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  const subject = request.auth?.uid || forwarded || request.rawRequest?.ip || 'anonymous';
  const id = stableSocialKey(action, subject).slice(0, 48);
  const ref = db.doc(`${ROOT}/socialRateLimits/${id}`);
  const now = Date.now();
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    const data = snapshot.data() || {};
    const active = now - Number(data.startsAtMs || 0) < windowMs;
    const count = active ? Number(data.count || 0) : 0;
    if (count >= limit) throw new HttpsError('resource-exhausted', 'Slow down and try again shortly.');
    tx.set(ref, {
      action,
      startsAtMs: active ? Number(data.startsAtMs) : now,
      count: count + 1,
      expiresAtMs: now + windowMs * 2
    }, { merge: true });
  });
}

async function canManageBusiness(request, ownerId) {
  const uid = requireAuth(request);
  if (uid === ownerId) return true;
  const email = cleanSocialValue(request.auth?.token?.email, 240).toLowerCase();
  if (!email) return false;
  const access = await db.doc(`${ROOT}/staffAccess/${email}/workspaces/${ownerId}`).get();
  return access.exists && access.data()?.status === 'active';
}

function profileRef(uid) {
  return db.doc(`${ROOT}/userProfiles/${cleanSocialId(uid)}`);
}

function notificationCollection({ uid, audience, ownerId }) {
  return audience === 'business'
    ? db.collection(`${ROOT}/users/${cleanSocialId(ownerId)}/socialNotifications`)
    : profileRef(uid).collection('socialNotifications');
}

function auditRecord({ actorUid, action, subjectType, subjectId, before = null, after = null, reason = '' }) {
  return {
    actorUid,
    action,
    subjectType,
    subjectId,
    before,
    after,
    reason: cleanSocialValue(reason, 500),
    createdAtMs: Date.now(),
    createdAt: FieldValue.serverTimestamp()
  };
}

export const socialReportContent = onCall(callableOptions, async (request) => {
  const reporterUid = requireAuth(request);
  await enforcePlatformRate(request, 'report', { limit: 20, windowMs: 60 * 60_000 });
  const subjectType = cleanSocialValue(request.data?.subjectType, 30);
  if (!['post', 'comment', 'profile', 'business'].includes(subjectType)) {
    throw new HttpsError('invalid-argument', 'Choose a valid report target.');
  }
  const subjectId = cleanSocialId(request.data?.subjectId);
  const reason = cleanSocialValue(request.data?.reason, 80);
  const details = cleanSocialValue(request.data?.details, 1000);
  if (!reason) throw new HttpsError('invalid-argument', 'Choose a reason for this report.');
  let subjectOwnerUid = '';
  if (subjectType === 'profile') subjectOwnerUid = subjectId;
  if (subjectType === 'post') {
    const subject = await db.doc(`${ROOT}/socialPosts/${subjectId}`).get();
    subjectOwnerUid = cleanSocialValue(subject.data()?.ownerId, 160);
  }
  if (subjectType === 'comment' && request.data?.postId) {
    const subject = await db.doc(`${ROOT}/socialPosts/${cleanSocialId(request.data.postId)}/comments/${subjectId}`).get();
    subjectOwnerUid = cleanSocialValue(subject.data()?.authorUid, 160);
  }
  if (subjectType === 'business') {
    const subject = await db.doc(`${ROOT}/public/data/workspaces/${subjectId}`).get();
    subjectOwnerUid = cleanSocialValue(subject.data()?.ownerId, 160);
  }
  if (subjectOwnerUid && subjectOwnerUid === reporterUid) throw new HttpsError('invalid-argument', 'You cannot report your own content.');
  const id = stableSocialKey(reporterUid, subjectType, subjectId).slice(0, 48);
  const ref = db.doc(`${ROOT}/socialModerationCases/${id}`);
  const now = Date.now();
  const result = await db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    const data = existing.data() || {};
    if (existing.exists && !['dismissed', 'resolved'].includes(data.status)) {
      return { duplicate: true, caseId: ref.id };
    }
    tx.set(ref, {
      id: ref.id,
      reporterUid,
      subjectType,
      subjectId,
      subjectOwnerUid,
      businessSlug: cleanSocialValue(request.data?.businessSlug, 120).toLowerCase(),
      postId: cleanSocialValue(request.data?.postId, 240),
      commentId: cleanSocialValue(request.data?.commentId, 240),
      reason,
      details,
      status: 'open',
      priority: reason === 'immediate_danger' ? 'urgent' : 'normal',
      createdAtMs: now,
      updatedAtMs: now,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    tx.set(db.collection(`${ROOT}/socialAuditLogs`).doc(), auditRecord({
      actorUid: reporterUid,
      action: 'report_created',
      subjectType,
      subjectId,
      after: { caseId: ref.id, reason }
    }));
    return { duplicate: false, caseId: ref.id };
  });
  return { ok: true, ...result };
});

export const socialSetRelationship = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  await enforcePlatformRate(request, 'relationship', { limit: 60, windowMs: 60_000 });
  const targetId = cleanSocialId(request.data?.targetId);
  const kind = request.data?.kind === 'block' ? 'block' : 'mute';
  const active = request.data?.active !== false;
  if (targetId === uid) throw new HttpsError('invalid-argument', `You cannot ${kind} yourself.`);
  const collectionName = kind === 'block' ? 'blockedAccounts' : 'mutedAccounts';
  const ref = profileRef(uid).collection(collectionName).doc(targetId);
  if (active) {
    await ref.set({ targetId, kind, createdAtMs: Date.now(), createdAt: FieldValue.serverTimestamp() });
  } else {
    await ref.delete();
  }
  return { ok: true, kind, targetId, active };
});

export const socialSetNotificationPreferences = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  await enforcePlatformRate(request, 'notification_preferences', { limit: 30, windowMs: 60_000 });
  const audience = request.data?.audience === 'business' ? 'business' : 'client';
  const ownerId = audience === 'business' ? cleanSocialId(request.data?.ownerId || uid) : '';
  if (audience === 'business' && !(await canManageBusiness(request, ownerId))) {
    throw new HttpsError('permission-denied', 'Business access required.');
  }
  const source = request.data?.preferences || {};
  const preferences = {
    inApp: source.inApp !== false,
    push: source.push === true,
    likes: source.likes !== false,
    shares: source.shares !== false,
    comments: source.comments !== false,
    replies: source.replies !== false,
    follows: source.follows !== false,
    quietHours: source.quietHours && typeof source.quietHours === 'object'
      ? {
          start: cleanSocialValue(source.quietHours.start, 5),
          end: cleanSocialValue(source.quietHours.end, 5),
          timezone: cleanSocialValue(source.quietHours.timezone, 80)
        }
      : null,
    updatedAtMs: Date.now()
  };
  const ref = audience === 'business'
    ? db.doc(`${ROOT}/users/${ownerId}/socialSettings/notifications`)
    : profileRef(uid).collection('socialSettings').doc('notifications');
  await ref.set(preferences, { merge: true });
  return { ok: true, preferences };
});

export const socialRegisterDevice = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  await enforcePlatformRate(request, 'device_registration', { limit: 10, windowMs: 60 * 60_000 });
  const token = cleanSocialValue(request.data?.token, 4096);
  if (token.length < 20) throw new HttpsError('invalid-argument', 'A valid push token is required.');
  const id = stableSocialKey(token).slice(0, 48);
  await profileRef(uid).collection('devices').doc(id).set({
    id,
    token,
    platform: cleanSocialValue(request.data?.platform || 'web', 30),
    userAgent: cleanSocialValue(request.data?.userAgent, 300),
    enabled: request.data?.enabled !== false,
    updatedAtMs: Date.now(),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  return { ok: true, deviceId: id };
});

export const socialListNotifications = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  await enforcePlatformRate(request, 'notification_list', { limit: 120, windowMs: 60_000 });
  const audience = request.data?.audience === 'business' ? 'business' : 'client';
  const ownerId = audience === 'business' ? cleanSocialId(request.data?.ownerId || uid) : '';
  if (audience === 'business' && !(await canManageBusiness(request, ownerId))) {
    throw new HttpsError('permission-denied', 'Business access required.');
  }
  const size = Math.min(50, Math.max(1, Number(request.data?.pageSize || 30)));
  let q = notificationCollection({ uid, audience, ownerId })
    .orderBy('createdAtMs', 'desc')
    .orderBy('__name__', 'desc');
  const cursor = request.data?.cursor;
  if (cursor?.createdAtMs && cursor?.id) q = q.startAfter(Number(cursor.createdAtMs), cleanSocialId(cursor.id));
  const snap = await q.limit(size + 1).get();
  const items = snap.docs.slice(0, size).map((entry) => ({ id: entry.id, ...entry.data() }));
  const last = items.at(-1);
  return {
    ok: true,
    items,
    hasMore: snap.size > size,
    nextCursor: snap.size > size && last ? { createdAtMs: last.createdAtMs, id: last.id } : null
  };
});

export const socialListFeed = onCall(callableOptions, async (request) => {
  await enforcePlatformRate(request, 'feed_list', { limit: 240, windowMs: 60_000 });
  const mode = request.data?.mode === 'home' ? 'home' : 'explore';
  const kind = cleanSocialValue(request.data?.type, 30);
  const businessSlug = cleanSocialValue(request.data?.businessSlug, 120).toLowerCase();
  const size = Math.min(48, Math.max(1, Number(request.data?.pageSize || PAGE_SIZE)));
  const uid = String(request.auth?.uid || '');
  const excludedOwners = new Set();
  if (uid) {
    const [blocked, muted] = await Promise.all([
      profileRef(uid).collection('blockedAccounts').limit(500).get(),
      profileRef(uid).collection('mutedAccounts').limit(500).get()
    ]);
    blocked.docs.forEach((entry) => excludedOwners.add(entry.id));
    muted.docs.forEach((entry) => excludedOwners.add(entry.id));
  }
  let q = db.collection(`${ROOT}/socialPosts`)
    .where('status', '==', 'published')
    .where('moderationState', '==', 'visible');
  if (kind) q = q.where('type', '==', kind);
  if (businessSlug) q = q.where('businessSlug', '==', businessSlug);
  q = mode === 'explore'
    ? q.orderBy('rankScore', 'desc').orderBy('publishedAtMs', 'desc').orderBy('__name__', 'desc')
    : q.orderBy('publishedAtMs', 'desc').orderBy('__name__', 'desc');
  const cursor = request.data?.cursor;
  if (cursor?.publishedAtMs && cursor?.id) {
    q = mode === 'explore'
      ? q.startAfter(Number(cursor.score || 0), Number(cursor.publishedAtMs), cleanSocialId(cursor.id))
      : q.startAfter(Number(cursor.publishedAtMs), cleanSocialId(cursor.id));
  }
  const snap = await q.limit(size * 3 + 1).get();
  let items = snap.docs
    .map((entry) => ({ id: entry.id, ...entry.data() }))
    .filter((post) => !excludedOwners.has(post.ownerId));
  if (mode === 'explore') items = items.map((post) => ({ ...post, rankScore: Number(post.rankScore || rankExplorePost(post)) }));
  items = items.slice(0, size);
  const last = items.at(-1);
  return {
    ok: true,
    mode,
    rankingVersion: mode === 'explore' ? 1 : 0,
    items,
    hasMore: snap.size > size,
    nextCursor: last ? { publishedAtMs: last.publishedAtMs, id: last.id, score: last.rankScore || 0 } : null
  };
});

export const socialListModerationCases = onCall(callableOptions, async (request) => {
  requirePlatformAdmin(request);
  const status = cleanSocialValue(request.data?.status || 'open', 30);
  const size = Math.min(100, Math.max(1, Number(request.data?.pageSize || 30)));
  let q = db.collection(`${ROOT}/socialModerationCases`)
    .where('status', '==', status)
    .orderBy('updatedAtMs', 'desc')
    .orderBy('__name__', 'desc');
  const cursor = request.data?.cursor;
  if (cursor?.updatedAtMs && cursor?.id) q = q.startAfter(Number(cursor.updatedAtMs), cleanSocialId(cursor.id));
  const snap = await q.limit(size + 1).get();
  const items = snap.docs.slice(0, size).map((entry) => ({ id: entry.id, ...entry.data() }));
  const last = items.at(-1);
  return { ok: true, items, hasMore: snap.size > size, nextCursor: snap.size > size && last ? { updatedAtMs: last.updatedAtMs, id: last.id } : null };
});

export const socialResolveModerationCase = onCall(callableOptions, async (request) => {
  const actorUid = requirePlatformAdmin(request);
  const caseId = cleanSocialId(request.data?.caseId);
  const action = cleanSocialValue(request.data?.action, 30);
  if (!['dismiss', 'remove', 'restore', 'warn', 'suspend', 'resolve_appeal'].includes(action)) {
    throw new HttpsError('invalid-argument', 'Choose a valid moderation action.');
  }
  const ref = db.doc(`${ROOT}/socialModerationCases/${caseId}`);
  let resolvedCase = null;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'Moderation case not found.');
    const before = snap.data();
    resolvedCase = before;
    const status = action === 'dismiss' ? 'dismissed' : 'resolved';
    tx.update(ref, {
      status,
      resolution: action,
      resolutionNote: cleanSocialValue(request.data?.note, 1000),
      resolvedByUid: actorUid,
      updatedAtMs: Date.now(),
      updatedAt: FieldValue.serverTimestamp()
    });
    if (before.subjectType === 'post' && ['remove', 'restore'].includes(action)) {
      tx.set(db.doc(`${ROOT}/socialPosts/${cleanSocialId(before.subjectId)}`), {
        moderationState: action === 'remove' ? 'removed' : 'visible',
        updatedAtMs: Date.now()
      }, { merge: true });
    }
    if (before.subjectType === 'comment' && before.postId && ['remove', 'restore'].includes(action)) {
      tx.set(db.doc(`${ROOT}/socialPosts/${cleanSocialId(before.postId)}/comments/${cleanSocialId(before.subjectId)}`), {
        moderationState: action === 'remove' ? 'removed' : 'visible',
        updatedAtMs: Date.now()
      }, { merge: true });
    }
    if (before.subjectOwnerUid && ['warn', 'suspend'].includes(action)) {
      tx.set(db.doc(`${ROOT}/socialAccountModeration/${cleanSocialId(before.subjectOwnerUid)}`), {
        uid: before.subjectOwnerUid,
        status: action === 'suspend' ? 'suspended' : 'warned',
        caseId,
        updatedByUid: actorUid,
        updatedAtMs: Date.now()
      }, { merge: true });
    }
    tx.set(db.collection(`${ROOT}/socialAuditLogs`).doc(), auditRecord({
      actorUid,
      action: `moderation_${action}`,
      subjectType: before.subjectType,
      subjectId: before.subjectId,
      before: { status: before.status },
      after: { status, caseId }
    }));
  });
  if (action === 'suspend' && resolvedCase?.subjectOwnerUid) {
    const posts = await db.collection(`${ROOT}/socialPosts`)
      .where('ownerId', '==', resolvedCase.subjectOwnerUid)
      .limit(500)
      .get();
    if (!posts.empty) {
      const batch = db.batch();
      posts.docs.forEach((entry) => batch.set(entry.ref, {
        moderationState: 'removed',
        moderationReason: 'account_suspended',
        updatedAtMs: Date.now()
      }, { merge: true }));
      await batch.commit();
    }
  }
  return { ok: true, caseId, action };
});

export const socialAppealModeration = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  await enforcePlatformRate(request, 'moderation_appeal', { limit: 5, windowMs: 24 * 60 * 60_000 });
  const caseId = cleanSocialId(request.data?.caseId);
  const statement = cleanSocialValue(request.data?.statement, 2000);
  if (statement.length < 20) throw new HttpsError('invalid-argument', 'Please explain your appeal in a little more detail.');
  const ref = db.doc(`${ROOT}/socialModerationCases/${caseId}`);
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) throw new HttpsError('not-found', 'Moderation case not found.');
    const item = snapshot.data();
    if (item.subjectOwnerUid !== uid && item.reporterUid !== uid) {
      throw new HttpsError('permission-denied', 'This case does not belong to your account.');
    }
    tx.update(ref, {
      status: 'appealed',
      appealStatement: statement,
      appealedByUid: uid,
      appealedAtMs: Date.now(),
      updatedAtMs: Date.now()
    });
    tx.set(db.collection(`${ROOT}/socialAuditLogs`).doc(), auditRecord({
      actorUid: uid,
      action: 'moderation_appealed',
      subjectType: item.subjectType,
      subjectId: item.subjectId,
      after: { caseId }
    }));
  });
  return { ok: true, caseId, status: 'appealed' };
});

export const socialCreateStreamUpload = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  await enforcePlatformRate(request, 'stream_upload', { limit: 20, windowMs: 60 * 60_000 });
  const enabled = String(process.env.SOCIAL_CLOUDFLARE_ENABLED || '').toLowerCase() === 'true';
  const accountId = cleanSocialValue(process.env.CLOUDFLARE_ACCOUNT_ID, 80);
  const apiToken = cleanSocialValue(process.env.CLOUDFLARE_API_TOKEN, 500);
  if (!enabled || !accountId || !apiToken) return { ok: true, enabled: false, provider: 'firebase' };
  const ownerId = cleanSocialId(request.data?.ownerId || uid);
  if (!(await canManageBusiness(request, ownerId))) throw new HttpsError('permission-denied', 'Business access required.');
  const maxDurationSeconds = Math.min(3600, Math.max(1, Number(request.data?.maxDurationSeconds || 600)));
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiToken}`, 'content-type': 'application/json', 'upload-creator': uid },
    body: JSON.stringify({
      maxDurationSeconds,
      requireSignedURLs: true,
      allowedOrigins: Array.isArray(request.data?.allowedOrigins) ? request.data.allowedOrigins.slice(0, 5) : []
    })
  });
  const data = await response.json();
  if (!response.ok || !data?.success || !data?.result?.uid) throw new HttpsError('unavailable', 'Video upload could not be prepared.');
  const assetId = cleanSocialId(data.result.uid);
  await db.doc(`${ROOT}/socialMediaAssets/${assetId}`).set({
    assetId,
    ownerId,
    creatorUid: uid,
    provider: 'cloudflare',
    state: 'uploading',
    maxDurationSeconds,
    createdAtMs: Date.now(),
    updatedAtMs: Date.now()
  });
  return { ok: true, enabled: true, provider: 'cloudflare', assetId, uploadUrl: data.result.uploadURL };
});

export const socialGetStreamToken = onCall(async (request) => {
  const assetId = cleanSocialId(request.data?.assetId);
  const enabled = String(process.env.SOCIAL_CLOUDFLARE_ENABLED || '').toLowerCase() === 'true';
  const accountId = cleanSocialValue(process.env.CLOUDFLARE_ACCOUNT_ID, 80);
  const apiToken = cleanSocialValue(process.env.CLOUDFLARE_API_TOKEN, 500);
  if (!enabled || !accountId || !apiToken) return { ok: true, enabled: false };
  const asset = await db.doc(`${ROOT}/socialMediaAssets/${assetId}`).get();
  if (!asset.exists || asset.data()?.state !== 'ready') throw new HttpsError('failed-precondition', 'Video is not ready.');
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${assetId}/token`, {
    method: 'POST', headers: { authorization: `Bearer ${apiToken}`, 'content-type': 'application/json' }
  });
  const data = await response.json();
  if (!response.ok || !data?.result?.token) throw new HttpsError('unavailable', 'Playback could not be prepared.');
  return { ok: true, enabled: true, token: data.result.token, expiresInSeconds: 3600 };
});

export const socialCloudflareWebhook = onRequest(async (request, response) => {
  const secret = cleanSocialValue(process.env.CLOUDFLARE_WEBHOOK_SECRET, 500);
  if (!secret || !verifyCloudflareWebhook({
    header: request.get('Webhook-Signature'),
    rawBody: request.rawBody,
    secret
  })) {
    response.status(401).send('Invalid signature');
    return;
  }
  const payload = request.body || {};
  const assetId = cleanSocialId(payload.uid);
  const state = payload.readyToStream === true
    ? 'ready'
    : payload.status?.state === 'error' || payload.status?.errorReasonCode
      ? 'failed'
      : 'processing';
  await db.doc(`${ROOT}/socialMediaAssets/${assetId}`).set({
    state,
    durationSeconds: Number(payload.duration || 0),
    width: Number(payload.input?.width || 0),
    height: Number(payload.input?.height || 0),
    posterUrl: cleanSocialValue(payload.thumbnail, 2000),
    hlsUrl: cleanSocialValue(payload.playback?.hls, 2000),
    dashUrl: cleanSocialValue(payload.playback?.dash, 2000),
    errorCode: cleanSocialValue(payload.status?.errorReasonCode, 120),
    errorText: cleanSocialValue(payload.status?.errorReasonText, 500),
    updatedAtMs: Date.now(),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  response.status(204).send('');
});

async function dispatchOutboxRecord(eventId, ref) {
  const row = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) return null;
    const current = snapshot.data();
    if (!current?.taskName || !['pending', 'dispatching'].includes(current.status)) return null;
    if (current.status === 'dispatching' && Number(current.dispatchClaimedAtMs || 0) > Date.now() - 5 * 60_000) {
      return null;
    }
    tx.set(ref, {
      status: 'dispatching',
      dispatchClaimedAtMs: Date.now(),
      updatedAtMs: Date.now()
    }, { merge: true });
    return current;
  });
  if (!row) return;
  try {
    const id = createHash('sha256').update(String(eventId)).digest('hex').slice(0, 48);
    await getFunctions().taskQueue(row.taskName).enqueue(
      { ...(row.payload || {}), outboxId: eventId },
      {
        id,
        scheduleDelaySeconds: Math.max(0, Math.ceil((Number(row.notBeforeMs || 0) - Date.now()) / 1000)),
        dispatchDeadlineSeconds: 300
      }
    );
    await ref.set({ status: 'dispatched', dispatchedAtMs: Date.now(), updatedAtMs: Date.now() }, { merge: true });
  } catch (error) {
    if (String(error?.code || '').includes('task-already-exists')) {
      await ref.set({ status: 'dispatched', dispatchedAtMs: Date.now(), updatedAtMs: Date.now() }, { merge: true });
      return;
    }
    await ref.set({ status: 'pending', lastError: cleanSocialValue(error?.message, 500), updatedAtMs: Date.now() }, { merge: true });
    throw error;
  }
}

export const socialDispatchOutbox = onDocumentCreated('artifacts/{appId}/socialOutbox/{eventId}', async (event) => {
  if (event.params.appId !== APP_ID || !event.data) return;
  await dispatchOutboxRecord(event.params.eventId, event.data.ref);
});

export const socialMaintainPlatform = onSchedule('every 15 minutes', async () => {
  const staleAt = Date.now() - 15 * 60_000;
  const stale = await db.collection(`${ROOT}/socialOutbox`)
    .where('status', '==', 'dispatched')
    .where('dispatchedAtMs', '<=', staleAt)
    .limit(100)
    .get();
  const batch = db.batch();
  stale.docs.forEach((entry) => {
    const attempts = Number(entry.data().attempts || 0) + 1;
    if (attempts >= 8) {
      batch.set(db.doc(`${ROOT}/socialDeadLetters/${entry.id}`), { ...entry.data(), attempts, deadAtMs: Date.now() });
      batch.update(entry.ref, { status: 'dead', attempts, updatedAtMs: Date.now() });
    } else {
      batch.update(entry.ref, { status: 'pending', attempts, updatedAtMs: Date.now() });
    }
  });
  if (!stale.empty) await batch.commit();

  const pending = await db.collection(`${ROOT}/socialOutbox`)
    .where('status', '==', 'pending')
    .limit(100)
    .get();
  await Promise.allSettled(pending.docs.map((entry) => dispatchOutboxRecord(entry.id, entry.ref)));

  const scheduled = await db.collection(`${ROOT}/socialPosts`)
    .where('status', '==', 'scheduled')
    .limit(100)
    .get();
  const due = scheduled.docs.filter((entry) => Number(entry.data().scheduledAtMs || 0) <= Date.now());
  if (due.length) {
    const publishBatch = db.batch();
    due.forEach((entry) => {
      const publishedAtMs = Date.now();
      publishBatch.set(entry.ref, {
        status: 'published',
        published: true,
        publishedAtMs,
        updatedAtMs: publishedAtMs,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      [
        ['socialSyncSearch', { postId: entry.id }],
        ['socialFanoutPost', { postId: entry.id }]
      ].forEach(([taskName, payload]) => {
        const eventId = stableSocialKey(taskName, entry.id, String(entry.data().scheduledAtMs || '')).slice(0, 48);
        publishBatch.create(db.doc(`${ROOT}/socialOutbox/${eventId}`), {
          taskName,
          payload,
          status: 'pending',
          attempts: 0,
          notBeforeMs: publishedAtMs,
          createdAtMs: publishedAtMs,
          updatedAtMs: publishedAtMs
        });
      });
    });
    try {
      await publishBatch.commit();
    } catch (error) {
      if (!String(error?.code || '').includes('already-exists') && Number(error?.code) !== 6) throw error;
    }
  }

  const posts = await db.collection(`${ROOT}/socialPosts`).orderBy('updatedAtMs', 'desc').limit(100).get();
  await Promise.all(posts.docs.map(async (post) => {
    const shards = await post.ref.collection('counterShards').get();
    if (shards.empty) return;
    const counts = shards.docs.reduce((total, entry) => {
      const data = entry.data();
      total.likes += Math.max(0, Number(data.likes || 0));
      total.comments += Math.max(0, Number(data.comments || 0));
      total.shares += Math.max(0, Number(data.shares || 0));
      return total;
    }, { likes: 0, comments: 0, shares: 0 });
    await post.ref.set({ counts, countsUpdatedAtMs: Date.now(), rankScore: rankExplorePost({ ...post.data(), counts }) }, { merge: true });
  }));

  const cleanupTargets = [
    db.collection(`${ROOT}/socialMutationReceipts`).where('expiresAtMs', '<=', Date.now()).limit(200),
    db.collection(`${ROOT}/socialActivityEvents`).where('createdAtMs', '<=', Date.now() - 30 * 24 * 60 * 60_000).limit(200),
    db.collectionGroup('socialNotifications').where('createdAtMs', '<=', Date.now() - 90 * 24 * 60 * 60_000).limit(200),
    db.collection(`${ROOT}/socialAuditLogs`).where('createdAtMs', '<=', Date.now() - 365 * 24 * 60 * 60_000).limit(200)
  ];
  const cleanupSnapshots = await Promise.all(cleanupTargets.map((target) => target.get()));
  const cleanupRefs = [];
  cleanupSnapshots.forEach((snapshot) => snapshot.docs.forEach((entry) => {
    if (!entry.ref.path.startsWith(`${ROOT}/`)) return;
    cleanupRefs.push(entry.ref);
  }));
  for (let index = 0; index < cleanupRefs.length; index += 400) {
    const cleanupBatch = db.batch();
    cleanupRefs.slice(index, index + 400).forEach((ref) => cleanupBatch.delete(ref));
    await cleanupBatch.commit();
  }

  const expiredPosts = await db.collection(`${ROOT}/socialPosts`)
    .where('status', '==', 'deleted')
    .where('deletedAtMs', '<=', Date.now() - 30 * 24 * 60 * 60_000)
    .limit(20)
    .get();
  await Promise.all(expiredPosts.docs.map((entry) => db.recursiveDelete(entry.ref)));
});

export async function completeSocialOutbox(outboxId, error = null) {
  if (!outboxId) return;
  const ref = db.doc(`${ROOT}/socialOutbox/${cleanSocialId(outboxId)}`);
  if (!error) {
    await ref.set({ status: 'completed', completedAtMs: Date.now(), updatedAtMs: Date.now() }, { merge: true });
    return;
  }
  await ref.set({ lastError: cleanSocialValue(error?.message || error, 500), updatedAtMs: Date.now() }, { merge: true });
}

export async function deliverSocialPush({ recipientUid, ownerId, audience = 'client', notification }) {
  const targetUid = audience === 'business' ? ownerId : recipientUid;
  if (!targetUid) return;
  const settingsRef = audience === 'business'
    ? db.doc(`${ROOT}/users/${ownerId}/socialSettings/notifications`)
    : profileRef(targetUid).collection('socialSettings').doc('notifications');
  const [settings, devices] = await Promise.all([
    settingsRef.get(),
    profileRef(targetUid).collection('devices').where('enabled', '==', true).limit(20).get()
  ]);
  if (settings.exists && settings.data()?.push !== true) return;
  const tokens = devices.docs.map((entry) => entry.data()?.token).filter(Boolean);
  if (!tokens.length) return;
  const result = await getMessaging().sendEachForMulticast({
    tokens,
    notification: {
      title: notification.actorName || 'New social activity',
      body: cleanSocialValue(notification.preview || 'Open Book and Buy to see what happened.', 160)
    },
    data: {
      type: String(notification.type || 'social'),
      businessSlug: String(notification.businessSlug || ''),
      postId: String(notification.postId || ''),
      commentId: String(notification.commentId || '')
    },
    webpush: { fcmOptions: { link: notification.businessSlug && notification.postId
      ? `/#/w/${notification.businessSlug}/social/${encodeURIComponent(notification.postId)}`
      : '/#/app/account/notifications' } }
  });
  const cleanup = db.batch();
  result.responses.forEach((entry, index) => {
    if (!entry.success && ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(entry.error?.code)) {
      const doc = devices.docs.find((item) => item.data()?.token === tokens[index]);
      if (doc) cleanup.update(doc.ref, { enabled: false, invalidatedAtMs: Date.now() });
    }
  });
  if (result.failureCount) await cleanup.commit();
}
