import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { usePublicCart } from '../PublicCartContext';
import { PublicCartCheckout } from './PublicCartCheckout';
import { formatProductPrice, formatStockNote } from '../../../utils/products';

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

  return (
    <section
      className={`bb-public-buy-section bb-public-gutter ${preview ? 'pointer-events-none' : ''}`}
    >
      <div className="bb-public-measure grid gap-7">
        {hideIntro ? (
          <div className="flex justify-end">{cartButton}</div>
        ) : (
          <header className="bb-public-buy-header">
            <div className="grid gap-2 max-w-2xl">
              <h1 className="bb-page-title">{title}</h1>
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
          <>
            {featured && featuredProductId ? (
              <article className="bb-public-product-card bb-public-product-card--featured">
                <div className="bb-public-product-media">
                  {featured.imageUrls?.[0] || featured.image ? (
                    <img src={featured.imageUrls?.[0] || featured.image} alt="" />
                  ) : null}
                </div>
                <div className="bb-public-product-body">
                  <p className="bb-public-service-meta">Featured</p>
                  <h2>{featured.name}</h2>
                  <p className="bb-public-product-desc">{featured.description}</p>
                </div>
                <div className="bb-public-product-aside">
                  <p className="bb-public-product-price">
                    {[formatProductPrice(featured), formatStockNote(featured)]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {featured.quoteBased || featured.priceType === 'quote' ? (
                    <span className="bb-ghost-btn pointer-events-none">Quote only</span>
                  ) : (
                    <button
                      type="button"
                      className="bb-primary-btn"
                      onClick={() => cart.addItem(featured)}
                    >
                      Add to cart
                    </button>
                  )}
                </div>
              </article>
            ) : null}

            <div className="bb-public-product-grid">
              {(featuredProductId ? gridProducts : catalog).map((product) => {
                const quote = product.quoteBased || product.priceType === 'quote';
                const imageSrc = product.imageUrls?.[0] || product.image || '';
                const priceLine = [formatProductPrice(product), formatStockNote(product)]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <article key={product.id} className="bb-public-product-card">
                    <div className="bb-public-product-media">
                      {imageSrc ? <img src={imageSrc} alt="" /> : null}
                    </div>
                    <div className="bb-public-product-body">
                      <h2>{product.name}</h2>
                      <p className="bb-public-product-desc">{product.description}</p>
                      <p className="bb-public-product-price md:hidden">{priceLine}</p>
                    </div>
                    <div className="bb-public-product-aside">
                      <p className="bb-public-product-price hidden md:block">{priceLine}</p>
                      {quote ? (
                        <span className="bb-ghost-btn pointer-events-none">Quote only</span>
                      ) : (
                        <button
                          type="button"
                          className="bb-primary-btn"
                          onClick={() => cart.addItem(product)}
                        >
                          Add to cart
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
