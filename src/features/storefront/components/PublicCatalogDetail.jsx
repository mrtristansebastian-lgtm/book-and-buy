import { useEffect, useState } from 'react';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { navigate, publicPagePath } from '../../../app/routing';
import { usePublicCart } from '../../storefront/PublicCartContext';
import { PublicCartCheckout } from '../../storefront/components/PublicCartCheckout';
import { formatProductPrice, formatStockNote } from '../../../utils/products';
import {
  formatServiceDuration,
  formatServicePrice
} from '../../../utils/services';
import { getCatalogCategory } from '../../../utils/catalogCategories';

function collectImages(item = {}) {
  const urls = Array.isArray(item.imageUrls)
    ? item.imageUrls.map((url) => String(url || '').trim()).filter(Boolean)
    : [];
  if (urls.length) return [...new Set(urls)];
  const single = String(item.image || '').trim();
  return single ? [single] : [];
}

/**
 * Shared public product / service detail page.
 * kind: 'product' | 'service'
 */
export function PublicCatalogDetail({
  kind = 'product',
  item,
  workspace,
  workspaceName,
  slug,
  preview = false,
  publicMode = false
}) {
  const cart = usePublicCart();
  const [panel, setPanel] = useState('detail');

  useEffect(() => {
    if (preview) return undefined;
    window.scrollTo(0, 0);
    return undefined;
  }, [item?.id, preview]);

  const catalogPage = kind === 'service' ? 'book' : 'buy';
  const catalogLabel = kind === 'service' ? 'Book' : 'Buy';
  const images = collectImages(item);

  if (!item) {
    return (
      <section className="bb-public-detail bb-public-gutter">
        <div className="bb-public-measure grid gap-4 py-10">
          <p className="bb-muted m-0">
            {kind === 'service' ? 'Service' : 'Product'} not found.
          </p>
          <button
            type="button"
            className="bb-ghost-btn justify-self-start"
            onClick={() => {
              if (preview) return;
              navigate(publicPagePath(slug, catalogPage));
            }}
          >
            <ArrowLeft size={16} />
            Back to {catalogLabel}
          </button>
        </div>
      </section>
    );
  }

  const quote =
    kind === 'product'
      ? item.quoteBased || item.priceType === 'quote'
      : item.priceType === 'quote';
  const price =
    kind === 'service' ? formatServicePrice(item) : formatProductPrice(item);
  const duration =
    kind === 'service' ? formatServiceDuration(item.duration) : '';
  const stock = kind === 'product' ? formatStockNote(item) : '';
  const meta =
    kind === 'service'
      ? getCatalogCategory(item, 'Service')
      : getCatalogCategory(item, 'Product');
  const lineKey = kind === 'service' ? `service:${item.id}` : `product:${item.id}`;
  const inCart = cart.items.some((row) => row.lineKey === lineKey);
  const cartDisabled = kind === 'service' ? inCart : quote;

  const cartButton = (
    <button
      type="button"
      className="bb-ink-btn"
      onClick={() => setPanel(panel === 'cart' ? 'detail' : 'cart')}
    >
      <ShoppingBag size={16} />
      Cart ({cart.count})
    </button>
  );

  const addToCart = () => {
    if (cartDisabled) return;
    if (kind === 'service') cart.addService(item);
    else cart.addItem(item);
    setPanel('cart');
  };

  if (panel === 'cart') {
    return (
      <section
        className={`bb-public-detail bb-public-gutter ${preview ? 'pointer-events-none' : ''}`}
      >
        <div className="bb-public-measure-wide grid gap-6">
          <div className="flex justify-end">{cartButton}</div>
          <PublicCartCheckout
            catalogWorkspace={workspace}
            workspaceName={workspaceName || workspace.brandName}
            publicMode={publicMode}
            onBack={() => setPanel('detail')}
          />
        </div>
      </section>
    );
  }

  return (
    <section
      className={`bb-public-detail bb-public-gutter ${preview ? 'pointer-events-none' : ''}`}
    >
      <div className="bb-public-measure-wide bb-public-detail-shell">
        <header className="bb-public-detail-toolbar">
          <button
            type="button"
            className="bb-ghost-btn"
            onClick={() => {
              if (preview) return;
              navigate(publicPagePath(slug, catalogPage));
            }}
          >
            <ArrowLeft size={16} />
            Back to {catalogLabel}
          </button>
          {cartButton}
        </header>

        <div className="bb-public-detail-layout">
          <div className="bb-public-detail-gallery" aria-label={`${item.name} images`}>
            {images.length ? (
              images.map((src, index) => (
                <figure key={`${src}-${index}`} className="bb-public-detail-frame">
                  <img src={src} alt={index === 0 ? item.name || '' : ''} />
                </figure>
              ))
            ) : (
              <div className="bb-public-detail-frame is-empty" aria-hidden="true" />
            )}
          </div>

          <aside className="bb-public-detail-copy">
            <p className="bb-public-service-meta">{meta}</p>
            <h1 className="bb-public-detail-title">{item.name}</h1>

            <div className="bb-public-detail-facts">
              <div className="bb-public-detail-fact">
                <span className="bb-public-product-stat-label">Price</span>
                <span className="bb-public-detail-price">{price || '—'}</span>
              </div>
              {duration ? (
                <div className="bb-public-detail-fact">
                  <span className="bb-public-product-stat-label">Duration</span>
                  <span className="bb-public-detail-price">{duration}</span>
                </div>
              ) : null}
              {stock ? (
                <div className="bb-public-detail-fact">
                  <span className="bb-public-product-stat-label">Availability</span>
                  <span className="bb-public-detail-price">{stock}</span>
                </div>
              ) : null}
            </div>

            {item.description ? (
              <div className="bb-public-detail-body">
                <h2 className="bb-public-detail-section-label">About</h2>
                <p>{item.description}</p>
              </div>
            ) : null}

            <button
              type="button"
              className="bb-public-product-cart-btn bb-public-detail-cart-btn"
              disabled={cartDisabled}
              onClick={addToCart}
            >
              <ShoppingBag size={15} strokeWidth={2.35} />
              <span>
                {kind === 'service'
                  ? inCart
                    ? 'In cart'
                    : 'Add to cart'
                  : quote
                    ? 'Quote only'
                    : 'Add to cart'}
              </span>
            </button>
          </aside>
        </div>
      </div>
    </section>
  );
}
