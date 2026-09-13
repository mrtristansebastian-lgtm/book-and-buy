import { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, DollarSign, Hourglass } from 'lucide-react';
import { navigate } from '../../../app/routing';
import { toDateKey } from '../../../utils/dates';
import {
  formatPeriodLabel,
  getPeriodRange,
  isDateKeyInPeriod,
  PERIOD_OPTIONS,
  shiftPeriod
} from '../../../utils/periodFilters';
import { formatServiceDuration, formatServicePrice } from '../../../utils/services';
import { PeriodCustomPicker } from '../../../shared/ui/PeriodCustomPicker';
import { PeriodSegmentedControl } from '../../../shared/ui/PeriodSegmentedControl';
import { SortField } from '../../../shared/ui/SortField';
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

const SORT_OPTIONS = [
  { id: 'latest', label: 'Latest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'client', label: 'Client A-Z' },
  { id: 'service', label: 'Service A-Z' }
];

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

function bookingDateKey(booking) {
  return String(booking?.dateKey || booking?.date || '').trim();
}

function compareBookings(a, b, sortBy) {
  const dateA = `${bookingDateKey(a)} ${a.time || ''}`;
  const dateB = `${bookingDateKey(b)} ${b.time || ''}`;
  const chronoCompare = dateA.localeCompare(dateB);

  if (sortBy === 'latest') return -chronoCompare || String(b.id || '').localeCompare(String(a.id || ''));
  if (sortBy === 'client') {
    return (
      String(a.clientName || '').localeCompare(String(b.clientName || ''), undefined, {
        sensitivity: 'base'
      }) || chronoCompare
    );
  }
  if (sortBy === 'service') {
    return (
      String(a.serviceName || '').localeCompare(String(b.serviceName || ''), undefined, {
        sensitivity: 'base'
      }) || chronoCompare
    );
  }

  return chronoCompare;
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
  const [period, setPeriod] = useState('week');
  const [day, setDay] = useState(() => toDateKey(new Date()));
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [customPickerOpen, setCustomPickerOpen] = useState(false);
  const [sortBy, setSortBy] = useState('latest');
  const todayKey = toDateKey(new Date());
  const periodRange = useMemo(
    () => getPeriodRange(day, period, customRange),
    [day, period, customRange]
  );
  const periodLabel = useMemo(
    () => formatPeriodLabel(day, period, customRange),
    [day, period, customRange]
  );

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
        .filter((booking) => isDateKeyInPeriod(bookingDateKey(booking), periodRange))
        .slice()
        .sort((a, b) => compareBookings(a, b, sortBy)),
    [bookings, filter, periodRange, sortBy, todayKey]
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

      <div className="bb-ops-toolbar" aria-label="Booking request period and sort">
        <PeriodSegmentedControl
          variant="period"
          ariaLabel="Booking request period"
          value={period}
          onChange={setPeriod}
          options={PERIOD_OPTIONS}
          onCustomSelect={() => setCustomPickerOpen(true)}
        />

        <div className="bb-ops-toolbar-tools">
          <SortField
            value={sortBy}
            onChange={setSortBy}
            options={SORT_OPTIONS}
            pickerTitle="Sort requests"
            pickerHint="Order booking requests in the selected period."
          />

          <div className="bb-schedule-day-nav">
            <button
              type="button"
              className="bb-ghost-btn px-3"
              onClick={() => setDay(shiftPeriod(day, period, -1))}
              aria-label="Previous period"
              disabled={period === 'all' || period === 'custom'}
            >
              <ChevronLeft size={18} />
            </button>
            <div className="bb-schedule-day-label">{periodLabel}</div>
            <button
              type="button"
              className="bb-ghost-btn px-3"
              onClick={() => setDay(shiftPeriod(day, period, 1))}
              aria-label="Next period"
              disabled={period === 'all' || period === 'custom'}
            >
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              className="bb-ink-btn"
              onClick={() => {
                setDay(toDateKey(new Date()));
                setPeriod('day');
              }}
            >
              Today
            </button>
          </div>
        </div>
      </div>

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
                  <strong className="bb-ops-when-primary">{booking.time || '—'}</strong>
                  <span className="bb-ops-when-secondary">
                    {formatOpsDayLabel(booking.dateKey || booking.date)}
                  </span>
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
                      <OpsAction
                        tone="primary"
                        ariaLabel="Approve"
                        onClick={() => confirmBooking(booking.id)}
                      >
                        <Check size={15} strokeWidth={2.75} />
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

      <PeriodCustomPicker
        open={customPickerOpen}
        from={customRange.from || day}
        to={customRange.to || customRange.from || day}
        onClose={() => setCustomPickerOpen(false)}
        onApply={({ from, to }) => {
          setCustomRange({ from, to });
          setDay(from);
          setPeriod('custom');
          setCustomPickerOpen(false);
        }}
      />
    </section>
  );
}
