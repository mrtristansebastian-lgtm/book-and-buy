import { X } from 'lucide-react';
import { navigate } from '../../../app/routing';
import { formatCents } from '../../../utils/products';
import { clientInitials, formatRelativeTime } from '../utils/supportFormat';

export function ClientFileDrawer({
  open,
  onClose,
  client,
  bookings = [],
  orders = [],
  presenceLabel
}) {
  if (!open || !client) return null;

  return (
    <>
      <button
        type="button"
        className="bb-support-drawer-backdrop border-0 p-0"
        aria-label="Close client file"
        onClick={onClose}
      />
      <aside className="bb-support-drawer support-client-info-panel" aria-label="Client file">
        <div className="bb-support-drawer-head">
          <div className="flex items-center gap-3 min-w-0">
            <span className="bb-support-avatar" aria-hidden="true">
              {clientInitials(client.name)}
            </span>
            <div className="min-w-0">
              <h2 className="bb-page-title text-xl m-0 truncate">{client.name}</h2>
              <p className="support-presence-label bb-muted m-0 text-xs">{presenceLabel}</p>
            </div>
          </div>
          <button type="button" className="bb-ghost-btn px-3 py-2" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="bb-support-drawer-body">
          <section className="bb-support-drawer-section">
            <h3>Contact</h3>
            <p className="m-0 text-sm font-semibold">{client.email || 'No email'}</p>
            <p className="bb-muted m-0 text-sm">{client.phone || 'No phone'}</p>
            <p className="bb-muted m-0 text-sm">{client.country || '—'}</p>
          </section>

          <section className="bb-support-drawer-section">
            <h3>Bookings</h3>
            {bookings.length === 0 ? (
              <p className="bb-muted m-0 text-sm">No bookings for this client.</p>
            ) : (
              bookings.slice(0, 5).map((booking) => (
                <div key={booking.id} className="bb-support-history-card">
                  <strong className="text-sm">{booking.serviceName}</strong>
                  <span className="bb-muted text-xs">
                    {booking.dateKey || booking.date} · {booking.time} · {booking.status}
                  </span>
                </div>
              ))
            )}
          </section>

          <section className="bb-support-drawer-section">
            <h3>Orders</h3>
            {orders.length === 0 ? (
              <p className="bb-muted m-0 text-sm">No product orders for this client.</p>
            ) : (
              orders.slice(0, 5).map((order) => (
                <div key={order.id} className="bb-support-history-card">
                  <strong className="text-sm">
                    {(order.items || []).map((item) => item.name).join(', ') || 'Order'}
                  </strong>
                  <span className="bb-muted text-xs">
                    {formatCents(order.amountInCents, order.currency)} · {order.status} ·{' '}
                    {formatRelativeTime(order.timestamp)}
                  </span>
                </div>
              ))
            )}
          </section>

          <button
            type="button"
            className="bb-primary-btn justify-self-start"
            onClick={() => {
              onClose();
              navigate('/dashboard/clients');
            }}
          >
            Open full client file
          </button>
        </div>
      </aside>
    </>
  );
}
