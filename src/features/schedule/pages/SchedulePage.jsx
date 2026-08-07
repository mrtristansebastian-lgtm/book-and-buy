import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Info, Pencil, Settings2, X } from 'lucide-react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import {
  addDays,
  buildMonthGrid,
  formatDisplayDate,
  parseDateKey,
  toDateKey
} from '../../../utils/dates';
import {
  countServiceSpotBookings,
  getServiceOpenSpots,
  getSpotSessionStatus
} from '../../../utils/services';
import { getServiceScheduleType } from '../../../utils/scheduleTypes';
import { getEffectiveStaffWindows } from '../../../utils/staffAvailability';

const ACTIVE = new Set(['pending', 'confirmed', 'waitlist']);
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

function resolveStaffNames(service, staffList = []) {
  const ids = Array.isArray(service?.staffIds) ? service.staffIds : [];
  if (!ids.length) return [];
  return ids
    .map((id) => staffList.find((member) => member.id === id)?.name)
    .filter(Boolean);
}

function startOfWeek(date) {
  return addDays(date, -((date.getDay() + 6) % 7));
}

function getPeriodRange(dayKey, period = 'day') {
  const date = parseDateKey(dayKey) || new Date();
  if (period === 'week') {
    const start = startOfWeek(date);
    return { start: toDateKey(start), end: toDateKey(addDays(start, 6)) };
  }
  if (period === 'month') {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { start: toDateKey(start), end: toDateKey(end) };
  }
  const key = toDateKey(date);
  return { start: key, end: key };
}

function formatPeriodLabel(dayKey, period = 'day') {
  const date = parseDateKey(dayKey) || new Date();
  if (period === 'month') {
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }
  if (period === 'week') {
    const { start, end } = getPeriodRange(dayKey, 'week');
    const startDate = parseDateKey(start);
    const endDate = parseDateKey(end);
    if (!startDate || !endDate) return formatDisplayDate(dayKey);
    const sameMonth = startDate.getMonth() === endDate.getMonth();
    const left = startDate.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
    const right = endDate.toLocaleDateString(undefined, {
      month: sameMonth ? undefined : 'short',
      day: 'numeric'
    });
    return `${left} – ${right}`;
  }
  return formatDisplayDate(dayKey);
}

function shiftPeriod(dayKey, period, direction) {
  const date = parseDateKey(dayKey) || new Date();
  if (period === 'week') return toDateKey(addDays(date, direction * 7));
  if (period === 'month') {
    return toDateKey(new Date(date.getFullYear(), date.getMonth() + direction, 1));
  }
  return toDateKey(addDays(date, direction));
}

function serviceOverlapsRange(service, startKey, endKey) {
  const sessionStart = String(service?.sessionStartDate || '').trim();
  const sessionEnd = String(service?.sessionEndDate || sessionStart).trim();
  if (!sessionStart) return false;
  return sessionStart <= endKey && sessionEnd >= startKey;
}

function ScheduleDatePicker({ day, period, allowPeriod = true, onApply, onClose }) {
  const selected = parseDateKey(day) || new Date();
  const [draftDay, setDraftDay] = useState(() => toDateKey(selected));
  const [draftPeriod, setDraftPeriod] = useState(allowPeriod ? period || 'day' : 'day');
  const [monthAnchor, setMonthAnchor] = useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1)
  );
  const monthDays = useMemo(() => buildMonthGrid(monthAnchor), [monthAnchor]);
  const todayKey = toDateKey(new Date());
  const effectivePeriod = allowPeriod ? draftPeriod : 'day';

  return (
    <div
      className="bb-services-sheet"
      role="dialog"
      aria-modal="true"
      aria-label="Pick schedule date"
    >
      <div className="bb-services-sheet-backdrop" onClick={onClose} />
      <div className="bb-services-sheet-panel bb-schedule-picker-sheet">
        <header className="bb-services-sheet-head">
          <div>
            <p className="bb-services-sheet-eyebrow">Calendar</p>
            <h2 className="bb-services-sheet-title">Pick day or period</h2>
            <p className="bb-services-sheet-lede">
              Jump to a date, or view a whole week or month.
            </p>
          </div>
          <button type="button" className="bb-ghost-btn bb-services-sheet-close" onClick={onClose}>
            <X size={16} />
          </button>
        </header>

        <div className="bb-services-sheet-body bb-schedule-picker-body">
          {allowPeriod ? (
            <div className="bb-schedule-period" role="tablist" aria-label="Period">
              {[
                { id: 'day', label: 'Day' },
                { id: 'week', label: 'Week' },
                { id: 'month', label: 'Month' }
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={draftPeriod === option.id}
                  className={`bb-schedule-period-btn${draftPeriod === option.id ? ' is-active' : ''}`}
                  onClick={() => setDraftPeriod(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="bb-schedule-picker-month-nav">
            <button
              type="button"
              className="bb-ghost-btn px-3"
              aria-label="Previous month"
              onClick={() =>
                setMonthAnchor(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                )
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
                setMonthAnchor(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                )
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

          <p className="bb-schedule-picker-summary">
            {formatPeriodLabel(draftDay, effectivePeriod)}
          </p>
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
            <button
              type="button"
              className="bb-primary-btn"
              onClick={() => onApply?.({ day: draftDay, period: effectivePeriod })}
            >
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
    workspace,
    updateAvailabilityRules
  } = useWorkspace();
  const [mode, setMode] = useState('slots');
  const [lens, setLens] = useState('overview');
  const [focusStaffId, setFocusStaffId] = useState(() => staff[0]?.id || '');
  const [day, setDay] = useState(() => toDateKey(new Date()));
  const [period, setPeriod] = useState('day');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [infoSpotId, setInfoSpotId] = useState('');
  const [hoursDraft, setHoursDraft] = useState({
    businessOpenTime: workspace.availabilityRules?.businessOpenTime || '09:00',
    businessCloseTime: workspace.availabilityRules?.businessCloseTime || '17:00'
  });

  const periodRange = useMemo(() => getPeriodRange(day, period), [day, period]);
  const periodLabel = useMemo(() => formatPeriodLabel(day, period), [day, period]);
  const navPeriod = mode === 'slots' ? 'day' : period;

  const slotBookings = useMemo(
    () =>
      bookings.filter((booking) => {
        const service = services.find((row) => row.id === booking.serviceId);
        const type = getServiceScheduleType(service || booking);
        return type !== 'class_session';
      }),
    [bookings, services]
  );

  const dayBookings = useMemo(
    () =>
      slotBookings
        .filter((booking) => (booking.dateKey || booking.date) === day)
        .filter((booking) => !['declined', 'cancelled'].includes(booking.status))
        .sort((a, b) => String(a.time).localeCompare(String(b.time))),
    [slotBookings, day]
  );

  const lanes = useMemo(() => {
    const roster =
      lens === 'staff' && focusStaffId
        ? staff.filter((member) => member.id === focusStaffId)
        : staff;
    const named = roster.map((member) => {
      const windows = getEffectiveStaffWindows(
        member.id,
        day,
        workspace.staffAvailability || {},
        workspace.availabilityRules || {}
      );
      return {
        ...member,
        windows,
        closed: windows.length === 0,
        items: dayBookings.filter((booking) => booking.staffId === member.id)
      };
    });
    const unassigned =
      lens === 'overview'
        ? dayBookings.filter((booking) => !booking.staffId)
        : [];
    return [
      ...named,
      ...(unassigned.length
        ? [{ id: 'unassigned', name: 'Unassigned', color: '#667085', items: unassigned, closed: false }]
        : [])
    ];
  }, [
    staff,
    dayBookings,
    lens,
    focusStaffId,
    day,
    workspace.staffAvailability,
    workspace.availabilityRules
  ]);

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
    if (lens === 'staff' && focusStaffId) {
      list = list.filter((service) =>
        (Array.isArray(service.staffIds) ? service.staffIds : []).includes(focusStaffId)
      );
    }
    return list;
  }, [allSpotServices, periodRange, lens, focusStaffId]);

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

  const saveHours = () => {
    updateAvailabilityRules({
      ...hoursDraft,
      openWeekdays: workspace.availabilityRules?.openWeekdays || [
        'mon',
        'tue',
        'wed',
        'thu',
        'fri',
        'sat'
      ]
    });
    setHoursOpen(false);
  };

  return (
    <div className="bb-schedule-desk">
      <header className="bb-schedule-desk-header">
        <div className="bb-schedule-desk-copy">
          <p className="bb-schedule-desk-eyebrow">Operations</p>
          <h1 className="bb-schedule-desk-title">Schedule</h1>
          <p className="bb-schedule-desk-lede">
            {mode === 'slots'
              ? lens === 'staff'
                ? `Staff schedule · ${
                    staff.find((member) => member.id === focusStaffId)?.name || 'Select staff'
                  }`
                : `Business overview · open ${
                    workspace.availabilityRules?.businessOpenTime || '09:00'
                  }–${workspace.availabilityRules?.businessCloseTime || '17:00'}`
              : `Programmes in view · ${periodLabel}`}
          </p>
        </div>

        <div className="bb-schedule-desk-tools">
          <div className="bb-schedule-mode" role="tablist" aria-label="Schedule lens">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'staff', label: 'By staff' }
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={lens === option.id}
                className={`bb-schedule-mode-btn${lens === option.id ? ' is-active' : ''}`}
                onClick={() => setLens(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="bb-schedule-mode" role="tablist" aria-label="Schedule mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'slots'}
              className={`bb-schedule-mode-btn${mode === 'slots' ? ' is-active' : ''}`}
              onClick={() => setMode('slots')}
            >
              Slots
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'spots'}
              className={`bb-schedule-mode-btn${mode === 'spots' ? ' is-active' : ''}`}
              onClick={() => setMode('spots')}
            >
              Spots
            </button>
          </div>

          {mode === 'slots' ? (
            <button
              type="button"
              className="bb-ghost-btn"
              onClick={() => {
                setHoursDraft({
                  businessOpenTime:
                    workspace.availabilityRules?.businessOpenTime || '09:00',
                  businessCloseTime:
                    workspace.availabilityRules?.businessCloseTime || '17:00'
                });
                setHoursOpen(true);
              }}
            >
              <Settings2 size={16} /> Hours
            </button>
          ) : null}

          <div className="bb-schedule-day-nav">
            <button
              type="button"
              className="bb-ghost-btn px-3"
              onClick={() => setDay(shiftPeriod(day, navPeriod, -1))}
              aria-label="Previous period"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="bb-schedule-day-label">
              {mode === 'slots' ? formatDisplayDate(day) : periodLabel}
            </div>
            <button
              type="button"
              className="bb-ghost-btn px-3"
              onClick={() => setDay(shiftPeriod(day, navPeriod, 1))}
              aria-label="Next period"
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
                if (mode === 'slots') setPeriod('day');
              }}
            >
              Today
            </button>
          </div>
        </div>
      </header>

      <div className="bb-schedule-stage" key={`${lens}-${mode}`}>
        {mode === 'slots' ? (
          <>
            {lens === 'staff' ? (
              <div className="bb-schedule-staff-chips" role="tablist" aria-label="Staff member">
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
            ) : null}

            {dayBookings.length === 0 ? (
              <div className="bb-schedule-empty">
                <p className="bb-schedule-empty-title">Quiet day</p>
                <p className="bb-schedule-empty-copy">
                  No slot bookings on this date. Appointment requests land here once clients
                  book a time.
                </p>
              </div>
            ) : null}

            <section className="bb-schedule-lanes">
              {lanes.map((lane) => (
                <div
                  key={lane.id}
                  className={`bb-schedule-lane${lane.closed ? ' is-closed' : ''}`}
                >
                  <div className="bb-schedule-lane-head">
                    <span
                      className="bb-schedule-lane-dot"
                      style={{ background: lane.color || '#050505' }}
                    />
                    <h2 className="bb-schedule-lane-title">{lane.name}</h2>
                    <span className="bb-schedule-lane-count">
                      {lane.closed
                        ? 'Closed'
                        : lane.windows?.length
                          ? lane.windows.map((w) => `${w.start}–${w.end}`).join(', ')
                          : lane.items.length}
                    </span>
                  </div>
                  {lane.closed ? (
                    <p className="bb-schedule-lane-empty">Not available this day</p>
                  ) : lane.items.length === 0 ? (
                    <p className="bb-schedule-lane-empty">Open lane</p>
                  ) : (
                    lane.items.map((booking) => (
                      <article key={booking.id} className="bb-schedule-booking">
                        <div className="bb-schedule-booking-top">
                          <strong>{booking.time}</strong>
                          <span className="bb-schedule-booking-status">{booking.status}</span>
                        </div>
                        <div className="bb-schedule-booking-service">{booking.serviceName}</div>
                        <div className="bb-schedule-booking-client">{booking.clientName}</div>
                        {booking.status === 'pending' ? (
                          <button
                            type="button"
                            className="bb-primary-btn text-sm py-2"
                            onClick={() => confirmBooking(booking.id)}
                          >
                            Confirm
                          </button>
                        ) : null}
                      </article>
                    ))
                  )}
                </div>
              ))}
            </section>
          </>
        ) : (
          <>
            {lens === 'staff' ? (
              <div className="bb-schedule-staff-chips" role="tablist" aria-label="Staff member">
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
            ) : null}

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
                    : lens === 'staff'
                      ? 'No programmes assigned to this staff member in the selected period.'
                      : 'No programmes overlap this date range. Use the edit control to pick another day, week, or month.'}
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
          period={mode === 'slots' ? 'day' : period}
          allowPeriod={mode === 'spots'}
          onClose={() => setPickerOpen(false)}
          onApply={({ day: nextDay, period: nextPeriod }) => {
            setDay(nextDay);
            setPeriod(mode === 'slots' ? 'day' : nextPeriod);
            setPickerOpen(false);
          }}
        />
      ) : null}

      {hoursOpen ? (
        <div className="bb-services-sheet" role="dialog" aria-modal="true" aria-label="Business hours">
          <div className="bb-services-sheet-backdrop" onClick={() => setHoursOpen(false)} />
          <div className="bb-services-sheet-panel" style={{ width: 'min(24rem, 100%)' }}>
            <header className="bb-services-sheet-head">
              <div>
                <p className="bb-services-sheet-eyebrow">Slots</p>
                <h2 className="bb-services-sheet-title">Business hours</h2>
                <p className="bb-services-sheet-lede">
                  Used for public appointment availability.
                </p>
              </div>
            </header>
            <div className="bb-services-sheet-body">
              <label className="bb-services-field">
                <span>Opens</span>
                <input
                  type="time"
                  className="native-control-input bb-services-control"
                  value={hoursDraft.businessOpenTime}
                  onChange={(event) =>
                    setHoursDraft((prev) => ({ ...prev, businessOpenTime: event.target.value }))
                  }
                />
              </label>
              <label className="bb-services-field">
                <span>Closes</span>
                <input
                  type="time"
                  className="native-control-input bb-services-control"
                  value={hoursDraft.businessCloseTime}
                  onChange={(event) =>
                    setHoursDraft((prev) => ({ ...prev, businessCloseTime: event.target.value }))
                  }
                />
              </label>
            </div>
            <footer className="bb-services-sheet-footer">
              <span />
              <div className="bb-services-sheet-footer-actions">
                <button type="button" className="bb-ghost-btn" onClick={() => setHoursOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="bb-primary-btn" onClick={saveHours}>
                  Save hours
                </button>
              </div>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
