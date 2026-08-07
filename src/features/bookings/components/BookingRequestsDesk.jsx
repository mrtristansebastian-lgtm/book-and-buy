import { useMemo, useState } from 'react';
import { Check, DollarSign, Hourglass } from 'lucide-react';
import { navigate } from '../../../app/routing';
import { toDateKey } from '../../../utils/dates';
import { formatServiceDuration, formatServicePrice } from '../../../utils/services';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { setSupportFocusThread } from '../../support/utils/supportFormat';
import {
  OpsAction,
  OpsAssignSelect,
  OpsAvatar,
  OpsChatAction,
  OpsDeclineAction,
  OpsDeskTabs,
  OpsStatusBadge,
  formatOpsDayLabel
} from '../../ops-desk/components/OpsDeskPrimitives';

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  waitlist: 'Waitlisted',
  declined: 'Declined',
  cancelled: 'Cancelled'
};

function isPastBooking(booking, todayKey) {
  const key = booking.dateKey || booking.date || '';
  if (!key) return false;
  return key < todayKey;
}

function matchesFilter(booking, filter, todayKey) {
  const status = booking.status || 'pending';
  const past = isPastBooking(booking, todayKey);
  const closed = ['declined', 'cancelled'].includes(status);

  switch (filter) {
    case 'upcoming':
      return !past && !closed;
    case 'review':
      return status === 'pending' && !past;
    case 'confirmed':
      return status === 'confirmed';
    case 'waitlist':
      return status === 'waitlist';
    case 'history':
      return past || closed;
    case 'all':
      return true;
    default:
      return true;
  }
}

export function BookingRequestsDesk() {
  const {
    bookings,
    services,
    staff,
    confirmBooking,
    declineBooking,
    waitlistBooking,
    markPaid,
    assignBookingStaff,
    startThreadFromBooking
  } = useWorkspace();
  const [filter, setFilter] = useState('upcoming');
  const todayKey = toDateKey(new Date());

  const counts = useMemo(() => {
    const next = {
      upcoming: 0,
      review: 0,
      confirmed: 0,
      waitlist: 0,
      history: 0,
      all: bookings.length
    };
    for (const booking of bookings) {
      if (matchesFilter(booking, 'upcoming', todayKey)) next.upcoming += 1;
      if (matchesFilter(booking, 'review', todayKey)) next.review += 1;
      if (matchesFilter(booking, 'confirmed', todayKey)) next.confirmed += 1;
      if (matchesFilter(booking, 'waitlist', todayKey)) next.waitlist += 1;
      if (matchesFilter(booking, 'history', todayKey)) next.history += 1;
    }
    return next;
  }, [bookings, todayKey]);

  const rows = useMemo(
    () =>
      bookings
        .filter((booking) => matchesFilter(booking, filter, todayKey))
        .slice()
        .sort((a, b) => {
          const dateA = `${a.dateKey || a.date || ''} ${a.time || ''}`;
          const dateB = `${b.dateKey || b.date || ''} ${b.time || ''}`;
          return dateA.localeCompare(dateB);
        }),
    [bookings, filter, todayKey]
  );

  const openChat = (booking) => {
    const thread = startThreadFromBooking(booking);
    if (thread?.id) setSupportFocusThread(thread.id);
    navigate('/dashboard/communications');
  };

  const serviceFor = (booking) =>
    services.find((service) => service.id === booking.serviceId) || null;

  return (
    <section className="bb-ops-desk">
      <OpsDeskTabs
        ariaLabel="Booking request filters"
        value={filter}
        onChange={setFilter}
        options={[
          { id: 'upcoming', label: 'Upcoming', count: counts.upcoming },
          { id: 'review', label: 'Review', count: counts.review },
          { id: 'confirmed', label: 'Confirmed', count: counts.confirmed },
          { id: 'waitlist', label: 'Waitlist', count: counts.waitlist },
          { id: 'history', label: 'History', count: counts.history },
          { id: 'all', label: 'All', count: counts.all }
        ]}
      />

      <div className="bb-ops-rows">
        {rows.length === 0 ? (
          <div className="bb-ops-empty">No booking requests in this view.</div>
        ) : (
          rows.map((booking) => {
            const service = serviceFor(booking);
            const meta = [
              booking.serviceName,
              service ? formatServicePrice(service) : '',
              service ? formatServiceDuration(service.duration) : ''
            ]
              .filter(Boolean)
              .join(', ');
            const status = booking.status || 'pending';
            const closed = ['declined', 'cancelled'].includes(status);
            const needsApprove = status === 'pending';

            return (
              <article key={booking.id} className="bb-ops-row">
                <div className="bb-ops-person">
                  <OpsAvatar name={booking.clientName} />
                  <div className="bb-ops-person-copy">
                    <div className="bb-ops-person-top">
                      <h3 className="bb-ops-person-name">{booking.clientName}</h3>
                      <OpsStatusBadge status={status} label={STATUS_LABELS[status] || status} />
                    </div>
                    <p className="bb-ops-meta">{meta}</p>
                  </div>
                </div>

                <div className="bb-ops-when">
                  <p className="bb-ops-when-primary">{booking.time || '—'}</p>
                  <p className="bb-ops-when-secondary">
                    {formatOpsDayLabel(booking.dateKey || booking.date)}
                  </p>
                </div>

                <OpsAssignSelect
                  value={booking.staffId || ''}
                  options={staff}
                  hint="Staff assigned to this booking"
                  onChange={(staffId) => {
                    const member = staff.find((item) => item.id === staffId) || null;
                    assignBookingStaff(booking.id, member);
                  }}
                />

                <div className="bb-ops-actions">
                  <OpsChatAction onClick={() => openChat(booking)} />
                  <OpsAction onClick={() => markPaid(booking.id)}>
                    <DollarSign size={13} strokeWidth={2.4} />
                    Mark paid
                  </OpsAction>
                  {!closed && status !== 'waitlist' ? (
                    <OpsAction onClick={() => waitlistBooking(booking.id)}>
                      <Hourglass size={13} strokeWidth={2.2} />
                      Waitlist
                    </OpsAction>
                  ) : (
                    <span className="bb-ops-action is-ghost-slot" aria-hidden="true">
                      Waitlist
                    </span>
                  )}
                  {needsApprove ? (
                    <div className="bb-ops-action-cluster">
                      <OpsAction tone="primary" onClick={() => confirmBooking(booking.id)}>
                        <Check size={14} strokeWidth={2.6} />
                        Approve
                      </OpsAction>
                      <OpsDeclineAction onClick={() => declineBooking(booking.id)} />
                    </div>
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
