import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getFunctions } from 'firebase-admin/functions';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';

if (!getApps().length) initializeApp();

const db = getFirestore();
const APP_ID = process.env.APP_ID || 'book-and-buy-v1';
const ROOT = `artifacts/${APP_ID}`;
const COUNTER_SHARDS = 32;
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
  return String(value || '').trim().slice(0, max);
}

function cleanId(value) {
  const id = clean(value, 240);
  if (!id || id.includes('/')) throw new HttpsError('invalid-argument', 'Invalid identifier.');
  return id;
}

function canonicalId(slug, postId) {
  const part = (value) =>
    clean(value, 160)
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  return `${part(slug) || 'business'}--${part(postId) || 'post'}`;
}

function postRef(postId) {
  return db.doc(`${ROOT}/socialPosts/${cleanId(postId)}`);
}

function profileRef(uid) {
  return db.doc(`${ROOT}/userProfiles/${uid}`);
}

function actorFrom(request) {
  return {
    actorUid: requireAuth(request),
    actorName: clean(request.auth?.token?.name || request.auth?.token?.email?.split('@')[0] || 'Someone', 100),
    actorPhotoURL: clean(request.auth?.token?.picture || '', 1000)
  };
}

function shardFor(value) {
  let hash = 0;
  const input = String(value || 'anonymous');
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash % COUNTER_SHARDS;
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

async function enqueueTask(name, payload, delaySeconds = 0) {
  try {
    await getFunctions().taskQueue(name).enqueue(payload, {
      scheduleDelaySeconds: delaySeconds,
      dispatchDeadlineSeconds: 300
    });
  } catch (error) {
    console.warn(`Could not enqueue ${name}`, error?.message || error);
  }
}

async function createActivityEvent({ type, post, actor, comment = null, targetUid = '', groupable = false }) {
  if (!post?.ownerId || actor.actorUid === post.ownerId && !targetUid) return;
  const eventRef = db.collection(`${ROOT}/socialActivityEvents`).doc();
  await eventRef.set({
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
  await enqueueTask('socialProcessActivity', { eventId: eventRef.id });
}

async function loadPost(postId) {
  const ref = postRef(postId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'This post is no longer available.');
  return { ref, id: snap.id, ...snap.data() };
}

async function queueAggregate(postId) {
  await enqueueTask('socialAggregatePost', { postId }, 2);
}

export const socialToggleReaction = onCall(callableOptions, async (request) => {
  const actor = actorFrom(request);
  await enforceRate(actor.actorUid, 'reaction');
  const postId = cleanId(request.data?.postId);
  const post = await loadPost(postId);
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
  if (changed && active) await createActivityEvent({ type: 'post_like', post, actor, groupable: true });
  if (changed) await queueAggregate(postId);
  return { ok: true, active, delta: changed ? (active ? 1 : -1) : 0 };
});

export const socialToggleSave = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  await enforceRate(uid, 'save');
  const postId = cleanId(request.data?.postId);
  await loadPost(postId);
  const ref = profileRef(uid).collection('savedPosts').doc(postId);
  let active = false;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    active = typeof request.data?.active === 'boolean' ? request.data.active : !snap.exists;
    if (active === snap.exists) return;
    if (!active) tx.delete(ref);
    else tx.set(ref, { postId, createdAtMs: Date.now(), createdAt: FieldValue.serverTimestamp() });
  });
  return { ok: true, active };
});

export const socialCreateComment = onCall(callableOptions, async (request) => {
  const actor = actorFrom(request);
  await enforceRate(actor.actorUid, 'comment', { limit: 10, windowMs: 60_000 });
  const postId = cleanId(request.data?.postId);
  const parentId = clean(request.data?.parentId, 240);
  const body = clean(request.data?.body, MAX_COMMENT_LENGTH);
  if (!body) throw new HttpsError('invalid-argument', 'Write a comment first.');
  const post = await loadPost(postId);
  if (post.status !== 'published') throw new HttpsError('failed-precondition', 'Post is not public.');
  let parent = null;
  if (parentId) {
    const parentSnap = await post.ref.collection('comments').doc(parentId).get();
    if (!parentSnap.exists || parentSnap.data()?.parentId) {
      throw new HttpsError('failed-precondition', 'Replies can only be one level deep.');
    }
    parent = { id: parentSnap.id, ...parentSnap.data() };
  }
  const commentRef = post.ref.collection('comments').doc();
  const record = {
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
    moderationState: 'visible'
  };
  const shardRef = post.ref.collection('counterShards').doc(String(shardFor(commentRef.id)));
  const batch = db.batch();
  batch.set(commentRef, record);
  batch.set(shardRef, { comments: FieldValue.increment(1) }, { merge: true });
  if (parent) batch.update(post.ref.collection('comments').doc(parent.id), { replyCount: FieldValue.increment(1) });
  await batch.commit();
  const targetUid = parent?.authorUid && parent.authorUid !== actor.actorUid ? parent.authorUid : '';
  await createActivityEvent({
    type: parent ? 'comment_reply' : 'post_comment',
    post,
    actor,
    comment: record,
    targetUid
  });
  await queueAggregate(postId);
  return { ok: true, comment: record };
});

export const socialToggleCommentLike = onCall(callableOptions, async (request) => {
  const actor = actorFrom(request);
  await enforceRate(actor.actorUid, 'comment_like');
  const postId = cleanId(request.data?.postId);
  const commentId = cleanId(request.data?.commentId);
  const post = await loadPost(postId);
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
      groupable: true
    });
  }
  return { ok: true, active, delta: changed ? (active ? 1 : -1) : 0 };
});

export const socialDeleteComment = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  const postId = cleanId(request.data?.postId);
  const commentId = cleanId(request.data?.commentId);
  const post = await loadPost(postId);
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
  if (changed) await queueAggregate(postId);
  return { ok: true, changed };
});

export const socialModerateComment = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  const postId = cleanId(request.data?.postId);
  const commentId = cleanId(request.data?.commentId);
  const post = await loadPost(postId);
  const email = clean(request.auth?.token?.email, 240).toLowerCase();
  if (!(await canManageBusiness(uid, post.ownerId, email))) {
    throw new HttpsError('permission-denied', 'Business access required.');
  }
  const moderationState = request.data?.moderationState === 'visible' ? 'visible' : 'hidden';
  await post.ref.collection('comments').doc(commentId).update({ moderationState, updatedAtMs: Date.now() });
  return { ok: true, moderationState };
});

export const socialRecordShare = onCall(callableOptions, async (request) => {
  const actor = actorFrom(request);
  await enforceRate(actor.actorUid, 'share', { limit: 60, windowMs: 60_000 });
  const postId = cleanId(request.data?.postId);
  const post = await loadPost(postId);
  const shareRef = post.ref.collection('shares').doc();
  const shardRef = post.ref.collection('counterShards').doc(String(shardFor(`${actor.actorUid}_${Date.now()}`)));
  const batch = db.batch();
  batch.set(shareRef, { actorUid: actor.actorUid, createdAtMs: Date.now(), createdAt: FieldValue.serverTimestamp() });
  batch.set(shardRef, { shares: FieldValue.increment(1) }, { merge: true });
  await batch.commit();
  await createActivityEvent({ type: 'post_share', post, actor, groupable: true });
  await queueAggregate(postId);
  return { ok: true, delta: 1 };
});

export const socialFollowBusiness = onCall(callableOptions, async (request) => {
  const actor = actorFrom(request);
  await enforceRate(actor.actorUid, 'follow', { limit: 30, windowMs: 60_000 });
  const slug = clean(request.data?.slug, 120).toLowerCase();
  if (!slug) throw new HttpsError('invalid-argument', 'Business required.');
  const workspaceSnap = await db.doc(`${ROOT}/public/data/workspaces/${slug}`).get();
  const ownerId = clean(request.data?.ownerId || workspaceSnap.data()?.ownerId, 160);
  if (!ownerId) throw new HttpsError('not-found', 'Business not found.');
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
      actor
    });
  }
  return { ok: true, following, changed };
});

export const socialMarkNotificationsRead = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
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
  if (!refs.length) return { ok: true, updated: 0 };
  const batch = db.batch();
  refs.forEach((ref) => batch.set(ref, { readAtMs: Date.now() }, { merge: true }));
  await batch.commit();
  return { ok: true, updated: refs.length };
});

function postPayload({ slug, ownerId, businessName, businessLogoUrl, post }) {
  const legacyId = clean(post?.id, 160);
  const id = canonicalId(slug, legacyId);
  const createdAtMs = Number(post?.createdAt || post?.createdAtMs || Date.now());
  const title = clean(post?.title, 240);
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
    type: ['image', 'video', 'vertical', 'text'].includes(post?.type) ? post.type : 'image',
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
    status: post?.published === false ? 'draft' : 'published',
    moderationState: 'visible',
    createdAtMs,
    updatedAtMs: Date.now(),
    searchText,
    searchPrefixes: prefixes,
    counts: {
      likes: Number(post?.counts?.likes || post?.likeCount || 0),
      comments: Number(post?.counts?.comments || post?.commentCount || 0),
      shares: Number(post?.counts?.shares || post?.shareCount || 0)
    }
  };
}

export const socialUpsertPost = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
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
  const ref = postRef(payload.id);
  const before = await ref.get();
  await ref.set({ ...payload, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await enqueueTask('socialSyncSearch', { postId: payload.id });
  if (!before.exists && payload.status === 'published') await enqueueTask('socialFanoutPost', { postId: payload.id });
  return { ok: true, postId: payload.id };
});

export const socialDeletePost = onCall(callableOptions, async (request) => {
  const uid = requireAuth(request);
  const post = await loadPost(cleanId(request.data?.postId));
  const email = clean(request.auth?.token?.email, 240).toLowerCase();
  if (!(await canManageBusiness(uid, post.ownerId, email))) throw new HttpsError('permission-denied', 'Business access required.');
  await post.ref.update({ status: 'deleted', moderationState: 'removed', updatedAtMs: Date.now() });
  await enqueueTask('socialSyncSearch', { postId: post.id, remove: true });
  return { ok: true };
});

export const socialAggregatePost = onTaskDispatched(
  { retryConfig: { maxAttempts: 5, minBackoffSeconds: 2 }, rateLimits: { maxConcurrentDispatches: 40 } },
  async (request) => {
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
    await post.ref.update({ counts, countsUpdatedAtMs: Date.now() });
  }
);

export const socialProcessActivity = onTaskDispatched(
  { retryConfig: { maxAttempts: 7, minBackoffSeconds: 2 }, rateLimits: { maxConcurrentDispatches: 80 } },
  async (request) => {
    const eventId = cleanId(request.data?.eventId);
    const eventRef = db.doc(`${ROOT}/socialActivityEvents/${eventId}`);
    const eventSnap = await eventRef.get();
    if (!eventSnap.exists || eventSnap.data()?.processedAtMs) return;
    const event = eventSnap.data();
    const target = event.targetUid
      ? profileRef(event.targetUid).collection('socialNotifications')
      : db.collection(`${ROOT}/users/${event.ownerId}/socialNotifications`);
    const groupKey = event.groupable
      ? `${event.type}_${event.postId}_${event.commentId || 'post'}`
      : eventId;
    const ref = target.doc(groupKey);
    await db.runTransaction(async (tx) => {
      const existing = await tx.get(ref);
      const count = Number(existing.data()?.groupedCount || 0) + 1;
      tx.set(
        ref,
        {
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
          groupedCount: count,
          createdAtMs: Date.now(),
          readAtMs: null
        },
        { merge: true }
      );
      tx.update(eventRef, { processedAtMs: Date.now() });
    });
  }
);

export const socialFanoutPost = onTaskDispatched(
  { retryConfig: { maxAttempts: 5, minBackoffSeconds: 5 }, rateLimits: { maxConcurrentDispatches: 20 } },
  async (request) => {
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
      await enqueueTask('socialFanoutPost', { postId: post.id, after: followers.docs.at(-1).id });
    }
  }
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
  async (request) => {
    const postId = cleanId(request.data?.postId);
    if (request.data?.remove) {
      await algoliaRequest(`/${encodeURIComponent(postId)}`, { method: 'DELETE' });
      return;
    }
    const post = await loadPost(postId);
    if (post.status !== 'published') {
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
  }
);

export const socialSearch = onCall(async (request) => {
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
  let q = db.collection(`${ROOT}/socialPosts`).where('status', '==', 'published');
  if (type) q = q.where('type', '==', type);
  if (prefix) q = q.where('searchPrefixes', 'array-contains', prefix);
  const snap = await q.orderBy('createdAtMs', 'desc').limit(SOCIAL_PAGE_SIZE).get();
  return { ok: true, source: 'firestore', items: snap.docs.map((entry) => entry.data()), hasMore: false };
});
