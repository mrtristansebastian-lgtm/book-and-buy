import { navigate, publicItemPath, publicPagePath } from '../../app/routing';
import { BlankMedia } from '../../shared/ui/BlankMedia';
import { EmptyState } from '../../shared/ui/EmptyState';

function itemImage(item = {}) {
  return item.imageUrls?.[0] || item.imageUrl || item.image || '';
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
        <article key={biz.slug} className="bb-explore-biz-card">
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
        </article>
      ))}
    </div>
  );
}
