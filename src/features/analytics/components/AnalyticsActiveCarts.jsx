import { CreditCard, ShoppingBag } from 'lucide-react';
import { formatLiveRelativeTime, formatMoney } from '../utils/analyticsMetrics';

function itemSummary(items = []) {
  const visible = items.slice(0, 2).map((item) => {
    const quantity = Number(item.quantity) || 1;
    return `${item.name}${quantity > 1 ? ` ×${quantity}` : ''}`;
  });
  const remaining = Math.max(0, items.length - visible.length);
  return `${visible.join(', ')}${remaining ? ` +${remaining} more` : ''}`;
}

export function AnalyticsActiveCarts({
  carts = [],
  currency = 'R',
  now = Date.now(),
  total = carts.length
}) {
  return (
    <section className="bb-live-column bb-live-column--buying" aria-labelledby="bb-live-carts-title">
      <header className="bb-live-column-head">
        <div>
          <p className="bb-live-column-kicker">Commerce</p>
          <h2 id="bb-live-carts-title" className="bb-live-column-title">
            Buying now
          </h2>
        </div>
        <span className="bb-live-column-count">
          {total} {total === 1 ? 'cart' : 'carts'}
        </span>
      </header>
      {carts.length === 0 ? (
        <div className="bb-live-empty">
          <ShoppingBag size={18} aria-hidden="true" />
          <div>
            <p>No active carts right now</p>
            <span>Carts touched in the last 30 minutes will appear here.</span>
          </div>
        </div>
      ) : (
        <div className="bb-live-cart-list">
          {carts.map((cart) => (
            <article
              key={cart.id}
              className={`bb-live-cart-row${cart.status === 'checkout' ? ' is-checkout' : ''}`}
            >
              <div className="bb-live-cart-copy">
                <div className="bb-live-cart-state">
                  {cart.status === 'checkout' ? (
                    <CreditCard size={13} aria-hidden="true" />
                  ) : (
                    <ShoppingBag size={13} aria-hidden="true" />
                  )}
                  <span>{cart.status === 'checkout' ? 'Checking out' : 'Cart active'}</span>
                </div>
                <p className="bb-live-cart-items">{itemSummary(cart.items)}</p>
                <p className="bb-live-cart-meta">
                  {cart.itemCount} item{cart.itemCount === 1 ? '' : 's'}
                  <span aria-hidden="true">·</span>
                  <time dateTime={new Date(cart.updatedAt).toISOString()}>
                    {formatLiveRelativeTime(cart.updatedAt, now)}
                  </time>
                </p>
              </div>
              <p className="bb-live-cart-value">{formatMoney(cart.valueCents, currency)}</p>
            </article>
          ))}
          {total > carts.length ? (
            <p className="bb-live-more-row">
              +{total - carts.length} more active {total - carts.length === 1 ? 'cart' : 'carts'}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
