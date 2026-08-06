import { useMemo, useState } from 'react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { formatDisplayDate } from '../../../utils/dates';
import { PeriodSegmentedControl } from '../../../shared/ui/PeriodSegmentedControl';

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
    markPaid
  } = useWorkspace();
  const [filter, setFilter] = useState('pending');
  const [query, setQuery] = useState('');

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
              <div className="flex flex-wrap gap-2">
                {booking.status !== 'confirmed' ? (
                  <button type="button" className="bb-primary-btn" onClick={() => confirmBooking(booking.id)}>
                    Confirm
                  </button>
                ) : null}
                {booking.status === 'pending' ? (
                  <button type="button" className="bb-ghost-btn" onClick={() => waitlistBooking(booking.id)}>
                    Waitlist
                  </button>
                ) : null}
                {booking.paymentStatus !== 'paid' ? (
                  <button type="button" className="bb-ghost-btn" onClick={() => markPaid(booking.id)}>
                    Mark paid
                  </button>
                ) : null}
                {!['declined', 'cancelled'].includes(booking.status) ? (
                  <button type="button" className="bb-ghost-btn" onClick={() => declineBooking(booking.id)}>
                    Decline
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
