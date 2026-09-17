import { navigate, publicItemPath, publicPagePath } from '../../app/routing';
import { BlankMedia } from '../../shared/ui/BlankMedia';
import { EmptyState } from '../../shared/ui/EmptyState';

function itemImage(item = {}) {
  return item.imageUrls?.[0] || item.image || '';
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
            <span className="bb-client-avatar is-sm" aria-hidden="true">
              {biz.logoUrl ? <img src={biz.logoUrl} alt="" /> : <BlankMedia variant="avatar" />}
            </span>
            <span className="bb-explore-biz-card-head-copy">
              <strong>{biz.brandName}</strong>
              {biz.meta ? <span className="bb-muted">{biz.meta}</span> : null}
            </span>
          </button>

          <div className="bb-explore-biz-preview bb-public-product-grid">
            {biz.items.map((item) => {
              const imageSrc = itemImage(item);
              const page = kind === 'book' ? 'book' : 'buy';
              return (
                <article key={item.id} className="bb-public-product-card bb-explore-biz-preview-item">
                  <button
                    type="button"
                    className="bb-public-product-surface"
                    onClick={() => navigate(publicItemPath(biz.slug, page, item.id))}
                    aria-label={`View ${item.name}`}
                  >
                    <div className="bb-public-product-media">
                      {imageSrc ? <img src={imageSrc} alt="" /> : null}
                    </div>
                    <div className="bb-public-product-price-row">
                      <h2 className="bb-public-product-name">{item.name}</h2>
                      <p className="bb-public-product-price">{item.priceLabel || '—'}</p>
                    </div>
                  </button>
                  <div className="bb-public-product-actions">
                    <button
                      type="button"
                      className="bb-public-product-cart-btn"
                      onClick={() => navigate(publicItemPath(biz.slug, page, item.id))}
                    >
                      <span>{kind === 'book' ? 'Book' : 'Buy'}</span>
                    </button>
                    <button
                      type="button"
                      className="bb-public-product-more-btn"
                      onClick={() => navigate(publicItemPath(biz.slug, page, item.id))}
                    >
                      View
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </article>
      ))}
    </div>
  );
}
