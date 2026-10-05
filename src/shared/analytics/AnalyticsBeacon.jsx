import { useEffect, useRef } from 'react';
import {
  reportPageView,
  reportProductView,
  reportOfferClick,
  startAnalyticsBeacon,
  trackAnalyticsEvent,
  upsertAnalyticsCart
} from './beacon';
import { cartAdditions } from './cartTracking';

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
  const reportedPath = useRef('');

  useEffect(() => {
    if (!enabled || !slug || !ownerId) return undefined;
    started.current = true;
    const stop = startAnalyticsBeacon({ slug, ownerId });
    const onOfferClick = event => {
      const card = event.target?.closest?.('[data-analytics-item-id]');
      if (!card) return;
      reportOfferClick({ slug, ownerId }, {
        id: card.dataset.analyticsItemId,
        name: card.dataset.analyticsItemName,
        kind: card.dataset.analyticsItemKind
      });
    };
    document.addEventListener('click', onOfferClick, true);
    return () => { stop(); document.removeEventListener('click', onOfferClick, true); };
  }, [enabled, slug, ownerId]);

  useEffect(() => {
    if (!enabled || !slug || !ownerId || !started.current) return;
    const path = `/${slug}/${page}${itemId ? `/${itemId}` : ''}`;
    if (reportedPath.current === path) return;
    reportedPath.current = path;
    reportPageView({ slug, ownerId, path }, path);
    if (itemId && (page === 'buy' || page === 'book')) {
      reportProductView(
        { slug, ownerId, path },
        { id: itemId, name: itemId, kind: page === 'book' ? 'service' : 'product' }
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
  const previousItems = useRef(items);

  useEffect(() => {
    if (!enabled || !slug || !ownerId) return;
    const count = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const previous = previousItems.current;
    previousItems.current = items;
    if (count === 0 && previous.length === 0) return;

    const status = count === 0 ? 'abandoned' : 'active';
    void upsertAnalyticsCart(
      { slug, ownerId },
      {
        items,
        status,
        valueCents: subtotalCents
      }
    );

    for (const item of cartAdditions(previous, items)) {
      void trackAnalyticsEvent('add_to_cart', { slug, ownerId }, {
        commerceVersion: 1,
        itemKind: item.kind,
        productId: item.productId || '',
        serviceId: item.serviceId || '',
        itemName: item.name || '',
        quantity: item.addedQuantity,
        valueCents: (Number(item.unitPriceCents) || 0) * item.addedQuantity,
        itemCount: count
      });
    }
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
