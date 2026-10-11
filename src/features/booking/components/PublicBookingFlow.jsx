import { searchPublicCatalog, sortPublicCatalog } from '../../website/profileModel';
import { Button } from '../../../shared/ui/Button';
import { useMemo, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { navigate, publicItemPath } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { usePublicCart } from '../../storefront/PublicCartContext';
import { PublicCartCheckout } from '../../storefront/components/PublicCartCheckout';
import { CatalogCategoryTabs } from '../../storefront/components/CatalogCategoryTabs';
import { PublicOfferCard } from '../../storefront/components/PublicOfferCard';
import { formatServiceCardMeta, formatServicePrice, getServiceOpenSpots } from '../../../utils/services';
import { getServiceScheduleType } from '../../../utils/scheduleTypes';
import { serviceNeedsTimingConversation } from '../../../../functions/serviceTiming';
import { isRetiredEventService } from '../../../../functions/serviceTemplates';
import {
  buildCatalogCategoryTabs,
  filterCatalogByCategory
} from '../../../utils/catalogCategories';

/**
 * Public Book catalog — browse services, open details, and review the shared cart.
 */
export function PublicBookingFlow({
  catalogWorkspace,
  workspaceName,
  hideTitle: _hideTitle = false,
  preview = false,
  publicMode = false,
  onOpenItem
}) {
  const ctx = useWorkspace();
  const workspace = catalogWorkspace || ctx.workspace;
  const website = workspace.website || {};
  const hasBookingRecords = Array.isArray(workspace.bookings);
  const bookings = workspace.bookings || [];
  const cart = usePublicCart();
  const [panel, setPanel] = useState('shop');
  const categoryId = cart.browse?.book?.categoryId || 'all';
  const query = cart.browse?.book?.query || '';
  const sortOrder = cart.browse?.book?.sortOrder || 'featured';
  const setCategoryId = (value) => cart.updateBrowse('book', { categoryId: value });
  const setQuery = (value) => cart.updateBrowse('book', { query: value });
  const cartOpen = panel === 'cart';
  const studioNav = typeof onOpenItem === 'function';

  const activeServices = useMemo(
    () => (workspace.services || []).filter((service) => service.active !== false && !isRetiredEventService(service)),
    [workspace.services]
  );
  const categoryTabs = useMemo(
    () => buildCatalogCategoryTabs(activeServices),
    [activeServices]
  );
  const visibleServices = useMemo(
    () => sortPublicCatalog(searchPublicCatalog(filterCatalogByCategory(activeServices, categoryId), query), sortOrder),
    [activeServices, categoryId, query, sortOrder]
  );

  const openDetail = (serviceId) => {
    if (studioNav) {
      onOpenItem(serviceId);
      return;
    }
    if (preview) return;
    navigate(publicItemPath(workspace.slug, 'book', serviceId));
  };

  const closeCart = () => setPanel('shop');
  const toggleCart = () => setPanel(cartOpen ? 'shop' : 'cart');

  const introBody =
    String(website.bookSubtext || '').trim() ||
    'Choose a service and request a time.';

  const cartButton = (
    <Button action="cart" variant="secondary"
      type="button"
      className={`bb-public-catalog-cart${cartOpen ? ' is-open' : ''}`}
      onClick={toggleCart}
      aria-expanded={cartOpen}
      aria-controls="bb-public-catalog-cart-panel-book"
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
      ariaLabel="Service categories"
    />
  );

  const serviceGrid = (
    <div className="bb-public-product-grid">
      {visibleServices.map((item) => {
        const price = formatServicePrice(item);
        const cardMeta = formatServiceCardMeta(item);
        const isSpot = getServiceScheduleType(item) === 'class_session' && !serviceNeedsTimingConversation(item);
        const spotCount = isSpot
          ? hasBookingRecords ? getServiceOpenSpots(item, bookings) : Math.max(1, Number(item.capacity) || 1)
          : null;
        const availability = isSpot
          ? `${spotCount} spot${spotCount === 1 ? '' : 's'} ${hasBookingRecords ? 'left' : 'per session'}`
          : '';
        const inCart = cart.items.some((row) => row.serviceId === item.id);
        return (
          <PublicOfferCard
            key={item.id}
            item={item}
            kind="book"
            price={price}
            meta={cardMeta}
            availability={availability}
            className={inCart ? 'is-in-cart' : ''}
            onOpen={() => openDetail(item.id)}
          />
        );
      })}
      {activeServices.length === 0 ? (
        <p className="bb-muted m-0" role="status">{website.catalogAvailability === 'country-required'
          ? 'Choose your shopping country above to see the services available to you.'
          : website.catalogAvailability === 'country-disabled' ? 'Services are not available in your selected country.'
          : website.buyerCountryCode ? 'No services are currently available in this country.' : 'No bookable services published yet.'}</p>
      ) : visibleServices.length === 0 ? (
        <p className="bb-muted m-0">No services match your search and category.</p>
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
            <header className="bb-public-catalog-intro">
              <div className="bb-public-catalog-intro-copy">
                <h2 className="bb-public-catalog-intro-title">Our Services</h2>
                <p className="bb-public-catalog-intro-body">{introBody}</p>
              </div>

            </header>

            <div className="bb-profile-catalog-toolbar">
              <label className="bb-profile-catalog-search">Search services<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or category" /></label>
              <div className="bb-profile-catalog-category">{categoryTabsEl}</div>
              <label className="bb-profile-catalog-sort">Sort by<select value={sortOrder} onChange={e => cart.updateBrowse('book', { sortOrder: e.target.value })}>
                <option value="featured">Featured</option><option value="name">Name A–Z</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option>
              </select></label>
              <div className="bb-profile-catalog-cart">{cartButton}</div>
            </div>

            <div className="bb-public-catalog-mobile-panel">
              {cartOpen ? cartCheckout : serviceGrid}
            </div>

            <div className="bb-public-catalog-desk-grid">{serviceGrid}</div>
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
              id="bb-public-catalog-cart-panel-book"
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
