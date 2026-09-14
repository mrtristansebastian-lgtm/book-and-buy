import { useMemo, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { navigate, publicItemPath } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { usePublicCart } from '../PublicCartContext';
import { PublicCartCheckout } from './PublicCartCheckout';
import { CatalogCategoryTabs } from './CatalogCategoryTabs';
import { formatProductPrice, formatStockNote, isProductPubliclyVisible, productHasVariants } from '../../../utils/products';
import {
  buildCatalogCategoryTabs,
  filterCatalogByCategory,
  getCatalogCategory
} from '../../../utils/catalogCategories';

export function PublicStorefront({
  catalogWorkspace,
  workspaceName,
  preview = false,
  featuredProductId = '',
  publicMode = false
}) {
  const ctx = useWorkspace();
  const workspace = catalogWorkspace || ctx.workspace;
  const website = workspace.website || {};
  const products = workspace.products || [];
  const cart = usePublicCart();
  const [panel, setPanel] = useState('shop');
  const [categoryId, setCategoryId] = useState('all');
  const cartOpen = panel === 'cart';

  const catalog = useMemo(
    () => products.filter((product) => isProductPubliclyVisible(product)),
    [products]
  );
  const categoryTabs = useMemo(() => buildCatalogCategoryTabs(catalog), [catalog]);
  const filteredCatalog = useMemo(
    () => filterCatalogByCategory(catalog, categoryId),
    [catalog, categoryId]
  );

  const featured =
    categoryId === 'all'
      ? catalog.find((product) => product.id === featuredProductId) || null
      : null;
  const gridProducts = featured
    ? filteredCatalog.filter((product) => product.id !== featured.id)
    : filteredCatalog;

  const openDetail = (productId) => {
    if (preview) return;
    navigate(publicItemPath(workspace.slug, 'buy', productId));
  };

  const openCart = () => setPanel('cart');
  const closeCart = () => setPanel('shop');
  const toggleCart = () => setPanel(cartOpen ? 'shop' : 'cart');

  const introBody =
    String(website.buySubtext || '').trim() ||
    'Order products from this business.';

  const cartButton = (
    <button
      type="button"
      className={`bb-public-catalog-cart${cartOpen ? ' is-open' : ''}`}
      onClick={toggleCart}
      aria-expanded={cartOpen}
      aria-controls="bb-public-catalog-cart-panel"
    >
      <ShoppingBag size={15} />
      <span>Cart</span>
      <span className="bb-public-catalog-cart-count">{cart.count}</span>
    </button>
  );

  const categoryTabsEl = (
    <CatalogCategoryTabs
      options={categoryTabs}
      value={categoryId}
      onChange={setCategoryId}
      ariaLabel="Product categories"
    />
  );

  const renderCard = (product, featuredCard = false) => {
    const quote = product.quoteBased || product.priceType === 'quote';
    const hasOptions = productHasVariants(product);
    const imageSrc = product.imageUrls?.[0] || product.image || '';
    const price = formatProductPrice(product);
    const stock = formatStockNote(product);
    const category = getCatalogCategory(
      product,
      featuredCard ? 'Featured' : 'Product'
    );

    return (
      <article
        key={product.id}
        className={`bb-public-product-card${featuredCard ? ' bb-public-product-card--featured' : ''}`}
      >
        <button
          type="button"
          className="bb-public-product-surface"
          onClick={() => openDetail(product.id)}
          aria-label={`View ${product.name}`}
        >
          <div className="bb-public-product-media">
            {imageSrc ? <img src={imageSrc} alt="" /> : null}
            {category ? (
              <span className="bb-public-product-sticker">{category}</span>
            ) : null}
            {stock ? (
              <span className="bb-public-product-sticker bb-public-product-sticker--ink bb-public-product-sticker--end">
                {stock}
              </span>
            ) : null}
          </div>
          <div className="bb-public-product-price-row">
            <h2 className="bb-public-product-name">{product.name}</h2>
            <span className="bb-public-product-price-meta">
              <span className="bb-public-product-price-label">Price</span>
              <span className="bb-public-product-price-value">{price || '—'}</span>
            </span>
          </div>
        </button>
        <div className="bb-public-product-actions">
          <button
            type="button"
            className="bb-public-product-cart-btn"
            disabled={quote}
            onClick={() => {
              if (quote) return;
              if (hasOptions) {
                openDetail(product.id);
                return;
              }
              cart.addItem(product);
              openCart();
            }}
          >
            <ShoppingBag size={12} strokeWidth={2.4} />
            <span>{quote ? 'Quote' : hasOptions ? 'Options' : 'Add'}</span>
          </button>
          <button
            type="button"
            className="bb-public-product-more-btn"
            onClick={() => openDetail(product.id)}
          >
            View more
          </button>
        </div>
      </article>
    );
  };

  const productGrid = (
    <div className="bb-public-product-grid">
      {featured && featuredProductId ? renderCard(featured, true) : null}
      {gridProducts.map((product) => renderCard(product))}
      {catalog.length === 0 ? (
        <p className="bb-muted m-0">No products published yet.</p>
      ) : filteredCatalog.length === 0 ? (
        <p className="bb-muted m-0">No products in this category.</p>
      ) : null}
    </div>
  );

  const cartCheckout = (
    <PublicCartCheckout
      catalogWorkspace={workspace}
      workspaceName={workspaceName || workspace.brandName}
      publicMode={publicMode}
      onBack={closeCart}
    />
  );

  return (
    <section
      className={`bb-public-buy-section bb-public-gutter bb-public-catalog-desk${
        cartOpen ? ' is-cart-open' : ''
      }${preview ? ' pointer-events-none' : ''}`}
    >
      <div className="bb-public-measure-wide bb-public-catalog-shell">
        <div className="bb-public-catalog-topbar">{cartButton}</div>

        <div className="bb-public-catalog-layout">
          <aside className="bb-public-catalog-side">{categoryTabsEl}</aside>

          <div className="bb-public-catalog-main">
            <header className="bb-public-catalog-intro">
              <h1 className="bb-public-catalog-intro-title">Our Products</h1>
              <p className="bb-public-catalog-intro-body">{introBody}</p>
            </header>

            <div className="bb-public-catalog-mobile-tools">
              {categoryTabsEl}
              {cartButton}
            </div>

            <div className="bb-public-catalog-mobile-panel">
              {cartOpen ? cartCheckout : productGrid}
            </div>

            <div className="bb-public-catalog-desk-grid">{productGrid}</div>
          </div>
        </div>

        {cartOpen ? (
          <>
            <button
              type="button"
              className="bb-public-catalog-cart-scrim"
              aria-label="Close cart"
              onClick={closeCart}
            />
            <aside
              id="bb-public-catalog-cart-panel"
              className="bb-public-catalog-cart-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Cart"
            >
              {cartCheckout}
            </aside>
          </>
        ) : null}
      </div>
    </section>
  );
}
