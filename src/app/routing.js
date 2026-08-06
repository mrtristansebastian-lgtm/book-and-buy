import { resolveWorkspaceTab } from '../config/routeConfig';

const stripHash = (value = '') => value.replace(/^#/, '');

const PUBLIC_PAGES = new Set(['home', 'book', 'buy', 'shop', 'social']);

const normalizePublicPage = (page = 'home') => {
  if (page === 'shop') return 'buy';
  return PUBLIC_PAGES.has(page) ? page : 'home';
};

export function getLocationPath() {
  const hash = stripHash(window.location.hash || '');
  if (hash.startsWith('/')) return hash;
  return window.location.pathname || '/';
}

export function parseAppRoute(path = getLocationPath()) {
  const clean = path.split('?')[0].replace(/\/+$/, '') || '/';
  const parts = clean.split('/').filter(Boolean);

  if (parts[0] === 'dashboard') {
    return {
      kind: 'owner',
      tab: resolveWorkspaceTab(parts[1] || 'overview'),
      rest: parts.slice(2)
    };
  }

  if (parts[0] === 'onboarding') {
    return { kind: 'onboarding' };
  }

  if (parts[0] === 'portal' || parts[0] === 'client-portal') {
    return { kind: 'portal' };
  }

  if (parts[0] === 'w' && parts[1]) {
    return {
      kind: 'public',
      slug: parts[1],
      page: normalizePublicPage(parts[2] || 'home')
    };
  }

  if ((parts[0] === 'book' || parts[0] === 'shop' || parts[0] === 'buy') && parts[1]) {
    return {
      kind: 'public',
      slug: parts[1],
      page: parts[0] === 'book' ? 'book' : 'buy'
    };
  }

  if (parts[0] === 'demo') {
    return { kind: 'public', slug: 'flour-and-flame', page: 'home', demo: true };
  }

  return { kind: 'auth' };
}

export function publicPagePath(slug, page = 'home') {
  const normalized = normalizePublicPage(page);
  if (normalized === 'home') return `/w/${slug}`;
  return `/w/${slug}/${normalized}`;
}

export function navigate(to, { replace = false } = {}) {
  const next = to.startsWith('#') ? to : `#${to.startsWith('/') ? to : `/${to}`}`;
  if (replace) window.location.replace(next);
  else window.location.hash = next.replace(/^#/, '');
}

export function useHashRoute(onChange) {
  const handler = () => onChange(parseAppRoute());
  window.addEventListener('hashchange', handler);
  return () => window.removeEventListener('hashchange', handler);
}
