import { Button } from '../../shared/ui/Button';
import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronRight, Navigation, ShoppingBag } from 'lucide-react';
import { navigate, publicItemPath, publicPagePath } from '../../app/routing';
import { BlankMedia } from '../../shared/ui/BlankMedia';
import { EmptyState } from '../../shared/ui/EmptyState';
import { reportDiscoveryVisit } from '../../shared/analytics/beacon';

function itemImage(item = {}) {
  return item.imageUrls?.[0] || item.imageUrl || item.image || '';
}

function ExploreBusinessOfferCard({ biz, kind, analyticsEnabled }) {
  const railRef = useRef(null);
  const [canScrollForward, setCanScrollForward] = useState(false);

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
    if (analyticsEnabled) reportDiscoveryVisit({ ownerId: biz.ownerId, slug: biz.slug });
    navigate(path);
  };

  return (
    <article className={`bb-marketplace-business is-${kind}`}>
      <header className="bb-marketplace-business-head">
        <button
          type="button"
          className="bb-marketplace-business-identity"
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
            const imageSrc = itemImage(item);
            const page = kind === 'book' ? 'book' : 'buy';
            const openItem = () => openBusiness(publicItemPath(biz.slug, page, item.id));
            const PrimaryIcon = kind === 'book' ? CalendarDays : ShoppingBag;
            return (
              <article key={item.id} className="bb-public-product-card">
                <button
                  type="button"
                  className="bb-public-product-surface"
                  onClick={openItem}
                  aria-label={`View ${item.name}`}
                >
                  <div className="bb-public-product-media">
                    {imageSrc ? <img src={imageSrc} alt="" /> : <BlankMedia variant="square" />}
                  </div>
                  <div className="bb-public-product-price-row">
                    <h2 className="bb-public-product-name">{item.name}</h2>
                    <p className="bb-public-product-price">{item.priceLabel || '—'}</p>
                  </div>
                </button>
                <div className="bb-public-product-actions">
                  <Button action={kind === 'book' ? 'book' : 'cart'} variant="primary" type="button" className="bb-public-product-cart-btn" onClick={openItem}>
                    <span>{kind === 'book' ? 'Book' : 'Buy'}</span>

                  </Button>
                  <Button action="view" variant="secondary" type="button" className="bb-public-product-more-btn" onClick={openItem}>
                    <span>View</span>

                  </Button>
                </div>
              </article>
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
