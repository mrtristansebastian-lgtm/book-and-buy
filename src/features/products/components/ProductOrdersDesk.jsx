import { useMemo, useState } from 'react';
import { Check, DollarSign, PackageCheck, Truck } from 'lucide-react';
import { navigate } from '../../../app/routing';
import { formatCents } from '../../../utils/products';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { setSupportFocusThread } from '../../support/utils/supportFormat';
import {
  OpsAction,
  OpsAvatar,
  OpsChatAction,
  OpsDeclineAction,
  OpsDeskTabs,
  OpsStatusBadge
} from '../../ops-desk/components/OpsDeskPrimitives';

const STATUS_LABELS = {
  pending: 'New',
  accepted: 'Accepted',
  shipped: 'Shipped',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled'
};

function matchesFilter(order, filter) {
  const status = order.status || 'pending';
  switch (filter) {
    case 'new':
      return status === 'pending';
    case 'accepted':
      return status === 'accepted';
    case 'shipped':
      return status === 'shipped';
    case 'fulfilled':
      return status === 'fulfilled';
    case 'cancelled':
      return status === 'cancelled';
    case 'all':
      return true;
    default:
      return true;
  }
}

function formatPlacedAt(timestamp) {
  const date = new Date(Number(timestamp) || Date.now());
  if (Number.isNaN(date.getTime())) return { time: '—', day: '—' };
  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'short' });
  const day = date.getDate();
  const month = date.toLocaleDateString('en-GB', { month: 'short' });
  return { time, day: `${weekday}, ${day} ${month}` };
}

export function ProductOrdersDesk() {
  const {
    orders,
    acceptOrder,
    shipOrder,
    fulfilOrder,
    cancelOrder,
    markOrderPaid,
    startThreadFromOrder
  } = useWorkspace();
  const [filter, setFilter] = useState('new');

  const counts = useMemo(() => {
    const next = {
      new: 0,
      accepted: 0,
      shipped: 0,
      fulfilled: 0,
      cancelled: 0,
      all: orders.length
    };
    for (const order of orders) {
      const status = order.status || 'pending';
      if (status === 'pending') next.new += 1;
      else if (status === 'accepted') next.accepted += 1;
      else if (status === 'shipped') next.shipped += 1;
      else if (status === 'fulfilled') next.fulfilled += 1;
      else if (status === 'cancelled') next.cancelled += 1;
    }
    return next;
  }, [orders]);

  const rows = useMemo(
    () =>
      orders
        .filter((order) => matchesFilter(order, filter))
        .slice()
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)),
    [orders, filter]
  );

  const openChat = (order) => {
    const thread = startThreadFromOrder(order);
    if (thread?.id) setSupportFocusThread(thread.id);
    navigate('/dashboard/communications');
  };

  return (
    <section className="bb-ops-desk">
      <OpsDeskTabs
        ariaLabel="Product order filters"
        value={filter}
        onChange={setFilter}
        options={[
          { id: 'new', label: 'New', count: counts.new },
          { id: 'accepted', label: 'Accepted', count: counts.accepted },
          { id: 'shipped', label: 'Shipped', count: counts.shipped },
          { id: 'fulfilled', label: 'Fulfilled', count: counts.fulfilled },
          { id: 'cancelled', label: 'Cancelled', count: counts.cancelled },
          { id: 'all', label: 'All', count: counts.all }
        ]}
      />

      <div className="bb-ops-rows">
        {rows.length === 0 ? (
          <div className="bb-ops-empty">No product orders in this view.</div>
        ) : (
          rows.map((order) => {
            const status = order.status || 'pending';
            const itemsLabel = (order.items || [])
              .map((item) => `${item.quantity}× ${item.name}`)
              .join(', ');
            const meta = [
              itemsLabel,
              formatCents(order.amountInCents, order.currency),
              order.paymentMethod ? String(order.paymentMethod).replace(/_/g, ' ') : ''
            ]
              .filter(Boolean)
              .join(', ');
            const placed = formatPlacedAt(order.timestamp);
            const closed = status === 'cancelled' || status === 'fulfilled';

            return (
              <article key={order.id} className="bb-ops-row">
                <div className="bb-ops-person">
                  <OpsAvatar name={order.clientName} />
                  <div className="bb-ops-person-copy">
                    <div className="bb-ops-person-top">
                      <h3 className="bb-ops-person-name">{order.clientName}</h3>
                      <OpsStatusBadge
                        status={status === 'pending' ? 'new' : status}
                        label={STATUS_LABELS[status] || status}
                      />
                    </div>
                    <p className="bb-ops-meta">{meta}</p>
                  </div>
                </div>

                <div className="bb-ops-when">
                  <p className="bb-ops-when-primary">{placed.time}</p>
                  <p className="bb-ops-when-secondary">{placed.day}</p>
                </div>

                <div className="bb-ops-assign">
                  <p className="bb-ops-assign-label">Payment</p>
                  <div className="bb-ops-assign-control">
                    <select
                      value={order.paymentStatus === 'paid' ? 'paid' : 'unpaid'}
                      onChange={(event) => {
                        if (event.target.value === 'paid') markOrderPaid(order.id);
                      }}
                      aria-label="Payment status"
                    >
                      <option value="unpaid">
                        {order.paymentStatus === 'manual_pending' ? 'Awaiting EFT' : 'Unpaid'}
                      </option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                </div>

                <div className="bb-ops-actions">
                  <OpsChatAction onClick={() => openChat(order)} />
                  {order.paymentStatus !== 'paid' ? (
                    <OpsAction onClick={() => markOrderPaid(order.id)}>
                      <DollarSign size={13} strokeWidth={2.4} />
                      Mark paid
                    </OpsAction>
                  ) : (
                    <span className="bb-ops-action is-ghost-slot" aria-hidden="true">
                      Mark paid
                    </span>
                  )}
                  {status === 'pending' ? (
                    <div className="bb-ops-action-cluster">
                      <OpsAction tone="primary" onClick={() => acceptOrder(order.id)}>
                        <Check size={14} strokeWidth={2.6} />
                        Accept
                      </OpsAction>
                      <OpsDeclineAction label="Cancel order" onClick={() => cancelOrder(order.id)} />
                    </div>
                  ) : null}
                  {status === 'accepted' ? (
                    <div className="bb-ops-action-cluster">
                      <OpsAction tone="primary" onClick={() => shipOrder(order.id)}>
                        <Truck size={13} strokeWidth={2.2} />
                        Ship
                      </OpsAction>
                      <OpsDeclineAction label="Cancel order" onClick={() => cancelOrder(order.id)} />
                    </div>
                  ) : null}
                  {status === 'shipped' ? (
                    <div className="bb-ops-action-cluster">
                      <OpsAction tone="primary" onClick={() => fulfilOrder(order.id)}>
                        <PackageCheck size={13} strokeWidth={2.2} />
                        Fulfilled
                      </OpsAction>
                      <OpsDeclineAction label="Cancel order" onClick={() => cancelOrder(order.id)} />
                    </div>
                  ) : null}
                  {!closed && !['pending', 'accepted', 'shipped'].includes(status) ? (
                    <OpsDeclineAction label="Cancel order" onClick={() => cancelOrder(order.id)} />
                  ) : null}
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
