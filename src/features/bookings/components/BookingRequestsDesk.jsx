import { useMemo, useState } from 'react';
import { navigate } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { formatDisplayDate } from '../../../utils/dates';
import { PeriodSegmentedControl } from '../../../shared/ui/PeriodSegmentedControl';
import { setSupportFocusThread } from '../../support/utils/supportFormat';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'waitlist', label: 'Waitlist' }
];

export function BookingRequestsDesk() {
  const {
    bookings,
    confirmBooking,
    declineBooking,
    waitlistBooking,
    markPaid,
    startThreadFromBooking
  } = useWorkspace();
  const [filter, setFilter] = useState('pending');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return bookings
      .filter((booking) => (filter === 'all' ? true : booking.status === filter))
      .filter((booking) => {
        if (!needle) return true;
        return [booking.clientName, booking.serviceName, booking.clientEmail]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
      });
  }, [bookings, filter, query]);

  const selected = bookings.find((booking) => booking.id === selectedId) || null;

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodSegmentedControl
          ariaLabel="Request filter"
          value={filter}
          onChange={setFilter}
          options={FILTERS.map((item) => ({
            ...item,
            count:
              item.id === 'all'
                ? bookings.length
                : bookings.filter((booking) => booking.status === item.id).length
          }))}
        />
        <input
          className="native-control-input px-4 min-w-[220px]"
          placeholder="Search client or service"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="grid gap-3">
        {rows.length === 0 ? (
          <div className="bb-panel p-6 bb-muted">No booking requests in this view.</div>
        ) : (
          rows.map((booking) => (
            <article key={booking.id} className="bb-panel p-4 md:p-5 grid gap-3">
              <button
                type="button"
                className="bg-transparent border-0 p-0 text-left grid gap-1"
                onClick={() => setSelectedId(booking.id)}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <h3 className="bb-page-title text-xl m-0">{booking.clientName}</h3>
                    <p className="m-0 text-sm font-semibold">{booking.serviceName}</p>
                    <p className="bb-muted m-0 text-sm">
                      {formatDisplayDate(booking.dateKey || booking.date)} · {booking.time}
                      {booking.staffName ? ` · ${booking.staffName}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-right">
                    <span className="text-xs font-bold uppercase tracking-wide">{booking.status}</span>
                    <span className="bb-muted text-xs">{booking.paymentStatus || 'unpaid'}</span>
                  </div>
                </div>
              </button>
              <div className="flex flex-wrap gap-2">
                {booking.status !== 'confirmed' ? (
                  <button
                    type="button"
                    className="bb-primary-btn"
                    onClick={() => confirmBooking(booking.id)}
                  >
                    Confirm
                  </button>
                ) : null}
                {booking.status === 'pending' ? (
                  <button
                    type="button"
                    className="bb-ghost-btn"
                    onClick={() => waitlistBooking(booking.id)}
                  >
                    Waitlist
                  </button>
                ) : null}
                {booking.paymentStatus !== 'paid' ? (
                  <button type="button" className="bb-ghost-btn" onClick={() => markPaid(booking.id)}>
                    Mark paid
                  </button>
                ) : null}
                <button type="button" className="bb-ghost-btn" onClick={() => setSelectedId(booking.id)}>
                  Details
                </button>
                {!['declined', 'cancelled'].includes(booking.status) ? (
                  <button
                    type="button"
                    className="bb-ghost-btn"
                    onClick={() => declineBooking(booking.id)}
                  >
                    Decline
                  </button>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>

      {selected ? (
        <div className="fixed inset-0 z-40 bg-black/30 grid place-items-end md:place-items-center p-4">
          <div className="bb-panel w-full max-w-lg p-5 grid gap-4 max-h-[90vh] overflow-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="grid gap-1">
                <h2 className="bb-page-title text-2xl m-0">{selected.clientName}</h2>
                <p className="bb-muted m-0 text-sm">{selected.serviceName}</p>
              </div>
              <button type="button" className="bb-ghost-btn" onClick={() => setSelectedId(null)}>
                Close
              </button>
            </div>
            <dl className="grid gap-2 text-sm m-0">
              <div className="flex justify-between gap-3">
                <dt className="bb-muted">When</dt>
                <dd className="m-0 font-semibold">
                  {formatDisplayDate(selected.dateKey || selected.date)} · {selected.time}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="bb-muted">Status</dt>
                <dd className="m-0 font-semibold">{selected.status}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="bb-muted">Payment</dt>
                <dd className="m-0 font-semibold">{selected.paymentStatus || 'unpaid'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="bb-muted">Email</dt>
                <dd className="m-0 font-semibold">{selected.clientEmail || '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="bb-muted">Phone</dt>
                <dd className="m-0 font-semibold">{selected.clientPhone || '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="bb-muted">Staff</dt>
                <dd className="m-0 font-semibold">{selected.staffName || 'Unassigned'}</dd>
              </div>
              {selected.clientNote ? (
                <div className="grid gap-1">
                  <dt className="bb-muted">Note</dt>
                  <dd className="m-0">{selected.clientNote}</dd>
                </div>
              ) : null}
            </dl>
            <div className="flex flex-wrap gap-2">
              {selected.status !== 'confirmed' ? (
                <button
                  type="button"
                  className="bb-primary-btn"
                  onClick={() => confirmBooking(selected.id)}
                >
                  Confirm
                </button>
              ) : null}
              {selected.paymentStatus !== 'paid' ? (
                <button type="button" className="bb-ghost-btn" onClick={() => markPaid(selected.id)}>
                  Mark paid
                </button>
              ) : null}
              <button
                type="button"
                className="bb-ghost-btn"
                onClick={() => {
                  const thread = startThreadFromBooking(selected);
                  if (thread?.id) setSupportFocusThread(thread.id);
                  navigate('/dashboard/communications');
                }}
              >
                Open thread
              </button>
              <button
                type="button"
                className="bb-ghost-btn"
                onClick={() => navigate('/dashboard/staff')}
              >
                View on Schedule
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
