import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Info, Pencil, X } from 'lucide-react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { SortField } from '../../../shared/ui/SortField';
import {
  buildMonthGrid,
  formatDisplayDate,
  parseDateKey,
  toDateKey
} from '../../../utils/dates';
import {
  formatPeriodLabel,
  getPeriodRange,
  PERIOD_OPTIONS,
  shiftPeriod
} from '../../../utils/periodFilters';
import {
  countServiceSpotBookings,
  getServiceOpenSpots,
  getSpotSessionStatus
} from '../../../utils/services';
import { getServiceScheduleType } from '../../../utils/scheduleTypes';
import { getScheduleDayTimeline } from '../../../utils/staffAvailability';
import { formatTimeValue, parseTimeValue } from '../../../utils/time';
import { DayTimelineMeter } from '../components/DayTimelineMeter';

const ACTIVE = new Set(['pending', 'confirmed', 'waitlist']);
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SORT_OPTIONS = [
  { id: 'latest', label: 'Latest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'client', label: 'Client A-Z' },
  { id: 'service', label: 'Service A-Z' }
];

const SPOT_SORT_OPTIONS = [
  { id: 'latest', label: 'Latest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'service', label: 'Name A-Z' }
];

function statusLabel(status) {
  if (status === 'upcoming') return 'Upcoming';
  if (status === 'live') return 'Live';
  if (status === 'ended') return 'Ended';
  return 'Draft';
}

function formatSessionPart(dateKey, time) {
  if (!dateKey && !time) return '—';
  const datePart = dateKey ? formatDisplayDate(dateKey) : '';
  const timePart = String(time || '').trim();
  if (datePart && timePart) return `${datePart} · ${timePart}`;
  return datePart || timePart || '—';
}

function formatBookingWindow(booking) {
  const start = String(booking?.time || '').trim();
  if (!start) return '—';
  const minutes = Number(booking?.durationMinutes) || 0;
  if (!minutes) return start;
  const parts = parseTimeValue(start, start);
  const total = parts.hour * 60 + parts.minute + minutes;
  const endHour = Math.floor(total / 60) % 24;
  const endMinute = total % 60;
  return `${start}–${formatTimeValue(endHour, endMinute)}`;
}

function bookingDateKey(booking) {
  return String(booking?.dateKey || booking?.date || '').trim();
}

function resolveStaffNames(service, staffList = []) {
  const ids = Array.isArray(service?.staffIds) ? service.staffIds : [];
  if (!ids.length) return [];
  return ids
    .map((id) => staffList.find((member) => member.id === id)?.name)
    .filter(Boolean);
}

function compareAgendaBookings(a, b, sort = 'oldest') {
  const dateCompare = bookingDateKey(a).localeCompare(bookingDateKey(b));
  const timeCompare = String(a.time || '').localeCompare(String(b.time || ''));
  const chronoCompare = dateCompare || timeCompare;
  if (sort === 'latest') return -chronoCompare || String(b.id || '').localeCompare(String(a.id || ''));
  if (sort === 'client') {
    const byClient = String(a.clientName || '').localeCompare(String(b.clientName || ''), undefined, {
      sensitivity: 'base'
    });
    return byClient || chronoCompare;
  }
  if (sort === 'service') {
    const byService = String(a.serviceName || '').localeCompare(String(b.serviceName || ''), undefined, {
      sensitivity: 'base'
    });
    return byService || chronoCompare;
  }
  return chronoCompare;
}

function compareSpotServices(a, b, sort = 'oldest') {
  const startCompare = String(a.sessionStartDate || '').localeCompare(String(b.sessionStartDate || ''));
  const timeCompare = String(a.sessionStartTime || '').localeCompare(String(b.sessionStartTime || ''));
  const chronoCompare = startCompare || timeCompare;
  if (sort === 'latest') return -chronoCompare;
  if (sort === 'service') {
    return String(a.name || '').localeCompare(String(b.name || ''), undefined, {
      sensitivity: 'base'
    });
  }
  return chronoCompare;
}

function serviceOverlapsRange(service, startKey, endKey) {
  const sessionStart = String(service?.sessionStartDate || '').trim();
  const sessionEnd = String(service?.sessionEndDate || sessionStart).trim();
  if (!sessionStart) return false;
  return sessionStart <= endKey && sessionEnd >= startKey;
}

function ScheduleDatePicker({ day, onApply, onClose }) {
  const selected = parseDateKey(day) || new Date();
  const [draftDay, setDraftDay] = useState(() => toDateKey(selected));
  const [monthAnchor, setMonthAnchor] = useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1)
  );
  const monthDays = useMemo(() => buildMonthGrid(monthAnchor), [monthAnchor]);
  const todayKey = toDateKey(new Date());

  return (
    <div
      className="bb-services-sheet"
      role="dialog"
      aria-modal="true"
      aria-label="Pick day"
    >
      <div className="bb-services-sheet-backdrop" onClick={onClose} />
      <div className="bb-services-sheet-panel bb-schedule-picker-sheet">
        <header className="bb-services-sheet-head">
          <div>
            <p className="bb-services-sheet-eyebrow">Calendar</p>
            <h2 className="bb-services-sheet-title">Pick day</h2>
            <p className="bb-services-sheet-lede">Jump to a date.</p>
          </div>
          <button type="button" className="bb-ghost-btn bb-services-sheet-close" onClick={onClose}>
            <X size={16} />
          </button>
        </header>

        <div className="bb-services-sheet-body bb-schedule-picker-body">
          <div className="bb-schedule-picker-month-nav">
            <button
              type="button"
              className="bb-ghost-btn px-3"
              aria-label="Previous month"
              onClick={() =>
                setMonthAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
              }
            >
              <ChevronLeft size={18} />
            </button>
            <strong>
              {monthAnchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </strong>
            <button
              type="button"
              className="bb-ghost-btn px-3"
              aria-label="Next month"
              onClick={() =>
                setMonthAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
              }
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="bb-schedule-picker-weekdays" aria-hidden="true">
            {WEEKDAYS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="bb-schedule-picker-grid">
            {monthDays.map((date) => {
              const key = toDateKey(date);
              const inMonth = date.getMonth() === monthAnchor.getMonth();
              const isSelected = key === draftDay;
              const isToday = key === todayKey;
              return (
                <button
                  key={key}
                  type="button"
                  className={`bb-schedule-picker-day${isSelected ? ' is-selected' : ''}${
                    isToday ? ' is-today' : ''
                  }${inMonth ? '' : ' is-outside'}`}
                  onClick={() => setDraftDay(key)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <p className="bb-schedule-picker-summary">{formatDisplayDate(draftDay)}</p>
        </div>

        <footer className="bb-services-sheet-footer">
          <button
            type="button"
            className="bb-ghost-btn"
            onClick={() => {
              const now = toDateKey(new Date());
              setDraftDay(now);
              setMonthAnchor(new Date());
            }}
          >
            Today
          </button>
          <div className="bb-services-sheet-footer-actions">
            <button type="button" className="bb-ghost-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="bb-primary-btn" onClick={() => onApply?.({ day: draftDay })}>
              Apply
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
function SpotInfoSheet({ service, staff, bookings, onClose, onConfirm }) {
  if (!service) return null;

  const capacity = Math.max(1, Number(service.capacity) || 1);
  const booked = countServiceSpotBookings(service, bookings);
  const open = getServiceOpenSpots(service, bookings);
  const status = getSpotSessionStatus(service);
  const staffNames = resolveStaffNames(service, staff);
  const imageSrc = service.imageUrls?.[0] || '';
  const seatBookings = bookings
    .filter((booking) => booking.serviceId === service.id)
    .filter((booking) => ACTIVE.has(String(booking.status || '')))
    .sort((a, b) => String(b.createdAt || 0).localeCompare(String(a.createdAt || 0)));

  return (
    <div
      className="bb-services-sheet"
      role="dialog"
      aria-modal="true"
      aria-label={`${service.name} details`}
    >
      <div className="bb-services-sheet-backdrop" onClick={onClose} />
      <div className="bb-services-sheet-panel bb-schedule-spot-sheet">
        <header className="bb-services-sheet-head">
          <div className="bb-schedule-spot-sheet-head">
            <div className={`bb-schedule-spot-sheet-thumb${imageSrc ? '' : ' is-empty'}`}>
              {imageSrc ? <img src={imageSrc} alt="" /> : null}
            </div>
            <div className="bb-schedule-spot-sheet-copy">
              <p className="bb-services-sheet-eyebrow">Spot programme</p>
              <h2 className="bb-services-sheet-title">{service.name}</h2>
              <span className={`bb-schedule-spot-pill is-${status}`}>{statusLabel(status)}</span>
            </div>
          </div>
          <button type="button" className="bb-ghost-btn bb-services-sheet-close" onClick={onClose}>
            <X size={16} />
          </button>
        </header>

        <div className="bb-services-sheet-body bb-schedule-spot-sheet-body">
          <dl className="bb-schedule-spot-sheet-facts">
            <div>
              <dt>Starts</dt>
              <dd>{formatSessionPart(service.sessionStartDate, service.sessionStartTime)}</dd>
            </div>
            <div>
              <dt>Ends</dt>
              <dd>{formatSessionPart(service.sessionEndDate, service.sessionEndTime)}</dd>
            </div>
            <div>
              <dt>Capacity</dt>
              <dd>
                {booked}/{capacity} booked · {open} open
              </dd>
            </div>
            <div>
              <dt>Staff</dt>
              <dd>{staffNames.length ? staffNames.join(', ') : 'No staff assigned'}</dd>
            </div>
          </dl>

          {String(service.description || '').trim() ? (
            <p className="bb-schedule-spot-sheet-desc">{service.description}</p>
          ) : null}

          <section className="bb-schedule-spot-sheet-seats">
            <h3 className="bb-schedule-spot-sheet-seats-title">Seat bookings</h3>
            {seatBookings.length === 0 ? (
              <p className="bb-schedule-lane-empty">No seat requests yet.</p>
            ) : (
              <div className="bb-schedule-spot-bookings">
                {seatBookings.map((booking) => (
                  <article key={booking.id} className="bb-schedule-booking">
                    <div className="bb-schedule-booking-top">
                      <strong>{booking.clientName || 'Guest'}</strong>
                      <span className="bb-schedule-booking-status">{booking.status}</span>
                    </div>
                    <div className="bb-schedule-booking-client">
                      {booking.clientEmail || booking.clientPhone || 'No contact'}
                    </div>
                    {booking.status === 'pending' ? (
                      <button
                        type="button"
                        className="bb-primary-btn text-sm py-2"
                        onClick={() => onConfirm?.(booking.id)}
                      >
                        Confirm seat
                      </button>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <footer className="bb-services-sheet-footer">
          <span />
          <div className="bb-services-sheet-footer-actions">
            <button type="button" className="bb-primary-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export function SchedulePage() {
  const {
    bookings,
    staff,
    services,
    confirmBooking,
    workspace
  } = useWorkspace();
  const [mode, setMode] = useState('slots');
  const [focusStaffId, setFocusStaffId] = useState('');
  const [day, setDay] = useState(() => toDateKey(new Date()));
  const [period, setPeriod] = useState('day');
  const [sortBy, setSortBy] = useState('latest');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [infoSpotId, setInfoSpotId] = useState('');

  const periodRange = useMemo(() => getPeriodRange(day, period), [day, period]);
  const periodLabel = useMemo(() => formatPeriodLabel(day, period), [day, period]);

  const slotBookings = useMemo(
    () =>
      bookings.filter((booking) => {
        const service = services.find((row) => row.id === booking.serviceId);
        const type = getServiceScheduleType(service || booking);
        return type !== 'class_session';
      }),
    [bookings, services]
  );

  const agendaBookings = useMemo(() => {
    const { start, end } = periodRange;
    return slotBookings
      .filter((booking) => booking.status === 'confirmed')
      .filter((booking) => {
        const key = bookingDateKey(booking);
        return key && key >= start && key <= end;
      })
      .filter((booking) => (focusStaffId ? booking.staffId === focusStaffId : true))
      .sort((a, b) => compareAgendaBookings(a, b, sortBy));
  }, [slotBookings, periodRange, focusStaffId, sortBy]);

  const agendaGroups = useMemo(() => {
    const groupByDate = sortBy === 'oldest' || sortBy === 'latest';
    if (!groupByDate) {
      return [{ dateKey: '', items: agendaBookings }];
    }
    const groups = [];
    const map = new Map();
    for (const booking of agendaBookings) {
      const key = bookingDateKey(booking);
      if (!map.has(key)) {
        const group = { dateKey: key, items: [] };
        map.set(key, group);
        groups.push(group);
      }
      map.get(key).items.push(booking);
    }
    if (sortBy === 'latest') groups.reverse();
    return groups;
  }, [agendaBookings, sortBy]);

  const slotAgendaGroups = useMemo(() => {
    if (period === 'day') {
      return [{ dateKey: day, items: agendaBookings }];
    }
    return agendaGroups;
  }, [period, day, agendaBookings, agendaGroups]);

  const showAgendaMeters =
    period === 'day' ||
    ((period === 'week' || period === 'month' || period === 'all') &&
      (sortBy === 'oldest' || sortBy === 'latest'));

  const allSpotServices = useMemo(
    () =>
      (services || [])
        .filter((service) => getServiceScheduleType(service) === 'class_session')
        .filter((service) => service.active !== false)
        .sort((a, b) =>
          String(a.sessionStartDate || '').localeCompare(String(b.sessionStartDate || ''))
        ),
    [services]
  );

  const spotServices = useMemo(() => {
    let list = allSpotServices.filter((service) =>
      serviceOverlapsRange(service, periodRange.start, periodRange.end)
    );
    if (focusStaffId) {
      list = list.filter((service) =>
        (Array.isArray(service.staffIds) ? service.staffIds : []).includes(focusStaffId)
      );
    }
    return [...list].sort((a, b) => compareSpotServices(a, b, sortBy === 'client' ? 'oldest' : sortBy));
  }, [allSpotServices, periodRange, focusStaffId, sortBy]);

  const spotStats = useMemo(() => {
    let openSeats = 0;
    let filledSeats = 0;
    let liveOrUpcoming = 0;
    for (const service of spotServices) {
      const status = getSpotSessionStatus(service);
      if (status === 'upcoming' || status === 'live') liveOrUpcoming += 1;
      const booked = countServiceSpotBookings(service, bookings);
      const capacity = Math.max(1, Number(service.capacity) || 1);
      filledSeats += Math.min(booked, capacity);
      openSeats += getServiceOpenSpots(service, bookings);
    }
    return {
      programmes: liveOrUpcoming,
      openSeats,
      filledSeats
    };
  }, [spotServices, bookings]);

  const infoSpot = allSpotServices.find((service) => service.id === infoSpotId) || null;

  return (
    <div className="bb-schedule-desk">
      <header className="bb-schedule-desk-header">
        <div className="bb-schedule-desk-copy">
          <p className="bb-schedule-desk-eyebrow">Operations</p>
          <h1 className="bb-schedule-desk-title">Schedule</h1>
          <p className="bb-schedule-desk-lede">
            Agenda and programmes for the period you select.
          </p>
        </div>

        <div className="bb-schedule-desk-tools">
          <div className="bb-schedule-mode" role="tablist" aria-label="Schedule mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'slots'}
              className={`bb-schedule-mode-btn${mode === 'slots' ? ' is-active' : ''}`}
              onClick={() => {
                setMode('slots');
              }}
            >
              Slots
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'spots'}
              className={`bb-schedule-mode-btn${mode === 'spots' ? ' is-active' : ''}`}
              onClick={() => {
                setMode('spots');
                if (sortBy === 'client') setSortBy('oldest');
              }}
            >
              Spots
            </button>
          </div>
        </div>
      </header>

      <section className="bb-schedule-period-filter" aria-label="Period filter">
        <div className="bb-schedule-period" role="tablist" aria-label="Period">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={period === option.id}
              className={`bb-schedule-period-btn${period === option.id ? ' is-active' : ''}`}
              onClick={() => setPeriod(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="bb-schedule-period-filter-tools">
          <SortField
            value={mode === 'spots' && sortBy === 'client' ? 'oldest' : sortBy}
            onChange={setSortBy}
            options={mode === 'slots' ? SORT_OPTIONS : SPOT_SORT_OPTIONS}
            pickerTitle="Sort schedule"
            pickerHint={mode === 'slots' ? 'Order appointments in this period.' : 'Order programmes in this period.'}
          />

          <div className="bb-schedule-day-nav">
            <button
              type="button"
              className="bb-ghost-btn px-3"
              onClick={() => setDay(shiftPeriod(day, period, -1))}
              aria-label="Previous period"
              disabled={period === 'all'}
            >
              <ChevronLeft size={18} />
            </button>
            <div className="bb-schedule-day-label">{periodLabel}</div>
            <button
              type="button"
              className="bb-ghost-btn px-3"
              onClick={() => setDay(shiftPeriod(day, period, 1))}
              aria-label="Next period"
              disabled={period === 'all'}
            >
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              className="bb-ghost-btn bb-schedule-day-edit"
              aria-label="Pick day or period"
              title="Pick day or period"
              onClick={() => setPickerOpen(true)}
            >
              <Pencil size={15} strokeWidth={2.2} />
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
      </section>

      <div className="bb-schedule-stage" key={`${mode}-${period}-${day}`}>
        {mode === 'slots' ? (
          <>
            <div className="bb-schedule-staff-chips" role="tablist" aria-label="Staff filter">
              <button
                type="button"
                role="tab"
                aria-selected={!focusStaffId}
                className={`bb-schedule-staff-chip${!focusStaffId ? ' is-active' : ''}`}
                onClick={() => setFocusStaffId('')}
              >
                All staff
              </button>
              {staff.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  role="tab"
                  aria-selected={focusStaffId === member.id}
                  className={`bb-schedule-staff-chip${
                    focusStaffId === member.id ? ' is-active' : ''
                  }`}
                  onClick={() => setFocusStaffId(member.id)}
                >
                  <span
                    className="bb-schedule-lane-dot"
                    style={{ background: member.color || '#050505' }}
                  />
                  {member.name}
                </button>
              ))}
            </div>

            {agendaBookings.length === 0 && period !== 'day' ? (
              <div className="bb-schedule-empty">
                <p className="bb-schedule-empty-title">No confirmed bookings</p>
                <p className="bb-schedule-empty-copy">
                  {focusStaffId
                    ? 'No confirmed appointments for this staff member in the selected period.'
                    : 'No confirmed appointments in this period. Pending requests stay in Requests until confirmed.'}
                </p>
              </div>
            ) : (
              <section className="bb-schedule-agenda" aria-label="Confirmed appointments">
                {slotAgendaGroups.map((group) => {
                  const meterDateKey = showAgendaMeters ? group.dateKey : '';
                  const timeline = meterDateKey
                    ? getScheduleDayTimeline({
                        staffId: focusStaffId || '',
                        dateKey: meterDateKey,
                        staffAvailability: workspace.staffAvailability || {},
                        availabilityRules: workspace.availabilityRules || {},
                        bookings: agendaBookings
                      })
                    : null;
                  const hasOpen = timeline?.segments?.some((segment) => segment.kind === 'open');
                  const hasBreak = timeline?.segments?.some((segment) => segment.kind === 'break');
                  const hasBooking = timeline?.segments?.some(
                    (segment) => segment.kind === 'booking'
                  );

                  return (
                    <div key={group.dateKey || 'flat'} className="bb-schedule-agenda-group">
                      {group.dateKey && period !== 'day' ? (
                        <h3 className="bb-schedule-agenda-day">
                          {formatDisplayDate(group.dateKey)}
                        </h3>
                      ) : null}
                      {timeline ? (
                        <div className="bb-schedule-agenda-meter">
                          <DayTimelineMeter
                            segments={timeline.segments}
                            status={timeline.status}
                            dayStart={timeline.dayStart}
                            dayEnd={timeline.dayEnd}
                          />
                          {hasOpen || hasBreak || hasBooking ? (
                            <div className="bb-schedule-day-meter-legend" aria-hidden="true">
                              {hasOpen ? (
                                <span className="bb-schedule-day-meter-legend-item is-open">
                                  <i /> Shift
                                </span>
                              ) : null}
                              {hasBreak ? (
                                <span className="bb-schedule-day-meter-legend-item is-break">
                                  <i /> Break
                                </span>
                              ) : null}
                              {hasBooking ? (
                                <span className="bb-schedule-day-meter-legend-item is-booking">
                                  <i /> Booking
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      {group.items.length ? (
                        <div className="bb-schedule-agenda-list">
                          {group.items.map((booking) => {
                            const member = staff.find((row) => row.id === booking.staffId);
                            return (
                              <article key={booking.id} className="bb-schedule-agenda-row">
                                <div className="bb-schedule-agenda-time">
                                  <strong>{formatBookingWindow(booking)}</strong>
                                  {period !== 'day' ||
                                  sortBy === 'client' ||
                                  sortBy === 'service' ? (
                                    <span>{formatDisplayDate(bookingDateKey(booking))}</span>
                                  ) : null}
                                </div>
                                <div className="bb-schedule-agenda-main">
                                  <h4 className="bb-schedule-agenda-client">
                                    {booking.clientName || 'Client'}
                                  </h4>
                                  <p className="bb-schedule-agenda-service">
                                    {booking.serviceName || 'Service'}
                                  </p>
                                  <p className="bb-schedule-agenda-meta">
                                    {member?.name || booking.staffName || 'Unassigned'}
                                    {booking.clientEmail || booking.clientPhone
                                      ? ` · ${booking.clientEmail || booking.clientPhone}`
                                      : ''}
                                  </p>
                                </div>
                                <span className="bb-schedule-agenda-badge">Confirmed</span>
                              </article>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bb-schedule-empty is-compact">
                          <p className="bb-schedule-empty-title">No confirmed bookings</p>
                          <p className="bb-schedule-empty-copy">
                            {focusStaffId
                              ? 'No confirmed appointments for this staff member today.'
                              : 'No confirmed appointments today. Pending requests stay in Requests until confirmed.'}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>
            )}
          </>
        ) : (
          <>
            <div className="bb-schedule-staff-chips" role="tablist" aria-label="Staff filter">
              <button
                type="button"
                role="tab"
                aria-selected={!focusStaffId}
                className={`bb-schedule-staff-chip${!focusStaffId ? ' is-active' : ''}`}
                onClick={() => setFocusStaffId('')}
              >
                All staff
              </button>
              {staff.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  role="tab"
                  aria-selected={focusStaffId === member.id}
                  className={`bb-schedule-staff-chip${
                    focusStaffId === member.id ? ' is-active' : ''
                  }`}
                  onClick={() => setFocusStaffId(member.id)}
                >
                  <span
                    className="bb-schedule-lane-dot"
                    style={{ background: member.color || '#050505' }}
                  />
                  {member.name}
                </button>
              ))}
            </div>

            <div className="bb-schedule-spot-stats">
              <div className="bb-schedule-spot-stat">
                <span className="bb-schedule-spot-stat-label">Active programmes</span>
                <strong className="bb-schedule-spot-stat-value">{spotStats.programmes}</strong>
              </div>
              <div className="bb-schedule-spot-stat">
                <span className="bb-schedule-spot-stat-label">Open seats</span>
                <strong className="bb-schedule-spot-stat-value">{spotStats.openSeats}</strong>
              </div>
              <div className="bb-schedule-spot-stat">
                <span className="bb-schedule-spot-stat-label">Seats filled</span>
                <strong className="bb-schedule-spot-stat-value">{spotStats.filledSeats}</strong>
              </div>
            </div>

            {spotServices.length === 0 ? (
              <div className="bb-schedule-empty">
                <p className="bb-schedule-empty-title">
                  {allSpotServices.length === 0 ? 'No spot programmes yet' : 'Nothing in this period'}
                </p>
                <p className="bb-schedule-empty-copy">
                  {allSpotServices.length === 0
                    ? 'Add a service with type “Book a Spot” to run classes and programmes with fixed dates and capacity.'
                    : focusStaffId
                      ? 'No programmes assigned to this staff member in the selected period.'
                      : 'No programmes overlap this date range. Pick another day, week, or month.'}
                </p>
              </div>
            ) : (
              <div className="bb-schedule-spot-grid">
                {spotServices.map((service) => {
                  const capacity = Math.max(1, Number(service.capacity) || 1);
                  const booked = countServiceSpotBookings(service, bookings);
                  const open = getServiceOpenSpots(service, bookings);
                  const fill = Math.min(100, Math.round((booked / capacity) * 100));
                  const status = getSpotSessionStatus(service);
                  const imageSrc = service.imageUrls?.[0] || '';
                  const staffNames = resolveStaffNames(service, staff);

                  return (
                    <article key={service.id} className="bb-schedule-spot-card">
                      <div className={`bb-schedule-spot-media${imageSrc ? '' : ' is-empty'}`}>
                        {imageSrc ? <img src={imageSrc} alt="" /> : null}
                        <span className={`bb-schedule-spot-pill is-${status}`}>
                          {statusLabel(status)}
                        </span>
                      </div>

                      <div className="bb-schedule-spot-card-body">
                        <h3 className="bb-schedule-spot-name">{service.name}</h3>

                        <dl className="bb-schedule-spot-when-list">
                          <div>
                            <dt>Starts</dt>
                            <dd>
                              {formatSessionPart(
                                service.sessionStartDate,
                                service.sessionStartTime
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt>Ends</dt>
                            <dd>
                              {formatSessionPart(service.sessionEndDate, service.sessionEndTime)}
                            </dd>
                          </div>
                        </dl>

                        <p className="bb-schedule-spot-staff">
                          {staffNames.length
                            ? staffNames.join(', ')
                            : 'No staff assigned'}
                        </p>

                        <div className="bb-schedule-spot-capacity">
                          <span>
                            {booked}/{capacity} booked · {open} open
                          </span>
                          <span>{fill}%</span>
                        </div>
                        <div className="bb-schedule-spot-bar" aria-hidden="true">
                          <span style={{ width: `${fill}%` }} />
                        </div>

                        <button
                          type="button"
                          className="bb-schedule-spot-info"
                          onClick={() => setInfoSpotId(service.id)}
                        >
                          <Info size={15} strokeWidth={2.2} />
                          <span>Info</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {infoSpot ? (
        <SpotInfoSheet
          service={infoSpot}
          staff={staff}
          bookings={bookings}
          onClose={() => setInfoSpotId('')}
          onConfirm={confirmBooking}
        />
      ) : null}

      {pickerOpen ? (
        <ScheduleDatePicker
          day={day}
          period={period}
          allowPeriod
          onClose={() => setPickerOpen(false)}
          onApply={({ day: nextDay, period: nextPeriod }) => {
            setDay(nextDay);
            setPeriod(nextPeriod);
            setPickerOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}


