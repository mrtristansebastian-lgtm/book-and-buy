import { APP_ID } from '../../config/appConfig';

export const DEMO_CLIENT_EMAIL = 'aisha.naidoo@example.com';
export const DEMO_CLIENT_NAME = 'Aisha Naidoo';
export const CLIENT_PROFILE_KEY = 'bb.clientProfile';

export function emptyClientProfile(overrides = {}) {
  return {
    kind: 'client',
    email: '',
    displayName: '',
    photoURL: '',
    savedPlaceSlugs: [],
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

export function readLocalClientProfile() {
  try {
    const raw = window.localStorage.getItem(CLIENT_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.kind !== 'client') return null;
    return {
      ...emptyClientProfile(),
      ...parsed,
      savedPlaceSlugs: Array.isArray(parsed.savedPlaceSlugs)
        ? [...new Set(parsed.savedPlaceSlugs.map(String).filter(Boolean))]
        : [],
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
      clientCity: String(parsed.clientCity || '').trim()
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
    savedPlaceSlugs: ['flameandflour'],
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

export { APP_ID };
