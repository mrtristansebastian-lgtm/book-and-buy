import { useMemo, useState } from 'react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { PeriodSegmentedControl } from '../../../shared/ui/PeriodSegmentedControl';
import { formatCents } from '../../../utils/products';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'fulfilled', label: 'Fulfilled' },
  { id: 'cancelled', label: 'Cancelled' }
];

export function ProductOrdersDesk() {
  const { orders, fulfilOrder, cancelOrder, markOrderPaid } = useWorkspace();
  const [filter, setFilter] = useState('pending');
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders
      .filter((order) => (filter === 'all' ? true : order.status === filter))
      .filter((order) => {
        if (!needle) return true;
        return [order.clientName, order.clientEmail, ...(order.items || []).map((item) => item.name)]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
      });
  }, [orders, filter, query]);

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodSegmentedControl
          ariaLabel="Order filter"
          value={filter}
          onChange={setFilter}
          options={FILTERS.map((item) => ({
            ...item,
            count:
              item.id === 'all'
                ? orders.length
                : orders.filter((order) => order.status === item.id).length
          }))}
        />
        <input
          className="native-control-input px-4 min-w-[220px]"
          placeholder="Search client or product"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="grid gap-3">
        {rows.length === 0 ? (
          <div className="bb-panel p-6 bb-muted">No product orders in this view.</div>
        ) : (
          rows.map((order) => (
            <article key={order.id} className="bb-panel p-4 md:p-5 grid gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-1">
                  <h3 className="bb-page-title text-xl m-0">{order.clientName}</h3>
                  <p className="m-0 text-sm font-semibold">
                    {(order.items || [])
                      .map((item) => `${item.quantity}× ${item.name}`)
                      .join(', ')}
                  </p>
                  <p className="bb-muted m-0 text-sm">
                    {formatCents(order.amountInCents, order.currency)} · {order.paymentMethod}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 text-right">
                  <span className="text-xs font-bold uppercase tracking-wide">{order.status}</span>
                  <span className="bb-muted text-xs">{order.paymentStatus}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {order.status === 'pending' ? (
                  <button type="button" className="bb-primary-btn" onClick={() => fulfilOrder(order.id)}>
                    Mark fulfilled
                  </button>
                ) : null}
                {order.paymentStatus !== 'paid' ? (
                  <button type="button" className="bb-ghost-btn" onClick={() => markOrderPaid(order.id)}>
                    Mark paid
                  </button>
                ) : null}
                {order.status !== 'cancelled' ? (
                  <button type="button" className="bb-ghost-btn" onClick={() => cancelOrder(order.id)}>
                    Cancel
                  </button>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
