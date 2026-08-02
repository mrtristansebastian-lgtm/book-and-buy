import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  List,
  Plus,
  Settings2,
  Users
} from 'lucide-react';

const STATUS_LEGEND = [
  ['confirmed', 'confirmed'],
  ['pending', 'pending'],
  ['waitlist', 'waitlist'],
  ['completed', 'complete'],
  ['reschedule', 'reschedule']
];

const PERIODS = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' }
];

const SLOT_MINUTES = 30;

const fromDateKey = dateKey => new Date(`${dateKey}T00:00:00`);
const toDateKey = date => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
const addDays = (date, amount) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};
const startOfWeek = date => addDays(date, -((date.getDay() + 6) % 7));
const firstName = value => String(value || '').trim().split(/\s+/)[0] || 'Team';
const formatTime = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const formatDayLabel = date => date.toLocaleDateString('en-US', { weekday: 'short' });
const formatAgendaDate = date => date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
const getWeekDates = dateKey => {
  const start = startOfWeek(fromDateKey(dateKey));
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
};
const getMonthDates = dateKey => {
  const anchor = fromDateKey(dateKey);
  const start = startOfWeek(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
};
const addMonths = (date, amount) => new Date(date.getFullYear(), date.getMonth() + amount, 1);
const getCalendarMonthDates = dateKey => {
  const anchor = fromDateKey(dateKey);
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => new Date(anchor.getFullYear(), anchor.getMonth(), index + 1));
};
const getMonthTitle = date => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
const countStatusBookings = events => events.reduce((totals, event) => {
  const count = event.bookings?.length || 1;
  if (Object.prototype.hasOwnProperty.call(totals, event.status)) totals[event.status] += count;
  return totals;
}, Object.fromEntries(STATUS_LEGEND.map(([status]) => [status, 0])));
function StaffAvatar({ calendar, compact = false, rail = false }) {
  const label = calendar?.shortName || calendar?.name || 'Business';
  const iconSize = rail ? 16 : compact ? 13 : 15;
  if (calendar?.id === 'workspace') return <span className={`schedule-ops-avatar is-business ${rail ? 'is-rail' : ''}`}><Users size={iconSize} /></span>;
  return calendar?.photoURL
    ? <img className={`schedule-ops-avatar ${rail ? 'is-rail' : ''}`} src={calendar.photoURL} alt="" />
    : <span className={`schedule-ops-avatar ${rail ? 'is-rail' : ''}`}>{firstName(label).charAt(0)}</span>;
}

function ScheduleScopeRail({ calendars, onSelectCalendar, selectedCalendarId }) {
  const visibleCalendars = calendars.slice(0, 7);
  return (
    <div className="schedule-ops-scope-rail" aria-label="Calendar scope">
      {visibleCalendars.map(calendar => {
        const selected = calendar.id === selectedCalendarId;
        const testId = calendar.id === 'workspace' ? 'schedule-scope-business' : `schedule-scope-staff-${calendar.id}`;
        return (
          <button
            key={calendar.id}
            type="button"
            className={`schedule-ops-scope ${selected ? 'is-active native-gradient-ring' : ''}`}
            data-testid={testId}
            aria-pressed={selected}
            onClick={() => onSelectCalendar(calendar.id)}
            title={calendar.id === 'workspace' ? 'Business view' : calendar.name}
          >
            <StaffAvatar calendar={calendar} compact rail />
            <span>{calendar.id === 'workspace' ? 'Business' : firstName(calendar.shortName || calendar.name)}</span>
          </button>
        );
      })}
    </div>
  );
}

function ScheduleStatusLegend({ totals }) {
  return (
    <aside className="schedule-ops-status-legend" aria-label="Booking card status colours" data-testid="schedule-status-legend">
      {STATUS_LEGEND.map(([status, label]) => (
        <span key={status} className={`schedule-ops-status-legend-item is-${status}`}>
          <i aria-hidden="true" />
          <span><strong>{totals?.[status] || 0}</strong> {label}</span>
        </span>
      ))}
    </aside>
  );
}

function ScheduleTypeRail({ onSelectScheduleType, scheduleTypes = [], selectedScheduleType }) {
  if (!scheduleTypes.length || (scheduleTypes.length === 1 && scheduleTypes[0].id === 'appointment')) return null;
  return (
    <div className="schedule-ops-type-rail" aria-label="Schedule type">
      {scheduleTypes.map(type => {
        const active = type.id === selectedScheduleType;
        return (
          <button
            key={type.id}
            type="button"
            className={active ? 'is-active native-gradient-ring' : ''}
            aria-pressed={active}
            onClick={() => onSelectScheduleType(type.id)}
          >
            <strong>{type.shortLabel || type.label}</strong>
            <span>{type.scheduleLabel}</span>
          </button>
        );
      })}
    </div>
  );
}

function ScheduleOperationsToolbar({
  agendaOpen,
  dateTitle,
  onChangeView,
  onCreate,
  onMove,
  onOpenSettings,
  onToday,
  onToggleAgenda,
  readOnly,
  view
}) {
  return (
    <header className="schedule-ops-command-bar">
      <div className="schedule-ops-date-nav">
        <button type="button" className="schedule-ops-today" onClick={onToday}>Today</button>
        <div className="schedule-ops-date-arrows">
          <button type="button" aria-label="Previous date range" onClick={() => onMove(-1)}><ChevronLeft size={17} /></button>
          <button type="button" aria-label="Next date range" onClick={() => onMove(1)}><ChevronRight size={17} /></button>
        </div>
        <div className="schedule-ops-date-copy">
          <h2>{dateTitle}</h2>
        </div>
      </div>

      <div className="schedule-ops-command-actions">
        <div className="schedule-ops-view-tabs" aria-label="Schedule view">
          {PERIODS.map(period => (
            <button
              key={period.id}
              type="button"
              className={view === period.id ? 'is-active native-gradient-button' : ''}
              data-testid={`schedule-view-${period.id}`}
              aria-pressed={view === period.id}
              onClick={() => onChangeView(period.id)}
            >
              <span>{period.label}</span>
            </button>
          ))}
        </div>
        <div className="schedule-ops-view-tabs schedule-ops-mode-tabs" aria-label="Schedule display mode">
          <button
            type="button"
            className={!agendaOpen ? 'is-active native-gradient-button' : ''}
            data-testid="schedule-view-calendar"
            aria-pressed={!agendaOpen}
            onClick={() => onToggleAgenda(false)}
          >
            <CalendarDays size={14} />
            <span>Calendar</span>
          </button>
          <button
            type="button"
            className={agendaOpen ? 'is-active native-gradient-button' : ''}
            data-testid="schedule-view-agenda"
            aria-pressed={agendaOpen}
            onClick={() => onToggleAgenda(true)}
          >
            <List size={14} />
            <span>List</span>
          </button>
        </div>
        <button type="button" className="schedule-ops-icon-action" aria-label="Schedule settings" onClick={onOpenSettings} disabled={readOnly}>
          <Settings2 size={16} />
        </button>
        <button type="button" className="schedule-ops-create native-gradient-button" data-testid="schedule-create" onClick={onCreate} disabled={readOnly}>
          <Plus size={16} />
          <span>New booking</span>
        </button>
      </div>
    </header>
  );
}

function EventCard({ event, onOpen }) {
  const bookings = event.bookings || (event.booking ? [event.booking] : []);
  const bookingId = bookings[0]?.id || event.id;
  const time = event.time || formatTime(event.startMinutes || 0);
  const endTime = Number.isFinite(event.endMinutes) ? formatTime(event.endMinutes) : '';
  const isClassSession = event.scheduleType === 'class_session';
  const attendeeCount = Number(event.attendeeCount) || bookings.reduce((total, booking) => total + Math.max(1, Number(booking.partySize || 1) || 1), 0);
  const capacity = Number(event.serviceCapacity || event.booking?.serviceCapacity || 0);
  return (
    <button
      type="button"
      className={`schedule-ops-event is-${event.status || 'confirmed'} ${isClassSession ? 'is-class-session' : ''}`}
      data-testid={`schedule-booking-card-${bookingId}`}
      onClick={target => onOpen(event, target.currentTarget)}
      title={`${time} · ${event.clientName || 'Client'} · ${event.serviceName || 'Service'}`}
    >
      <span className="schedule-ops-event-status" aria-hidden="true" />
      <span className="schedule-ops-event-copy">
        <em>{time}{endTime ? ` – ${endTime}` : ''}</em>
        <strong>{isClassSession ? event.serviceName || 'Class' : event.clientName || 'Client'}</strong>
        <small>{isClassSession ? `${attendeeCount}${capacity ? ` / ${capacity}` : ''} signed up` : event.serviceName || 'Service'}</small>
      </span>
      {isClassSession ? <span className="schedule-ops-event-count">{attendeeCount}</span> : bookings.length > 1 ? <span className="schedule-ops-event-count">+{bookings.length - 1}</span> : null}
    </button>
  );
}

function StatusLineTotals({ events }) {
  const totals = countStatusBookings(events);
  const visibleStatuses = STATUS_LEGEND.filter(([status]) => totals[status] > 0);
  if (!visibleStatuses.length) return <i>Quiet day</i>;
  return visibleStatuses.map(([status, label]) => (
    <span key={status} className={`is-${status}`}>
      <em aria-hidden="true" />
      <strong>{totals[status] || 0}</strong>
      <small>{label}</small>
    </span>
  ));
}

function getTimelineHours(staff, getAvailability, getEvents, dateKey) {
  const boundaries = [8 * 60, 18 * 60];
  staff.forEach(member => {
    getAvailability(member.id, dateKey).forEach(interval => boundaries.push(interval.startMinutes, interval.endMinutes));
    getEvents(dateKey, member.id).forEach(event => boundaries.push(event.startMinutes, event.endMinutes));
  });
  const min = Math.max(5 * 60, Math.floor(Math.min(...boundaries) / 60) * 60);
  const max = Math.min(23 * 60, Math.ceil(Math.max(...boundaries) / 60) * 60);
  return { max: Math.max(min + 6 * 60, max), min };
}

function isOpenSlot(intervals, startMinutes) {
  const endMinutes = startMinutes + SLOT_MINUTES;
  return intervals.some(interval => interval.available !== false && interval.startMinutes <= startMinutes && interval.endMinutes >= endMinutes);
}

function DesktopDayBoard({ dateKey, getAvailability, getEvents, onCreate, onOpenEvent, readOnly, staff }) {
  const { min, max } = getTimelineHours(staff, getAvailability, getEvents, dateKey);
  const slots = Array.from({ length: Math.max(1, (max - min) / SLOT_MINUTES) }, (_, index) => min + index * SLOT_MINUTES);
  const hourSlots = slots.filter(minutes => minutes % 60 === 0);
  return (
    <div className="schedule-ops-day-scroll">
      <div className="schedule-ops-day-board" style={{ '--schedule-ops-hour-count': hourSlots.length, '--schedule-ops-slot-count': slots.length }}>
        <div className="schedule-ops-day-header">
          <span>Team</span>
          <div className="schedule-ops-day-times">
            {hourSlots.map(minutes => <span key={minutes}>{formatTime(minutes)}</span>)}
          </div>
        </div>
        {staff.map(member => {
          const memberEvents = getEvents(dateKey, member.id);
          const intervals = getAvailability(member.id, dateKey);
          const lanes = memberEvents.reduce((largest, event) => Math.max(largest, (event.column || 0) + 1), 1);
          return (
            <section
              key={member.id}
              className="schedule-ops-day-lane"
              data-testid={`schedule-day-lane-${member.id}`}
              style={{ '--schedule-ops-lanes': Math.max(1, lanes) }}
            >
              <div className="schedule-ops-day-staff">
                <StaffAvatar calendar={member} />
                <span><strong>{member.shortName || firstName(member.name)}</strong><small>{member.role || 'Team member'}</small></span>
              </div>
              <div className="schedule-ops-day-track">
                {slots.map(minutes => {
                  const open = isOpenSlot(intervals, minutes);
                  return (
                    <button
                      key={minutes}
                      type="button"
                      className={`schedule-ops-day-slot ${open ? 'is-open' : ''}`}
                      aria-label={`${open ? 'Create booking' : 'Unavailable'} ${formatTime(minutes)} with ${member.name}`}
                      disabled={!open || readOnly}
                      onClick={() => onCreate({ dateKey, staffId: member.id, time: formatTime(minutes) })}
                    />
                  );
                })}
                <span className="schedule-ops-day-end-pad" aria-hidden="true" />
                {memberEvents.map(event => {
                  const startSlots = (event.startMinutes - min) / SLOT_MINUTES;
                  const durationSlots = Math.max(1, (event.endMinutes - event.startMinutes) / SLOT_MINUTES);
                  return (
                    <div
                      key={event.id}
                      className="schedule-ops-event-placement"
                      style={{
                        '--schedule-ops-event-left': startSlots,
                        '--schedule-ops-event-width': durationSlots,
                        '--schedule-ops-event-row': event.column || 0
                      }}
                    >
                      <EventCard event={event} onOpen={onOpenEvent} />
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function MobileDayBoard({ dateKey, getAvailability, getEvents, onCreate, onOpenEvent, readOnly, staff }) {
  return (
    <div className="schedule-ops-mobile-day">
      {staff.map(member => {
        const events = getEvents(dateKey, member.id);
        const firstOpen = getAvailability(member.id, dateKey).find(interval => interval.available !== false);
        return (
          <section key={member.id} className="schedule-ops-mobile-staff" data-testid={`schedule-day-lane-${member.id}`}>
            <header>
              <div><StaffAvatar calendar={member} /><span><strong>{member.shortName || firstName(member.name)}</strong><small>{member.role || 'Team member'}</small></span></div>
              {firstOpen ? (
                <button type="button" onClick={() => onCreate({ dateKey, staffId: member.id, time: formatTime(firstOpen.startMinutes) })} disabled={readOnly}>
                  <Plus size={14} /> Add
                </button>
              ) : null}
            </header>
            {events.length ? <div>{events.map(event => <EventCard key={event.eventKey || event.id} event={event} onOpen={onOpenEvent} />)}</div> : <p>No bookings scheduled</p>}
          </section>
        );
      })}
    </div>
  );
}

function WeekPlanner({ dateKey, getAgendaEvents, getEvents, getSummary, onOpenDay, staff, todayStr }) {
  const dates = getWeekDates(dateKey);
  return (
    <section className="schedule-ops-week-planner" aria-label="Weekly planning board">
      {dates.map(date => {
        const key = toDateKey(date);
        const summary = getSummary(key);
        const events = getAgendaEvents(key);
        const activeStaff = new Set(getEvents(key).map(event => event.staffId));
        return (
          <button
            key={key}
            type="button"
            className={`schedule-ops-week-card ${key === todayStr ? 'is-today native-gradient-ring' : ''} ${summary.pending ? 'has-attention' : ''}`}
            data-testid={`schedule-week-day-${key}`}
            onClick={() => onOpenDay(key)}
          >
            <span className="schedule-ops-week-card-date"><em>{formatDayLabel(date)}</em><strong>{date.getDate()}</strong></span>
            <span className="schedule-ops-week-card-metrics"><span>{summary.open || 0} open</span></span>
            <span className="schedule-ops-week-card-events is-status-summary">
              <StatusLineTotals events={events} />
            </span>
            <span className="schedule-ops-week-card-footer">
              <span className="schedule-ops-week-team" aria-label={`${activeStaff.size} staff scheduled`}>
                {[...activeStaff].slice(0, 3).map(staffId => {
                  const member = staff.find(item => item.id === staffId);
                  return member ? <StaffAvatar key={staffId} calendar={member} compact /> : null;
                })}
              </span>
              {summary.pending ? <span className="schedule-ops-attention"><AlertTriangle size={12} /> {summary.pending} pending</span> : <span className="schedule-ops-open-day">Open day <ChevronRight size={13} /></span>}
            </span>
          </button>
        );
      })}
    </section>
  );
}

function MonthCard({ date, getAgendaEvents, getEvents, getSummary, month, onOpenDay, staff, todayStr }) {
  const key = toDateKey(date);
  const summary = getSummary(key);
  const activeStaff = new Set(getEvents(key).map(event => event.staffId));
  return (
    <button
      type="button"
      className={`schedule-ops-week-card schedule-ops-month-card ${date.getMonth() !== month ? 'is-outside' : ''} ${key === todayStr ? 'is-today native-gradient-ring' : ''} ${summary.pending ? 'has-attention' : ''}`}
      data-testid={`schedule-month-day-${key}`}
      onClick={() => onOpenDay(key)}
    >
      <span className="schedule-ops-week-card-date"><em>{formatDayLabel(date)}</em><strong>{date.getDate()}</strong></span>
      <span className="schedule-ops-week-card-metrics"><span>{summary.open || 0} open</span></span>
      <span className="schedule-ops-week-card-events is-status-summary">
        <StatusLineTotals events={getAgendaEvents(key)} />
      </span>
      <span className="schedule-ops-week-card-footer">
        <span className="schedule-ops-week-team" aria-label={`${activeStaff.size} staff scheduled`}>
          {[...activeStaff].slice(0, 3).map(staffId => {
            const member = staff.find(item => item.id === staffId);
            return member ? <StaffAvatar key={staffId} calendar={member} compact /> : null;
          })}
        </span>
        {summary.pending ? <span className="schedule-ops-attention"><AlertTriangle size={12} /> {summary.pending} pending</span> : <span className="schedule-ops-open-day">Open day <ChevronRight size={13} /></span>}
      </span>
    </button>
  );
}

function MonthSection({ anchorDate, getAgendaEvents, getEvents, getSummary, isFirst = false, onOpenDay, staff, todayStr }) {
  const dateKey = toDateKey(anchorDate);
  const dates = getMonthDates(dateKey);
  const month = anchorDate.getMonth();
  return (
    <section className="schedule-ops-month-section" aria-label={`${getMonthTitle(anchorDate)} workload`}>
      <header className={`schedule-ops-month-section-head ${isFirst ? 'is-hidden' : ''}`}>
        <h3>{getMonthTitle(anchorDate)}</h3>
      </header>
      <div className="schedule-ops-month-weekdays" aria-hidden="true">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span key={day}>{day}</span>)}
      </div>
      <div className="schedule-ops-month-grid">
        {dates.map(date => <MonthCard key={toDateKey(date)} date={date} getAgendaEvents={getAgendaEvents} getEvents={getEvents} getSummary={getSummary} month={month} onOpenDay={onOpenDay} staff={staff} todayStr={todayStr} />)}
      </div>
    </section>
  );
}

function MonthPulse({ dateKey, getAgendaEvents, getEvents, getSummary, onMonthWindowChange, onOpenDay, staff, todayStr }) {
  const [visibleMonths, setVisibleMonths] = useState(2);
  const sentinelRef = useRef(null);
  const lastWheelLoadRef = useRef(0);
  const anchor = fromDateKey(dateKey);
  const monthKey = `${anchor.getFullYear()}-${anchor.getMonth()}`;
  const monthAnchors = useMemo(() => (
    Array.from({ length: visibleMonths }, (_, index) => addMonths(anchor, index))
  ), [monthKey, visibleMonths]);

  useEffect(() => {
    setVisibleMonths(2);
  }, [monthKey]);

  useEffect(() => {
    onMonthWindowChange?.(visibleMonths);
  }, [onMonthWindowChange, visibleMonths]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') return undefined;
    const loadMore = () => setVisibleMonths(count => Math.min(count + 1, 36));
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) loadMore();
    }, { root: null, rootMargin: '900px 0px', threshold: 0.01 });
    observer.observe(sentinel);
    const handleScroll = () => {
      const rect = sentinel.getBoundingClientRect();
      if (rect.top < window.innerHeight + 900) loadMore();
    };
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, []);

  const handleWheel = event => {
    if (event.deltaY <= 0) return;
    const now = Date.now();
    if (now - lastWheelLoadRef.current < 650) return;
    lastWheelLoadRef.current = now;
    setVisibleMonths(count => Math.min(count + 1, 36));
  };

  return (
    <section className="schedule-ops-month-pulse" aria-label="Monthly workload view" onWheel={handleWheel}>
      {monthAnchors.map((monthDate, index) => (
        <MonthSection key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`} anchorDate={monthDate} getAgendaEvents={getAgendaEvents} getEvents={getEvents} getSummary={getSummary} isFirst={index === 0} onOpenDay={onOpenDay} staff={staff} todayStr={todayStr} />
      ))}
      <div ref={sentinelRef} className="schedule-ops-month-loader" aria-hidden="true" />
    </section>
  );
}

function getAgendaDates(dateKey, rangeView) {
  const anchor = fromDateKey(dateKey);
  if (rangeView === 'week') return getWeekDates(dateKey);
  if (rangeView === 'month') {
    const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, index) => new Date(anchor.getFullYear(), anchor.getMonth(), index + 1));
  }
  return [anchor];
}

function AgendaDayRow({ date, events, isSelected, onOpenEvent, summary }) {
  const dateKey = toDateKey(date);
  const [isOpen, setIsOpen] = useState(isSelected);

  useEffect(() => {
    setIsOpen(isSelected);
  }, [dateKey, isSelected]);

  return (
    <article className={`schedule-ops-agenda-day ${isOpen ? 'is-open' : ''}`} data-testid={`schedule-agenda-day-${dateKey}`}>
      <button
        type="button"
        className="schedule-ops-agenda-day-toggle"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(open => !open)}
      >
        <span className="schedule-ops-agenda-day-date">
          <em>{formatDayLabel(date)}</em>
          <strong>{date.getDate()}</strong>
          <small>{formatAgendaDate(date)}</small>
        </span>
        <span className="schedule-ops-agenda-day-summary">
          <strong>{events.length}</strong>
          <small>{events.length === 1 ? 'booking' : 'bookings'}</small>
          {summary.pending ? <i className="is-attention">{summary.pending} pending</i> : <i>{summary.open || 0} open</i>}
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {isOpen ? (
        <div className="schedule-ops-agenda-day-body">
          {events.length ? events.map(event => <EventCard key={event.eventKey || event.id} event={event} onOpen={onOpenEvent} />) : (
            <p>Nothing scheduled for this day.</p>
          )}
        </div>
      ) : null}
    </article>
  );
}

function AgendaBoard({ dateKey, getAgendaEvents, getSummary, onOpenEvent, rangeView }) {
  const agendaDays = getAgendaDates(dateKey, rangeView).map(date => {
    const key = toDateKey(date);
    return {
      date,
      events: getAgendaEvents(key),
      key,
      summary: getSummary(key)
    };
  });
  const bookingCount = agendaDays.reduce((total, day) => total + day.events.length, 0);
  const leadIn = rangeView === 'day' ? 'Selected day' : rangeView === 'week' ? 'Week ahead' : 'Month ahead';

  return (
    <section className="schedule-ops-agenda" aria-label="Schedule list">
      <header><div><p>{leadIn}</p><h3>List</h3></div><span><CalendarDays size={16} /> {bookingCount} {bookingCount === 1 ? 'booking' : 'bookings'}</span></header>
      <div className="schedule-ops-agenda-days">
        {agendaDays.map(day => (
          <AgendaDayRow
            key={day.key}
            date={day.date}
            events={day.events}
            isSelected={day.key === dateKey}
            onOpenEvent={onOpenEvent}
            summary={day.summary}
          />
        ))}
      </div>
    </section>
  );
}

export function ScheduleOperationsBoard({
  agendaOpen,
  calendarView,
  calendars,
  dateTitle,
  eventsByDate,
  getAvailability,
  getSummary,
  onChangeView,
  onCreate,
  onMove,
  onMonthWindowChange,
  onOpenEvent,
  onOpenSettings,
  onSelectCalendar,
  onSelectScheduleType,
  onSelectDate,
  onToday,
  onToggleAgenda,
  readOnly,
  mobile = false,
  selectedCalendarId,
  selectedScheduleType = 'appointment',
  scheduleTypes = [],
  selectedDate,
  todayStr,
  view
}) {
  const scopeStaff = useMemo(() => {
    if (selectedCalendarId === 'workspace') return calendars.filter(calendar => calendar.id !== 'workspace');
    return calendars.filter(calendar => calendar.id === selectedCalendarId);
  }, [calendars, selectedCalendarId]);
  const getEvents = (dateKey, staffId = '') => {
    const dayEvents = eventsByDate.get(dateKey) || [];
    return dayEvents.filter(event => event.isScheduled !== false && (!staffId || event.staffId === staffId));
  };
  const getAgendaEvents = (dateKey, staffId = '') => {
    const dayEvents = eventsByDate.get(dateKey) || [];
    return dayEvents.filter(event => event.status !== 'declined' && (!staffId || event.staffId === staffId));
  };
  const periodDates = useMemo(() => {
    const period = agendaOpen ? calendarView : view;
    if (period === 'week') return getWeekDates(selectedDate).map(toDateKey);
    if (period === 'month') return getCalendarMonthDates(selectedDate).map(toDateKey);
    return [selectedDate];
  }, [agendaOpen, calendarView, selectedDate, view]);
  const statusTotals = useMemo(() => {
    const totals = Object.fromEntries(STATUS_LEGEND.map(([status]) => [status, 0]));
    periodDates.forEach(dateKey => {
      getAgendaEvents(dateKey).forEach(event => {
        if (Object.prototype.hasOwnProperty.call(totals, event.status)) totals[event.status] += 1;
      });
    });
    return totals;
  }, [getAgendaEvents, periodDates]);
  const openDay = dateKey => {
    onSelectDate(dateKey);
    onChangeView('day');
  };

  return (
    <section className="schedule-operations-board" data-testid="schedule-operations-board">
      <ScheduleOperationsToolbar
        agendaOpen={agendaOpen}
        dateTitle={dateTitle}
        onChangeView={onChangeView}
        onCreate={() => onCreate({ dateKey: selectedDate, staffId: selectedCalendarId === 'workspace' ? scopeStaff[0]?.id || '' : selectedCalendarId, time: '09:00' })}
        onMove={onMove}
        onOpenSettings={onOpenSettings}
        onToday={onToday}
        onToggleAgenda={onToggleAgenda}
        readOnly={readOnly}
        view={view}
      />
      <div className="schedule-ops-context-rail">
        <ScheduleScopeRail calendars={calendars} onSelectCalendar={onSelectCalendar} selectedCalendarId={selectedCalendarId} />
        <ScheduleStatusLegend totals={statusTotals} />
      </div>
      <ScheduleTypeRail scheduleTypes={scheduleTypes} selectedScheduleType={selectedScheduleType} onSelectScheduleType={onSelectScheduleType} />

      {!agendaOpen && view === 'day' ? (
        <>
          {mobile ? (
            <MobileDayBoard dateKey={selectedDate} getAvailability={getAvailability} getEvents={getEvents} onCreate={onCreate} onOpenEvent={onOpenEvent} readOnly={readOnly} staff={scopeStaff} />
          ) : (
            <DesktopDayBoard dateKey={selectedDate} getAvailability={getAvailability} getEvents={getEvents} onCreate={onCreate} onOpenEvent={onOpenEvent} readOnly={readOnly} staff={scopeStaff} />
          )}
        </>
      ) : null}
      {!agendaOpen && view === 'week' ? <WeekPlanner dateKey={selectedDate} getAgendaEvents={getAgendaEvents} getEvents={getEvents} getSummary={getSummary} onOpenDay={openDay} staff={scopeStaff} todayStr={todayStr} /> : null}
      {!agendaOpen && view === 'month' ? <MonthPulse dateKey={selectedDate} getAgendaEvents={getAgendaEvents} getEvents={getEvents} getSummary={getSummary} onMonthWindowChange={onMonthWindowChange} onOpenDay={openDay} staff={scopeStaff} todayStr={todayStr} /> : null}
      {agendaOpen ? <AgendaBoard dateKey={selectedDate} getAgendaEvents={getAgendaEvents} getSummary={getSummary} onOpenEvent={onOpenEvent} rangeView={calendarView} /> : null}
    </section>
  );
}
