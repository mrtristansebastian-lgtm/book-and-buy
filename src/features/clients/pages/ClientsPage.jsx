import { useMemo, useState } from 'react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { formatDisplayDate } from '../../../utils/dates';

export function ClientsPage() {
  const { clients, bookings, orders } = useWorkspace();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(clients[0]?.id || '');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return clients.filter((client) => {
      if (!needle) return true;
      return [client.name, client.email, client.phone, client.country]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [clients, query]);

  const selected = filtered.find((client) => client.id === selectedId) || filtered[0] || null;

  const history = useMemo(() => {
    if (!selected) return { bookings: [], orders: [] };
    const email = String(selected.email || '').toLowerCase();
    const name = String(selected.name || '').toLowerCase();
    return {
      bookings: bookings.filter(
        (booking) =>
          String(booking.clientEmail || '').toLowerCase() === email ||
          String(booking.clientName || '').toLowerCase() === name
      ),
      orders: orders.filter(
        (order) =>
          String(order.clientEmail || '').toLowerCase() === email ||
          String(order.clientName || '').toLowerCase() === name
      )
    };
  }, [selected, bookings, orders]);

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="bb-page-title text-3xl m-0">Clients</h1>
          <p className="bb-muted m-0">Directory with booking and order history.</p>
        </div>
        <input
          className="native-control-input px-4 min-w-[240px]"
          placeholder="Search clients"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </header>

      <section className="grid gap-3 lg:grid-cols-[300px_1fr]">
        <aside className="bb-panel overflow-hidden">
          {filtered.map((client) => (
            <button
              key={client.id}
              type="button"
              className={`w-full text-left px-4 py-3 border-0 border-b border-black/5 grid gap-0.5 ${
                selected?.id === client.id ? 'bg-black/[0.03]' : 'bg-transparent'
              }`}
              onClick={() => setSelectedId(client.id)}
            >
              <strong className="text-sm">{client.name}</strong>
              <span className="bb-muted text-xs truncate">{client.email}</span>
            </button>
          ))}
        </aside>

        {selected ? (
          <div className="bb-panel p-5 grid gap-5 content-start">
            <div className="grid gap-1">
              <h2 className="bb-page-title text-2xl m-0">{selected.name}</h2>
              <p className="bb-muted m-0 text-sm">
                {[selected.email, selected.phone, selected.country].filter(Boolean).join(' · ')}
              </p>
            </div>

            <div className="grid gap-2">
              <h3 className="bb-page-title text-lg m-0">Bookings</h3>
              {history.bookings.length === 0 ? (
                <p className="bb-muted m-0 text-sm">No bookings.</p>
              ) : (
                history.bookings.map((booking) => (
                  <div key={booking.id} className="rounded-xl border border-black/8 px-3 py-2 text-sm">
                    {booking.serviceName} · {formatDisplayDate(booking.dateKey || booking.date)} ·{' '}
                    {booking.time} · {booking.status}
                  </div>
                ))
              )}
            </div>

            <div className="grid gap-2">
              <h3 className="bb-page-title text-lg m-0">Orders</h3>
              {history.orders.length === 0 ? (
                <p className="bb-muted m-0 text-sm">No orders.</p>
              ) : (
                history.orders.map((order) => (
                  <div key={order.id} className="rounded-xl border border-black/8 px-3 py-2 text-sm">
                    {(order.items || []).map((item) => item.name).join(', ')} · {order.status}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="bb-panel p-8 bb-muted">No clients match.</div>
        )}
      </section>
    </div>
  );
}
