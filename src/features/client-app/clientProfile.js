import { APP_ID } from '../../config/appConfig';
import { isReactionId } from './reactions';

export const DEMO_CLIENT_EMAIL = 'aisha.naidoo@example.com';
export const DEMO_CLIENT_NAME = 'Aisha Naidoo';
export const CLIENT_PROFILE_KEY = 'bb.clientProfile';

export function emptyClientProfile(overrides = {}) {
  return {
    kind: 'client',
    email: '',
    displayName: '',
    photoURL: '',
    followedSlugs: [],
    likedKeys: [],
    reactionsByKey: {},
    savedKeys: [],
    commentsByKey: {},
    createdAt: Date.now(),
    isDemo: false,
    showActivityStatus: true,
    exploreMode: 'local',
    exploreMaxKm: 30,
    exploreCategoryIds: [],
    exploreSearchHistory: [],
    clientLat: null,
    clientLng: null,
    clientCountryCode: '',
    clientCity: '',
    ...overrides
  };
}

function normalizeReactionsByKey(parsed = {}) {
  const raw =
    parsed.reactionsByKey && typeof parsed.reactionsByKey === 'object'
      ? parsed.reactionsByKey
      : {};
  const next = {};
  Object.entries(raw).forEach(([key, value]) => {
    if (isReactionId(value)) next[String(key)] = String(value);
  });
  // Migrate legacy likedKeys → like reaction
  const liked = Array.isArray(parsed.likedKeys) ? parsed.likedKeys.map(String) : [];
  liked.forEach((key) => {
    if (key && !next[key]) next[key] = 'like';
  });
  return next;
}

function normalizeEngagement(parsed = {}) {
  const reactionsByKey = normalizeReactionsByKey(parsed);
  return {
    likedKeys: Object.keys(reactionsByKey),
    reactionsByKey,
    savedKeys: Array.isArray(parsed.savedKeys) ? parsed.savedKeys.map(String) : [],
    commentsByKey:
      parsed.commentsByKey && typeof parsed.commentsByKey === 'object'
        ? parsed.commentsByKey
        : {}
  };
}

export function readLocalClientProfile() {
  try {
    const raw = window.localStorage.getItem(CLIENT_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.kind !== 'client') return null;
    return {
      ...emptyClientProfile(),
      ...parsed,
      followedSlugs: Array.isArray(parsed.followedSlugs) ? parsed.followedSlugs : [],
      exploreMode: parsed.exploreMode === 'international' ? 'international' : 'local',
      exploreMaxKm: (() => {
        const n = Math.round(Number(parsed.exploreMaxKm));
        if (!Number.isFinite(n)) return 30;
        return Math.min(100, Math.max(1, n));
      })(),
      exploreCategoryIds: Array.isArray(parsed.exploreCategoryIds)
        ? parsed.exploreCategoryIds.map(String)
        : [],
      exploreSearchHistory: Array.isArray(parsed.exploreSearchHistory)
        ? parsed.exploreSearchHistory.map(String).filter(Boolean).slice(0, 5)
        : [],
      clientLat: Number.isFinite(Number(parsed.clientLat)) ? Number(parsed.clientLat) : null,
      clientLng: Number.isFinite(Number(parsed.clientLng)) ? Number(parsed.clientLng) : null,
      clientCountryCode: String(parsed.clientCountryCode || '')
        .trim()
        .toUpperCase(),
      clientCity: String(parsed.clientCity || '').trim(),
      ...normalizeEngagement(parsed)
    };
  } catch {
    return null;
  }
}

export function writeLocalClientProfile(profile) {
  try {
    window.localStorage.setItem(CLIENT_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* ignore */
  }
}

export function clearLocalClientProfile() {
  try {
    window.localStorage.removeItem(CLIENT_PROFILE_KEY);
  } catch {
    /* ignore */
  }
}

export function makeDemoClientProfile() {
  return emptyClientProfile({
    email: DEMO_CLIENT_EMAIL,
    displayName: DEMO_CLIENT_NAME,
    followedSlugs: ['flameandflour'],
    isDemo: true,
    uid: 'demo-client',
    exploreMode: 'local',
    exploreMaxKm: 30,
    clientLat: -33.9249,
    clientLng: 18.4241,
    clientCountryCode: 'ZA',
    clientCity: 'Cape Town'
  });
}

/** Stable key for engagement across businesses. */
export function socialPostKey(slug, postId) {
  return `${String(slug || '').trim()}:${String(postId || '').trim()}`;
}

export function seedEngagementCount(post, field, postKey = '') {
  const raw = Number(post?.[field]);
  if (Number.isFinite(raw) && raw > 0) return Math.floor(raw);
  let hash = 0;
  const seed = `${postKey || post?.id || ''}:${field}`;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  if (field === 'likeCount') return 12 + (hash % 240);
  if (field === 'commentCount') return 1 + (hash % 28);
  return 0;
}

export { APP_ID, normalizeEngagement };
