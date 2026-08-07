import { useMemo, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { navigate, publicItemPath } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { usePublicCart } from '../../storefront/PublicCartContext';
import { PublicCartCheckout } from '../../storefront/components/PublicCartCheckout';
import { CatalogCategoryTabs } from '../../storefront/components/CatalogCategoryTabs';
import { formatServiceCardMeta, formatServicePrice, getServiceOpenSpots } from '../../../utils/services';
import { getServiceScheduleType } from '../../../utils/scheduleTypes';
import {
  buildCatalogCategoryTabs,
  filterCatalogByCategory,
  getCatalogCategory
} from '../../../utils/catalogCategories';

/**
 * Public Book catalog — trading cards matching Buy, shared cart with slot checkout.
 */
export function PublicBookingFlow({
  catalogWorkspace,
  workspaceName,
  hideTitle = false,
  preview = false,
  publicMode = false
}) {
  const ctx = useWorkspace();
  const workspace = catalogWorkspace || ctx.workspace;
  const bookings = workspace.bookings || [];
  const cart = usePublicCart();
  const [panel, setPanel] = useState('shop');
  const [categoryId, setCategoryId] = useState('all');

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
    if (preview) return;
    navigate(publicItemPath(workspace.slug, 'book', serviceId));
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
          ariaLabel="Service categories"
        />
      ) : null}
      {cartButton}
    </div>
  );

  return (
    <section
      className={`bb-public-buy-section ${hideTitle ? '' : 'bb-public-gutter'} ${
        preview ? 'pointer-events-none' : ''
      }`}
    >
      <div className={`${hideTitle ? '' : 'bb-public-measure-wide'} grid gap-6`}>
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
            {visibleServices.map((item) => {
              const category = getCatalogCategory(item, 'Service');
              const imageSrc = item.imageUrls?.[0] || item.image || '';
              const price = formatServicePrice(item);
              const cardMeta = formatServiceCardMeta(item);
              const isSpot = getServiceScheduleType(item) === 'class_session';
              const spotsLeft = isSpot ? getServiceOpenSpots(item, bookings) : null;
              const inCart = cart.items.some((row) => row.lineKey === `service:${item.id}`);
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
                      {category ? (
                        <span className="bb-public-product-sticker">{category}</span>
                      ) : null}
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
                    <div className="bb-public-product-body">
                      <h2>{item.name}</h2>
                      {item.description ? (
                        <p className="bb-public-product-desc">{item.description}</p>
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
                    disabled={inCart}
                    onClick={() => {
                      cart.addService(item);
                      setPanel('cart');
                    }}
                  >
                    <ShoppingBag size={12} strokeWidth={2.4} />
                    <span>{inCart ? 'In cart' : 'Add to cart'}</span>
                  </button>
                </article>
              );
            })}
            {activeServices.length === 0 ? (
              <p className="bb-muted m-0">No bookable services published yet.</p>
            ) : visibleServices.length === 0 ? (
              <p className="bb-muted m-0">No services in this category.</p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
