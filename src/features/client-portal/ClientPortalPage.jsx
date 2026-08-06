import { useMemo, useState } from 'react';
import { APP_NAME } from '../../config/appConfig';
import { navigate } from '../../app/routing';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { formatDisplayDate } from '../../utils/dates';
import { formatCents } from '../../utils/products';

export function ClientPortalPage() {
  const { bookings, orders } = useWorkspace();
  const [email, setEmail] = useState('');
  const [lookup, setLookup] = useState('');

  const matches = useMemo(() => {
    const needle = lookup.trim().toLowerCase();
    if (!needle) return { bookings: [], orders: [] };
    return {
      bookings: bookings.filter(
        (booking) => String(booking.clientEmail || '').toLowerCase() === needle
      ),
      orders: orders.filter((order) => String(order.clientEmail || '').toLowerCase() === needle)
    };
  }, [bookings, orders, lookup]);

  return (
    <div className="bb-shell native-ui min-h-screen flex justify-center px-5 py-10">
      <div className="w-full max-w-xl grid gap-6 content-start">
        <header className="grid gap-2">
          <button
            type="button"
            className="bb-brand-mark text-2xl bg-transparent border-0 p-0 justify-self-start cursor-pointer"
            onClick={() => navigate('/')}
          >
            {APP_NAME}
          </button>
          <h1 className="bb-page-title text-3xl m-0">Client portal</h1>
          <p className="bb-muted m-0">Look up your booking requests and product orders by email.</p>
        </header>

        <form
          className="bb-panel p-5 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setLookup(email);
          }}
        >
          <input
            className="native-control-input px-4"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button type="submit" className="bb-primary-btn justify-self-start">
            Find my activity
          </button>
        </form>

        {lookup ? (
          <section className="grid gap-4">
            <div className="grid gap-2">
              <h2 className="bb-page-title text-xl m-0">Bookings</h2>
              {matches.bookings.length === 0 ? (
                <p className="bb-muted m-0 text-sm">No bookings for this email.</p>
              ) : (
                matches.bookings.map((booking) => (
                  <article key={booking.id} className="bb-panel p-4 text-sm grid gap-1">
                    <strong>{booking.serviceName}</strong>
                    <span>
                      {formatDisplayDate(booking.dateKey || booking.date)} · {booking.time}
                    </span>
                    <span className="bb-muted">
                      {booking.status} · {booking.paymentStatus}
                    </span>
                  </article>
                ))
              )}
            </div>
            <div className="grid gap-2">
              <h2 className="bb-page-title text-xl m-0">Orders</h2>
              {matches.orders.length === 0 ? (
                <p className="bb-muted m-0 text-sm">No orders for this email.</p>
              ) : (
                matches.orders.map((order) => (
                  <article key={order.id} className="bb-panel p-4 text-sm grid gap-1">
                    <strong>
                      {(order.items || []).map((item) => `${item.quantity}× ${item.name}`).join(', ')}
                    </strong>
                    <span>{formatCents(order.amountInCents, order.currency)}</span>
                    <span className="bb-muted">
                      {order.status} · {order.paymentStatus}
                    </span>
                  </article>
                ))
              )}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
