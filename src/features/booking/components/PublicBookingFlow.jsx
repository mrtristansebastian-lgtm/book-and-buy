import { useMemo, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { navigate, publicItemPath } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { usePublicCart } from '../../storefront/PublicCartContext';
import { PublicCartCheckout } from '../../storefront/components/PublicCartCheckout';
import { CatalogCategoryTabs } from '../../storefront/components/CatalogCategoryTabs';
import { PublicServiceSlotSheet } from './PublicServiceSlotSheet';
import { formatServiceCardMeta, formatServicePrice, getServiceOpenSpots, serviceHasVariants } from '../../../utils/services';
import { getServiceScheduleType } from '../../../utils/scheduleTypes';
import {
  buildCatalogCategoryTabs,
  filterCatalogByCategory
} from '../../../utils/catalogCategories';

/**
 * Public Book catalog — trading cards matching Buy, shared cart with slot checkout.
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
  const bookings = workspace.bookings || [];
  const cart = usePublicCart();
  const [panel, setPanel] = useState('shop');
  const [categoryId, setCategoryId] = useState('all');
  const [slotService, setSlotService] = useState(null);
  const cartOpen = panel === 'cart';
  const studioNav = typeof onOpenItem === 'function';

  const activeServices = useMemo(
    () => (workspace.services || []).filter((service) => service.active !== false),
    [workspace.services]
  );
  const categoryTabs = useMemo(
    () => buildCatalogCategoryTabs(activeServices),
    [activeServices]
  );
  const visibleServices = useMemo(
    () => filterCatalogByCategory(activeServices, categoryId),
    [activeServices, categoryId]
  );

  const openDetail = (serviceId) => {
    if (studioNav) {
      onOpenItem(serviceId);
      return;
    }
    if (preview) return;
    navigate(publicItemPath(workspace.slug, 'book', serviceId));
  };

  const openCart = () => setPanel('cart');
  const closeCart = () => setPanel('shop');
  const toggleCart = () => setPanel(cartOpen ? 'shop' : 'cart');

  const requestAddService = (item) => {
    if (preview) return;
    const isSpot = getServiceScheduleType(item) === 'class_session';
    if (isSpot && !serviceHasVariants(item)) {
      if (cart.addService(item)) openCart();
      return;
    }
    setSlotService(item);
  };

  const introBody =
    String(website.bookSubtext || '').trim() ||
    'Choose a service and request a time.';

  const cartButton = (
    <button
      type="button"
      className={`bb-public-catalog-cart${cartOpen ? ' is-open' : ''}`}
      onClick={toggleCart}
      aria-expanded={cartOpen}
      aria-controls="bb-public-catalog-cart-panel-book"
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
      ariaLabel="Service categories"
    />
  );

  const serviceGrid = (
    <div className="bb-public-product-grid">
      {visibleServices.map((item) => {
        const imageSrc = item.imageUrls?.[0] || item.image || '';
        const price = formatServicePrice(item);
        const cardMeta = formatServiceCardMeta(item);
        const isSpot = getServiceScheduleType(item) === 'class_session';
        const spotsLeft = isSpot ? getServiceOpenSpots(item, bookings) : null;
        const inCart = cart.items.some((row) => row.serviceId === item.id);
        return (
          <article
            key={item.id}
            className={`bb-public-product-card${inCart ? ' is-in-cart' : ''}`}
          >
            <button
              type="button"
              className="bb-public-product-surface"
              onClick={() => openDetail(item.id)}
              aria-label={`View ${item.name}`}
            >
              <div className="bb-public-product-media">
                {imageSrc ? <img src={imageSrc} alt="" /> : null}
                {cardMeta || spotsLeft != null ? (
                  <div className="bb-public-product-sticker-stack">
                    {cardMeta ? (
                      <span className="bb-public-product-sticker bb-public-product-sticker--ink">
                        {cardMeta}
                      </span>
                    ) : null}
                    {spotsLeft != null ? (
                      <span className="bb-public-product-sticker bb-public-product-sticker--spots">
                        <strong>{spotsLeft}</strong>
                        <span>{spotsLeft === 1 ? 'spot left' : 'spots left'}</span>
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="bb-public-product-price-row">
                <h2 className="bb-public-product-name">{item.name}</h2>
                <p className="bb-public-product-price">{price || '—'}</p>
              </div>
            </button>
            <div className="bb-public-product-actions">
              <button
                type="button"
                className="bb-public-product-cart-btn"
                disabled={inCart}
                onClick={() => requestAddService(item)}
              >
                <ShoppingBag size={12} strokeWidth={2.4} />
                <span>{inCart ? 'In cart' : 'Add'}</span>
              </button>
              <button
                type="button"
                className="bb-public-product-more-btn"
                onClick={() => openDetail(item.id)}
              >
                View more
              </button>
            </div>
          </article>
        );
      })}
      {activeServices.length === 0 ? (
        <p className="bb-muted m-0">No bookable services published yet.</p>
      ) : visibleServices.length === 0 ? (
        <p className="bb-muted m-0">No services in this category.</p>
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
      }${preview && !studioNav ? ' pointer-events-none' : ''}`}
    >
      <div className="bb-public-measure-wide bb-public-catalog-shell">
        <div className="bb-public-catalog-layout">
          <aside className="bb-public-catalog-side">{categoryTabsEl}</aside>

          <div className="bb-public-catalog-main">
            <header className="bb-public-catalog-intro">
              <div className="bb-public-catalog-intro-copy">
                <h1 className="bb-public-catalog-intro-title">Our Services</h1>
                <p className="bb-public-catalog-intro-body">{introBody}</p>
              </div>
              <div className="bb-public-catalog-intro-actions">{cartButton}</div>
            </header>

            <div className="bb-public-catalog-mobile-tools">
              {categoryTabsEl}
              {cartButton}
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

      <PublicServiceSlotSheet
        open={Boolean(slotService)}
        service={slotService}
        workspace={workspace}
        bookings={bookings}
        confirmLabel="Add to cart"
        onClose={() => setSlotService(null)}
        onConfirm={(slot) => {
          if (!slotService) return;
          const added = cart.addService(
            slotService,
            slot,
            slot?.variant || null
          );
          setSlotService(null);
          if (added) openCart();
        }}
      />
    </section>
  );
}
