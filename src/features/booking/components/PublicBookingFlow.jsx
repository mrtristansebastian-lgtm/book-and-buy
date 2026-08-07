import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { usePublicCart } from '../../storefront/PublicCartContext';
import { PublicCartCheckout } from '../../storefront/components/PublicCartCheckout';
import { formatServiceDuration, formatServicePrice } from '../../../utils/services';
import { getScheduleTypeMeta } from '../../../utils/scheduleTypes';

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
  const cart = usePublicCart();
  const [panel, setPanel] = useState('shop');
  const activeServices = (workspace.services || []).filter(
    (service) => service.active !== false
  );

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
      className={`bb-public-buy-section ${hideTitle ? '' : 'bb-public-gutter'} ${
        preview ? 'pointer-events-none' : ''
      }`}
    >
      <div className={`${hideTitle ? '' : 'bb-public-measure-wide'} grid gap-6`}>
        {hideTitle ? (
          <div className="flex justify-end">{cartButton}</div>
        ) : (
          <header className="bb-public-buy-header">
            <div className="bb-public-catalog-intro">
              <h1 className="bb-public-catalog-title">Book</h1>
              <p className="bb-public-lede m-0">
                Add a service to your cart, then pick a date and time at checkout.
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
            {activeServices.map((item) => {
              const meta = getScheduleTypeMeta(item.scheduleType);
              const imageSrc = item.imageUrls?.[0] || item.image || '';
              const price = formatServicePrice(item);
              const duration = formatServiceDuration(item.duration);
              const inCart = cart.items.some((row) => row.lineKey === `service:${item.id}`);
              return (
                <article
                  key={item.id}
                  className={`bb-public-product-card${inCart ? ' is-in-cart' : ''}`}
                >
                  <div className="bb-public-product-surface">
                    <div className="bb-public-product-media">
                      {imageSrc ? <img src={imageSrc} alt="" /> : null}
                    </div>
                    <div className="bb-public-product-body">
                      <p className="bb-public-service-meta">{meta.singular}</p>
                      <h2>{item.name}</h2>
                      {item.description ? (
                        <p className="bb-public-product-desc">{item.description}</p>
                      ) : null}
                    </div>
                    <div
                      className={`bb-public-product-stats${duration ? ' has-duration' : ''}`}
                    >
                      <div className="bb-public-product-stat">
                        <span className="bb-public-product-stat-label">Price</span>
                        <span className="bb-public-product-stat-value">{price || '—'}</span>
                      </div>
                      {duration ? (
                        <div className="bb-public-product-stat">
                          <span className="bb-public-product-stat-label">Duration</span>
                          <span className="bb-public-product-stat-value">{duration}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="bb-public-product-cart-btn"
                    disabled={inCart}
                    onClick={() => {
                      cart.addService(item);
                      setPanel('cart');
                    }}
                  >
                    <ShoppingBag size={15} strokeWidth={2.35} />
                    <span>{inCart ? 'In cart' : 'Add to cart'}</span>
                  </button>
                </article>
              );
            })}
            {activeServices.length === 0 ? (
              <p className="bb-muted m-0">No bookable services published yet.</p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
