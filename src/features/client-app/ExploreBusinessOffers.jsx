import { Button } from '../../shared/ui/Button';
import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Navigation } from 'lucide-react';
import { navigate, publicItemPath, publicPagePath } from '../../app/routing';
import { BlankMedia } from '../../shared/ui/BlankMedia';
import { EmptyState } from '../../shared/ui/EmptyState';
import { reportDiscoveryVisit, reportOfferClick } from '../../shared/analytics/beacon';
import { useDiscoveryImpressions } from '../../shared/analytics/useDiscoveryImpressions';
import { PublicOfferCard } from '../storefront/components/PublicOfferCard';
import { useAuth } from '../auth/AuthContext';

function ExploreBusinessOfferCard({ biz, kind, analyticsEnabled }) {
  const { user } = useAuth();
  const trackDiscovery = analyticsEnabled && user?.uid !== biz.ownerId;
  const cardRef = useRef(null);
  const railRef = useRef(null);
  const [canScrollForward, setCanScrollForward] = useState(false);
  useDiscoveryImpressions(cardRef, { enabled: trackDiscovery, ownerId: biz.ownerId, slug: biz.slug, surface: kind }, biz.items);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return undefined;

    const updateScrollCue = () => {
      setCanScrollForward(rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 4);
    };

    rail.scrollLeft = 0;
    updateScrollCue();
    rail.addEventListener('scroll', updateScrollCue, { passive: true });

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateScrollCue);
    resizeObserver?.observe(rail);

    return () => {
      rail.removeEventListener('scroll', updateScrollCue);
      resizeObserver?.disconnect();
    };
  }, [biz.items.length, kind]);

  const scrollForward = () => {
    railRef.current?.scrollBy({ left: 196, behavior: 'smooth' });
  };
  const openBusiness = (path) => {
    if (trackDiscovery) reportDiscoveryVisit({ ownerId: biz.ownerId, slug: biz.slug }, { surface: kind });
    navigate(path);
  };

  return (
    <article ref={cardRef} className={`bb-marketplace-business is-${kind}`}>
      <header className="bb-marketplace-business-head">
        <button
          type="button"
          className="bb-marketplace-business-identity"
          data-discovery-target="business"
          onClick={() => openBusiness(publicPagePath(biz.slug, 'home'))}
          aria-label={`View ${biz.brandName} business profile`}
        >
          <span className="bb-marketplace-business-logo" aria-hidden="true">
          {biz.logoUrl ? <img src={biz.logoUrl} alt="" /> : <BlankMedia variant="avatar" />}
          </span>
          <span className="bb-marketplace-business-copy">
            <span className="bb-marketplace-business-title">
              <strong>{biz.brandName}</strong>
              {biz.categoryLabel ? <span className="bb-places-category bb-marketplace-business-category">{biz.categoryLabel}</span> : null}
            </span>
            {(biz.locationLabel || biz.distanceLabel) ? (
              <span className="bb-places-detail-row bb-marketplace-business-details">
                {biz.locationLabel ? (
                  <span className="bb-public-profile-meta bb-places-meta">
                    <span className="bb-public-profile-chip bb-public-profile-chip--location">
                      <span className="bb-public-profile-chip-icon" aria-hidden="true" />
                      <span className="bb-public-profile-location">{biz.locationLabel}</span>
                    </span>
                  </span>
                ) : null}
                {biz.distanceLabel ? (
                  <span className="bb-places-distance">
                    <Navigation size={12} strokeWidth={2.15} aria-hidden="true" />
                    <strong>{biz.distanceLabel}</strong>
                    <span>from you</span>
                  </span>
                ) : null}
              </span>
            ) : null}
          </span>
        </button>

        <Button action="view" variant="primary"
          type="button"
          className="bb-page-action bb-marketplace-store-link bb-marketplace-store-link--desktop"
          onClick={() => openBusiness(publicPagePath(biz.slug, kind === 'book' ? 'book' : 'buy'))}
        >
          {kind === 'book' ? 'View services' : 'View shop'}

        </Button>
      </header>

      <div className="bb-marketplace-shelf">
        <div
          ref={railRef}
          className="bb-marketplace-offers bb-public-product-grid"
        >
          {biz.items.map((item) => {
            const page = kind === 'book' ? 'book' : 'buy';
            const openItem = () => {
              if (trackDiscovery) {
                const context = { ownerId: biz.ownerId, slug: biz.slug, source: 'places', discoverySurface: kind };
                reportDiscoveryVisit(context, { surface: kind, target: 'offer' });
                reportOfferClick(context, { ...item, kind: page === 'book' ? 'service' : 'product' });
              }
              navigate(publicItemPath(biz.slug, page, item.id));
            };
            return (
              <PublicOfferCard key={item.id} item={item} kind={kind} price={item.priceLabel} onOpen={openItem} />
            );
          })}
        </div>

        {biz.items.length > 1 && canScrollForward ? (
          <button
            type="button"
            className="bb-marketplace-scroll-cue"
            onClick={scrollForward}
            aria-label="Show more offers"
          >
            <ChevronRight aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <Button action="view" variant="primary"
        type="button"
        className="bb-page-action bb-marketplace-store-link bb-marketplace-store-link--mobile"
        onClick={() => openBusiness(publicPagePath(biz.slug, kind === 'book' ? 'book' : 'buy'))}
      >
        {kind === 'book' ? 'View services' : 'View shop'}

      </Button>
    </article>
  );
}

/**
 * Explore Book/Buy: one card per business with avatar header + first few item previews.
 */
export function ExploreBusinessOffers({
  kind = 'buy',
  businesses = [],
  emptyTitle = '',
  emptyDescription = '',
  analyticsEnabled = false
}) {
  if (!businesses.length) {
    return (
      <EmptyState
        compact
        title={emptyTitle || (kind === 'book' ? 'No bookable services nearby' : 'No products nearby')}
        description={
          emptyDescription ||
          (kind === 'book'
            ? 'Widen distance, change categories, or try another search.'
            : 'Widen distance, change categories, or try another search.')
        }
      />
    );
  }

  return (
    <div className="bb-explore-biz-list" aria-label={kind === 'book' ? 'Book offers' : 'Buy offers'}>
      {businesses.map((biz) => (
        <ExploreBusinessOfferCard key={biz.slug} biz={biz} kind={kind} analyticsEnabled={analyticsEnabled} />
      ))}
    </div>
  );
}
