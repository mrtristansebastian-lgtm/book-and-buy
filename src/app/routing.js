import { resolveWorkspaceTab } from '../config/routeConfig';

const stripHash = (value = '') => value.replace(/^#/, '');

const PUBLIC_PAGES = new Set([
  'home',
  'book',
  'buy',
  'shop',
  'social',
  'cart',
  'checkout',
  'success'
]);

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

  if (parts[0] === 'app') {
    const section = parts[1] || 'home';
    if (section === 'auth') {
      return { kind: 'client', section: 'auth', rest: [] };
    }
    const allowed = new Set(['home', 'explore', 'messages', 'account']);
    const tab = allowed.has(section) ? section : 'home';
    return {
      kind: 'client',
      section: tab,
      rest: parts.slice(2)
    };
  }

  if (parts[0] === 'w' && parts[1]) {
    const page = normalizePublicPage(parts[2] || 'home');
    const itemId =
      (page === 'book' || page === 'buy' || page === 'social') && parts[3]
        ? decodeURIComponent(String(parts[3]))
        : '';
    return {
      kind: 'public',
      slug: parts[1],
      page,
      itemId
    };
  }

  if ((parts[0] === 'book' || parts[0] === 'shop' || parts[0] === 'buy') && parts[1]) {
    const page = parts[0] === 'book' ? 'book' : 'buy';
    return {
      kind: 'public',
      slug: parts[1],
      page,
      itemId: parts[2] ? decodeURIComponent(String(parts[2])) : ''
    };
  }

  if (parts[0] === 'demo') {
    // Guest demo opens the owner dashboard; public site stays at /w/flameandflour
    if (!parts[1] || parts[1] === 'dashboard') {
      return {
        kind: 'owner',
        tab: resolveWorkspaceTab(parts[2] || 'overview'),
        rest: parts.slice(3),
        demo: true
      };
    }
    if (['home', 'book', 'buy', 'shop', 'social', 'cart', 'checkout', 'success'].includes(parts[1])) {
      const page = normalizePublicPage(parts[1]);
      const itemId =
        (page === 'book' || page === 'buy' || page === 'social') && parts[2]
          ? decodeURIComponent(String(parts[2]))
          : '';
      return {
        kind: 'public',
        slug: 'flameandflour',
        page,
        itemId,
        demo: true
      };
    }
    return {
      kind: 'owner',
      tab: resolveWorkspaceTab(parts[1] || 'overview'),
      rest: parts.slice(2),
      demo: true
    };
  }

  return { kind: 'auth' };
}

export function publicPagePath(slug, page = 'home') {
  const normalized = normalizePublicPage(page);
  if (normalized === 'home') return `/w/${slug}`;
  return `/w/${slug}/${normalized}`;
}

/** Product (`buy`), service (`book`), or social post (`social`) detail path. */
export function publicItemPath(slug, page, itemId) {
  const normalized = normalizePublicPage(page);
  const id = String(itemId || '').trim();
  if (!id || (normalized !== 'book' && normalized !== 'buy' && normalized !== 'social')) {
    return publicPagePath(slug, normalized);
  }
  return `/w/${slug}/${normalized}/${encodeURIComponent(id)}`;
}

export function clientAppPath(section = 'home', ...rest) {
  const base = section === 'home' || !section ? '/app/home' : `/app/${section}`;
  if (!rest.length) return base;
  return `${base}/${rest.map((part) => encodeURIComponent(String(part))).join('/')}`;
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
