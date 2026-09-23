import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where
} from 'firebase/firestore';
import { APP_ID } from '../../config/appConfig';
import { firebaseCallables } from '../../shared/firebase/callables';
import { getFirebase, isFirebaseConfigured } from '../../shared/firebase/client';
import {
  businessSocialNotificationsPath,
  clientSocialNotificationsPath,
  socialCommentsPath,
  socialPostsPath
} from '../../shared/firebase/paths';
import {
  executeDurableMutation,
  replayDurableMutations
} from './socialMutationQueue';

export const SOCIAL_PAGE_SIZE = 24;
export const SOCIAL_COMMENT_PAGE_SIZE = 30;
export const SOCIAL_REPLY_PAGE_SIZE = 20;
export const SOCIAL_NOTIFICATION_PAGE_SIZE = 30;

export function canonicalSocialPostId(slug, postId) {
  const clean = (value) =>
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  return `${clean(slug) || 'business'}--${clean(postId) || 'post'}`;
}

function timestampMs(value) {
  if (Number.isFinite(Number(value))) return Number(value);
  if (typeof value?.toMillis === 'function') return value.toMillis();
  return 0;
}

function normalizeComment(snapshot) {
  const data = snapshot.data?.() || snapshot || {};
  return {
    id: snapshot.id || data.id || '',
    ...data,
    createdAtMs: timestampMs(data.createdAtMs || data.createdAt),
    updatedAtMs: timestampMs(data.updatedAtMs || data.updatedAt),
    likeCount: Number(data.likeCount || data.counts?.likes || 0),
    replyCount: Number(data.replyCount || data.counts?.replies || 0)
  };
}

function normalizeNotification(snapshot) {
  const data = snapshot.data?.() || snapshot || {};
  return {
    id: snapshot.id || data.id || '',
    ...data,
    createdAtMs: timestampMs(data.createdAtMs || data.createdAt),
    readAtMs: data.readAtMs == null ? null : timestampMs(data.readAtMs)
  };
}

function firebaseReadyFor(uid) {
  return Boolean(isFirebaseConfigured() && uid && !String(uid).startsWith('demo'));
}

export async function listSocialComments({ slug, postId, parentId = '', cursor = null, pageSize } = {}) {
  const firebase = getFirebase();
  if (!firebase || !postId) return { items: [], nextCursor: null, hasMore: false };
  const canonicalId = canonicalSocialPostId(slug, postId);
  const size = Number(pageSize) || (parentId ? SOCIAL_REPLY_PAGE_SIZE : SOCIAL_COMMENT_PAGE_SIZE);
  const clauses = [
    where('parentId', '==', String(parentId || '')),
    where('moderationState', '==', 'visible'),
    orderBy('createdAtMs', 'desc'),
    orderBy('__name__', 'desc')
  ];
  if (cursor?.createdAtMs && cursor?.id) {
    clauses.push(startAfter(Number(cursor.createdAtMs), String(cursor.id)));
  }
  clauses.push(limit(size + 1));
  const snap = await getDocs(query(collection(firebase.db, ...socialCommentsPath(APP_ID, canonicalId)), ...clauses));
  const rows = snap.docs.map(normalizeComment);
  const hasMore = rows.length > size;
  const items = rows.slice(0, size);
  const last = items.at(-1);
  return {
    items,
    hasMore,
    nextCursor: hasMore && last ? { createdAtMs: last.createdAtMs, id: last.id } : null
  };
}

export async function listCanonicalSocialPosts({ kind = '', slug = '', cursor = null, pageSize = SOCIAL_PAGE_SIZE, mode = 'explore' } = {}) {
  const firebase = getFirebase();
  if (!firebase) return { items: [], nextCursor: null, hasMore: false };
  try {
    const result = await firebaseCallables.socialListFeed({
      mode,
      type: kind,
      businessSlug: slug,
      cursor: cursor?.publishedAtMs
        ? cursor
        : cursor?.createdAtMs
          ? { ...cursor, publishedAtMs: cursor.createdAtMs }
          : null,
      pageSize
    });
    const items = (result?.items || []).map((entry) => ({
      ...entry,
      id: entry.legacyId || entry.id,
      canonicalId: entry.id,
      createdAt: timestampMs(entry.createdAtMs || entry.createdAt)
    }));
    return { items, nextCursor: result?.nextCursor || null, hasMore: Boolean(result?.hasMore) };
  } catch {
    // Production reads prefer the canonical feed API. Direct Firestore remains
    // a compatibility fallback while older deployments are being migrated.
  }
  const clauses = [where('status', '==', 'published'), where('moderationState', '==', 'visible')];
  if (kind) clauses.push(where('type', '==', kind));
  if (slug) clauses.push(where('businessSlug', '==', slug));
  clauses.push(orderBy('publishedAtMs', 'desc'), orderBy('__name__', 'desc'));
  if ((cursor?.publishedAtMs || cursor?.createdAtMs) && cursor?.id) {
    clauses.push(startAfter(Number(cursor.publishedAtMs || cursor.createdAtMs), String(cursor.id)));
  }
  clauses.push(limit(pageSize + 1));
  const snap = await getDocs(query(collection(firebase.db, ...socialPostsPath(APP_ID)), ...clauses));
  const rows = snap.docs.map((entry) => ({
    id: entry.data().legacyId || entry.id,
    canonicalId: entry.id,
    ...entry.data(),
    createdAt: timestampMs(entry.data().createdAtMs || entry.data().createdAt)
  }));
  const hasMore = rows.length > pageSize;
  const items = rows.slice(0, pageSize);
  const last = items.at(-1);
  return {
    items,
    hasMore,
    nextCursor: hasMore && last ? { publishedAtMs: timestampMs(last.publishedAtMs || last.createdAt), id: last.canonicalId } : null
  };
}

function subscribeNotifications(path, onChange, onError) {
  const firebase = getFirebase();
  if (!firebase) return () => {};
  const ref = collection(firebase.db, ...path);
  const q = query(ref, orderBy('createdAtMs', 'desc'), limit(SOCIAL_NOTIFICATION_PAGE_SIZE));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map(normalizeNotification)),
    (error) => onError?.(error)
  );
}

export function subscribeClientSocialNotifications(uid, onChange, onError) {
  if (!firebaseReadyFor(uid)) return () => {};
  return subscribeNotifications(clientSocialNotificationsPath(APP_ID, uid), onChange, onError);
}

export function subscribeBusinessSocialNotifications(ownerId, onChange, onError) {
  if (!firebaseReadyFor(ownerId)) return () => {};
  return subscribeNotifications(businessSocialNotificationsPath(APP_ID, ownerId), onChange, onError);
}

const SOCIAL_EXECUTORS = {
  socialToggleReaction: firebaseCallables.socialToggleReaction,
  socialToggleSave: firebaseCallables.socialToggleSave,
  socialCreateComment: firebaseCallables.socialCreateComment,
  socialToggleCommentLike: firebaseCallables.socialToggleCommentLike,
  socialDeleteComment: firebaseCallables.socialDeleteComment,
  socialModerateComment: firebaseCallables.socialModerateComment,
  socialRecordShare: firebaseCallables.socialRecordShare,
  socialFollowBusiness: firebaseCallables.socialFollowBusiness,
  socialMarkNotificationsRead: firebaseCallables.socialMarkNotificationsRead,
  socialUpsertPost: firebaseCallables.socialUpsertPost,
  socialDeletePost: firebaseCallables.socialDeletePost,
  socialReportContent: firebaseCallables.socialReportContent,
  socialSetRelationship: firebaseCallables.socialSetRelationship,
  socialSetNotificationPreferences: firebaseCallables.socialSetNotificationPreferences,
  socialRegisterDevice: firebaseCallables.socialRegisterDevice,
  socialResolveModerationCase: firebaseCallables.socialResolveModerationCase,
  socialAppealModeration: firebaseCallables.socialAppealModeration
};

function durable(name, payload) {
  return executeDurableMutation(name, payload, SOCIAL_EXECUTORS[name]);
}

let replayStarted = false;
function startMutationReplay() {
  if (replayStarted || typeof window === 'undefined') return;
  replayStarted = true;
  const replay = () => replayDurableMutations(SOCIAL_EXECUTORS).catch(() => {});
  window.addEventListener('online', replay);
  window.setTimeout(replay, 500);
  window.setInterval(replay, 30_000);
}
startMutationReplay();

export const socialMutations = {
  togglePostLike: ({ slug, postId, active, mutationId }) =>
    durable('socialToggleReaction', {
      postId: canonicalSocialPostId(slug, postId),
      kind: 'like',
      active,
      mutationId
    }),
  toggleSave: ({ slug, postId, active, mutationId }) =>
    durable('socialToggleSave', { postId: canonicalSocialPostId(slug, postId), active, mutationId }),
  createComment: ({ slug, postId, body, parentId = '', mutationId }) =>
    durable('socialCreateComment', {
      postId: canonicalSocialPostId(slug, postId),
      body,
      parentId,
      mutationId
    }),
  toggleCommentLike: ({ slug, postId, commentId, active, mutationId }) =>
    durable('socialToggleCommentLike', {
      postId: canonicalSocialPostId(slug, postId),
      commentId,
      active,
      mutationId
    }),
  deleteComment: ({ slug, postId, commentId, mutationId }) =>
    durable('socialDeleteComment', {
      postId: canonicalSocialPostId(slug, postId),
      commentId,
      mutationId
    }),
  moderateComment: ({ slug, postId, commentId, moderationState = 'hidden', mutationId }) =>
    durable('socialModerateComment', {
      postId: canonicalSocialPostId(slug, postId),
      commentId,
      moderationState,
      mutationId
    }),
  recordShare: ({ slug, postId, mutationId }) =>
    durable('socialRecordShare', { postId: canonicalSocialPostId(slug, postId), mutationId }),
  followBusiness: ({ slug, ownerId = '', following, mutationId }) =>
    durable('socialFollowBusiness', { slug, ownerId, following, mutationId }),
  markNotificationsRead: ({ ids = [], audience = 'client', ownerId = '', all = false, mutationId }) =>
    durable('socialMarkNotificationsRead', { ids, audience, ownerId, all, mutationId }),
  upsertPost: ({ slug, ownerId, businessName, businessLogoUrl, post, mutationId }) =>
    durable('socialUpsertPost', { slug, ownerId, businessName, businessLogoUrl, post, mutationId }),
  deletePost: ({ slug, postId, mutationId }) =>
    durable('socialDeletePost', { postId: canonicalSocialPostId(slug, postId), mutationId }),
  report: (payload) => durable('socialReportContent', payload),
  setRelationship: (payload) => durable('socialSetRelationship', payload),
  setNotificationPreferences: (payload) => durable('socialSetNotificationPreferences', payload),
  registerDevice: (payload) => durable('socialRegisterDevice', payload),
  resolveModerationCase: (payload) => durable('socialResolveModerationCase', payload),
  appealModeration: (payload) => durable('socialAppealModeration', payload),
  search: (payload) => firebaseCallables.socialSearch(payload),
  listFeed: (payload) => firebaseCallables.socialListFeed(payload),
  listNotifications: (payload) => firebaseCallables.socialListNotifications(payload),
  listModerationCases: (payload) => firebaseCallables.socialListModerationCases(payload),
  createStreamUpload: (payload) => firebaseCallables.socialCreateStreamUpload(payload),
  getStreamToken: (payload) => firebaseCallables.socialGetStreamToken(payload)
};

export async function enableSocialPushNotifications({ audience = 'client', ownerId = '' } = {}) {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return { enabled: false, reason: 'unsupported' };
  }
  const vapidKey = String(import.meta.env.VITE_FIREBASE_VAPID_KEY || '').trim();
  if (!vapidKey) return { enabled: false, reason: 'not-configured' };
  const firebase = getFirebase();
  if (!firebase) return { enabled: false, reason: 'not-configured' };
  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();
  if (permission !== 'granted') return { enabled: false, reason: 'permission-denied' };
  const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
  if (!(await isSupported())) return { enabled: false, reason: 'unsupported' };
  const registration = await navigator.serviceWorker.register('/social-push-sw.js', { scope: '/' });
  const token = await getToken(getMessaging(firebase.app), {
    vapidKey,
    serviceWorkerRegistration: registration
  });
  if (!token) return { enabled: false, reason: 'token-unavailable' };
  await socialMutations.registerDevice({
    token,
    platform: 'web',
    userAgent: navigator.userAgent
  });
  await socialMutations.setNotificationPreferences({
    audience,
    ownerId,
    preferences: { push: true }
  });
  return { enabled: true };
}

export function canUseCanonicalSocial(uid) {
  return firebaseReadyFor(uid);
}
