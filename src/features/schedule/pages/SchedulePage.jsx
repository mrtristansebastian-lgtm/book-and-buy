import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, Check, ChevronDown, Info } from 'lucide-react';
import { PageBackButton } from '../../../shared/ui/PageBackButton';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { formatDisplayDate, parseDateKey, toDateKey } from '../../../utils/dates';
import {
  formatPeriodLabel,
  getPeriodRange
} from '../../../utils/periodFilters';
import {
  countServiceSpotBookings,
  getServiceOpenSpots,
  getSpotSessionStatus
} from '../../../utils/services';
import { getServiceScheduleType } from '../../../utils/scheduleTypes';
import {
  getBookingAvailabilityConflict,
  getBusinessHoursForDate,
  getScheduleDayTimeline,
  getStaffDayTimeline,
  isBusinessOpenOnDate,
  resolveCalendarDayStatus
} from '../../../utils/staffAvailability';
import { DayTimelineMeter, buildTimelineAxisMarks } from '../components/DayTimelineMeter';
import { AvailabilityMonthGrid } from '../components/AvailabilityMonthGrid';
import { SpotInfoSheet } from '../components/SpotInfoSheet';
import {
  bookingDateKey,
  compareAgendaBookings,
  compareSpotServices,
  formatBookingWindow,
  formatSessionPart,
  resolveStaffNames,
  serviceOverlapsRange,
  staffInitials,
  staffPhoto,
  statusLabel
} from './schedulePageUtils';

function timeToMinutes(value = '') {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function bookingHorizontalPosition(booking, dayStart, dayEnd) {
  const rawStart = timeToMinutes(booking?.time);
  const rangeMinutes = Math.max(1, dayEnd - dayStart);
  const startMinutes = Math.max(dayStart, Math.min(dayEnd, rawStart ?? dayStart));
  const duration = Math.max(30, Number(booking?.durationMinutes) || 60);
  const offset = startMinutes - dayStart;
  return {
    left: (offset / rangeMinutes) * 100,
    width: Math.min(((duration / rangeMinutes) * 100), 100 - (offset / rangeMinutes) * 100)
  };
}

function clientInitials(name = '') {
  const parts = String(name || 'Client').trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] || 'C'}${parts[1]?.[0] || ''}`.toUpperCase();
}

export function SchedulePage() {
  const {
    bookings,
    staff,
    services,
    confirmBooking,
    workspace
  } = useWorkspace();
  const mode = 'slots';
  const [focusStaffId, setFocusStaffId] = useState('');
  const [day, setDay] = useState(() => toDateKey(new Date()));
  const [monthAnchor, setMonthAnchor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const period = 'day';
  const sortBy = 'oldest';
  const [infoSpotId, setInfoSpotId] = useState('');
  const [expandedDayKeys, setExpandedDayKeys] = useState(() => new Set([toDateKey(new Date())]));

  useEffect(() => {
    if (sortBy === 'client' || sortBy === 'service') {
      setExpandedDayKeys(new Set(['flat']));
      return;
    }
    setExpandedDayKeys(new Set([day]));
  }, [day, period, sortBy]);

  const periodRange = useMemo(
    () => getPeriodRange(day, 'day'),
    [day]
  );
  const periodLabel = useMemo(
    () => formatPeriodLabel(day, 'day'),
    [day]
  );

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
    period === 'custom' ||
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

  const visibleStaffRows = useMemo(() => {
    const selected = focusStaffId
      ? (staff || []).filter((member) => member.id === focusStaffId)
      : (staff || []);
    return selected.length ? selected : [{ id: '', name: 'All bookings', color: '#101828' }];
  }, [staff, focusStaffId]);

  const dayHours = useMemo(
    () => getBusinessHoursForDate(day, workspace.availabilityRules || {}),
    [day, workspace.availabilityRules]
  );
  const dayStartMinutes = useMemo(
    () => timeToMinutes(dayHours.openTime) ?? 9 * 60,
    [dayHours.openTime]
  );
  const dayEndMinutes = useMemo(() => {
    const end = timeToMinutes(dayHours.closeTime) ?? 17 * 60;
    return end > dayStartMinutes ? end : dayStartMinutes + 8 * 60;
  }, [dayHours.closeTime, dayStartMinutes]);
  const boardAxisMarks = useMemo(
    () => buildTimelineAxisMarks(dayStartMinutes, dayEndMinutes),
    [dayStartMinutes, dayEndMinutes]
  );
  const confirmedDayBookings = useMemo(
    () => slotBookings.filter(
      (booking) => booking.status === 'confirmed' && bookingDateKey(booking) === day
    ),
    [slotBookings, day]
  );
  const staffRows = useMemo(
    () => visibleStaffRows.map((member) => {
      const memberBookings = confirmedDayBookings.filter((booking) =>
        member.id ? booking.staffId === member.id : true
      );
      const timeline = member.id
        ? getStaffDayTimeline(
            member.id,
            day,
            workspace.staffAvailability || {},
            workspace.availabilityRules || {}
          )
        : { status: dayHours.open ? 'open' : 'business-closed', segments: [], dayStart: dayStartMinutes, dayEnd: dayEndMinutes };
      const bookingsWithConflict = memberBookings.map((booking) => ({
        booking,
        conflict: getBookingAvailabilityConflict({
          booking,
          staffId: booking.staffId || member.id,
          dateKey: day,
          staffAvailability: workspace.staffAvailability || {},
          availabilityRules: workspace.availabilityRules || {}
        })
      }));
      return { member, timeline, bookingsWithConflict };
    }),
    [visibleStaffRows, confirmedDayBookings, day, workspace.staffAvailability, workspace.availabilityRules, dayHours.open, dayStartMinutes, dayEndMinutes]
  );
  const attentionBookings = useMemo(
    () => confirmedDayBookings.map((booking) => ({
      booking,
      conflict: getBookingAvailabilityConflict({
        booking,
        dateKey: day,
        staffAvailability: workspace.staffAvailability || {},
        availabilityRules: workspace.availabilityRules || {}
      })
    })).filter(({ conflict }) =>
      !dayHours.open || conflict?.code === 'outside-business-hours' || conflict?.code === 'invalid-time'
    ),
    [confirmedDayBookings, day, workspace.staffAvailability, workspace.availabilityRules, dayHours.open]
  );

  const toggleAgendaDay = (key) => {
    const id = key || 'flat';
    setExpandedDayKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderStaffFilter = () => (
    <div className="bb-schedule-staff-filter" role="tablist" aria-label="Staff filter">
      <button
        type="button"
        role="tab"
        aria-selected={!focusStaffId}
        className={`bb-schedule-staff-avatar${!focusStaffId ? ' is-active' : ''}`}
        onClick={() => setFocusStaffId('')}
      >
        <span className="bb-schedule-staff-avatar-face is-all" aria-hidden="true">
          All
        </span>
        <span className="bb-schedule-staff-avatar-name">All staff</span>
      </button>
      {staff.map((member) => {
        const photo = staffPhoto(member);
        const active = focusStaffId === member.id;
        return (
          <button
            key={member.id}
            type="button"
            role="tab"
            aria-selected={active}
            title={member.name}
            className={`bb-schedule-staff-avatar${active ? ' is-active' : ''}`}
            style={{ '--staff-color': member.color || '#101828' }}
            onClick={() => setFocusStaffId(member.id)}
          >
            <span className="bb-schedule-staff-avatar-face" aria-hidden="true">
              {photo ? <img src={photo} alt="" /> : staffInitials(member.name)}
            </span>
            <span className="bb-schedule-staff-avatar-name">{member.name}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="bb-schedule-desk">
      <div className="bb-page-chrome">
        <header className="bb-schedule-desk-header">
          <div className="bb-schedule-desk-copy">
            <div className="bb-page-title-wrap">
              <PageBackButton />
              <span className="bb-page-title-main">
                <div className="bb-page-header-glow" aria-hidden="true" />
                <h1 className="bb-page-title bb-schedule-desk-title">Schedule</h1>
              </span>
            </div>
          </div>
        </header>
      </div>

      <div className="bb-schedule-workspace">
        <aside className="bb-schedule-sidebar" aria-label="Schedule calendar and filters">
          <div className="bb-schedule-mini-calendar bb-schedule-avail">
            <AvailabilityMonthGrid
              monthAnchor={monthAnchor}
              selectedDay={day}
              onPreviousMonth={() => setMonthAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              onNextMonth={() => setMonthAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              resolveStatus={(key) =>
                focusStaffId
                  ? resolveCalendarDayStatus(
                      focusStaffId,
                      key,
                      workspace.staffAvailability || {},
                      workspace.availabilityRules || {}
                    )
                  : isBusinessOpenOnDate(key, workspace.availabilityRules || {})
                    ? 'open'
                    : 'business-closed'
              }
              hasIndicator={(key) => slotBookings.some(
                (booking) => booking.status === 'confirmed' && bookingDateKey(booking) === key
              )}
              onSelectDay={(key, date) => {
                setDay(key);
                if (date.getMonth() !== monthAnchor.getMonth()) {
                  setMonthAnchor(new Date(date.getFullYear(), date.getMonth(), 1));
                }
              }}
            />
          </div>

          <div className="bb-schedule-side-section">
            <span className="bb-schedule-side-label">Team calendars</span>
            {renderStaffFilter()}
          </div>

          <div className="bb-schedule-side-section bb-schedule-legend">
            <span className="bb-schedule-side-label">Categories</span>
            <span><i className="is-lilac" /> Appointments</span>
            <span><i className="is-blue" /> Consultations</span>
            <span><i className="is-pink" /> Classes</span>
          </div>
        </aside>

        <main className="bb-schedule-main">
        <div className="bb-schedule-stage-filters">
          <strong className="bb-schedule-stage-date">
            {(parseDateKey(day) || new Date()).toLocaleDateString(undefined, {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            })}
          </strong>
          <span className="bb-schedule-results-copy">
            {mode === 'slots' ? `${agendaBookings.length} confirmed appointment${agendaBookings.length === 1 ? '' : 's'}` : `${spotServices.length} programme${spotServices.length === 1 ? '' : 's'}`}
          </span>
        </div>

      <div className="bb-schedule-stage" key={`${mode}-${period}-${day}`}>
        {mode === 'slots' ? (
          period === 'day' || period === 'week' ? (
            <>
              {!dayHours.open ? (
                <section className="bb-schedule-closed-day" aria-label="Business closed">
                  <CalendarDays size={24} aria-hidden="true" />
                  <div>
                    <strong>Business closed</strong>
                    <span>The booking window is closed on {formatDisplayDate(day)}.</span>
                  </div>
                </section>
              ) : (
                <section className="bb-schedule-board bb-schedule-resource-board" aria-label="Daily staff appointment calendar">
                  <div className="bb-schedule-board-scroll">
                    <div className="bb-schedule-resource-grid">
                      <div className="bb-schedule-resource-corner"><span>Team</span></div>
                      <div className="bb-schedule-resource-axis" aria-label={`${dayHours.openTime} to ${dayHours.closeTime}`}>
                        {boardAxisMarks.map((mark) => (
                          <span
                            key={`${mark.minutes}-${mark.edge}`}
                            className={`is-${mark.edge}`}
                            style={{ left: `${mark.leftPct}%` }}
                          >
                            {mark.label}
                          </span>
                        ))}
                      </div>

                      {staffRows.map(({ member, timeline, bookingsWithConflict }) => {
                        const photo = staffPhoto(member);
                        const visibleBookings = bookingsWithConflict.filter(({ conflict }) =>
                          conflict?.code !== 'outside-business-hours' && conflict?.code !== 'invalid-time'
                        );
                        const laneLabel = timeline.status === 'leave'
                          ? 'Leave'
                          : timeline.status === 'off'
                            ? 'Off day'
                            : timeline.status === 'business-closed'
                              ? 'Closed'
                              : 'Available';
                        return (
                          <div className={`bb-schedule-resource-row is-${timeline.status}`} key={member.id || 'all'}>
                            <div className="bb-schedule-resource-person">
                              <span className="bb-schedule-resource-avatar" style={{ '--staff-color': member.color || '#101828' }}>
                                {photo ? <img src={photo} alt="" /> : staffInitials(member.name)}
                              </span>
                              <span>
                                <strong>{member.name}</strong>
                                <small>{bookingsWithConflict.length} booking{bookingsWithConflict.length === 1 ? '' : 's'}</small>
                              </span>
                            </div>
                            <div className={`bb-schedule-resource-track is-${timeline.status}`}>
                              <div className="bb-schedule-resource-lines" aria-hidden="true">
                                {boardAxisMarks.slice(1, -1).map((mark) => (
                                  <i key={mark.minutes} style={{ left: `${mark.leftPct}%` }} />
                                ))}
                              </div>
                              <div className="bb-schedule-resource-availability" aria-hidden="true">
                                {(timeline.segments || []).map((segment, index) => (
                                  <i
                                    key={`${segment.kind}-${segment.start}-${index}`}
                                    className={`is-${segment.kind}`}
                                    style={{ left: `${segment.leftPct}%`, width: `${segment.widthPct}%` }}
                                  />
                                ))}
                              </div>
                              {visibleBookings.map(({ booking, conflict }, bookingIndex) => {
                                const position = bookingHorizontalPosition(booking, dayStartMinutes, dayEndMinutes);
                                return (
                                  <article
                                    key={booking.id}
                                    className={`bb-schedule-resource-event is-palette-${bookingIndex % 4}${conflict ? ' is-conflict' : ''}`}
                                    style={{ left: `${position.left}%`, width: `${position.width}%` }}
                                    title={conflict?.label || 'Confirmed booking'}
                                  >
                                    <span className="bb-schedule-event-kicker">{booking.serviceName || 'Appointment'}</span>
                                    <h3>{booking.clientName || 'Client'}</h3>
                                    <time>{formatBookingWindow(booking)}</time>
                                    {conflict ? (
                                      <span className="bb-schedule-event-conflict"><AlertTriangle size={12} />{conflict.label}</span>
                                    ) : null}
                                    <div className="bb-schedule-event-person">
                                      <span>{clientInitials(booking.clientName)}</span>
                                      <b>{booking.staffName || member.name}</b>
                                      <Check size={13} aria-label="Confirmed" />
                                    </div>
                                  </article>
                                );
                              })}
                              {visibleBookings.length === 0 ? <span className="bb-schedule-resource-free">{laneLabel}</span> : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}

              {attentionBookings.length ? (
                <section className="bb-schedule-attention" aria-label="Bookings needing attention">
                  <div className="bb-schedule-attention-head">
                    <AlertTriangle size={18} aria-hidden="true" />
                    <div><strong>Needs attention</strong><span>Confirmed bookings outside the visible availability window.</span></div>
                  </div>
                  <div className="bb-schedule-attention-list">
                    {attentionBookings.map(({ booking, conflict }) => (
                      <article key={booking.id}>
                        <div><strong>{booking.clientName || 'Client'}</strong><span>{booking.serviceName || 'Appointment'} · {formatBookingWindow(booking)}</span></div>
                        <span className="bb-schedule-attention-reason">{conflict?.label || 'Unavailable time'}</span>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          ) : period !== 'day' && agendaBookings.length === 0 ? (
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
                const groupKey = group.dateKey || 'flat';
                const expanded = expandedDayKeys.has(groupKey);
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
                const hoursLabel =
                  group.dateKey === day
                    ? dayHours.open
                      ? `${dayHours.openTime} – ${dayHours.closeTime}`
                      : 'Business closed'
                    : null;
                const countLabel =
                  group.items.length === 1
                    ? '1 booking'
                    : `${group.items.length} bookings`;

                return (
                  <div
                    key={groupKey}
                    className={`bb-schedule-agenda-group${expanded ? ' is-open' : ''}`}
                  >
                    <button
                      type="button"
                      className="bb-schedule-agenda-day-toggle"
                      aria-expanded={expanded}
                      onClick={() => toggleAgendaDay(groupKey)}
                    >
                      <span className="bb-schedule-agenda-day-toggle-copy">
                        <strong>
                          {group.dateKey
                            ? formatDisplayDate(group.dateKey)
                            : periodLabel || 'Appointments'}
                        </strong>
                        <span>
                          {countLabel}
                          {hoursLabel ? ` · ${hoursLabel}` : ''}
                          {focusStaffId
                            ? ` · ${staff.find((row) => row.id === focusStaffId)?.name || 'Staff'}`
                            : ''}
                        </span>
                      </span>
                      <ChevronDown
                        size={18}
                        strokeWidth={2.2}
                        className="bb-schedule-agenda-day-chevron"
                        aria-hidden="true"
                      />
                    </button>

                    {expanded ? (
                      <div className="bb-schedule-agenda-day-panel">
                        {timeline ? (
                          <div className="bb-schedule-agenda-meter">
                            <DayTimelineMeter
                              segments={timeline.segments}
                              status={timeline.status}
                              dayStart={timeline.dayStart}
                              dayEnd={timeline.dayEnd}
                            />
                            {hasOpen || hasBreak || hasBooking || timeline.status === 'off' || timeline.status === 'leave' ? (
                              <div className="bb-schedule-day-meter-legend" aria-hidden="true">
                                {hasOpen ? (
                                  <span className="bb-schedule-day-meter-legend-item is-open">
                                    <i /> Working
                                  </span>
                                ) : null}
                                {hasBreak ? (
                                  <span className="bb-schedule-day-meter-legend-item is-break">
                                    <i /> Break
                                  </span>
                                ) : null}
                                {timeline.status === 'off' ? (
                                  <span className="bb-schedule-day-meter-legend-item is-off">
                                    <i /> Off day
                                  </span>
                                ) : null}
                                {timeline.status === 'leave' ? (
                                  <span className="bb-schedule-day-meter-legend-item is-leave">
                                    <i /> Leave
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

                        {group.items.length === 0 ? (
                          <div className="bb-schedule-agenda-day-empty">
                            <p className="bb-schedule-empty-title">No confirmed bookings</p>
                            <p className="bb-schedule-empty-copy">
                              {focusStaffId
                                ? 'No confirmed appointments for this staff member today.'
                                : 'No confirmed appointments today. Pending requests stay in Requests until confirmed.'}
                            </p>
                          </div>
                        ) : (
                          <div className="bb-schedule-agenda-list">
                            {group.items.map((booking) => {
                              const member = staff.find((row) => row.id === booking.staffId);
                              return (
                                <article key={booking.id} className="bb-schedule-agenda-row">
                                  <div className="bb-schedule-agenda-time">
                                    <strong>{formatBookingWindow(booking)}</strong>
                                    {sortBy === 'client' || sortBy === 'service' ? (
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
                                  <span className="bb-schedule-status-chip is-confirmed">
                                    Confirmed
                                  </span>
                                </article>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </section>
          )
        ) : (
          <>
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
                  {allSpotServices.length === 0
                    ? 'No spot programmes yet'
                    : 'Nothing in this period'}
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
                        <span className={`bb-schedule-status-chip is-${status}`}>
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
                          {staffNames.length ? staffNames.join(', ') : 'No staff assigned'}
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
        </main>
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

    </div>
  );
}
