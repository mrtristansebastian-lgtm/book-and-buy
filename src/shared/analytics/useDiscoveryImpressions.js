import { useEffect } from 'react';
import { reportDiscoveryImpression } from './beacon';

/** Count listings only once they are at least halfway visible, including offer rails. */
export function useDiscoveryImpressions(rootRef, { enabled, surface, ownerId = '', slug = '', excludeOwnerId = '' }, records) {
  useEffect(() => {
    const root = rootRef.current;
    if (!enabled || !root || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.5) continue;
        const data = entry.target.dataset;
        const context = {
          ownerId: data.discoveryOwnerId || ownerId,
          slug: data.discoverySlug || slug
        };
        if (excludeOwnerId && context.ownerId === excludeOwnerId) {
          observer.unobserve(entry.target);
          continue;
        }
        const kind = data.analyticsItemKind;
        const item = data.analyticsItemId ? {
          id: data.analyticsItemId,
          name: data.analyticsItemName,
          kind
        } : undefined;
        reportDiscoveryImpression(context, surface, item);
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.5 });
    root.querySelectorAll('[data-discovery-target], [data-analytics-item-id]').forEach(target => observer.observe(target));
    return () => observer.disconnect();
  }, [enabled, ownerId, slug, surface, records, rootRef, excludeOwnerId]);
}
