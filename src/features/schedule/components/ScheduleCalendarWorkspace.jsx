import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  Hourglass,
  List,
  MessageCircle,
  Plus,
  RefreshCw,
  Settings2,
  Users,
  X
} from 'lucide-react';
import { getLocalDateStr } from '../../../utils/dates';
import { getBookingDateKey, getSlotStartMinutes } from '../utils/businessCalendarUtils';
import { getCalendarDayConfig } from '../utils/scheduleWorkspaceModel';

const EMPTY_LIST = [];
const VIEW_OPTIONS = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'list', label: 'List', icon: List }
];
const STATUS_OPTIONS = ['confirmed', 'pending', 'completed', 'waitlist'];
const PREFERENCE_KEY = 'bookify:schedule-view:v1';
const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 44;
const GRID_TOP_INSET = 22;
const EVENT_HEIGHT = 64;

const fromDateKey = (dateKey) => new Date(`${dateKey}T00:00:00`);
const toDateKey = (date) => getLocalDateStr(date);
const addDays = (date, amount) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};
const startOfWeek = (date) => addDays(date, -((date.getDay() + 6) % 7));
const firstName = (value = '') => String(value || '').trim().split(/\s+/)[0] || 'Staff';
const formatDay = (date) => date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const formatMonthTitle = (date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
const getOrdinalSuffix = (day) => {
  const value = day % 100;
  if (value >= 11 && value <= 13) return 'th';
  if (day % 10 === 1) return 'st';
  if (day % 10 === 2) return 'nd';
  if (day % 10 === 3) return 'rd';
  return 'th';
};
const formatOrdinalMonthDay = date => (
  `${date.toLocaleDateString('en-US', { month: 'short' })} ${date.getDate()}${getOrdinalSuffix(date.getDate())}`
);
const formatBookingDate = (dateKey) => fromDateKey(dateKey).toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric'
});
const parseDuration = (booking, service) => {
  const raw = booking.serviceDuration ?? service?.duration ?? 60;
  const duration = Number.parseInt(String(raw).match(/\d+/)?.[0] || '60', 10);
  return Number.isFinite(duration) ? Math.max(30, duration) : 60;
};
const getServiceImage = (service = {}) => service.imageUrls?.[0] || service.imageUrl || service.image || '';
const getStaffPhoto = (booking = {}, staff = {}) => booking.staffPhotoURL || staff.photoURL || staff.avatar || '';
const normalizeStatus = status => status === 'waitlisted' ? 'waitlist' : status || 'confirmed';
const PENDING_RESCHEDULE_STATUSES = new Set(['pending', 'requested', 'countered', 'offered']);
const hasPendingReschedule = (booking = {}) => [
  booking.rescheduleStatus,
  booking.reschedule?.status,
  booking.rescheduleRequest?.status
].some(value => PENDING_RESCHEDULE_STATUSES.has(String(value || '').toLowerCase()));
const getSummaryStats = (events = []) => events.reduce((stats, event) => {
  const bookingCount = event.bookings.length;
  if (event.status === 'confirmed') stats.confirmed += bookingCount;
  if (event.status === 'pending') stats.pending += bookingCount;
  if (event.status === 'waitlist') stats.waitlist += bookingCount;
  stats.reschedule += event.bookings.filter(hasPendingReschedule).length;
  return stats;
}, { confirmed: 0, pending: 0, waitlist: 0, reschedule: 0 });

function readPreferences(contextKey, mobile) {
  const fallback = mobile ? 'day' : contextKey === 'workspace' ? 'week' : 'day';
  if (typeof window === 'undefined') {
    return { view: fallback, serviceId: '', status: '' };
  }
  try {
    const saved = JSON.parse(window.localStorage.getItem(PREFERENCE_KEY) || '{}');
    const preference = saved?.[contextKey] || {};
    const savedView = VIEW_OPTIONS.some(option => option.id === preference.view) ? preference.view : fallback;
    return {
      view: mobile && !['day', 'list'].includes(savedView) ? 'day' : savedView,
      serviceId: String(preference.selectedServiceId || ''),
      status: String(preference.selectedStatus || '')
    };
  } catch {
    return { view: fallback, serviceId: '', status: '' };
  }
}

function writePreferences(contextKey, payload) {
  if (typeof window === 'undefined') return;
  try {
    const saved = JSON.parse(window.localStorage.getItem(PREFERENCE_KEY) || '{}');
    window.localStorage.setItem(PREFERENCE_KEY, JSON.stringify({ ...saved, [contextKey]: payload }));
  } catch {
    // Preference persistence should never block the calendar.
  }
}

function getWeekDates(dateKey) {
  const first = startOfWeek(fromDateKey(dateKey));
  return Array.from({ length: 7 }, (_, index) => addDays(first, index));
}

function getMonthDates(dateKey) {
  const anchor = fromDateKey(dateKey);
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

function getDateTitle(view, selectedDate) {
  const date = fromDateKey(selectedDate);
  if (view === 'month') return formatMonthTitle(date);
  if (view === 'week') {
    const dates = getWeekDates(selectedDate);
    const first = dates[0];
    const last = dates[6];
    if (first.getMonth() === last.getMonth()) {
      return `${first.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${last.getDate()}, ${last.getFullYear()}`;
    }
    return `${first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${last.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function groupCalendarEvents(events) {
  const groups = new Map();
  events.forEach(event => {
    const key = [event.dateKey, event.time, event.serviceId || event.serviceName, event.staffId || 'unassigned'].join('|');
    const group = groups.get(key);
    if (group) {
      group.bookings.push(event.booking);
      group.endMinutes = Math.max(group.endMinutes, event.endMinutes);
      if (event.status === 'pending') group.status = 'pending';
      return;
    }
    groups.set(key, { ...event, bookings: [event.booking] });
  });
  return [...groups.values()].sort((left, right) => (
    left.dateKey.localeCompare(right.dateKey) ||
    left.startMinutes - right.startMinutes ||
    left.serviceName.localeCompare(right.serviceName)
  ));
}

function layoutOverlappingEvents(events) {
  const sorted = [...events].sort((left, right) => left.startMinutes - right.startMinutes || left.endMinutes - right.endMinutes);
  const result = [];
  let cluster = [];
  let clusterEnd = -1;

  const flush = () => {
    if (!cluster.length) return;
    if (cluster.length > 2) {
      const visible = cluster[0];
      result.push({
        ...visible,
        id: `cluster-${cluster.map(event => event.id).join('-')}`,
        bookings: cluster.flatMap(event => event.bookings),
        column: 0,
        columns: 1,
        isOverflowGroup: true,
        overflowCount: cluster.length - 1
      });
      cluster = [];
      return;
    }
    const columnEnds = [];
    const assigned = cluster.map(event => {
      let column = columnEnds.findIndex(end => end <= event.startMinutes);
      if (column === -1) {
        column = columnEnds.length;
        columnEnds.push(event.endMinutes);
      } else {
        columnEnds[column] = event.endMinutes;
      }
      return { ...event, column };
    });
    const columns = Math.max(1, columnEnds.length);
    assigned.forEach(event => result.push({ ...event, columns }));
    cluster = [];
  };

  sorted.forEach(event => {
    if (cluster.length && event.startMinutes >= clusterEnd) flush();
    cluster.push(event);
    clusterEnd = Math.max(clusterEnd, event.endMinutes);
  });
  flush();
  return result;
}

function CalendarToolbar({
  calendars,
  dateTitle,
  filtersOpen,
  onChangeService,
  onChangeStatus,
  onChangeView,
  onCreate,
  onMove,
  onOpenSettings,
  onSelectCalendar,
  onToday,
  onToggleFilters,
  readOnly,
  selectedCalendarId,
  selectedServiceId,
  selectedStatus,
  services,
  view
}) {
  const selectedCalendar = calendars.find(calendar => calendar.id === selectedCalendarId) || calendars[0];
  return (
    <header className="schedule-calendar-toolbar">
      <div className="schedule-calendar-date-nav">
        <button type="button" className="schedule-calendar-today" onClick={onToday}>Today</button>
        <div className="schedule-calendar-arrows">
          <button type="button" onClick={() => onMove(-1)} aria-label="Previous date range"><ChevronLeft size={17} /></button>
          <button type="button" onClick={() => onMove(1)} aria-label="Next date range"><ChevronRight size={17} /></button>
        </div>
        <h2>{dateTitle}</h2>
      </div>

      <div className="schedule-calendar-toolbar-actions">
        <div className="schedule-calendar-view-switcher" aria-label="Calendar view">
          {VIEW_OPTIONS.map(option => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                data-view={option.id}
                className={view === option.id ? 'is-active' : ''}
                onClick={() => onChangeView(option.id)}
                aria-pressed={view === option.id}
              >
                {Icon ? <Icon size={13} /> : null}
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="schedule-calendar-filter-wrap">
          <button
            type="button"
            className={`schedule-calendar-filter-trigger ${filtersOpen || selectedServiceId || selectedStatus ? 'is-active' : ''}`}
            onClick={onToggleFilters}
            aria-expanded={filtersOpen}
            aria-label="Calendar filters"
          >
            <Filter size={15} />
            <span>{selectedCalendar?.shortName || selectedCalendar?.name || 'All staff'}</span>
            <ChevronDown size={13} />
          </button>
          {filtersOpen ? (
            <div className="schedule-calendar-filter-popover">
              <p>Calendar</p>
              <div className="schedule-calendar-staff-options">
                {calendars.map(calendar => (
                  <button
                    key={calendar.id}
                    type="button"
                    className={selectedCalendarId === calendar.id ? 'is-active' : ''}
                    onClick={() => onSelectCalendar(calendar.id)}
                  >
                    <span className="schedule-calendar-filter-avatar" style={{ '--staff-color': calendar.color || '#111827' }}>
                      {calendar.photoURL ? <img src={calendar.photoURL} alt="" /> : calendar.id === 'workspace' ? <Users size={14} /> : firstName(calendar.name).charAt(0)}
                    </span>
                    <span>
                      <strong>{calendar.shortName || calendar.name}</strong>
                      <small>{calendar.role || 'Calendar'}</small>
                    </span>
                    {selectedCalendarId === calendar.id ? <Check size={14} /> : null}
                  </button>
                ))}
              </div>
              <label>
                <span>Service</span>
                <select value={selectedServiceId} onChange={event => onChangeService(event.target.value)}>
                  <option value="">All services</option>
                  {services.map(service => <option key={service.id || service.name} value={service.id || service.name}>{service.name}</option>)}
                </select>
              </label>
              <label>
                <span>Status</span>
                <select value={selectedStatus} onChange={event => onChangeStatus(event.target.value)}>
                  <option value="">All statuses</option>
                  {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}
                </select>
              </label>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="schedule-calendar-settings"
          onClick={onOpenSettings}
          aria-label="Schedule settings"
          disabled={readOnly}
          title={readOnly ? 'Example data is read only' : 'Schedule settings'}
        >
          <Settings2 size={16} />
        </button>
        <button
          type="button"
          className="schedule-calendar-create native-gradient-button"
          onClick={onCreate}
          disabled={readOnly}
          title={readOnly ? 'Example data is read only' : 'Create booking'}
        >
          <Plus size={16} />
          <span>New booking</span>
        </button>
      </div>
    </header>
  );
}

function CalendarEvent({ density, event, minMinutes, onOpen, slotHeight }) {
  const top = GRID_TOP_INSET + ((event.startMinutes - minMinutes) / SLOT_MINUTES) * slotHeight + 2;
  const height = EVENT_HEIGHT;
  const width = 100 / event.columns;
  const left = event.column * width;
  const statusLabel = event.status === 'waitlist'
    ? 'Waitlist'
    : event.status === 'pending'
      ? 'Pending'
      : event.status === 'completed'
        ? 'Completed'
        : 'Confirmed';
  return (
    <button
      type="button"
      className={`schedule-calendar-event is-${event.status || 'confirmed'} is-${density} ${event.isOverflowGroup ? 'is-overflow-group' : ''}`}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        left: `calc(${left}% + 0.18rem)`,
        width: `calc(${width}% - 0.36rem)`
      }}
      onClick={target => onOpen(event, target.currentTarget)}
      title={`${event.time} · ${event.clientName}${event.isOverflowGroup ? ` · ${event.overflowCount} more appointments` : ` · ${event.serviceName}`}`}
      aria-label={event.isOverflowGroup
        ? `${event.time}, ${event.clientName} and ${event.overflowCount} more appointments`
        : `${event.time}, ${event.bookings.length > 1 ? `${event.bookings.length} attendees` : event.clientName}, ${event.serviceName}, ${firstName(event.staffName)}, ${statusLabel}`}
    >
      <span className="schedule-calendar-event-accent" aria-hidden="true" />
      {event.isOverflowGroup ? (
        <span className="schedule-calendar-event-overflow-count">
          +{event.overflowCount}<span className="schedule-calendar-event-overflow-word"> more</span>
        </span>
      ) : null}
      <span className="schedule-calendar-event-title">
        {event.isOverflowGroup ? event.clientName : event.bookings.length > 1 ? event.serviceName : event.clientName}
      </span>
      <span className="schedule-calendar-event-meta">
        <span className="schedule-calendar-event-media">
          {event.serviceImage ? <img src={event.serviceImage} alt="" /> : event.serviceName.charAt(0)}
        </span>
        <span>{event.bookings.length > 1 && !event.isOverflowGroup ? `${event.bookings.length} clients` : event.serviceName}</span>
      </span>
    </button>
  );
}

function ResourceDayEvent({ event, minMinutes, onOpen }) {
  const startSlots = (event.startMinutes - minMinutes) / SLOT_MINUTES;
  const statusLabel = event.status === 'waitlist'
    ? 'Waitlist'
    : event.status === 'pending'
      ? 'Pending'
      : event.status === 'completed'
        ? 'Completed'
        : 'Confirmed';
  return (
    <button
      type="button"
      className={`schedule-resource-day-event is-${event.status || 'confirmed'} ${event.isOverflowGroup ? 'is-overflow-group' : ''}`}
      style={{
        left: `calc(${startSlots} * var(--resource-time-slot-width) + 0.22rem)`,
        width: 'var(--resource-event-width)'
      }}
      onClick={target => onOpen(event, target.currentTarget)}
      title={`${event.time} - ${event.clientName} - ${event.serviceName}`}
      aria-label={event.isOverflowGroup
        ? `${event.time}, ${event.clientName} and ${event.overflowCount} more appointments`
        : `${event.time}, ${event.bookings.length > 1 ? `${event.bookings.length} attendees` : event.clientName}, ${event.serviceName}, ${firstName(event.staffName)}, ${statusLabel}`}
    >
      <span className="schedule-calendar-event-accent" aria-hidden="true" />
      {event.isOverflowGroup ? (
        <span className="schedule-calendar-event-overflow-count">+{event.overflowCount}</span>
      ) : null}
      <strong>{event.bookings.length > 1 ? event.serviceName : event.clientName}</strong>
      <span>
        <i className="schedule-calendar-event-media">
          {event.serviceImage ? <img src={event.serviceImage} alt="" /> : event.serviceName.charAt(0)}
        </i>
        <span>{event.bookings.length > 1 ? `${event.bookings.length} clients` : event.serviceName}</span>
      </span>
    </button>
  );
}

function ResourceDayGrid({
  events,
  maxHour,
  minHour,
  onCreate,
  onOpenEvent,
  readOnly,
  resources,
  settings,
  todayStr
}) {
  const bodyRef = useRef(null);
  const minMinutes = minHour * 60;
  const slotCount = (maxHour - minHour) * 2;
  const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const slots = Array.from({ length: slotCount }, (_, index) => {
    const minutes = minMinutes + index * SLOT_MINUTES;
    return {
      minutes,
      time: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
    };
  });

  const handleCellKeyDown = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    const cells = [...bodyRef.current.querySelectorAll('[data-calendar-cell]')];
    const index = cells.indexOf(event.currentTarget);
    const delta = event.key === 'ArrowLeft' ? -1
      : event.key === 'ArrowRight' ? 1
        : event.key === 'ArrowUp' ? -slotCount
          : slotCount;
    const target = cells[index + delta];
    if (target) {
      event.preventDefault();
      target.focus();
    }
  };

  return (
    <div className="schedule-resource-day-scroll">
      <div
        className="schedule-resource-day-grid"
        style={{ '--resource-slot-count': slotCount, '--resource-row-count': resources.length }}
      >
        <div className="schedule-resource-day-header">
          <span className="schedule-resource-day-corner">Team</span>
          <div className="schedule-resource-day-time-track">
            {slots.map((slot, index) => (
              <span key={slot.time} className={index % 2 ? 'is-half-hour' : ''}>
                {index % 2 ? '' : slot.time}
              </span>
            ))}
          </div>
        </div>
        <div ref={bodyRef} className="schedule-resource-day-rows">
          {resources.map(resource => {
            const resourceConfig = getCalendarDayConfig(settings, resource.staffId || 'workspace', resource.dateKey);
            const allowedTimes = new Set(resourceConfig.times || []);
            const resourceEvents = layoutOverlappingEvents(events.filter(event => (
              event.dateKey === resource.dateKey && event.staffId === resource.staffId
            )));
            return (
              <div key={resource.id} className={`schedule-resource-day-row ${resourceConfig.available ? '' : 'is-closed'}`}>
                <div className="schedule-resource-day-staff">
                  {resource.photoURL ? <img src={resource.photoURL} alt="" /> : <span>{resource.label.charAt(0)}</span>}
                  <strong>{resource.label}</strong>
                </div>
                <div className="schedule-resource-day-track">
                  {slots.map(slot => {
                    const available = resourceConfig.available && (!allowedTimes.size || allowedTimes.has(slot.time));
                    const past = resource.dateKey < todayStr || (resource.dateKey === todayStr && slot.minutes < currentMinutes);
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        data-calendar-cell
                        className={`schedule-resource-day-cell ${available ? 'is-available' : 'is-unavailable'}`}
                        onClick={() => onCreate({ dateKey: resource.dateKey, time: slot.time, staffId: resource.staffId })}
                        onKeyDown={handleCellKeyDown}
                        disabled={!available || past || readOnly}
                        aria-label={`${available ? 'Create booking' : 'Unavailable'} ${formatDay(fromDateKey(resource.dateKey))} at ${slot.time} with ${resource.staffName}`}
                      />
                    );
                  })}
                  {resource.dateKey === todayStr && currentMinutes >= minMinutes && currentMinutes <= maxHour * 60 ? (
                    <span
                      className="schedule-resource-current-time"
                      style={{ left: `calc(${(currentMinutes - minMinutes) / SLOT_MINUTES} * var(--resource-time-slot-width))` }}
                      aria-hidden="true"
                    />
                  ) : null}
                  {resourceEvents.map(event => (
                    <ResourceDayEvent key={event.id} event={event} minMinutes={minMinutes} onOpen={onOpenEvent} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TimeGrid({
  events,
  minHour,
  mode,
  onCreate,
  onOpenEvent,
  readOnly,
  resources,
  settings,
  todayStr
}) {
  const bodyRef = useRef(null);
  const minMinutes = minHour * 60;
  const maxHour = Math.max(minHour + 8, Math.ceil(Math.max(minMinutes + 480, ...events.map(event => event.endMinutes)) / 60));
  const slotCount = (maxHour - minHour) * 2;
  const gridHeight = GRID_TOP_INSET + slotCount * SLOT_HEIGHT;
  const labels = Array.from({ length: maxHour - minHour + 1 }, (_, index) => minHour + index);
  const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  if (mode === 'resource-day') {
    return (
      <ResourceDayGrid
        events={events}
        maxHour={maxHour}
        minHour={minHour}
        onCreate={onCreate}
        onOpenEvent={onOpenEvent}
        readOnly={readOnly}
        resources={resources}
        settings={settings}
        todayStr={todayStr}
      />
    );
  }

  const handleCellKeyDown = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    const cells = [...bodyRef.current.querySelectorAll('[data-calendar-cell]')];
    const index = cells.indexOf(event.currentTarget);
    const columnCount = Math.max(1, resources.length);
    const delta = event.key === 'ArrowLeft' ? -slotCount
      : event.key === 'ArrowRight' ? slotCount
        : event.key === 'ArrowUp' ? -1
          : 1;
    const target = cells[index + delta] || cells[index + (event.key === 'ArrowLeft' ? -columnCount : event.key === 'ArrowRight' ? columnCount : 0)];
    if (target) {
      event.preventDefault();
      target.focus();
    }
  };

  return (
    <div className="schedule-time-grid-scroll">
      <div className={`schedule-time-grid is-${mode}`} style={{ '--resource-count': resources.length }}>
        <div className="schedule-time-grid-header">
          <span className="schedule-time-grid-corner" />
          {resources.map(resource => (
            <div key={resource.id} className={`schedule-time-grid-resource ${resource.dateKey === todayStr ? 'is-today' : ''}`}>
              {resource.photoURL ? <img src={resource.photoURL} alt="" /> : null}
              <span>
                <strong>{resource.label}</strong>
                {resource.subLabel ? <small>{resource.subLabel}</small> : null}
              </span>
            </div>
          ))}
        </div>
        <div ref={bodyRef} className="schedule-time-grid-body">
          <div className="schedule-time-axis" style={{ height: `${gridHeight}px` }}>
            {labels.map(hour => (
              <span key={hour} style={{ top: `${GRID_TOP_INSET + (hour - minHour) * SLOT_HEIGHT * 2}px` }}>{String(hour).padStart(2, '0')}:00</span>
            ))}
          </div>
          {resources.map(resource => {
            const resourceConfig = getCalendarDayConfig(settings, resource.staffId || 'workspace', resource.dateKey);
            const allowedTimes = new Set(resourceConfig.times || []);
            const resourceEvents = layoutOverlappingEvents(events.filter(event => (
              event.dateKey === resource.dateKey &&
              (!resource.staffId || event.staffId === resource.staffId)
            )));
            return (
              <div
                key={resource.id}
                className={`schedule-time-grid-column ${resourceConfig.available ? '' : 'is-closed'}`}
                style={{ height: `${gridHeight}px` }}
              >
                {Array.from({ length: slotCount }, (_, index) => {
                  const minutes = minMinutes + index * SLOT_MINUTES;
                  const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
                  const available = resourceConfig.available && (!allowedTimes.size || allowedTimes.has(time));
                  const past = resource.dateKey < todayStr || (resource.dateKey === todayStr && minutes < currentMinutes);
                  return (
                    <button
                      key={time}
                      type="button"
                      data-calendar-cell
                      className={`schedule-time-grid-cell ${available ? 'is-available' : 'is-unavailable'}`}
                      style={{ top: `${GRID_TOP_INSET + index * SLOT_HEIGHT}px`, height: `${SLOT_HEIGHT}px` }}
                      onClick={() => onCreate({ dateKey: resource.dateKey, time, staffId: resource.staffId || '' })}
                      onKeyDown={handleCellKeyDown}
                      disabled={!available || past || readOnly}
                      aria-label={`${available ? 'Create booking' : 'Unavailable'} ${formatDay(fromDateKey(resource.dateKey))} at ${time}${resource.staffName ? ` with ${resource.staffName}` : ''}`}
                    />
                  );
                })}
                {resource.dateKey === todayStr && currentMinutes >= minMinutes && currentMinutes <= maxHour * 60 ? (
                  <span className="schedule-current-time" style={{ top: `${GRID_TOP_INSET + ((currentMinutes - minMinutes) / SLOT_MINUTES) * SLOT_HEIGHT}px` }} aria-hidden="true" />
                ) : null}
                {!resourceEvents.length && resourceConfig.available ? (
                  <span className="schedule-time-grid-hint" style={{ top: `${GRID_TOP_INSET + Math.max(1, (9 * 60 - minMinutes) / SLOT_MINUTES) * SLOT_HEIGHT}px` }}>
                    {readOnly ? 'No appointments' : 'Click a time to create a booking'}
                  </span>
                ) : null}
                {resourceEvents.map(event => (
                  <CalendarEvent
                    key={event.id}
                    density={resources.length === 1 ? 'focused' : resources.length >= 7 ? 'compact' : 'standard'}
                    event={event}
                    minMinutes={minMinutes}
                    onOpen={onOpenEvent}
                    slotHeight={SLOT_HEIGHT}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SummaryStatusStats({ stats }) {
  const items = [
    { id: 'confirmed', label: 'Confirmed', Icon: Check },
    { id: 'pending', label: 'Pending', Icon: Hourglass },
    { id: 'waitlist', label: 'Waitlist', Icon: Clock3 },
    { id: 'reschedule', label: 'Reschedule', Icon: RefreshCw }
  ];
  return (
    <span className="schedule-summary-stats">
      {items.map(({ id, label, Icon }) => (
        <span
          key={id}
          className={`is-${id} ${stats[id] ? 'has-value' : ''}`}
          aria-label={`${label}: ${stats[id]}`}
          title={`${label}: ${stats[id]}`}
        >
          <Icon size={11} aria-hidden="true" />
          <strong>{stats[id]}</strong>
        </span>
      ))}
    </span>
  );
}

function SummaryStatusLegend() {
  const items = [
    { id: 'confirmed', label: 'Confirmed', Icon: Check },
    { id: 'pending', label: 'Pending', Icon: Hourglass },
    { id: 'waitlist', label: 'Waitlist', Icon: Clock3 },
    { id: 'reschedule', label: 'Reschedule', Icon: RefreshCw }
  ];
  return (
    <div className="schedule-summary-legend" aria-label="Booking status legend">
      {items.map(({ id, label, Icon }) => (
        <span key={id} className={`is-${id}`}>
          <Icon size={12} aria-hidden="true" />
          {label}
        </span>
      ))}
    </div>
  );
}

function ResourceSummaryMatrix({
  dates,
  events,
  onOpenDay,
  scope = 'week',
  staffResources,
  todayStr
}) {
  return (
    <div className={`schedule-week-matrix-scroll is-${scope}`}>
      <div className="schedule-week-matrix" style={{ '--summary-column-count': dates.length }}>
        <div className="schedule-week-matrix-header">
          <span className="schedule-week-matrix-corner">Team</span>
          {dates.map(date => (
            <div
              key={date.dateKey}
              className={`${date.dateKey === todayStr ? 'is-today' : ''} ${date.dateKey >= todayStr ? 'is-current-or-future' : ''}`}
            >
              <strong>{date.label}</strong>
            </div>
          ))}
        </div>
        <div className="schedule-week-matrix-body">
          {staffResources.map(staff => (
            <div key={staff.id} className="schedule-week-matrix-row">
              <div className="schedule-week-matrix-staff">
                {staff.photoURL ? <img src={staff.photoURL} alt="" /> : <span>{staff.label.charAt(0)}</span>}
                <strong>{staff.label}</strong>
              </div>
              {dates.map(date => {
                const summaryDate = fromDateKey(date.dateKey);
                const dayEvents = events.filter(event => event.dateKey === date.dateKey && event.staffId === staff.staffId);
                const stats = getSummaryStats(dayEvents);
                const hasActivity = Object.values(stats).some(Boolean);
                return (
                  <button
                    key={date.dateKey}
                    type="button"
                    className={`schedule-week-summary-card ${hasActivity ? 'has-bookings' : ''} ${date.dateKey === todayStr ? 'is-today' : ''}`}
                    onClick={() => onOpenDay(date.dateKey, staff.staffId)}
                    aria-label={`${staff.staffName}, ${formatDay(fromDateKey(date.dateKey))}, ${stats.confirmed} confirmed, ${stats.pending} pending, ${stats.waitlist} waitlist, ${stats.reschedule} reschedule. View more`}
                  >
                    <span className="schedule-week-summary-date">
                      <span>{summaryDate.getDate()}</span>
                      <sup>{getOrdinalSuffix(summaryDate.getDate())}</sup>
                    </span>
                    <SummaryStatusStats stats={stats} />
                    <span className="schedule-week-summary-action">
                      View more
                      <ChevronRight size={13} />
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonthView({ events, onOpenDay, selectedDate, todayStr }) {
  const dates = getMonthDates(selectedDate);
  const selectedMonth = fromDateKey(selectedDate).getMonth();
  return (
    <div className="schedule-month-summary">
      <div className="schedule-month-summary-weekdays" aria-hidden="true">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span key={day}>{day}</span>)}
      </div>
      <div className="schedule-month-summary-grid">
        {dates.map(date => {
          const dateKey = toDateKey(date);
          const dayEvents = events.filter(event => event.dateKey === dateKey);
          const stats = getSummaryStats(dayEvents);
          const hasActivity = Object.values(stats).some(Boolean);
          return (
            <button
              key={dateKey}
              type="button"
              className={`schedule-month-summary-card ${date.getMonth() === selectedMonth ? '' : 'is-outside'} ${dateKey === todayStr ? 'is-today' : ''} ${dateKey >= todayStr ? 'is-current-or-future' : ''} ${hasActivity ? 'has-bookings' : ''}`}
              onClick={() => onOpenDay(dateKey)}
              aria-label={`${formatDay(date)}, ${stats.confirmed} confirmed, ${stats.pending} pending, ${stats.waitlist} waitlist, ${stats.reschedule} reschedule. View more`}
            >
              <span className="schedule-month-summary-date">
                <span>{date.getDate()}</span>
                <sup>{getOrdinalSuffix(date.getDate())}</sup>
              </span>
              <SummaryStatusStats stats={stats} />
              <span className="schedule-month-summary-action">
                View more
                <ChevronRight size={13} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BookingDrawer({
  allBookings,
  clientDirectory,
  drawer,
  onClose,
  onCreate,
  onOpenChat,
  onUpdate,
  readOnly,
  services,
  staffList
}) {
  const closeButtonRef = useRef(null);
  const groupBookings = drawer?.event?.bookings || EMPTY_LIST;
  const [activeBookingId, setActiveBookingId] = useState(groupBookings[0]?.id || '');
  const activeBooking = groupBookings.find(booking => booking.id === activeBookingId) || drawer?.booking || groupBookings[0] || null;
  const initial = activeBooking || drawer?.draft || {};
  const [form, setForm] = useState(() => ({
    clientName: initial.clientName || '',
    clientEmail: initial.clientEmail || '',
    clientPhone: initial.clientPhone || '',
    dateKey: initial.dateKey || drawer?.draft?.dateKey || '',
    time: initial.time || drawer?.draft?.time || '',
    serviceId: initial.serviceId || '',
    staffId: initial.staffId || drawer?.draft?.staffId || '',
    status: initial.status || 'confirmed'
  }));
  const [saving, setSaving] = useState(false);
  const clientOptions = clientDirectory.slice(0, 200).map((client, index) => ({
    id: client.id || client.email || `client-${index}`,
    name: client.name || client.clientName || client.fullName || '',
    email: client.email || client.clientEmail || '',
    phone: client.phone || client.clientPhone || ''
  })).filter(client => client.name);

  useEffect(() => {
    const booking = groupBookings.find(item => item.id === activeBookingId) || drawer?.booking || groupBookings[0] || drawer?.draft || {};
    setForm({
      clientName: booking.clientName || '',
      clientEmail: booking.clientEmail || '',
      clientPhone: booking.clientPhone || '',
      dateKey: booking.dateKey || drawer?.draft?.dateKey || '',
      time: booking.time || drawer?.draft?.time || '',
      serviceId: booking.serviceId || '',
      staffId: booking.staffId || drawer?.draft?.staffId || '',
      status: booking.status || 'confirmed'
    });
  }, [activeBookingId, drawer?.booking, drawer?.draft, groupBookings]);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleEscape = event => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const selectedService = services.find(service => service.id === form.serviceId);
  const conflictingBooking = allBookings.find(booking => (
    booking.id !== activeBooking?.id &&
    booking.status !== 'declined' &&
    booking.dateKey === form.dateKey &&
    booking.time === form.time &&
    booking.staffId &&
    booking.staffId === form.staffId &&
    booking.serviceId !== form.serviceId
  ));
  const canSave = form.clientName.trim() && form.dateKey && form.time && (form.serviceId || activeBooking?.serviceName);
  const updateClientName = value => {
    const client = clientOptions.find(option => option.name.toLowerCase() === value.trim().toLowerCase());
    setForm(current => ({
      ...current,
      clientName: value,
      clientEmail: client?.email || current.clientEmail,
      clientPhone: client?.phone || current.clientPhone
    }));
  };

  const submit = async event => {
    event.preventDefault();
    if (!canSave || readOnly || saving) return;
    setSaving(true);
    const selectedStaff = staffList.find(staff => staff.id === form.staffId);
    const updates = {
      clientName: form.clientName.trim(),
      clientEmail: form.clientEmail.trim(),
      clientPhone: form.clientPhone.trim(),
      dateKey: form.dateKey,
      date: formatBookingDate(form.dateKey),
      time: form.time,
      serviceId: selectedService?.id || activeBooking?.serviceId || '',
      serviceName: selectedService?.name || activeBooking?.serviceName || 'Manual service',
      serviceDescription: selectedService?.description || activeBooking?.serviceDescription || '',
      serviceDuration: selectedService?.duration || activeBooking?.serviceDuration || '',
      servicePrice: selectedService?.price ?? activeBooking?.servicePrice ?? '',
      serviceCategory: selectedService?.category || activeBooking?.serviceCategory || '',
      staffId: form.staffId,
      staffName: selectedStaff?.name || '',
      staffPhotoURL: selectedStaff?.photoURL || '',
      status: form.status
    };
    try {
      const ok = activeBooking
        ? await onUpdate?.(activeBooking.id, updates)
        : await onCreate?.({
          bookingDate: form.dateKey,
          bookingTime: form.time,
          bookingStatus: form.status,
          clientName: updates.clientName,
          clientEmail: updates.clientEmail,
          clientPhone: updates.clientPhone,
          serviceId: updates.serviceId,
          serviceName: updates.serviceName,
          staffId: form.staffId
        });
      if (ok !== false) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="schedule-booking-drawer-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <aside className="schedule-booking-drawer" role="dialog" aria-modal="true" aria-label={activeBooking ? 'Booking details' : 'Create booking'}>
        <div className="schedule-booking-drawer-head">
          <div>
            <p>{activeBooking ? 'Appointment' : 'New booking'}</p>
            <h3>{activeBooking ? activeBooking.clientName || 'Booking details' : 'Add to calendar'}</h3>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close booking drawer"><X size={17} /></button>
        </div>

        {groupBookings.length > 1 ? (
          <div className="schedule-booking-attendees">
            <p>{groupBookings.length} attendees</p>
            <div>
              {groupBookings.map(booking => (
                <button
                  key={booking.id}
                  type="button"
                  className={activeBooking?.id === booking.id ? 'is-active' : ''}
                  onClick={() => setActiveBookingId(booking.id)}
                >
                  <span>{(booking.clientName || 'C').charAt(0)}</span>
                  {booking.clientName || 'Client'}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <form onSubmit={submit}>
          {readOnly ? <div className="schedule-booking-readonly">Read-only example. Explore the booking without changing it.</div> : null}
          <div className="schedule-booking-field-grid">
            <label className="is-wide">
              <span>Client name</span>
              <input
                value={form.clientName}
                list="schedule-client-options"
                onChange={event => updateClientName(event.target.value)}
                disabled={readOnly}
                required
              />
              <datalist id="schedule-client-options">
                {clientOptions.map(client => <option key={client.id} value={client.name}>{client.email}</option>)}
              </datalist>
            </label>
            <label>
              <span>Email</span>
              <input type="email" value={form.clientEmail} onChange={event => setForm(current => ({ ...current, clientEmail: event.target.value }))} disabled={readOnly} />
            </label>
            <label>
              <span>Phone</span>
              <input value={form.clientPhone} onChange={event => setForm(current => ({ ...current, clientPhone: event.target.value }))} disabled={readOnly} />
            </label>
            <label className="is-wide">
              <span>Service</span>
              <select value={form.serviceId} onChange={event => setForm(current => ({ ...current, serviceId: event.target.value }))} disabled={readOnly}>
                <option value="">Choose a service</option>
                {services.map(service => <option key={service.id || service.name} value={service.id}>{service.name}</option>)}
              </select>
            </label>
            <label>
              <span>Date</span>
              <input type="date" value={form.dateKey} onChange={event => setForm(current => ({ ...current, dateKey: event.target.value }))} disabled={readOnly} required />
            </label>
            <label>
              <span>Time</span>
              <input type="time" value={form.time} onChange={event => setForm(current => ({ ...current, time: event.target.value }))} disabled={readOnly} required />
            </label>
            <label className="is-wide">
              <span>Assigned staff</span>
              <select value={form.staffId} onChange={event => setForm(current => ({ ...current, staffId: event.target.value }))} disabled={readOnly}>
                <option value="">Unassigned</option>
                {staffList.map(staff => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
              </select>
            </label>
            <label className="is-wide">
              <span>Status</span>
              <select value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value }))} disabled={readOnly}>
                {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}
              </select>
            </label>
          </div>
          {conflictingBooking ? (
            <div className="schedule-booking-conflict">
              <Clock3 size={15} />
              <span>{firstName(conflictingBooking.staffName)} already has {conflictingBooking.serviceName || 'another service'} at this time.</span>
            </div>
          ) : null}
          {activeBooking ? (
            <div className="schedule-booking-context">
              <span><strong>Payment</strong>{activeBooking.paymentStatus || 'Unpaid'}</span>
              <span><strong>Source</strong>{activeBooking.source || 'Dashboard'}</span>
              <span><strong>Notes</strong>{activeBooking.clientNote || 'No client notes'}</span>
            </div>
          ) : null}
          <div className="schedule-booking-drawer-actions">
            {activeBooking && onOpenChat ? (
              <button type="button" className="schedule-booking-chat" onClick={() => onOpenChat(activeBooking)}>
                <MessageCircle size={15} /> Open chat
              </button>
            ) : <span />}
            <button type="submit" className="schedule-booking-save native-gradient-button" disabled={!canSave || readOnly || saving || Boolean(conflictingBooking)}>
              {saving ? 'Saving...' : activeBooking ? 'Save changes' : 'Create booking'}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

export function ScheduleCalendarWorkspace({
  allBookings = EMPTY_LIST,
  calendars = EMPTY_LIST,
  clientDirectory = EMPTY_LIST,
  exampleMode = false,
  listView,
  onCreateBooking,
  onOpenBookingChat,
  onOpenSettings,
  onSelectCalendar,
  onSelectDate,
  onUpdateBooking,
  selectedCalendarId,
  selectedDate,
  services = EMPTY_LIST,
  settings = {},
  staffList = EMPTY_LIST,
  todayStr
}) {
  const [mobile, setMobile] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(max-width: 700px)').matches
  ));
  const [view, setView] = useState(() => readPreferences(selectedCalendarId, mobile).view);
  const [selectedServiceId, setSelectedServiceId] = useState(() => readPreferences(selectedCalendarId, mobile).serviceId);
  const [selectedStatus, setSelectedStatus] = useState(() => readPreferences(selectedCalendarId, mobile).status);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [drawer, setDrawer] = useState(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 700px)');
    const updateMobile = event => setMobile(event.matches);
    query.addEventListener('change', updateMobile);
    return () => query.removeEventListener('change', updateMobile);
  }, []);

  useEffect(() => {
    const preference = readPreferences(selectedCalendarId, mobile);
    setView(preference.view);
    setSelectedServiceId(preference.serviceId);
    setSelectedStatus(preference.status);
  }, [mobile, selectedCalendarId]);

  useEffect(() => {
    writePreferences(selectedCalendarId, { view, selectedServiceId, selectedStatus });
  }, [selectedCalendarId, selectedServiceId, selectedStatus, view]);

  useEffect(() => {
    if (!filtersOpen) return undefined;
    const closeFilters = event => {
      if (event.key === 'Escape') setFiltersOpen(false);
    };
    window.addEventListener('keydown', closeFilters);
    return () => window.removeEventListener('keydown', closeFilters);
  }, [filtersOpen]);

  const serviceMap = useMemo(() => new Map(services.map(service => [service.id || service.name, service])), [services]);
  const staffMap = useMemo(() => new Map(staffList.map(staff => [staff.id, staff])), [staffList]);
  const currentMonth = useMemo(() => fromDateKey(selectedDate), [selectedDate]);
  const events = useMemo(() => {
    const normalized = allBookings.flatMap(booking => {
      if (booking.status === 'declined' || booking.time === 'Waitlist') return [];
      const dateKey = getBookingDateKey(booking, { todayStr, currentMonth });
      const startMinutes = getSlotStartMinutes(booking.time);
      if (!dateKey || startMinutes >= 24 * 60) return [];
      const service = serviceMap.get(booking.serviceId) || services.find(item => item.name === booking.serviceName) || {};
      const staff = staffMap.get(booking.staffId) || {};
      return [{
        id: booking.id,
        booking,
        clientName: booking.clientName || 'Client',
        dateKey,
        endMinutes: startMinutes + parseDuration(booking, service),
        serviceId: booking.serviceId || service.id || '',
        serviceImage: getServiceImage(service),
        serviceName: booking.serviceName || service.name || 'Service',
        staffId: booking.staffId || '',
        staffName: booking.staffName || staff.name || 'Unassigned',
        staffPhoto: getStaffPhoto(booking, staff),
        startMinutes,
        status: normalizeStatus(booking.status),
        time: booking.time
      }];
    });
    return groupCalendarEvents(normalized).filter(event => (
      (selectedCalendarId === 'workspace' || event.staffId === selectedCalendarId) &&
      (!selectedServiceId || event.serviceId === selectedServiceId || event.serviceName === selectedServiceId) &&
      (!selectedStatus || event.status === selectedStatus)
    ));
  }, [allBookings, currentMonth, selectedCalendarId, selectedServiceId, selectedStatus, serviceMap, services, staffMap, todayStr]);

  const minHour = useMemo(() => {
    const configured = (settings.availableTimes || []).map(getSlotStartMinutes).filter(value => value < 24 * 60);
    const visibleStarts = events.map(event => event.startMinutes);
    const minimum = Math.min(...configured, ...visibleStarts, 8 * 60);
    return Math.max(5, Math.floor(minimum / 60));
  }, [events, settings.availableTimes]);

  const openDrawer = (nextDrawer, trigger) => {
    triggerRef.current = trigger || document.activeElement;
    setDrawer(nextDrawer);
  };
  const closeDrawer = () => {
    setDrawer(null);
    window.setTimeout(() => triggerRef.current?.focus?.(), 0);
  };
  const changeView = (nextView) => startTransition(() => setView(nextView));
  const moveRange = direction => {
    const anchor = fromDateKey(selectedDate);
    const next = view === 'month'
      ? new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1)
      : addDays(anchor, direction * (view === 'week' ? 7 : 1));
    onSelectDate(toDateKey(next));
  };

  const weekResources = getWeekDates(selectedDate).map(date => ({
    id: toDateKey(date),
    dateKey: toDateKey(date),
    label: date.toLocaleDateString('en-US', { weekday: 'short' }),
    subLabel: formatOrdinalMonthDay(date),
    staffId: selectedCalendarId === 'workspace' ? '' : selectedCalendarId,
    staffName: selectedCalendarId === 'workspace' ? '' : staffMap.get(selectedCalendarId)?.name || ''
  }));
  const dayResources = selectedCalendarId === 'workspace'
    ? calendars.filter(calendar => calendar.id !== 'workspace').map(calendar => ({
      id: calendar.id,
      dateKey: selectedDate,
      label: calendar.shortName || firstName(calendar.name),
      subLabel: '',
      photoURL: calendar.photoURL || '',
      staffId: calendar.id,
      staffName: calendar.name
    }))
    : [{
      id: selectedCalendarId,
      dateKey: selectedDate,
      label: staffMap.get(selectedCalendarId)?.name || calendars.find(calendar => calendar.id === selectedCalendarId)?.name || 'Calendar',
      subLabel: formatDay(fromDateKey(selectedDate)),
      photoURL: staffMap.get(selectedCalendarId)?.photoURL || '',
      staffId: selectedCalendarId,
      staffName: staffMap.get(selectedCalendarId)?.name || ''
    }];
  const resources = view === 'week' ? weekResources : dayResources.length ? dayResources : [{
    id: 'workspace',
    dateKey: selectedDate,
    label: 'Business',
    subLabel: formatDay(fromDateKey(selectedDate)),
    staffId: ''
  }];

  return (
    <section className="schedule-calendar-workspace">
      <CalendarToolbar
        calendars={calendars}
        dateTitle={getDateTitle(view, selectedDate)}
        filtersOpen={filtersOpen}
        onChangeService={setSelectedServiceId}
        onChangeStatus={setSelectedStatus}
        onChangeView={changeView}
        onCreate={() => openDrawer({ draft: { dateKey: selectedDate, time: '09:00', staffId: selectedCalendarId === 'workspace' ? '' : selectedCalendarId } })}
        onMove={moveRange}
        onOpenSettings={onOpenSettings}
        onSelectCalendar={calendarId => {
          onSelectCalendar(calendarId);
          setFiltersOpen(false);
        }}
        onToday={() => onSelectDate(todayStr)}
        onToggleFilters={() => setFiltersOpen(current => !current)}
        readOnly={exampleMode}
        selectedCalendarId={selectedCalendarId}
        selectedServiceId={selectedServiceId}
        selectedStatus={selectedStatus}
        services={services}
        view={view}
      />

      <div className="schedule-calendar-surface">
        {view === 'week' || view === 'month' ? <SummaryStatusLegend /> : null}
        {view === 'month' ? (
          <MonthView
            events={events}
            onOpenDay={dateKey => {
              onSelectDate(dateKey);
              changeView('day');
            }}
            selectedDate={selectedDate}
            todayStr={todayStr}
          />
        ) : view === 'list' ? listView : view === 'week' ? (
          <ResourceSummaryMatrix
            dates={weekResources}
            events={events}
            onOpenDay={(dateKey, staffId) => {
              onSelectDate(dateKey);
              onSelectCalendar(staffId);
              changeView('day');
            }}
            staffResources={dayResources}
            todayStr={todayStr}
          />
        ) : (
          <TimeGrid
            events={events}
            minHour={minHour}
            mode={resources.length === 1 ? 'focused-day' : 'resource-day'}
            onCreate={draft => openDrawer({ draft })}
            onOpenEvent={(event, trigger) => openDrawer({ event }, trigger)}
            readOnly={exampleMode}
            resources={resources}
            settings={settings}
            todayStr={todayStr}
          />
        )}
      </div>

      {drawer ? (
        <BookingDrawer
          allBookings={allBookings}
          clientDirectory={clientDirectory}
          drawer={drawer}
          onClose={closeDrawer}
          onCreate={onCreateBooking}
          onOpenChat={onOpenBookingChat}
          onUpdate={onUpdateBooking}
          readOnly={exampleMode}
          services={services}
          staffList={staffList}
        />
      ) : null}
    </section>
  );
}
