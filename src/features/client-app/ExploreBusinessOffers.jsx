import { useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { navigate, publicItemPath, publicPagePath } from '../../app/routing';
import { BlankMedia } from '../../shared/ui/BlankMedia';
import { EmptyState } from '../../shared/ui/EmptyState';

function itemImage(item = {}) {
  return item.imageUrls?.[0] || item.imageUrl || item.image || '';
}

function ExploreBusinessOfferCard({ biz, kind }) {
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

  return (
    <article ref={railRef} className="bb-explore-biz-card">
      <button
        type="button"
        className="bb-explore-biz-card-head"
        onClick={() => navigate(publicPagePath(biz.slug, 'home'))}
      >
        <span className="bb-explore-biz-card-banner" aria-hidden="true">
          {biz.heroImageUrl ? <img src={biz.heroImageUrl} alt="" /> : <BlankMedia variant="banner" />}
        </span>
        <span className="bb-client-avatar is-sm" aria-hidden="true">
          {biz.logoUrl ? <img src={biz.logoUrl} alt="" /> : <BlankMedia variant="avatar" />}
        </span>
        <span className="bb-explore-biz-card-head-copy">
          <strong>{biz.brandName}</strong>
          {biz.categoryLabel || biz.locationLabel ? (
            <span className="bb-public-profile-meta bb-find-biz-profile-meta">
              {biz.categoryLabel ? (
                <span className="bb-public-profile-chip bb-public-profile-chip--category">
                  <span className="bb-public-profile-category">{biz.categoryLabel}</span>
                </span>
              ) : null}
              {biz.locationLabel ? (
                <span className="bb-public-profile-chip bb-public-profile-chip--location">
                  <span className="bb-public-profile-chip-icon" aria-hidden="true" />
                  <span className="bb-public-profile-location">{biz.locationLabel}</span>
                </span>
              ) : null}
            </span>
          ) : null}
          {biz.distanceLabel ? (
            <span className="bb-find-biz-distance">{biz.distanceLabel} from you</span>
          ) : null}
        </span>
      </button>

      <div className="bb-explore-biz-preview">
        {biz.items.map((item) => {
          const imageSrc = itemImage(item);
          const page = kind === 'book' ? 'book' : 'buy';
          return (
            <article key={item.id} className="bb-find-offer-preview">
              <button
                type="button"
                className="bb-find-offer-preview-hit"
                onClick={() => navigate(publicItemPath(biz.slug, page, item.id))}
                aria-label={`View ${item.name}`}
              >
                <div className="bb-find-offer-preview-media">
                  {imageSrc ? <img src={imageSrc} alt="" /> : <BlankMedia variant="square" />}
                </div>
                <div className="bb-find-offer-preview-copy">
                  <h2>{item.name}</h2>
                  <p>{item.priceLabel || '—'}</p>
                </div>
              </button>
              <button
                type="button"
                className="bb-public-product-more-btn bb-find-offer-preview-action"
                onClick={() => navigate(publicItemPath(biz.slug, page, item.id))}
              >
                View
              </button>
            </article>
          );
        })}
      </div>

      {biz.items.length > 1 && canScrollForward ? (
        <button
          type="button"
          className="bb-find-offer-scroll-cue"
          onClick={scrollForward}
          aria-label="Show more offers"
        >
          <ChevronRight aria-hidden="true" />
        </button>
      ) : null}
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
  emptyDescription = ''
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
        <ExploreBusinessOfferCard key={biz.slug} biz={biz} kind={kind} />
      ))}
    </div>
  );
}
