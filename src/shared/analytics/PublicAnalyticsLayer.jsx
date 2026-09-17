import { useEffect } from 'react';
import { usePublicCart } from '../../features/storefront/PublicCartContext';
import { AnalyticsBeacon, AnalyticsCartSync } from './AnalyticsBeacon';

/** Beacon + cart sync; must sit under PublicCartProvider on live public surfaces. */
export function PublicAnalyticsLayer({
  workspace,
  page = 'home',
  itemId = '',
  enabled = false
}) {
  const slug = workspace?.slug || '';
  const ownerId = workspace?.ownerId || '';
  const cart = usePublicCart();

  if (!enabled || !slug || !ownerId) return null;

  return (
    <>
      <AnalyticsBeacon
        slug={slug}
        ownerId={ownerId}
        page={page}
        itemId={itemId}
        enabled
      />
      <AnalyticsCartSync
        slug={slug}
        ownerId={ownerId}
        items={cart.items}
        subtotalCents={cart.subtotalCents}
        enabled
      />
    </>
  );
}
