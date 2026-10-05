import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import { Check, DollarSign, Hourglass } from 'lucide-react';
import { getLocationPath, navigate, workspacePagePath } from '../../../app/routing';
import { parseDateKey, toDateKey } from '../../../utils/dates';
import {
  getPeriodRange,
  isDateKeyInPeriod,
  PERIOD_OPTIONS
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

export function BookingRequestsDesk({ heading = null }) {
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
  const [actionError, setActionError] = useState('');
  const runBookingAction = async (action) => { setActionError(''); try { await action(); } catch (error) { setActionError(error.message || 'The booking was not changed. Please try again.'); } };
  const [period, setPeriod] = useState('week');
  const [day, setDay] = useState(() => toDateKey(new Date()));
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [customPickerOpen, setCustomPickerOpen] = useState(false);
  const [sortBy, setSortBy] = useState('latest');
  const locationPath = typeof window === 'undefined' ? '' : getLocationPath();
  const focusParams = new URLSearchParams(locationPath.split('?')[1] || '');
  const focusedId = focusParams.get('booking') || '';
  const focusedBooking = bookings.find(booking => String(booking.id) === focusedId);
  const focusedDate = focusedBooking ? bookingDateKey(focusedBooking) : '';
  const appliedFocus = useRef('');
  useEffect(() => {
    if (!focusedBooking) { if (!focusedId) appliedFocus.current = ''; return; }
    const key = `${focusedId}|${focusedDate}`;
    if (appliedFocus.current === key) return;
    appliedFocus.current = key;
    const date = parseDateKey(focusedDate);
    setFilter('all');
    setPeriod(date && toDateKey(date) === focusedDate ? 'day' : 'all');
    if (date && toDateKey(date) === focusedDate) setDay(focusedDate);
  }, [focusedId, focusedDate, Boolean(focusedBooking)]);
  const todayKey = toDateKey(new Date());
  const periodRange = useMemo(
    () => getPeriodRange(day, period, customRange),
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
        .filter((booking) => period === 'all' || isDateKeyInPeriod(bookingDateKey(booking), periodRange))
        .slice()
        .sort((a, b) => compareBookings(a, b, sortBy)),
    [bookings, filter, period, periodRange, sortBy, todayKey]
  );

  useEffect(() => {
    if (!focusedId || !rows.some(booking => String(booking.id) === focusedId) || typeof document === 'undefined') return undefined;
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(`request-booking-${focusedId}`);
      target?.scrollIntoView({ block: 'nearest' });
      target?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [focusedId, rows.length, period, filter, day]);

  const clearFocus = () => {
    focusParams.delete('booking');
    const queryString = focusParams.toString();
    navigate(locationPath.split('?')[0] + (queryString ? `?${queryString}` : ''), { replace: true });
  };

  const openChat = (booking) => {
    const thread = startThreadFromBooking(booking);
    if (thread?.id) setSupportFocusThread(thread.id);
    navigate(workspacePagePath('communications'));
  };

  const serviceFor = (booking) =>
    services.find((service) => service.id === booking.serviceId) || null;

  return (
    <section className="bb-ops-desk">
      {actionError && <p role="alert" className="bb-reschedule-error">{actionError}</p>}
      <div className="bb-page-chrome">
        {heading}
        <div className="bb-ops-toolbar" aria-label="Booking request period">
          <PeriodSegmentedControl
            variant="period"
            ariaLabel="Booking request period"
            value={period}
            onChange={setPeriod}
            options={PERIOD_OPTIONS}
            onCustomSelect={() => setCustomPickerOpen(true)}
          />

        </div>

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

        <div className="bb-ops-list-sort">
          <SortField
            value={sortBy}
            onChange={setSortBy}
            options={SORT_OPTIONS}
            pickerTitle="Sort requests"
            pickerHint="Order booking requests in the selected period."
          />
        </div>
      </div>

      {focusedBooking ? <div className="bb-ops-booking-focus" role="status"><span>Selected booking · <strong>{focusedBooking.clientName || 'Client'}</strong></span><Button action="clear" variant="secondary" onClick={clearFocus}>Clear selection</Button></div> : null}
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
              <article key={booking.id} id={`request-booking-${booking.id}`} tabIndex={booking.id === focusedId ? -1 : undefined} aria-label={`Booking for ${booking.clientName || 'client'}`} className={`bb-ops-row${booking.id === focusedId ? ' is-focused-booking' : ''}`}>
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
                    runBookingAction(() => assignBookingStaff(booking.id, member));
                  }}
                />

                <div className="bb-ops-actions">
                  <OpsChatAction onClick={() => openChat(booking)} />
                  <OpsAction action="markPaid" variant={booking.paymentStatus === 'paid' ? 'positive' : 'secondary'} disabled={booking.paymentStatus === 'paid'} onClick={() => runBookingAction(() => markPaid(booking.id))}>
                    <DollarSign size={13} strokeWidth={2.4} />
                    {booking.paymentStatus === 'paid' ? 'Paid' : 'Mark paid'}
                  </OpsAction>
                  {!closed && status !== 'waitlist' ? (
                    <OpsAction action="waitlist" onClick={() => runBookingAction(() => waitlistBooking(booking.id))}>
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
                      <OpsAction action="accept"
                        variant="positive"
                        ariaLabel="Approve"
                        onClick={() => runBookingAction(() => confirmBooking(booking.id))}
                      >
                        <Check size={15} strokeWidth={2.75} />
                        Accept
                      </OpsAction>
                      <OpsDeclineAction onClick={() => runBookingAction(() => declineBooking(booking.id))} />
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
