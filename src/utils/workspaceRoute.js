import {
  defaultEditorTab,
  editorTabAliases,
  editorTabIds,
  workspaceTabAliases,
  workspaceTabIds
} from '../config/appConfig';

export const guestModeStorageKey = 'build-a-booking-guest-mode';
export const rememberLoginStorageKey = 'build-a-booking-remember-login';
export const workspaceRouteStorageKey = 'build-a-booking-workspace-route';
export const authRedirectStorageKey = 'build-a-booking-auth-return';
export const authRedirectStateStorageKey = 'build-a-booking-auth-return-state';
export const authRedirectStartedStorageKey = 'build-a-booking-auth-started';
export const googleCalendarRedirectStorageKey = 'build-a-booking-google-calendar-auth';
export const bookingsCacheStoragePrefix = 'build-a-booking-bookings-cache-v1';
export const clientAuthPrefillStorageKey = 'build-a-booking-client-auth-prefill';

export const safeJsonParse = (value, fallback = null) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const safeStorageGet = (storage, key) => {
  try {
    return storage?.getItem(key) || null;
  } catch {
    return null;
  }
};

const safeStorageSet = (storage, key, value) => {
  try {
    storage?.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

const safeStorageRemove = (storage, key) => {
  try {
    storage?.removeItem(key);
  } catch {
    // Storage can be unavailable in private, embedded, or homescreen contexts.
  }
};

export const safeLocalGet = (key) => safeStorageGet(typeof window !== 'undefined' ? window.localStorage : null, key);
export const safeLocalSet = (key, value) => safeStorageSet(typeof window !== 'undefined' ? window.localStorage : null, key, value);
export const safeLocalRemove = (key) => safeStorageRemove(typeof window !== 'undefined' ? window.localStorage : null, key);
export const safeSessionGet = (key) => safeStorageGet(typeof window !== 'undefined' ? window.sessionStorage : null, key);
export const safeSessionSet = (key, value) => safeStorageSet(typeof window !== 'undefined' ? window.sessionStorage : null, key, value);
export const safeSessionRemove = (key) => safeStorageRemove(typeof window !== 'undefined' ? window.sessionStorage : null, key);

export const getBookingsCacheKey = (ownerId = 'guest') => (
  `${bookingsCacheStoragePrefix}-${String(ownerId || 'guest').replace(/[^a-zA-Z0-9_-]/g, '-')}`
);

export const readBookingsCache = (ownerId) => {
  const cached = safeJsonParse(safeLocalGet(getBookingsCacheKey(ownerId)));
  if (!cached || typeof cached !== 'object' || !Array.isArray(cached.bookings)) return null;
  return cached;
};

export const writeBookingsCache = (ownerId, bookings = []) => {
  if (!ownerId || !Array.isArray(bookings)) return false;
  const cached = {
    version: 1,
    savedAt: Date.now(),
    bookings: bookings.slice(0, 250)
  };
  return safeLocalSet(getBookingsCacheKey(ownerId), JSON.stringify(cached));
};

export const getPublicBookingSlug = () => {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  const querySlug = url.searchParams.get('book') || url.searchParams.get('workspace');
  if (querySlug) return querySlug.trim().toLowerCase();
  const hashBookMatch = url.hash.match(/^#\/book\/([^/?#]+)/i);
  if (hashBookMatch?.[1]) return decodeURIComponent(hashBookMatch[1]).trim().toLowerCase();
  const [, section, slug] = url.pathname.split('/');
  if (section === 'book' && slug) return slug.trim().toLowerCase();
  return '';
};

export const normalizeEditorTabId = (editorTab, fallback = defaultEditorTab) => {
  const requestedEditorTab = editorTabAliases[editorTab] || editorTab;
  if (editorTabIds.includes(requestedEditorTab)) return requestedEditorTab;
  const requestedFallback = editorTabAliases[fallback] || fallback;
  return editorTabIds.includes(requestedFallback) ? requestedFallback : defaultEditorTab;
};

export const normalizeWorkspaceRoute = (route = {}, fallback = {}) => {
  const source = route || {};
  const requestedView = source.view || source.return || source.returnTarget;
  const nextView = ['dashboard', 'client', 'landing', 'authAction'].includes(requestedView)
    ? requestedView
    : fallback.view || 'landing';
  const requestedTab = workspaceTabAliases[source.activeTab || source.tab] || source.activeTab || source.tab;
  const nextActiveTab = workspaceTabIds.includes(requestedTab)
    ? requestedTab
    : fallback.activeTab || 'overview';
  const nextEditorTab = normalizeEditorTabId(source.editorTab, fallback.editorTab);

  return {
    view: nextView,
    activeTab: nextView === 'dashboard' ? nextActiveTab : 'overview',
    editorTab: nextEditorTab,
    timestamp: Number(source.timestamp) || Date.now()
  };
};

export const getWorkspaceRouteFromUrl = () => {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const dashboardHashMatch = url.hash.match(/^#\/dashboard(?:\/([a-z-]+))?/i);
  const clientHashMatch = url.hash.match(/^#\/client(?:\/portal)?/i);
  const authActionHashMatch = url.hash.match(/^#\/auth\/action/i);
  const returnTarget = url.searchParams.get('return');
  const tabParam = url.searchParams.get('tab');
  const editorTabParam = url.searchParams.get('editorTab');

  if (url.searchParams.get('auth') === 'google') {
    return normalizeWorkspaceRoute({
      view: ['dashboard', 'client'].includes(returnTarget) ? returnTarget : 'landing',
      activeTab: tabParam,
      editorTab: editorTabParam
    }, { view: 'dashboard', activeTab: 'overview', editorTab: defaultEditorTab });
  }

  if (clientHashMatch) {
    return normalizeWorkspaceRoute({ view: 'client' }, { view: 'client', activeTab: 'overview', editorTab: defaultEditorTab });
  }

  if (authActionHashMatch) {
    return normalizeWorkspaceRoute({ view: 'authAction' }, { view: 'authAction', activeTab: 'overview', editorTab: defaultEditorTab });
  }

  if (dashboardHashMatch) {
    return normalizeWorkspaceRoute({
      view: 'dashboard',
      activeTab: dashboardHashMatch[1],
      editorTab: editorTabParam || url.searchParams.get('editor')
    }, { view: 'dashboard', activeTab: 'overview', editorTab: defaultEditorTab });
  }

  return null;
};

export const getSavedWorkspaceRoute = () => (
  normalizeWorkspaceRoute(safeJsonParse(safeLocalGet(workspaceRouteStorageKey)), { view: 'landing', activeTab: 'overview', editorTab: defaultEditorTab })
);

export const hasAuthRedirectSignal = () => {
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    if (url.searchParams.get('auth') === 'google') return true;
  }
  const startedAt = Number(safeSessionGet(authRedirectStartedStorageKey) || safeLocalGet(authRedirectStartedStorageKey) || 0);
  return Boolean(startedAt && Date.now() - startedAt <= 10 * 60 * 1000);
};

export const getInitialWorkspaceRoute = () => {
  if (typeof window === 'undefined' || getPublicBookingSlug()) {
    return { view: 'landing', activeTab: 'overview', editorTab: defaultEditorTab, timestamp: Date.now() };
  }
  return getWorkspaceRouteFromUrl() || getSavedWorkspaceRoute();
};

export const shouldStartInGuestWorkspace = (route = {}) => (
  !hasAuthRedirectSignal() &&
  (
    safeLocalGet(guestModeStorageKey) === 'true' ||
    (route.view === 'dashboard' && !getPublicBookingSlug())
  )
);

export const saveWorkspaceRoute = (route) => {
  const normalized = normalizeWorkspaceRoute(route);
  if (normalized.view !== 'authAction') safeLocalSet(workspaceRouteStorageKey, JSON.stringify(normalized));
  return normalized;
};

export const saveAuthReturnState = (route) => {
  const normalized = normalizeWorkspaceRoute(route, { view: 'dashboard', activeTab: 'overview', editorTab: defaultEditorTab });
  const payload = JSON.stringify(normalized);
  safeSessionSet(authRedirectStorageKey, normalized.view);
  safeSessionSet(authRedirectStateStorageKey, payload);
  safeLocalSet(authRedirectStateStorageKey, payload);
  safeSessionSet(authRedirectStartedStorageKey, String(Date.now()));
  safeLocalSet(authRedirectStartedStorageKey, String(Date.now()));
  saveWorkspaceRoute(normalized);
  return normalized;
};

export const getGoogleAuthIntent = () => {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  if (url.searchParams.get('auth') !== 'google') return null;
  return normalizeWorkspaceRoute({
    view: ['dashboard', 'client'].includes(url.searchParams.get('return')) ? url.searchParams.get('return') : 'landing',
    activeTab: url.searchParams.get('tab'),
    editorTab: url.searchParams.get('editorTab')
  }, { view: 'dashboard', activeTab: 'overview', editorTab: defaultEditorTab });
};

export const getAuthReturnState = () => {
  const stored = safeJsonParse(safeSessionGet(authRedirectStateStorageKey)) || safeJsonParse(safeLocalGet(authRedirectStateStorageKey));
  if (stored) return normalizeWorkspaceRoute(stored, { view: 'dashboard', activeTab: 'overview', editorTab: defaultEditorTab });
  const legacyTarget = safeSessionGet(authRedirectStorageKey);
  if (legacyTarget) return normalizeWorkspaceRoute({ view: legacyTarget }, { view: 'dashboard', activeTab: 'overview', editorTab: defaultEditorTab });
  return getGoogleAuthIntent();
};

export const clearGoogleAuthIntentUrl = () => {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has('auth')) return;
  url.searchParams.delete('auth');
  url.searchParams.delete('return');
  url.searchParams.delete('tab');
  url.searchParams.delete('editorTab');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
};

export const clearAuthReturnState = () => {
  safeSessionRemove(authRedirectStorageKey);
  safeSessionRemove(authRedirectStateStorageKey);
  safeLocalRemove(authRedirectStateStorageKey);
  safeSessionRemove(authRedirectStartedStorageKey);
  safeLocalRemove(authRedirectStartedStorageKey);
};

export const hasFreshAuthRedirectStart = () => {
  const startedAt = Number(safeSessionGet(authRedirectStartedStorageKey) || safeLocalGet(authRedirectStartedStorageKey) || 0);
  if (!startedAt) return false;
  if (Date.now() - startedAt <= 10 * 60 * 1000) return true;
  clearAuthReturnState();
  clearGoogleAuthIntentUrl();
  safeSessionRemove(googleCalendarRedirectStorageKey);
  return false;
};

export const writeGoogleAuthIntentUrl = (route = {}) => {
  if (typeof window === 'undefined') return;
  const normalized = normalizeWorkspaceRoute(route, { view: 'dashboard', activeTab: 'overview', editorTab: defaultEditorTab });
  const url = new URL(window.location.href);
  url.searchParams.set('auth', 'google');
  url.searchParams.set('return', normalized.view);
  if (normalized.view === 'dashboard') {
    url.searchParams.set('tab', normalized.activeTab);
    url.searchParams.set('editorTab', normalized.editorTab);
  } else {
    url.searchParams.delete('tab');
    url.searchParams.delete('editorTab');
  }
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
};
