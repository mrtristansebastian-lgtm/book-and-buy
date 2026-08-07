import { useMemo, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { navigate, publicItemPath } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { usePublicCart } from '../PublicCartContext';
import { PublicCartCheckout } from './PublicCartCheckout';
import { CatalogCategoryTabs } from './CatalogCategoryTabs';
import { formatProductPrice, formatStockNote } from '../../../utils/products';
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
          <div className="bb-public-product-body">
            <h2>{product.name}</h2>
            {product.description ? (
              <p className="bb-public-product-desc">{product.description}</p>
            ) : null}
          </div>
          <div className="bb-public-product-price-row">
            <span className="bb-public-product-price-label">Price</span>
            <span className="bb-public-product-price-value">{price || '—'}</span>
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
        {catalogTools}

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
