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

export async function listCanonicalSocialPosts({ kind = '', slug = '', cursor = null, pageSize = SOCIAL_PAGE_SIZE } = {}) {
  const firebase = getFirebase();
  if (!firebase) return { items: [], nextCursor: null, hasMore: false };
  const clauses = [where('status', '==', 'published')];
  if (kind) clauses.push(where('type', '==', kind));
  if (slug) clauses.push(where('businessSlug', '==', slug));
  clauses.push(orderBy('createdAtMs', 'desc'), orderBy('__name__', 'desc'));
  if (cursor?.createdAtMs && cursor?.id) {
    clauses.push(startAfter(Number(cursor.createdAtMs), String(cursor.id)));
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
    nextCursor: hasMore && last ? { createdAtMs: last.createdAt, id: last.canonicalId } : null
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

export const socialMutations = {
  togglePostLike: ({ slug, postId, active }) =>
    firebaseCallables.socialToggleReaction({
      postId: canonicalSocialPostId(slug, postId),
      kind: 'like',
      active
    }),
  toggleSave: ({ slug, postId, active }) =>
    firebaseCallables.socialToggleSave({ postId: canonicalSocialPostId(slug, postId), active }),
  createComment: ({ slug, postId, body, parentId = '' }) =>
    firebaseCallables.socialCreateComment({
      postId: canonicalSocialPostId(slug, postId),
      body,
      parentId
    }),
  toggleCommentLike: ({ slug, postId, commentId, active }) =>
    firebaseCallables.socialToggleCommentLike({
      postId: canonicalSocialPostId(slug, postId),
      commentId,
      active
    }),
  deleteComment: ({ slug, postId, commentId }) =>
    firebaseCallables.socialDeleteComment({
      postId: canonicalSocialPostId(slug, postId),
      commentId
    }),
  moderateComment: ({ slug, postId, commentId, moderationState = 'hidden' }) =>
    firebaseCallables.socialModerateComment({
      postId: canonicalSocialPostId(slug, postId),
      commentId,
      moderationState
    }),
  recordShare: ({ slug, postId }) =>
    firebaseCallables.socialRecordShare({ postId: canonicalSocialPostId(slug, postId) }),
  followBusiness: ({ slug, ownerId = '', following }) =>
    firebaseCallables.socialFollowBusiness({ slug, ownerId, following }),
  markNotificationsRead: ({ ids = [], audience = 'client', ownerId = '', all = false }) =>
    firebaseCallables.socialMarkNotificationsRead({ ids, audience, ownerId, all }),
  upsertPost: ({ slug, ownerId, businessName, businessLogoUrl, post }) =>
    firebaseCallables.socialUpsertPost({ slug, ownerId, businessName, businessLogoUrl, post }),
  deletePost: ({ slug, postId }) =>
    firebaseCallables.socialDeletePost({ postId: canonicalSocialPostId(slug, postId) }),
  search: (payload) => firebaseCallables.socialSearch(payload)
};

export function canUseCanonicalSocial(uid) {
  return firebaseReadyFor(uid);
}
