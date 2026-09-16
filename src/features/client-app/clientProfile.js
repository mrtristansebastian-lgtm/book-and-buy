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
    followedSlugs: [],
    createdAt: Date.now(),
    isDemo: false,
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
      followedSlugs: Array.isArray(parsed.followedSlugs) ? parsed.followedSlugs : []
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
    uid: 'demo-client'
  });
}

export { APP_ID };
