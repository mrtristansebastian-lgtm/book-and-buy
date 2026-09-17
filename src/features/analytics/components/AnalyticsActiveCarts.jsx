import { formatMoney } from '../utils/analyticsMetrics';

function relativeTime(at, now = Date.now()) {
  const diff = Math.max(0, now - Number(at || 0));
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function AnalyticsActiveCarts({ carts = [], currency = 'R' }) {
  return (
    <section className="bb-analytics-panel" aria-label="Active carts">
      <header className="bb-analytics-panel-head">
        <h2 className="bb-analytics-panel-title">Active carts</h2>
        <p className="bb-analytics-panel-lede">Value, items, and last activity</p>
      </header>
      {carts.length === 0 ? (
        <p className="bb-analytics-empty">No active carts right now.</p>
      ) : (
        <div className="bb-analytics-carts">
          {carts.map((cart) => (
            <article key={cart.id} className="bb-analytics-cart-row">
              <div>
                <p className="bb-analytics-cart-value">
                  {formatMoney(cart.valueCents, currency)}
                </p>
                <p className="bb-analytics-cart-meta">
                  {cart.itemCount} item{cart.itemCount === 1 ? '' : 's'} · {cart.status} ·{' '}
                  {relativeTime(cart.updatedAt)}
                </p>
              </div>
              <ul className="bb-analytics-cart-items">
                {(cart.items || []).slice(0, 3).map((item) => (
                  <li key={item.lineKey || item.name}>
                    {item.name}
                    {item.quantity > 1 ? ` ×${item.quantity}` : ''}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
