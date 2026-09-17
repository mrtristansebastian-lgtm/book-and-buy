import { useEffect, useRef } from 'react';
import {
  reportPageView,
  reportProductView,
  startAnalyticsBeacon,
  trackAnalyticsEvent,
  upsertAnalyticsCart
} from './beacon';

/**
 * Mount on live public surfaces only (not owner studio preview).
 * Heartbeats the session and emits page / product views.
 */
export function AnalyticsBeacon({
  slug,
  ownerId,
  page = 'home',
  itemId = '',
  enabled = true
}) {
  const started = useRef(false);

  useEffect(() => {
    if (!enabled || !slug || !ownerId) return undefined;
    started.current = true;
    return startAnalyticsBeacon({ slug, ownerId });
  }, [enabled, slug, ownerId]);

  useEffect(() => {
    if (!enabled || !slug || !ownerId || !started.current) return;
    const path = `/${slug}/${page}${itemId ? `/${itemId}` : ''}`;
    reportPageView({ slug, ownerId, path }, path);
    if (itemId && (page === 'buy' || page === 'book')) {
      reportProductView(
        { slug, ownerId, path },
        { id: itemId, name: itemId }
      );
    }
  }, [enabled, slug, ownerId, page, itemId]);

  return null;
}

/** Sync durable analytics cart docs from the in-memory cart. */
export function useAnalyticsCartSync({
  slug,
  ownerId,
  items = [],
  subtotalCents = 0,
  enabled = true
}) {
  const prevCount = useRef(0);

  useEffect(() => {
    if (!enabled || !slug || !ownerId) return;
    const count = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    if (count === 0 && prevCount.current === 0) return;

    const status = count === 0 ? 'abandoned' : 'active';
    void upsertAnalyticsCart(
      { slug, ownerId },
      {
        items,
        status: count === 0 ? 'abandoned' : 'active',
        valueCents: subtotalCents
      }
    );

    if (count > prevCount.current) {
      void trackAnalyticsEvent('add_to_cart', { slug, ownerId }, {
        valueCents: subtotalCents,
        itemCount: count
      });
    }
    prevCount.current = count;
    void status;
  }, [enabled, slug, ownerId, items, subtotalCents]);
}

export function AnalyticsCartSync({
  slug,
  ownerId,
  items,
  subtotalCents,
  enabled = true
}) {
  useAnalyticsCartSync({ slug, ownerId, items, subtotalCents, enabled });
  return null;
}
