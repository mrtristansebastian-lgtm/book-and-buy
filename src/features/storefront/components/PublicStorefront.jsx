import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { usePublicCart } from '../PublicCartContext';
import { PublicCartCheckout } from './PublicCartCheckout';
import { formatProductPrice } from '../../../utils/products';

export function PublicStorefront({
  catalogWorkspace,
  workspaceName,
  title = 'Buy',
  subtext,
  preview = false,
  featuredProductId = '',
  hideIntro = false,
  publicMode = false
}) {
  const ctx = useWorkspace();
  const workspace = catalogWorkspace || ctx.workspace;
  const products = workspace.products || [];
  const cart = usePublicCart();
  const [panel, setPanel] = useState('shop');

  const catalog = products.filter((product) => product.active !== false);
  const featured =
    catalog.find((product) => product.id === featuredProductId) || catalog[0] || null;
  const gridProducts = featuredProductId
    ? catalog.filter((product) => product.id !== featured?.id)
    : catalog;

  const cartButton = (
    <button
      type="button"
      className="bb-ink-btn"
      onClick={() => setPanel(panel === 'cart' ? 'shop' : 'cart')}
    >
      <ShoppingBag size={16} />
      Cart ({cart.count})
    </button>
  );

  const renderCard = (product, featuredCard = false) => {
    const quote = product.quoteBased || product.priceType === 'quote';
    const imageSrc = product.imageUrls?.[0] || product.image || '';
    const price = formatProductPrice(product);
    const category =
      product.category || product.mainCategory || (featuredCard ? 'Featured' : 'Product');

    return (
      <article
        key={product.id}
        className={`bb-public-product-card${featuredCard ? ' bb-public-product-card--featured' : ''}`}
      >
        <div className="bb-public-product-surface">
          <div className="bb-public-product-media">
            {imageSrc ? <img src={imageSrc} alt="" /> : null}
          </div>
          <div className="bb-public-product-body">
            <p className="bb-public-service-meta">{category}</p>
            <h2>{product.name}</h2>
            {product.description ? (
              <p className="bb-public-product-desc">{product.description}</p>
            ) : null}
          </div>
          <div className="bb-public-product-stats">
            <div className="bb-public-product-stat">
              <span className="bb-public-product-stat-label">Price</span>
              <span className="bb-public-product-stat-value">{price || '—'}</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="bb-public-product-cart-btn"
          disabled={quote}
          onClick={() => {
            if (quote) return;
            cart.addItem(product);
            setPanel('cart');
          }}
        >
          <ShoppingBag size={15} strokeWidth={2.35} />
          <span>{quote ? 'Quote only' : 'Add to cart'}</span>
        </button>
      </article>
    );
  };

  return (
    <section
      className={`bb-public-buy-section bb-public-gutter ${preview ? 'pointer-events-none' : ''}`}
    >
      <div className="bb-public-measure-wide grid gap-6">
        {hideIntro ? (
          <div className="flex justify-end">{cartButton}</div>
        ) : (
          <header className="bb-public-buy-header">
            <div className="bb-public-catalog-intro">
              <h1 className="bb-public-catalog-title">{title}</h1>
              <p className="bb-public-lede m-0">
                {subtext ||
                  `Kitchen goods and take-home sets from ${workspaceName || workspace.brandName}.`}
              </p>
            </div>
            {cartButton}
          </header>
        )}

        {panel === 'cart' ? (
          <PublicCartCheckout
            catalogWorkspace={workspace}
            workspaceName={workspaceName || workspace.brandName}
            publicMode={publicMode}
            onBack={() => setPanel('shop')}
          />
        ) : (
          <div className="bb-public-product-grid">
            {featured && featuredProductId ? renderCard(featured, true) : null}
            {(featuredProductId ? gridProducts : catalog).map((product) => renderCard(product))}
            {catalog.length === 0 ? (
              <p className="bb-muted m-0">No products published yet.</p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
