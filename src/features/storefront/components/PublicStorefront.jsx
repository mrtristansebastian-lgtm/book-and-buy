import { searchPublicCatalog, sortPublicCatalog } from '../../website/profileModel';
import { Button } from '../../../shared/ui/Button';
import { useMemo, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { navigate, publicItemPath } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { usePublicCart } from '../PublicCartContext';
import { PublicCartCheckout } from './PublicCartCheckout';
import { CatalogCategoryTabs } from './CatalogCategoryTabs';
import { PublicOfferCard } from './PublicOfferCard';
import { formatProductPrice, isProductPubliclyVisible } from '../../../utils/products';
import {
  buildCatalogCategoryTabs,
  filterCatalogByCategory
} from '../../../utils/catalogCategories';

export function PublicStorefront({
  catalogWorkspace,
  workspaceName,
  hideTitle = false,
  hideIntro = false,
  preview = false,
  publicMode = false,
  onOpenItem
}) {
  const ctx = useWorkspace();
  const workspace = catalogWorkspace || ctx.workspace;
  const website = workspace.website || {};
  const products = workspace.products || [];
  const cart = usePublicCart();
  const [panel, setPanel] = useState('shop');
  const categoryId = cart.browse?.buy?.categoryId || 'all';
  const query = cart.browse?.buy?.query || '';
  const sortOrder = cart.browse?.buy?.sortOrder || 'featured';
  const setCategoryId = (value) => cart.updateBrowse('buy', { categoryId: value });
  const setQuery = (value) => cart.updateBrowse('buy', { query: value });
  const cartOpen = panel === 'cart';
  const studioNav = typeof onOpenItem === 'function';

  const catalog = useMemo(
    () => products.filter((product) => isProductPubliclyVisible(product)),
    [products]
  );
  const categoryTabs = useMemo(() => buildCatalogCategoryTabs(catalog), [catalog]);
  const filteredCatalog = useMemo(
    () => sortPublicCatalog(searchPublicCatalog(filterCatalogByCategory(catalog, categoryId), query), sortOrder),
    [catalog, categoryId, query, sortOrder]
  );

  const openDetail = (productId) => {
    if (studioNav) {
      onOpenItem(productId);
      return;
    }
    if (preview) return;
    navigate(publicItemPath(workspace.slug, 'buy', productId));
  };

  const closeCart = () => setPanel('shop');
  const toggleCart = () => setPanel(cartOpen ? 'shop' : 'cart');

  const introBody =
    String(website.buySubtext || '').trim() ||
    'Order products from this business.';

  const cartButton = (
    <Button action="cart" variant="secondary"
      type="button"
      className={`bb-public-catalog-cart${cartOpen ? ' is-open' : ''}`}
      onClick={toggleCart}
      aria-expanded={cartOpen}
      aria-controls="bb-public-catalog-cart-panel"
    >
      <ShoppingBag size={15} />
      <span>Cart</span>
      <span className="bb-public-catalog-cart-count">{cart.count}</span>
    </Button>
  );

  const categoryTabsEl = (
    <CatalogCategoryTabs
      options={categoryTabs}
      value={categoryId}
      onChange={setCategoryId}
      ariaLabel="Product categories"
    />
  );

  const renderCard = (product) => {
    const price = formatProductPrice(product);

    return (
      <PublicOfferCard key={product.id} item={product} price={price}
        onOpen={() => openDetail(product.id)}
      />
    );
  };

  const productGrid = (
    <div className="bb-public-product-grid">
      {filteredCatalog.map((product) => renderCard(product))}
      {catalog.length === 0 ? (
        <p className="bb-muted m-0" role="status">{website.catalogAvailability === 'country-required'
          ? 'Choose your shopping country above to see the products available to you.'
          : website.catalogAvailability === 'country-disabled' ? 'Products are not available in your selected country.'
          : website.buyerCountryCode ? 'No products are currently available in this country.' : 'No products published yet.'}</p>
      ) : filteredCatalog.length === 0 ? (
        <p className="bb-muted m-0">No products match your search and category.</p>
      ) : null}
    </div>
  );

  const cartCheckout = (
    <PublicCartCheckout
      catalogWorkspace={workspace}
      workspaceName={workspaceName || workspace.brandName}
      publicMode={publicMode}
      lockedPreview={preview}
      onBack={closeCart}
    />
  );

  return (
    <section
      className={`bb-public-buy-section bb-public-gutter bb-public-catalog-desk${
        cartOpen ? ' is-cart-open' : ''
      }${preview && !studioNav ? ' pointer-events-none' : ''}`}
    >
      <div className="bb-public-measure-wide bb-public-catalog-shell">
        <div className="bb-public-catalog-layout">
          <aside className="bb-public-catalog-side">{categoryTabsEl}</aside>

          <div className="bb-public-catalog-main">
            {!hideIntro && <header className="bb-public-catalog-intro">
              <div className="bb-public-catalog-intro-copy">
                {!hideTitle && <h2 className="bb-public-catalog-intro-title">Our Products</h2>}
                <p className="bb-public-catalog-intro-body">{introBody}</p>
              </div>

            </header>}

            <div className="bb-profile-catalog-toolbar">
              <label className="bb-profile-catalog-search">Search products<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or category" /></label>
              <div className="bb-profile-catalog-category">{categoryTabsEl}</div>
              <label className="bb-profile-catalog-sort">Sort by<select value={sortOrder} onChange={e => cart.updateBrowse('buy', { sortOrder: e.target.value })}>
                <option value="featured">Featured</option><option value="name">Name A–Z</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option>
              </select></label>
              <div className="bb-profile-catalog-cart">{cartButton}</div>
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
