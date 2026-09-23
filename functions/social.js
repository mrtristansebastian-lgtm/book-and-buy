import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import {
  SOCIAL_COUNTER_SHARDS,
  SOCIAL_SCHEMA_VERSION,
  canonicalSocialId,
  cleanSocialValue,
  rankExplorePost,
  socialMutationId,
  socialShardFor,
  stableSocialKey
} from './socialCore.js';
import { evaluateSocialText } from './socialSafety.js';
import { completeSocialOutbox, deliverSocialPush } from './socialPlatform.js';

if (!getApps().length) initializeApp();

const db = getFirestore();
const APP_ID = process.env.APP_ID || 'book-and-buy-v1';
const ROOT = `artifacts/${APP_ID}`;
const COUNTER_SHARDS = SOCIAL_COUNTER_SHARDS;
const MAX_COMMENT_LENGTH = 2200;
const SOCIAL_PAGE_SIZE = 24;
const callableOptions = {
  enforceAppCheck: String(process.env.SOCIAL_ENFORCE_APP_CHECK || '').toLowerCase() === 'true'
};

const algoliaAppId = () => String(process.env.ALGOLIA_APP_ID || '').trim();
const algoliaAdminKey = () => String(process.env.ALGOLIA_ADMIN_KEY || '').trim();
const algoliaIndexName = () => String(process.env.ALGOLIA_SOCIAL_INDEX || 'social_posts').trim();

function requireAuth(request) {
  const uid = String(request.auth?.uid || '');
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');
  return uid;
}

function clean(value, max = 500) {
  return cleanSocialValue(value, max);
}

function cleanId(value) {
  const id = clean(value, 240);
  if (!id || id.includes('/')) throw new HttpsError('invalid-argument', 'Invalid identifier.');
  return id;
}

function canonicalId(slug, postId) {
  return canonicalSocialId(slug, postId);
}

function postRef(postId) {
  return db.doc(`${ROOT}/socialPosts/${cleanId(postId)}`);
}

function profileRef(uid) {
  return db.doc(`${ROOT}/userProfiles/${uid}`);
}

function actorFrom(request) {
  const counts = {
    likes: Number(post?.counts?.likes || post?.likeCount || 0),
    comments: Number(post?.counts?.comments || post?.commentCount || 0),
    shares: Number(post?.counts?.shares || post?.shareCount || 0)
  };
  return {
    actorUid: requireAuth(request),
    actorName: clean(request.auth?.token?.name || request.auth?.token?.email?.split('@')[0] || 'Someone', 100),
    actorPhotoURL: clean(request.auth?.token?.picture || '', 1000)
  };
}

function shardFor(value) {
  return socialShardFor(value, COUNTER_SHARDS);
}

function requestMutationId(request) {
  try {
    return socialMutationId(request.data?.mutationId);
  } catch {
    throw new HttpsError('invalid-argument', 'A valid mutationId is required. Refresh the app and try again.');
  }
}

function mutationReceiptRef(uid, action, mutationId) {
  return db.doc(`${ROOT}/socialMutationReceipts/${stableSocialKey(uid, action, mutationId).slice(0, 48)}`);
}

async function existingMutationResult(uid, action, mutationId) {
  const snap = await mutationReceiptRef(uid, action, mutationId).get();
  return snap.exists ? snap.data()?.result || null : null;
}

async function rememberMutationResult(uid, action, mutationId, result) {
  await mutationReceiptRef(uid, action, mutationId).set({
    uid,
    action,
    mutationId,
    result,
    createdAtMs: Date.now(),
    expiresAtMs: Date.now() + 30 * 24 * 60 * 60_000
  }, { merge: true });
  return result;
}

async function enforceRate(uid, action, { limit = 120, windowMs = 60_000 } = {}) {
  const ref = db.doc(`${ROOT}/socialRateLimits/${uid}_${action}`);
  const now = Date.now();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() || {};
    const startsAtMs = Number(data.startsAtMs || 0);
    const active = now - startsAtMs < windowMs;
    const count = active ? Number(data.count || 0) : 0;
    if (count >= limit) throw new HttpsError('resource-exhausted', 'Slow down and try again shortly.');
    tx.set(
      ref,
      {
        uid,
        action,
        startsAtMs: active ? startsAtMs : now,
        count: count + 1,
        expiresAtMs: now + windowMs * 2
      },
      { merge: true }
    );
  });
}

async function canManageBusiness(uid, ownerId, email = '') {
  if (uid === ownerId) return true;
  if (!email) return false;
  const access = await db.doc(`${ROOT}/staffAccess/${email}/workspaces/${ownerId}`).get();
  return access.exists && access.data()?.status === 'active';
}

async function assertInteractionAllowed(actorUid, ownerId) {
  if (!ownerId || actorUid === ownerId) return;
  const [actorBlocked, ownerBlocked] = await Promise.all([
    profileRef(actorUid).collection('blockedAccounts').doc(ownerId).get(),
    profileRef(ownerId).collection('blockedAccounts').doc(actorUid).get()
  ]);
  if (actorBlocked.exists || ownerBlocked.exists) {
    throw new HttpsError('permission-denied', 'This interaction is not available.');
  }
}

async function enqueueTask(name, payload, delaySeconds = 0, eventKey = '') {
  const ref = eventKey
    ? db.doc(`${ROOT}/socialOutbox/${stableSocialKey(name, eventKey).slice(0, 48)}`)
    : db.collection(`${ROOT}/socialOutbox`).doc();
  let record = {
    taskName: name,
    payload,
    status: 'pending',
    attempts: 0,
    notBeforeMs: Date.now() + Math.max(0, Number(delaySeconds || 0)) * 1000,
    createdAtMs: Date.now(),
    updatedAtMs: Date.now()
  };
  try {
    await ref.create(record);
  } catch (error) {
    if (String(error?.code || '').includes('already-exists') || Number(error?.code) === 6) return ref.id;
    throw error;
  }
  return ref.id;
}

async function createActivityEvent({ type, post, actor, comment = null, targetUid = '', groupable = false, mutationId = '' }) {
  if (!post?.ownerId || actor.actorUid === post.ownerId && !targetUid) return;
  const eventId = mutationId
    ? stableSocialKey(type, post.id, comment?.id || '', actor.actorUid, mutationId).slice(0, 48)
    : db.collection(`${ROOT}/socialActivityEvents`).doc().id;
  const eventRef = db.doc(`${ROOT}/socialActivityEvents/${eventId}`);
  try {
    await eventRef.create({
    type,
    postId: post.id,
    legacyPostId: post.legacyId || '',
    ownerId: post.ownerId,
    businessSlug: post.businessSlug || '',
    actorUid: actor.actorUid,
    actorName: actor.actorName,
    actorPhotoURL: actor.actorPhotoURL,
    targetUid,
    commentId: comment?.id || '',
    parentId: comment?.parentId || '',
    preview: clean(comment?.body || post.title || post.caption || '', 180),
    thumbnailUrl: clean(post.posterUrl || post.mediaUrl || '', 1000),
    groupable,
    createdAtMs: Date.now(),
    processedAtMs: null
    });
  } catch (error) {
    if (!(String(error?.code || '').includes('already-exists') || Number(error?.code) === 6)) throw error;
  }
  await enqueueTask('socialProcessActivity', { eventId }, 0, `activity_${eventId}`);
}

async function loadPost(postId) {
  const ref = postRef(postId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'This post is no longer available.');
  return { ref, id: snap.id, ...snap.data() };
}

async function queueAggregate(postId, mutationId = '') {
  await enqueueTask('socialAggregatePost', { postId }, 2, `aggregate_${postId}_${mutationId || Date.now()}`);
}

async function createAutomatedModerationCase({ subjectType, subjectId, postId = '', ownerId = '', safety }) {
  if (!safety || safety.state === 'visible') return '';
  const id = stableSocialKey('automated', subjectType, subjectId, safety.reason).slice(0, 48);
  await db.doc(`${ROOT}/socialModerationCases/${id}`).set({
    id,
    source: 'automated',
    subjectType,
    subjectId,
    postId,
    ownerId,
    reason: safety.reason,
    signals: safety.signals || [],
    priority: safety.state === 'blocked' ? 'urgent' : 'normal',
    status: 'open',
    createdAtMs: Date.now(),
    updatedAtMs: Date.now()
  }, { merge: true });
  return id;
}

async function runQueuedTask(request, handler) {
  try {
    const result = await handler();
    await completeSocialOutbox(request.data?.outboxId);
    return result;
  } catch (error) {
    await completeSocialOutbox(request.data?.outboxId, error);
    throw error;
  }
}

export const socialToggleReaction = onCall(callableOptions, async (request) => {
  const actor = actorFrom(request);
  const mutationId = requestMutationId(request);
  const prior = await existingMutationResult(actor.actorUid, 'reaction', mutationId);
  if (prior) return prior;
  await enforceRate(actor.actorUid, 'reaction');
  const postId = cleanId(request.data?.postId);
  const post = await loadPost(postId);
  await assertInteractionAllowed(actor.actorUid, post.ownerId);
  if (post.status !== 'published') throw new HttpsError('failed-precondition', 'Post is not public.');
  const reactionRef = post.ref.collection('reactions').doc(actor.actorUid);
  const shardRef = post.ref.collection('counterShards').doc(String(shardFor(actor.actorUid)));
  let active = false;
  let changed = false;
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(reactionRef);
    active = typeof request.data?.active === 'boolean' ? request.data.active : !existing.exists;
    changed = active !== existing.exists;
    if (!changed) return;
    if (!active) tx.delete(reactionRef);
    else {
      tx.set(reactionRef, {
        actorUid: actor.actorUid,
        kind: 'like',
        createdAtMs: Date.now(),
        createdAt: FieldValue.serverTimestamp()
      });
    }
    tx.set(shardRef, { likes: FieldValue.increment(active ? 1 : -1) }, { merge: true });
  });
  if (changed && active) await createActivityEvent({ type: 'post_like', post, actor, groupable: true, mutationId });
  if (changed) await queueAggregate(postId, mutationId);
  return rememberMutationResult(actor.actorUid, 'reaction', mutationId, {
    ok: true, mutationId, version: SOCIAL_SCHEMA_VERSION, active, delta: changed ? (active ? 1 : -1) : 0
  });
});

export const socialToggleSave = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  const mutationId = requestMutationId(request);
  const prior = await existingMutationResult(uid, 'save', mutationId);
  if (prior) return prior;
  await enforceRate(uid, 'save');
  const postId = cleanId(request.data?.postId);
  const post = await loadPost(postId);
  await assertInteractionAllowed(uid, post.ownerId);
  const ref = profileRef(uid).collection('savedPosts').doc(postId);
  let active = false;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    active = typeof request.data?.active === 'boolean' ? request.data.active : !snap.exists;
    if (active === snap.exists) return;
    if (!active) tx.delete(ref);
    else tx.set(ref, { postId, createdAtMs: Date.now(), createdAt: FieldValue.serverTimestamp() });
  });
  return rememberMutationResult(uid, 'save', mutationId, {
    ok: true, mutationId, version: SOCIAL_SCHEMA_VERSION, active
  });
});

export const socialCreateComment = onCall(callableOptions, async (request) => {
  const actor = actorFrom(request);
  const mutationId = requestMutationId(request);
  const prior = await existingMutationResult(actor.actorUid, 'comment_create', mutationId);
  if (prior) return prior;
  await enforceRate(actor.actorUid, 'comment', { limit: 10, windowMs: 60_000 });
  const postId = cleanId(request.data?.postId);
  const parentId = clean(request.data?.parentId, 240);
  const body = clean(request.data?.body, MAX_COMMENT_LENGTH);
  if (!body) throw new HttpsError('invalid-argument', 'Write a comment first.');
  const safety = evaluateSocialText(body);
  if (safety.state === 'blocked') throw new HttpsError('failed-precondition', 'This comment cannot be posted because it may violate the safety rules.');
  const post = await loadPost(postId);
  await assertInteractionAllowed(actor.actorUid, post.ownerId);
  if (post.status !== 'published') throw new HttpsError('failed-precondition', 'Post is not public.');
  let parent = null;
  if (parentId) {
    const parentSnap = await post.ref.collection('comments').doc(parentId).get();
    if (!parentSnap.exists || parentSnap.data()?.parentId) {
      throw new HttpsError('failed-precondition', 'Replies can only be one level deep.');
    }
    parent = { id: parentSnap.id, ...parentSnap.data() };
  }
  const commentRef = post.ref.collection('comments').doc(`c_${mutationId}`);
  let record = {
    id: commentRef.id,
    postId,
    parentId,
    authorUid: actor.actorUid,
    authorName: actor.actorName,
    authorPhotoURL: actor.actorPhotoURL,
    body,
    createdAtMs: Date.now(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAtMs: 0,
    likeCount: 0,
    replyCount: 0,
    moderationState: safety.state
  };
  const shardRef = post.ref.collection('counterShards').doc(String(shardFor(commentRef.id)));
  let created = false;
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(commentRef);
    if (existing.exists) {
      record = { id: existing.id, ...existing.data() };
      return;
    }
    created = true;
    tx.set(commentRef, record);
    tx.set(shardRef, { comments: FieldValue.increment(1) }, { merge: true });
    if (parent) tx.update(post.ref.collection('comments').doc(parent.id), { replyCount: FieldValue.increment(1) });
  });
  const targetUid = parent?.authorUid && parent.authorUid !== actor.actorUid ? parent.authorUid : '';
  if (created && safety.state !== 'visible') {
    await createAutomatedModerationCase({
      subjectType: 'comment',
      subjectId: record.id,
      postId,
      ownerId: post.ownerId,
      safety
    });
  }
  if (created && safety.state === 'visible') {
    await createActivityEvent({
      type: parent ? 'comment_reply' : 'post_comment',
      post,
      actor,
      comment: record,
      targetUid,
      mutationId
    });
    await queueAggregate(postId, mutationId);
  }
  return rememberMutationResult(actor.actorUid, 'comment_create', mutationId, {
    ok: true, mutationId, version: SOCIAL_SCHEMA_VERSION, comment: record, moderationState: safety.state
  });
});

export const socialToggleCommentLike = onCall(callableOptions, async (request) => {
  const actor = actorFrom(request);
  const mutationId = requestMutationId(request);
  const prior = await existingMutationResult(actor.actorUid, 'comment_like', mutationId);
  if (prior) return prior;
  await enforceRate(actor.actorUid, 'comment_like');
  const postId = cleanId(request.data?.postId);
  const commentId = cleanId(request.data?.commentId);
  const post = await loadPost(postId);
  await assertInteractionAllowed(actor.actorUid, post.ownerId);
  const commentRef = post.ref.collection('comments').doc(commentId);
  const reactionRef = commentRef.collection('reactions').doc(actor.actorUid);
  let active = false;
  let changed = false;
  let comment = null;
  await db.runTransaction(async (tx) => {
    const [commentSnap, reactionSnap] = await Promise.all([tx.get(commentRef), tx.get(reactionRef)]);
    if (!commentSnap.exists) throw new HttpsError('not-found', 'Comment not found.');
    comment = { id: commentSnap.id, ...commentSnap.data() };
    active = typeof request.data?.active === 'boolean' ? request.data.active : !reactionSnap.exists;
    changed = active !== reactionSnap.exists;
    if (!changed) return;
    if (!active) tx.delete(reactionRef);
    else tx.set(reactionRef, { actorUid: actor.actorUid, createdAtMs: Date.now() });
    tx.update(commentRef, { likeCount: FieldValue.increment(active ? 1 : -1) });
  });
  if (changed && active && comment.authorUid !== actor.actorUid) {
    await createActivityEvent({
      type: 'comment_like',
      post,
      actor,
      comment,
      targetUid: comment.authorUid,
      groupable: true,
      mutationId
    });
  }
  return rememberMutationResult(actor.actorUid, 'comment_like', mutationId, {
    ok: true, mutationId, version: SOCIAL_SCHEMA_VERSION, active, delta: changed ? (active ? 1 : -1) : 0
  });
});

export const socialDeleteComment = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  const mutationId = requestMutationId(request);
  const prior = await existingMutationResult(uid, 'comment_delete', mutationId);
  if (prior) return prior;
  const postId = cleanId(request.data?.postId);
  const commentId = cleanId(request.data?.commentId);
  const post = await loadPost(postId);
  await assertInteractionAllowed(uid, post.ownerId);
  const ref = post.ref.collection('comments').doc(commentId);
  const shardRef = post.ref.collection('counterShards').doc(String(shardFor(commentId)));
  let changed = false;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const comment = snap.data();
    if (comment.authorUid !== uid) throw new HttpsError('permission-denied', 'You can only delete your comments.');
    if (comment.moderationState === 'removed') return;
    changed = true;
    tx.update(ref, { moderationState: 'removed', body: '', updatedAtMs: Date.now() });
    tx.set(shardRef, { comments: FieldValue.increment(-1) }, { merge: true });
  });
  if (changed) await queueAggregate(postId, mutationId);
  return rememberMutationResult(uid, 'comment_delete', mutationId, {
    ok: true, mutationId, version: SOCIAL_SCHEMA_VERSION, changed
  });
});

export const socialModerateComment = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  const mutationId = requestMutationId(request);
  const prior = await existingMutationResult(uid, 'comment_moderate', mutationId);
  if (prior) return prior;
  const postId = cleanId(request.data?.postId);
  const commentId = cleanId(request.data?.commentId);
  const post = await loadPost(postId);
  const email = clean(request.auth?.token?.email, 240).toLowerCase();
  if (!(await canManageBusiness(uid, post.ownerId, email))) {
    throw new HttpsError('permission-denied', 'Business access required.');
  }
  const moderationState = request.data?.moderationState === 'visible' ? 'visible' : 'hidden';
  const commentRef = post.ref.collection('comments').doc(commentId);
  const before = await commentRef.get();
  await commentRef.update({ moderationState, updatedAtMs: Date.now() });
  await db.collection(`${ROOT}/socialAuditLogs`).add({
    actorUid: uid,
    action: `owner_comment_${moderationState}`,
    subjectType: 'comment',
    subjectId: commentId,
    postId,
    before: { moderationState: before.data()?.moderationState || '' },
    after: { moderationState },
    createdAtMs: Date.now()
  });
  return rememberMutationResult(uid, 'comment_moderate', mutationId, {
    ok: true, mutationId, version: SOCIAL_SCHEMA_VERSION, moderationState
  });
});

export const socialRecordShare = onCall(callableOptions, async (request) => {
  const actor = actorFrom(request);
  const mutationId = requestMutationId(request);
  const prior = await existingMutationResult(actor.actorUid, 'share', mutationId);
  if (prior) return prior;
  await enforceRate(actor.actorUid, 'share', { limit: 60, windowMs: 60_000 });
  const postId = cleanId(request.data?.postId);
  const post = await loadPost(postId);
  const shareRef = post.ref.collection('shares').doc(`s_${mutationId}`);
  const shardRef = post.ref.collection('counterShards').doc(String(shardFor(`${actor.actorUid}_${mutationId}`)));
  let created = false;
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(shareRef);
    if (existing.exists) return;
    created = true;
    tx.set(shareRef, { actorUid: actor.actorUid, mutationId, createdAtMs: Date.now(), createdAt: FieldValue.serverTimestamp() });
    tx.set(shardRef, { shares: FieldValue.increment(1) }, { merge: true });
  });
  if (created) {
    await createActivityEvent({ type: 'post_share', post, actor, groupable: true, mutationId });
    await queueAggregate(postId, mutationId);
  }
  return rememberMutationResult(actor.actorUid, 'share', mutationId, {
    ok: true, mutationId, version: SOCIAL_SCHEMA_VERSION, delta: created ? 1 : 0
  });
});

export const socialFollowBusiness = onCall(callableOptions, async (request) => {
  const actor = actorFrom(request);
  const mutationId = requestMutationId(request);
  const prior = await existingMutationResult(actor.actorUid, 'follow', mutationId);
  if (prior) return prior;
  await enforceRate(actor.actorUid, 'follow', { limit: 30, windowMs: 60_000 });
  const slug = clean(request.data?.slug, 120).toLowerCase();
  if (!slug) throw new HttpsError('invalid-argument', 'Business required.');
  const workspaceSnap = await db.doc(`${ROOT}/public/data/workspaces/${slug}`).get();
  const ownerId = clean(request.data?.ownerId || workspaceSnap.data()?.ownerId, 160);
  if (!ownerId) throw new HttpsError('not-found', 'Business not found.');
  await assertInteractionAllowed(actor.actorUid, ownerId);
  const following = request.data?.following !== false;
  const userFollowRef = profileRef(actor.actorUid).collection('following').doc(slug);
  const followerRef = db.doc(`${ROOT}/businessFollows/${slug}/followers/${actor.actorUid}`);
  const businessRef = db.doc(`${ROOT}/socialBusinesses/${slug}`);
  let changed = false;
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(userFollowRef);
    if (existing.exists === following) return;
    changed = true;
    if (following) {
      const data = { slug, ownerId, uid: actor.actorUid, createdAtMs: Date.now() };
      tx.set(userFollowRef, data);
      tx.set(followerRef, data);
      tx.set(businessRef, { ownerId, slug, followerCount: FieldValue.increment(1) }, { merge: true });
    } else {
      tx.delete(userFollowRef);
      tx.delete(followerRef);
      tx.set(businessRef, { followerCount: FieldValue.increment(-1) }, { merge: true });
    }
  });
  if (changed && following && actor.actorUid !== ownerId) {
    await createActivityEvent({
      type: 'business_follow',
      post: { id: '', ownerId, businessSlug: slug, title: workspaceSnap.data()?.brandName || slug },
      actor,
      mutationId
    });
  }
  return rememberMutationResult(actor.actorUid, 'follow', mutationId, {
    ok: true, mutationId, version: SOCIAL_SCHEMA_VERSION, following, changed
  });
});

export const socialMarkNotificationsRead = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  const mutationId = requestMutationId(request);
  const prior = await existingMutationResult(uid, 'notifications_read', mutationId);
  if (prior) return prior;
  const audience = request.data?.audience === 'business' ? 'business' : 'client';
  const ownerId = audience === 'business' ? clean(request.data?.ownerId || uid, 160) : '';
  if (audience === 'business') {
    const email = clean(request.auth?.token?.email, 240).toLowerCase();
    if (!(await canManageBusiness(uid, ownerId, email))) throw new HttpsError('permission-denied', 'Business access required.');
  }
  const base = audience === 'business'
    ? db.collection(`${ROOT}/users/${ownerId}/socialNotifications`)
    : profileRef(uid).collection('socialNotifications');
  let refs = (Array.isArray(request.data?.ids) ? request.data.ids : []).slice(0, 100).map((id) => base.doc(cleanId(id)));
  if (request.data?.all) {
    const snap = await base.where('readAtMs', '==', null).limit(200).get();
    refs = snap.docs.map((entry) => entry.ref);
  }
  let updated = 0;
  while (refs.length) {
    const chunk = refs.splice(0, 400);
    const batch = db.batch();
    chunk.forEach((ref) => batch.set(ref, { readAtMs: Date.now() }, { merge: true }));
    await batch.commit();
    updated += chunk.length;
    if (request.data?.all) {
      const next = await base.where('readAtMs', '==', null).limit(400).get();
      refs = next.docs.map((entry) => entry.ref);
    }
  }
  return rememberMutationResult(uid, 'notifications_read', mutationId, {
    ok: true, mutationId, version: SOCIAL_SCHEMA_VERSION, updated
  });
});

function postPayload({ slug, ownerId, businessName, businessLogoUrl, post }) {
  const legacyId = clean(post?.id, 160);
  const id = canonicalId(slug, legacyId);
  const createdAtMs = Number(post?.createdAt || post?.createdAtMs || Date.now());
  const postType = ['image', 'video', 'vertical', 'text'].includes(post?.type) ? post.type : 'image';
  const title = postType === 'image' ? '' : clean(post?.title, 240);
  const caption = clean(post?.caption, 5000);
  const tags = Array.isArray(post?.tags) ? post.tags.map((tag) => clean(tag, 60)).filter(Boolean).slice(0, 30) : [];
  const searchText = [businessName, title, caption, ...tags].join(' ').toLowerCase();
  const prefixes = [...new Set(searchText.split(/\s+/).flatMap((word) => {
    const next = [];
    for (let i = 2; i <= Math.min(word.length, 18); i += 1) next.push(word.slice(0, i));
    return next;
  }))].slice(0, 200);
  return {
    id,
    legacyId,
    ownerId,
    businessSlug: slug,
    businessName: clean(businessName, 160),
    businessLogoUrl: clean(businessLogoUrl, 1000),
    type: postType,
    title,
    caption,
    mediaUrl: clean(post?.mediaUrl, 2000),
    mediaUrls: Array.isArray(post?.mediaUrls) ? post.mediaUrls.slice(0, 20) : [],
    mediaItems: Array.isArray(post?.mediaItems) ? post.mediaItems.slice(0, 20) : [],
    posterUrl: clean(post?.posterUrl, 2000),
    duration: clean(post?.duration, 40),
    durationSeconds: Number(post?.durationSeconds || 0),
    exploreMainCategoryId: clean(post?.exploreMainCategoryId, 120),
    exploreSubcategoryId: clean(post?.exploreSubcategoryId, 120),
    tags,
    location: clean(post?.location, 300),
    locationPlaceId: clean(post?.locationPlaceId, 240),
    locationLat: Number(post?.locationLat || 0),
    locationLng: Number(post?.locationLng || 0),
    status: ['draft', 'scheduled', 'published', 'archived'].includes(post?.status)
      ? post.status
      : post?.published === false ? 'draft' : 'published',
    moderationState: clean(post?.moderationState, 30) || 'visible',
    moderationReason: clean(post?.moderationReason, 500),
    scheduledAtMs: Number(post?.scheduledAtMs || 0),
    publishedAtMs: Number(post?.publishedAtMs || (post?.published === false ? 0 : createdAtMs)),
    archivedAtMs: Number(post?.archivedAtMs || 0),
    deletedAtMs: 0,
    createdAtMs,
    updatedAtMs: Date.now(),
    schemaVersion: SOCIAL_SCHEMA_VERSION,
    version: Number(post?.version || 1),
    media: post?.media && typeof post.media === 'object' ? post.media : {
      provider: 'firebase',
      assetId: '',
      state: post?.mediaUrl ? 'legacy' : 'ready',
      playbackUrl: clean(post?.mediaUrl, 2000),
      posterUrl: clean(post?.posterUrl, 2000),
      durationSeconds: Number(post?.durationSeconds || 0)
    },
    searchText,
    searchPrefixes: prefixes,
    counts,
    rankScore: rankExplorePost({ ...post, counts, createdAtMs, publishedAtMs: Number(post?.publishedAtMs || createdAtMs) })
  };
}

export const socialUpsertPost = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  const mutationId = requestMutationId(request);
  const prior = await existingMutationResult(uid, 'post_upsert', mutationId);
  if (prior) return prior;
  const slug = clean(request.data?.slug, 120).toLowerCase();
  const ownerId = clean(request.data?.ownerId || uid, 160);
  const email = clean(request.auth?.token?.email, 240).toLowerCase();
  if (!(await canManageBusiness(uid, ownerId, email))) throw new HttpsError('permission-denied', 'Business access required.');
  if (!request.data?.post?.id || !slug) throw new HttpsError('invalid-argument', 'Post and business are required.');
  const payload = postPayload({
    slug,
    ownerId,
    businessName: request.data?.businessName,
    businessLogoUrl: request.data?.businessLogoUrl,
    post: request.data.post
  });
  const safety = evaluateSocialText(`${payload.title}\n${payload.caption}`);
  if (safety.state !== 'visible') {
    payload.status = 'draft';
    payload.moderationState = safety.state;
    payload.moderationReason = safety.reason;
  }
  const ref = postRef(payload.id);
  let wasPublished = false;
  let isNew = false;
  await db.runTransaction(async (tx) => {
    const before = await tx.get(ref);
    isNew = !before.exists;
    wasPublished = before.data()?.status === 'published';
    const previous = before.data() || {};
    tx.set(ref, {
      ...payload,
      createdAtMs: Number(previous.createdAtMs || payload.createdAtMs),
      createdAt: previous.createdAt || FieldValue.serverTimestamp(),
      publishedAtMs: payload.status === 'published'
        ? Number(previous.publishedAtMs || payload.publishedAtMs || Date.now())
        : Number(previous.publishedAtMs || payload.publishedAtMs || 0),
      counts: previous.counts || payload.counts,
      version: Number(previous.version || 0) + 1,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  });
  await enqueueTask('socialSyncSearch', { postId: payload.id }, 0, `search_${payload.id}_${mutationId}`);
  if (safety.state !== 'visible') {
    await createAutomatedModerationCase({
      subjectType: 'post',
      subjectId: payload.id,
      postId: payload.id,
      ownerId: payload.ownerId,
      safety
    });
  }
  if (payload.status === 'published' && (isNew || !wasPublished)) {
    await enqueueTask('socialFanoutPost', { postId: payload.id }, 0, `fanout_${payload.id}_${mutationId}`);
  }
  return rememberMutationResult(uid, 'post_upsert', mutationId, {
    ok: true, mutationId, version: SOCIAL_SCHEMA_VERSION, postId: payload.id,
    status: payload.status, moderationState: payload.moderationState
  });
});

export const socialDeletePost = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  const mutationId = requestMutationId(request);
  const prior = await existingMutationResult(uid, 'post_delete', mutationId);
  if (prior) return prior;
  const post = await loadPost(cleanId(request.data?.postId));
  const email = clean(request.auth?.token?.email, 240).toLowerCase();
  if (!(await canManageBusiness(uid, post.ownerId, email))) throw new HttpsError('permission-denied', 'Business access required.');
  await post.ref.update({
    status: 'deleted',
    moderationState: 'removed',
    deletedAtMs: Date.now(),
    updatedAtMs: Date.now(),
    updatedAt: FieldValue.serverTimestamp()
  });
  await enqueueTask('socialSyncSearch', { postId: post.id, remove: true }, 0, `search_remove_${post.id}_${mutationId}`);
  return rememberMutationResult(uid, 'post_delete', mutationId, {
    ok: true, mutationId, version: SOCIAL_SCHEMA_VERSION
  });
});

export const socialAggregatePost = onTaskDispatched(
  { retryConfig: { maxAttempts: 5, minBackoffSeconds: 2 }, rateLimits: { maxConcurrentDispatches: 40 } },
  async (request) => runQueuedTask(request, async () => {
    const postId = cleanId(request.data?.postId);
    const post = await loadPost(postId);
    const shards = await post.ref.collection('counterShards').get();
    const counts = shards.docs.reduce(
      (total, entry) => {
        const row = entry.data();
        total.likes += Number(row.likes || 0);
        total.comments += Number(row.comments || 0);
        total.shares += Number(row.shares || 0);
        return total;
      },
      { likes: 0, comments: 0, shares: 0 }
    );
    await post.ref.update({ counts, countsUpdatedAtMs: Date.now(), rankScore: rankExplorePost({ ...post, counts }) });
  })
);

export const socialProcessActivity = onTaskDispatched(
  { retryConfig: { maxAttempts: 7, minBackoffSeconds: 2 }, rateLimits: { maxConcurrentDispatches: 80 } },
  async (request) => runQueuedTask(request, async () => {
    const eventId = cleanId(request.data?.eventId);
    const eventRef = db.doc(`${ROOT}/socialActivityEvents/${eventId}`);
    const eventSnap = await eventRef.get();
    if (!eventSnap.exists || eventSnap.data()?.processedAtMs) return;
    const event = eventSnap.data();
    const audience = event.targetUid ? 'client' : 'business';
    const settingsRef = audience === 'client'
      ? profileRef(event.targetUid).collection('socialSettings').doc('notifications')
      : db.doc(`${ROOT}/users/${event.ownerId}/socialSettings/notifications`);
    const settingsSnap = await settingsRef.get();
    const settings = settingsSnap.data() || {};
    const preferenceKey = {
      post_like: 'likes',
      comment_like: 'likes',
      post_share: 'shares',
      post_comment: 'comments',
      comment_reply: 'replies',
      business_follow: 'follows'
    }[event.type] || '';
    if (preferenceKey && settings[preferenceKey] === false) {
      await eventRef.update({ processedAtMs: Date.now(), skippedByPreference: preferenceKey });
      return;
    }
    const target = event.targetUid
      ? profileRef(event.targetUid).collection('socialNotifications')
      : db.collection(`${ROOT}/users/${event.ownerId}/socialNotifications`);
    const groupKey = event.groupable
      ? `${event.type}_${event.postId}_${event.commentId || 'post'}`
      : eventId;
    const ref = target.doc(groupKey);
    let notification = {
      id: groupKey,
      type: event.type,
      recipientUid: event.targetUid || '',
      ownerId: event.ownerId,
      actorUid: event.actorUid,
      actorName: event.actorName,
      actorPhotoURL: event.actorPhotoURL || '',
      businessSlug: event.businessSlug || '',
      postId: event.legacyPostId || event.postId,
      canonicalPostId: event.postId,
      commentId: event.commentId || '',
      preview: event.preview || '',
      thumbnailUrl: event.thumbnailUrl || '',
      groupedCount: 1,
      createdAtMs: Date.now(),
      readAtMs: null
    };
    if (settings.inApp !== false) await db.runTransaction(async (tx) => {
      const existing = await tx.get(ref);
      const count = Number(existing.data()?.groupedCount || 0) + 1;
      notification = {
          ...notification,
          groupedCount: count,
          createdAtMs: Date.now(),
          readAtMs: null
        };
      tx.set(
        ref,
        notification,
        { merge: true }
      );
      tx.update(eventRef, { processedAtMs: Date.now() });
    });
    else await eventRef.update({ processedAtMs: Date.now(), inAppSuppressed: true });
    if (notification) {
      await deliverSocialPush({
        recipientUid: event.targetUid || '',
        ownerId: event.ownerId,
        audience,
        notification
      }).catch((error) => console.warn('Push delivery failed', error?.message || error));
    }
  })
);

export const socialFanoutPost = onTaskDispatched(
  { retryConfig: { maxAttempts: 5, minBackoffSeconds: 5 }, rateLimits: { maxConcurrentDispatches: 20 } },
  async (request) => runQueuedTask(request, async () => {
    const post = await loadPost(cleanId(request.data?.postId));
    const business = await db.doc(`${ROOT}/socialBusinesses/${post.businessSlug}`).get();
    if (Number(business.data()?.followerCount || 0) > 10_000) {
      await post.ref.set({ fanoutMode: 'read' }, { merge: true });
      return;
    }
    let queryRef = db.collection(`${ROOT}/businessFollows/${post.businessSlug}/followers`).orderBy('__name__').limit(400);
    if (request.data?.after) queryRef = queryRef.startAfter(cleanId(request.data.after));
    const followers = await queryRef.get();
    const batch = db.batch();
    followers.docs.forEach((follower) => {
      batch.set(profileRef(follower.id).collection('socialFeed').doc(post.id), {
        postId: post.id,
        businessSlug: post.businessSlug,
        createdAtMs: post.createdAtMs,
        type: post.type
      });
    });
    if (!followers.empty) await batch.commit();
    if (followers.size === 400) {
      await enqueueTask(
        'socialFanoutPost',
        { postId: post.id, after: followers.docs.at(-1).id },
        0,
        `fanout_${post.id}_${followers.docs.at(-1).id}`
      );
    }
  })
);

async function algoliaRequest(path, { method = 'POST', body } = {}) {
  const appId = algoliaAppId();
  const key = algoliaAdminKey();
  if (!appId || !key) return null;
  const response = await fetch(`https://${appId}.algolia.net/1/indexes/${algoliaIndexName()}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-algolia-application-id': appId,
      'x-algolia-api-key': key
    },
    body: body == null ? undefined : JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`Algolia request failed (${response.status})`);
  return response.json();
}

export const socialSyncSearch = onTaskDispatched(
  { retryConfig: { maxAttempts: 6, minBackoffSeconds: 5 }, rateLimits: { maxConcurrentDispatches: 20 } },
  async (request) => runQueuedTask(request, async () => {
    const postId = cleanId(request.data?.postId);
    if (request.data?.remove) {
      await algoliaRequest(`/${encodeURIComponent(postId)}`, { method: 'DELETE' });
      return;
    }
    const post = await loadPost(postId);
    if (post.status !== 'published' || post.moderationState !== 'visible') {
      await algoliaRequest(`/${encodeURIComponent(postId)}`, { method: 'DELETE' });
      return;
    }
    await algoliaRequest(`/${encodeURIComponent(postId)}`, {
      method: 'PUT',
      body: {
        objectID: post.id,
        legacyId: post.legacyId,
        businessSlug: post.businessSlug,
        businessName: post.businessName,
        businessLogoUrl: post.businessLogoUrl,
        type: post.type,
        title: post.title,
        caption: post.caption,
        tags: post.tags || [],
        exploreMainCategoryId: post.exploreMainCategoryId || '',
        exploreSubcategoryId: post.exploreSubcategoryId || '',
        location: post.location || '',
        mediaUrl: post.mediaUrl || '',
        posterUrl: post.posterUrl || '',
        createdAtMs: post.createdAtMs
      }
    });
  })
);

export const socialSearch = onCall(async (request) => {
  const forwarded = String(request.rawRequest?.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  await enforceRate(
    request.auth?.uid || `public_${stableSocialKey(forwarded || request.rawRequest?.ip || 'anonymous').slice(0, 32)}`,
    'search',
    { limit: 120, windowMs: 60_000 }
  );
  const term = clean(request.data?.query, 120);
  const type = clean(request.data?.type, 30);
  const page = Math.max(0, Number(request.data?.page || 0));
  const filters = type ? `type:${type}` : '';
  if (algoliaAppId() && algoliaAdminKey()) {
    const result = await algoliaRequest('/query', {
      body: { query: term, page, hitsPerPage: SOCIAL_PAGE_SIZE, filters }
    });
    return { ok: true, source: 'algolia', items: result?.hits || [], hasMore: page + 1 < Number(result?.nbPages || 0) };
  }
  const prefix = term.toLowerCase().split(/\s+/).filter(Boolean)[0] || '';
  let q = db.collection(`${ROOT}/socialPosts`)
    .where('status', '==', 'published')
    .where('moderationState', '==', 'visible');
  if (type) q = q.where('type', '==', type);
  if (prefix) q = q.where('searchPrefixes', 'array-contains', prefix);
  const snap = await q.orderBy('createdAtMs', 'desc').limit(SOCIAL_PAGE_SIZE).get();
  return { ok: true, source: 'firestore', items: snap.docs.map((entry) => entry.data()), hasMore: false };
});
