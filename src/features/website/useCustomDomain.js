import { useEffect, useState } from 'react';
import { firebaseCallables } from '../../shared/firebase/callables';

const primaryHosts = String(import.meta.env.VITE_PRIMARY_HOSTS || '').split(',').map((host) => host.trim().toLowerCase());
const hostname = window.location.hostname.toLowerCase();
const isPrimary = ['localhost', '127.0.0.1', '::1', ...primaryHosts].includes(hostname) || hostname.endsWith('.web.app') || hostname.endsWith('.firebaseapp.com');
// Opt in at release only after the routing backend and primary host allowlist are configured.
const enabled = import.meta.env.VITE_CUSTOM_DOMAINS_ENABLED === 'true' && !isPrimary;

export function useCustomDomain() {
  const [state, setState] = useState({ loading: enabled, slug: null, error: '' });
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    firebaseCallables.resolveBusinessDomain({ domain: hostname }).then((result) => {
      if (!cancelled) setState({ loading: false, slug: result.slug, error: result.slug ? '' : 'This domain is not connected to a business yet.' });
    }).catch(() => { if (!cancelled) setState({ loading: false, slug: null, error: 'We could not load this business. Please refresh to try again.' }); });
    return () => { cancelled = true; };
  }, []);
  return { enabled, ...state };
}
