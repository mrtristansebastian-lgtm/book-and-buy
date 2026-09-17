import { useEffect } from 'react';

const LOCKED =
  'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
const OPEN =
  'width=device-width, initial-scale=1, viewport-fit=cover';

/** Surfaces where pinch-zoom is allowed (posts + verticals only). */
const ALLOW_ZOOM_SELECTOR = [
  '.bb-client-home-feed.is-posts',
  '.bb-client-home-feed.is-vertical-open',
  '.bb-client-vertical-page',
  '.bb-client-ig-explore.is-immersive .bb-vertical-watch',
  '.bb-vertical-watch',
  '.bb-client-ig-grid' /* explore posts grid */
].join(', ');

function getViewportMeta() {
  let meta = document.querySelector('meta[name="viewport"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'viewport');
    document.head.appendChild(meta);
  }
  return meta;
}

function syncViewportZoom() {
  const allow = Boolean(document.querySelector(ALLOW_ZOOM_SELECTOR));
  const meta = getViewportMeta();
  const next = allow ? OPEN : LOCKED;
  if (meta.getAttribute('content') !== next) {
    meta.setAttribute('content', next);
  }
  document.documentElement.classList.toggle('bb-zoom-allowed', allow);
  document.documentElement.classList.toggle('bb-zoom-locked', !allow);
}

/**
 * Locks page zoom everywhere except posts / verticals.
 * Also marks html.bb-zoom-locked for CSS overscroll / touch-action.
 */
export function useViewportZoomGate() {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    syncViewportZoom();

    const root = document.getElementById('root') || document.body;
    const mo = new MutationObserver(() => {
      syncViewportZoom();
    });
    mo.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class']
    });

    window.addEventListener('hashchange', syncViewportZoom);
    return () => {
      mo.disconnect();
      window.removeEventListener('hashchange', syncViewportZoom);
      const meta = getViewportMeta();
      meta.setAttribute('content', LOCKED);
      document.documentElement.classList.add('bb-zoom-locked');
      document.documentElement.classList.remove('bb-zoom-allowed');
    };
  }, []);
}
