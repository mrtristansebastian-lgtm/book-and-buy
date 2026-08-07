import { useMemo, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { navigate, publicItemPath } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { usePublicCart } from '../PublicCartContext';
import { PublicCartCheckout } from './PublicCartCheckout';
import { CatalogCategoryTabs } from './CatalogCategoryTabs';
import { formatProductPrice } from '../../../utils/products';
import {
  buildCatalogCategoryTabs,
  filterCatalogByCategory,
  getCatalogCategory
} from '../../../utils/catalogCategories';

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
  const [categoryId, setCategoryId] = useState('all');

  const catalog = useMemo(
    () => products.filter((product) => product.active !== false),
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

  const catalogTools = (
    <div className="bb-public-catalog-tools">
      {panel === 'shop' ? (
        <CatalogCategoryTabs
          options={categoryTabs}
          value={categoryId}
          onChange={setCategoryId}
          ariaLabel="Product categories"
        />
      ) : null}
      {cartButton}
    </div>
  );

  const renderCard = (product, featuredCard = false) => {
    const quote = product.quoteBased || product.priceType === 'quote';
    const imageSrc = product.imageUrls?.[0] || product.image || '';
    const price = formatProductPrice(product);
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
          </div>
          <div className="bb-public-product-body">
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
        </button>
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
          <ShoppingBag size={12} strokeWidth={2.4} />
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
          catalogTools
        ) : (
          <header className="bb-public-buy-header">
            <div className="bb-public-catalog-intro">
              <h1 className="bb-public-catalog-title">{title}</h1>
              <p className="bb-public-lede m-0">
                {subtext ||
                  `Kitchen goods and take-home sets from ${workspaceName || workspace.brandName}.`}
              </p>
            </div>
            {catalogTools}
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
            {gridProducts.map((product) => renderCard(product))}
            {catalog.length === 0 ? (
              <p className="bb-muted m-0">No products published yet.</p>
            ) : filteredCatalog.length === 0 ? (
              <p className="bb-muted m-0">No products in this category.</p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
