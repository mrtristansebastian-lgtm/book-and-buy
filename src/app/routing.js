import { resolveWorkspaceTab } from '../config/routeConfig';

const stripHash = (value = '') => value.replace(/^#/, '');

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

  if (parts[0] === 'w' && parts[1]) {
    const page = parts[2] || 'home';
    return {
      kind: 'public',
      slug: parts[1],
      page: ['home', 'book', 'shop', 'social'].includes(page) ? page : 'home'
    };
  }

  if ((parts[0] === 'book' || parts[0] === 'shop') && parts[1]) {
    return {
      kind: 'public',
      slug: parts[1],
      page: parts[0] === 'book' ? 'book' : 'shop'
    };
  }

  if (parts[0] === 'demo') {
    return { kind: 'public', slug: 'flour-and-flame', page: 'home', demo: true };
  }

  return { kind: 'auth' };
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
