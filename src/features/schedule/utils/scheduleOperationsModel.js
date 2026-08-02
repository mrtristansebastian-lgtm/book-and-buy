import { getLocalDateStr } from '../../../utils/dates.js';
import { getBookingDateKey, getStaffDisplayName } from './businessCalendarUtils.js';

/**
 * A UI-independent scheduling model for the operations board.
 *
 * It deliberately keeps the source booking intact on `event.booking` so callers can
 * continue using the existing create/update/chat handlers without a data migration.
 */
export const SCHEDULE_EVENT_KIND = 'schedule-event';
export const SCHEDULE_STATUS_IDS = Object.freeze([
  'confirmed',
  'pending',
  'completed',
  'waitlist',
  'declined',
  'other'
]);

const TERMINAL_STATUSES = new Set(['declined', 'cancelled', 'canceled']);
const WAITLIST_STATUSES = new Set(['waitlist', 'waitlisted']);
const PENDING_RESCHEDULE_STATUSES = new Set(['pending', 'requested', 'countered', 'offered']);
const EMPTY_LIST = Object.freeze([]);

const asRecord = (value) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
);

const asList = (value) => (Array.isArray(value) ? value : EMPTY_LIST);

const cleanText = (value) => String(value ?? '').trim();

const getOwn = (record, key) => {
  const safeRecord = asRecord(record);
  return Object.prototype.hasOwnProperty.call(safeRecord, key) ? safeRecord[key] : undefined;
};

const toTimeLabel = (minutes) => {
  const safeMinutes = Math.max(0, Math.min(24 * 60, Number(minutes) || 0));
  const hour = Math.floor(safeMinutes / 60);
  const minute = safeMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const compareEvents = (left, right) => (
  String(left.dateKey || '').localeCompare(String(right.dateKey || '')) ||
  (left.startMinutes ?? Number.MAX_SAFE_INTEGER) - (right.startMinutes ?? Number.MAX_SAFE_INTEGER) ||
  String(left.clientName || '').localeCompare(String(right.clientName || '')) ||
  String(left.id || '').localeCompare(String(right.id || ''))
);

const isSpecificStaff = (staffId) => {
  const normalized = cleanText(staffId);
  return Boolean(normalized && normalized !== 'workspace');
};

const matchesScope = (event, { dateKey, staffId } = {}) => (
  (!dateKey || event.dateKey === dateKey) &&
  (!isSpecificStaff(staffId) || event.staffId === cleanText(staffId))
);

const getBookingTime = (booking = {}) => cleanText(booking.time || booking.bookingTime);

const getBookingDateInput = (booking = {}) => {
  const dateKey = cleanText(booking.dateKey || booking.bookingDate);
  return dateKey ? { ...booking, dateKey } : booking;
};

/**
 * Parse a clock value without the silent 09:00 fallback used by form helpers.
 * Invalid input returns null so a bad booking cannot accidentally occupy a slot.
 */
export const parseScheduleTime = (value) => {
  const source = cleanText(value);
  const match = source.match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = String(match[3] || '').toLowerCase();

  if (!Number.isInteger(hour) || !Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (meridiem === 'pm' && hour !== 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
  } else if (hour < 0 || hour > 23) {
    return null;
  }

  return (hour * 60) + minute;
};

/**
 * Accepts existing values such as `60`, `60 min`, `1h 30m`, and `90 minutes`.
 */
export const parseScheduleDuration = (value, fallbackDurationMinutes = 60) => {
  const fallback = Math.max(1, Math.round(Number(fallbackDurationMinutes) || 60));
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(1, Math.round(value));

  const source = cleanText(value).toLowerCase();
  if (!source) return fallback;

  const hourMatch = source.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/);
  const minuteMatch = source.match(/(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)\b/);
  if (hourMatch || minuteMatch) {
    const hours = Number(hourMatch?.[1] || 0);
    const minutes = Number(minuteMatch?.[1] || 0);
    const total = Math.round((hours * 60) + minutes);
    return Number.isFinite(total) && total > 0 ? total : fallback;
  }

  const numericMatch = source.match(/\d+(?:\.\d+)?/);
  const numericValue = Number(numericMatch?.[0]);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.round(numericValue) : fallback;
};

/**
 * Parses a single slot (`09:00`) or a range (`09:00 - 10:30`).
 * Ranges never wrap into the next day; that avoids impossible day-board geometry.
 */
export const parseScheduleInterval = (slot, { defaultDurationMinutes = 60 } = {}) => {
  const source = cleanText(slot);
  if (!source) return null;

  const rangeMatch = source.match(/^(.+?)\s*(?:-|–|—|\bto\b)\s*(.+)$/i);
  const startMinutes = parseScheduleTime(rangeMatch ? rangeMatch[1] : source);
  if (startMinutes === null) return null;

  const parsedEnd = rangeMatch ? parseScheduleTime(rangeMatch[2]) : null;
  const endMinutes = rangeMatch
    ? parsedEnd
    : Math.min(24 * 60, startMinutes + parseScheduleDuration(defaultDurationMinutes));

  if (endMinutes === null || endMinutes <= startMinutes) return null;

  return {
    source,
    startMinutes,
    endMinutes,
    durationMinutes: endMinutes - startMinutes,
    start: toTimeLabel(startMinutes),
    end: toTimeLabel(endMinutes),
    isRange: Boolean(rangeMatch)
  };
};

export const normalizeScheduleStatus = (bookingOrStatus = {}) => {
  const booking = typeof bookingOrStatus === 'string'
    ? { status: bookingOrStatus }
    : asRecord(bookingOrStatus);
  const rawStatus = cleanText(booking.status).toLowerCase();
  const time = getBookingTime(booking).toLowerCase();

  if (WAITLIST_STATUSES.has(rawStatus) || time === 'waitlist') return 'waitlist';
  if (TERMINAL_STATUSES.has(rawStatus)) return 'declined';
  if (rawStatus === 'confirmed' || rawStatus === 'pending' || rawStatus === 'completed') return rawStatus;
  return rawStatus ? 'other' : 'confirmed';
};

export const hasPendingScheduleReschedule = (booking = {}) => [
  booking.rescheduleStatus,
  booking.reschedule?.status,
  booking.rescheduleRequest?.status
].some(value => PENDING_RESCHEDULE_STATUSES.has(cleanText(value).toLowerCase()));

export const getScheduleAttentionReasons = (bookingOrEvent = {}) => {
  const source = asRecord(bookingOrEvent);
  const status = normalizeScheduleStatus(source);
  const reasons = new Set();

  if (status === 'pending') reasons.add('pending');
  if (status === 'waitlist') reasons.add('waitlist');
  if (hasPendingScheduleReschedule(source) || source.hasPendingReschedule) reasons.add('reschedule');
  if (!cleanText(source.staffId) && status !== 'waitlist' && status !== 'declined') reasons.add('unassigned');

  return [...reasons];
};

const getServiceLookup = (services = []) => {
  const byId = new Map();
  const byName = new Map();
  asList(services).forEach(service => {
    const item = asRecord(service);
    const id = cleanText(item.id);
    const name = cleanText(item.name);
    if (id) byId.set(id, item);
    if (name) byName.set(name.toLowerCase(), item);
  });
  return { byId, byName };
};

const getStaffLookup = (staffList = []) => {
  const byId = new Map();
  asList(staffList).forEach(staff => {
    const item = asRecord(staff);
    const id = cleanText(item.id);
    if (id) byId.set(id, item);
  });
  return byId;
};

const getBookingDuration = (booking, service, fallbackDurationMinutes) => (
  parseScheduleDuration(
    booking.serviceDuration ?? booking.duration ?? service?.duration,
    fallbackDurationMinutes
  )
);

/**
 * Converts the app's existing booking records into deterministic day-board events.
 * Declined and waitlisted bookings are retained, but flagged as not placeable on a
 * time grid (`isScheduled: false`) so callers can display them in attention areas.
 */
export const normalizeScheduleEvents = ({
  bookings = EMPTY_LIST,
  currentMonth = new Date(),
  fallbackDurationMinutes = 60,
  services = EMPTY_LIST,
  staffList = EMPTY_LIST,
  todayStr = getLocalDateStr(new Date())
} = {}) => {
  const serviceLookup = getServiceLookup(services);
  const staffById = getStaffLookup(staffList);

  return asList(bookings)
    .map((rawBooking, sourceIndex) => {
      const booking = asRecord(rawBooking);
      const serviceId = cleanText(booking.serviceId);
      const serviceNameFromBooking = cleanText(booking.serviceName);
      const service = serviceLookup.byId.get(serviceId)
        || serviceLookup.byName.get(serviceNameFromBooking.toLowerCase())
        || {};
      const staffId = cleanText(booking.staffId);
      const staff = staffById.get(staffId) || {};
      const status = normalizeScheduleStatus(booking);
      const dateKey = getBookingDateKey(getBookingDateInput(booking), { todayStr, currentMonth });
      const time = getBookingTime(booking);
      const startMinutes = parseScheduleTime(time);
      const durationMinutes = getBookingDuration(booking, service, fallbackDurationMinutes);
      const rawEndMinutes = startMinutes === null ? null : startMinutes + durationMinutes;
      const endMinutes = rawEndMinutes === null ? null : Math.min(24 * 60, rawEndMinutes);
      const isTimed = startMinutes !== null && endMinutes !== null && endMinutes > startMinutes;
      const isDeclined = status === 'declined';
      const isWaitlist = status === 'waitlist';
      const bookingId = cleanText(booking.id);
      const id = bookingId || `schedule-event-${sourceIndex + 1}`;
      const hasPendingReschedule = hasPendingScheduleReschedule(booking);
      const attentionReasons = getScheduleAttentionReasons({
        ...booking,
        hasPendingReschedule,
        status
      });

      return {
        kind: SCHEDULE_EVENT_KIND,
        id,
        eventKey: `${id}:${sourceIndex}`,
        bookingId,
        sourceIndex,
        booking,
        clientName: cleanText(booking.clientName) || 'Client',
        clientEmail: cleanText(booking.clientEmail || booking.email),
        clientPhone: cleanText(booking.clientPhone || booking.phone),
        dateKey: cleanText(dateKey),
        time,
        startMinutes,
        endMinutes,
        rawEndMinutes,
        durationMinutes,
        spansNextDay: Boolean(rawEndMinutes && rawEndMinutes > 24 * 60),
        serviceId: serviceId || cleanText(service.id),
        serviceName: serviceNameFromBooking || cleanText(service.name) || 'Service',
        serviceImage: cleanText(service.imageUrls?.[0] || service.imageUrl || service.image),
        staffId,
        staffName: cleanText(booking.staffName) || getStaffDisplayName(staff),
        staffPhoto: cleanText(booking.staffPhotoURL || staff.photoURL || staff.avatar),
        staffTitle: cleanText(staff.title || staff.workTitle || staff.jobTitle || staff.role),
        status,
        rawStatus: cleanText(booking.status),
        isDeclined,
        isWaitlist,
        isTimed,
        isScheduled: Boolean(dateKey && isTimed && !isDeclined && !isWaitlist),
        hasPendingReschedule,
        attentionReasons
      };
    })
    .sort(compareEvents);
};

export const isNormalizedScheduleEvent = (value) => (
  asRecord(value).kind === SCHEDULE_EVENT_KIND
);

const coerceEvents = (events = EMPTY_LIST, options = {}) => {
  const normalized = [];
  asList(events).forEach((event, index) => {
    if (isNormalizedScheduleEvent(event)) {
      normalized.push(event);
      return;
    }
    normalized.push(...normalizeScheduleEvents({ ...options, bookings: [event] }).map(item => ({
      ...item,
      sourceIndex: index,
      eventKey: `${item.id}:${index}`
    })));
  });
  return normalized.sort(compareEvents);
};

export const getScheduleEventMapKey = (dateKey, staffId = '') => (
  `${cleanText(dateKey)}::${cleanText(staffId) || 'unassigned'}`
);

/**
 * Fast lookups for board lanes and week/month summaries. Maps avoid dynamic object
 * keys from booking data and keep the utility safe for arbitrary customer input.
 */
export const indexScheduleEvents = (events = EMPTY_LIST, options = {}) => {
  const normalizedEvents = coerceEvents(events, options);
  const byDate = new Map();
  const byDateStaff = new Map();
  const byId = new Map();

  normalizedEvents.forEach(event => {
    if (event.dateKey) {
      const dateEvents = byDate.get(event.dateKey) || [];
      dateEvents.push(event);
      byDate.set(event.dateKey, dateEvents);

      const dateStaffKey = getScheduleEventMapKey(event.dateKey, event.staffId);
      const dateStaffEvents = byDateStaff.get(dateStaffKey) || [];
      dateStaffEvents.push(event);
      byDateStaff.set(dateStaffKey, dateStaffEvents);
    }
    if (event.id && !byId.has(event.id)) byId.set(event.id, event);
  });

  return { events: normalizedEvents, byDate, byDateStaff, byId };
};

export const getScheduleEventsForDate = (eventIndex, dateKey) => (
  eventIndex?.byDate?.get(cleanText(dateKey)) || EMPTY_LIST
);

export const getScheduleEventsForDateAndStaff = (eventIndex, dateKey, staffId) => (
  eventIndex?.byDateStaff?.get(getScheduleEventMapKey(dateKey, staffId)) || EMPTY_LIST
);

const inferSlotDurationMinutes = (times = []) => {
  const starts = asList(times)
    .map(slot => parseScheduleInterval(slot, { defaultDurationMinutes: 60 })?.startMinutes)
    .filter(Number.isFinite)
    .sort((left, right) => left - right);
  const gaps = starts.slice(1)
    .map((start, index) => start - starts[index])
    .filter(gap => gap > 0);
  return gaps.length ? Math.min(...gaps) : 60;
};

/**
 * Mirrors the current workspace/staff schedule setting shape without depending on
 * React state. An explicit empty `times` array is respected as a closed-by-slots day.
 */
export const getScheduleAvailabilityConfig = ({
  calendarId,
  dateKey,
  settings = {},
  staffId
} = {}) => {
  const selectedCalendarId = cleanText(calendarId || staffId) || 'workspace';
  const isWorkspace = selectedCalendarId === 'workspace';
  const safeSettings = asRecord(settings);
  const staffCalendars = asRecord(safeSettings.staffCalendars);
  const staffCalendar = isWorkspace ? {} : asRecord(getOwn(staffCalendars, selectedCalendarId));
  const schedule = asRecord(isWorkspace ? safeSettings.schedule : staffCalendar.schedule);
  const dayConfig = asRecord(dateKey ? getOwn(schedule, dateKey) : undefined);
  const defaultTimes = isWorkspace
    ? asList(safeSettings.availableTimes)
    : (asList(staffCalendar.availableTimes).length ? asList(staffCalendar.availableTimes) : asList(safeSettings.availableTimes));
  const hasDayTimes = Object.prototype.hasOwnProperty.call(dayConfig, 'times') && Array.isArray(dayConfig.times);
  const times = hasDayTimes ? dayConfig.times : defaultTimes;
  const scheduleDefaults = asRecord(
    isWorkspace
      ? safeSettings.scheduleDefaults
      : (staffCalendar.scheduleDefaults || safeSettings.scheduleDefaults)
  );
  const defaultDurationMinutes = parseScheduleDuration(
    scheduleDefaults.duration,
    inferSlotDurationMinutes(times)
  );

  return {
    calendarId: selectedCalendarId,
    available: dayConfig.available !== false,
    times: [...times],
    defaultDurationMinutes
  };
};

/**
 * Returns valid bookable windows for a business or staff calendar. By default each
 * configured slot remains separate, which preserves the app's current slot capacity.
 */
export const getAvailabilityIntervals = ({
  calendarId,
  dateKey,
  defaultDurationMinutes,
  merge = false,
  settings = {},
  staffId,
  times
} = {}) => {
  const config = getScheduleAvailabilityConfig({ calendarId, dateKey, settings, staffId });
  if (!config.available) return [];

  const configuredTimes = Array.isArray(times) ? times : config.times;
  const duration = parseScheduleDuration(defaultDurationMinutes, config.defaultDurationMinutes);
  const seen = new Set();
  const intervals = configuredTimes
    .map((slot, sourceIndex) => {
      const parsed = parseScheduleInterval(slot, { defaultDurationMinutes: duration });
      if (!parsed) return null;
      const duplicateKey = `${parsed.startMinutes}:${parsed.endMinutes}`;
      if (seen.has(duplicateKey)) return null;
      seen.add(duplicateKey);
      return {
        ...parsed,
        id: `availability-${sourceIndex}-${duplicateKey}`,
        dateKey: cleanText(dateKey),
        staffId: cleanText(calendarId || staffId) || 'workspace',
        sourceIndex
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.startMinutes - right.startMinutes || left.endMinutes - right.endMinutes);

  return merge ? mergeScheduleIntervals(intervals) : intervals;
};

export const mergeScheduleIntervals = (intervals = EMPTY_LIST) => {
  const sorted = asList(intervals)
    .filter(interval => Number.isFinite(interval?.startMinutes) && Number.isFinite(interval?.endMinutes) && interval.endMinutes > interval.startMinutes)
    .map(interval => ({ ...interval }))
    .sort((left, right) => left.startMinutes - right.startMinutes || left.endMinutes - right.endMinutes);
  const merged = [];

  sorted.forEach(interval => {
    const previous = merged[merged.length - 1];
    if (!previous || interval.startMinutes > previous.endMinutes) {
      merged.push({
        ...interval,
        sourceIntervals: [interval]
      });
      return;
    }
    previous.endMinutes = Math.max(previous.endMinutes, interval.endMinutes);
    previous.durationMinutes = previous.endMinutes - previous.startMinutes;
    previous.end = toTimeLabel(previous.endMinutes);
    previous.sourceIntervals.push(interval);
  });

  return merged;
};

export const scheduleIntervalsOverlap = (left, right) => (
  Number.isFinite(left?.startMinutes) &&
  Number.isFinite(left?.endMinutes) &&
  Number.isFinite(right?.startMinutes) &&
  Number.isFinite(right?.endMinutes) &&
  left.startMinutes < right.endMinutes &&
  right.startMinutes < left.endMinutes
);

const shouldOccupyTime = (event, includeStatuses) => {
  if (!event?.isScheduled) return false;
  if (Array.isArray(includeStatuses) && includeStatuses.length) {
    return includeStatuses.includes(event.status);
  }
  return event.status !== 'declined' && event.status !== 'waitlist';
};

const getScopedTimedEvents = (events, { dateKey, includeStatuses, staffId } = {}) => (
  coerceEvents(events)
    .filter(event => matchesScope(event, { dateKey, staffId }) && shouldOccupyTime(event, includeStatuses))
);

/**
 * Slot-level capacity: a configured availability window is open only when no
 * time-occupying booking overlaps it. Adjacent appointments do not conflict.
 */
export const getOpenAvailabilityIntervals = ({
  availabilityIntervals = EMPTY_LIST,
  dateKey,
  events = EMPTY_LIST,
  ignoreBookingId,
  includeStatuses,
  staffId
} = {}) => {
  const ignoredId = cleanText(ignoreBookingId);
  const scopedEvents = getScopedTimedEvents(events, { dateKey, includeStatuses, staffId })
    .filter(event => !ignoredId || event.id !== ignoredId);

  return asList(availabilityIntervals).filter(interval => (
    (!dateKey || !interval.dateKey || interval.dateKey === dateKey) &&
    (!isSpecificStaff(staffId) || !interval.staffId || interval.staffId === cleanText(staffId)) &&
    !scopedEvents.some(event => scheduleIntervalsOverlap(interval, event))
  ));
};

const createStatusCounts = () => ({
  total: 0,
  scheduled: 0,
  confirmed: 0,
  pending: 0,
  completed: 0,
  waitlist: 0,
  declined: 0,
  other: 0,
  reschedule: 0
});

export const getStatusCounts = (events = EMPTY_LIST) => {
  const counts = createStatusCounts();
  coerceEvents(events).forEach(event => {
    counts.total += 1;
    if (event.isScheduled) counts.scheduled += 1;
    if (Object.prototype.hasOwnProperty.call(counts, event.status)) counts[event.status] += 1;
    else counts.other += 1;
    if (event.hasPendingReschedule) counts.reschedule += 1;
  });
  return counts;
};

const getConflictEventKeys = (conflicts = EMPTY_LIST) => {
  const keys = new Set();
  asList(conflicts).forEach(conflict => {
    const source = asRecord(conflict);
    [source.leftEvent, source.rightEvent, source.left, source.right]
      .filter(Boolean)
      .forEach(event => keys.add(event.eventKey || event.id));
  });
  return keys;
};

export const getAttentionCounts = (events = EMPTY_LIST, { conflicts = EMPTY_LIST } = {}) => {
  const counts = {
    total: 0,
    pending: 0,
    waitlist: 0,
    reschedule: 0,
    unassigned: 0,
    conflict: 0
  };
  const conflictEventKeys = getConflictEventKeys(conflicts);

  coerceEvents(events).forEach(event => {
    const reasons = new Set(event.attentionReasons || getScheduleAttentionReasons(event));
    if (conflictEventKeys.has(event.eventKey || event.id)) reasons.add('conflict');
    reasons.forEach(reason => {
      if (Object.prototype.hasOwnProperty.call(counts, reason) && reason !== 'total') counts[reason] += 1;
    });
    if (reasons.size) counts.total += 1;
  });

  return counts;
};

/**
 * Finds every pair that overlaps in the same date/staff lane. Waitlist and declined
 * records intentionally do not occupy a lane. The returned pair keeps both source
 * events so the command panel can explain the conflict without another lookup.
 */
export const getScheduleConflicts = ({
  dateKey,
  events = EMPTY_LIST,
  includeStatuses,
  staffId
} = {}) => {
  const groups = new Map();
  getScopedTimedEvents(events, { dateKey, includeStatuses, staffId })
    .filter(event => cleanText(event.staffId))
    .forEach(event => {
      const key = getScheduleEventMapKey(event.dateKey, event.staffId);
      const group = groups.get(key) || [];
      group.push(event);
      groups.set(key, group);
    });

  const conflicts = [];
  groups.forEach(group => {
    const active = [];
    group.sort((left, right) => left.startMinutes - right.startMinutes || left.endMinutes - right.endMinutes || left.eventKey.localeCompare(right.eventKey));
    group.forEach(event => {
      for (let index = active.length - 1; index >= 0; index -= 1) {
        if (active[index].endMinutes <= event.startMinutes) active.splice(index, 1);
      }
      active.forEach(other => {
        if (!scheduleIntervalsOverlap(other, event)) return;
        conflicts.push({
          id: `conflict:${other.eventKey}:${event.eventKey}`,
          dateKey: event.dateKey,
          staffId: event.staffId,
          startMinutes: Math.max(other.startMinutes, event.startMinutes),
          endMinutes: Math.min(other.endMinutes, event.endMinutes),
          leftEvent: other,
          rightEvent: event
        });
      });
      active.push(event);
    });
  });

  return conflicts.sort((left, right) => left.dateKey.localeCompare(right.dateKey) || left.startMinutes - right.startMinutes || left.id.localeCompare(right.id));
};

export const findScheduleConflicts = ({
  candidate,
  events = EMPTY_LIST,
  ignoreBookingId,
  includeStatuses,
  ...normalizerOptions
} = {}) => {
  const target = isNormalizedScheduleEvent(candidate)
    ? candidate
    : normalizeScheduleEvents({ ...normalizerOptions, bookings: [candidate] })[0];
  if (!target || !target.isScheduled || !cleanText(target.staffId)) return [];

  // A new draft receives a generated display id, which must not suppress a real
  // booking conflict. Only ignore a persisted booking id (or an explicit id).
  const ignoredId = cleanText(ignoreBookingId || target.bookingId);
  return getScopedTimedEvents(events, {
    dateKey: target.dateKey,
    includeStatuses,
    staffId: target.staffId
  })
    .filter(event => (!ignoredId || event.id !== ignoredId) && scheduleIntervalsOverlap(target, event))
    .sort(compareEvents);
};

export const findScheduleConflict = (options = {}) => findScheduleConflicts(options)[0] || null;

/**
 * Gives every overlapping event a deterministic column for a lane. A later
 * appointment that starts exactly when another ends reuses the column.
 */
export const layoutScheduleOverlaps = (events = EMPTY_LIST) => {
  const scheduled = coerceEvents(events).filter(event => event.isScheduled);
  const groups = new Map();
  scheduled.forEach(event => {
    const key = getScheduleEventMapKey(event.dateKey, event.staffId);
    const group = groups.get(key) || [];
    group.push(event);
    groups.set(key, group);
  });

  const laidOut = [];
  groups.forEach(group => {
    const sorted = [...group].sort((left, right) => left.startMinutes - right.startMinutes || left.endMinutes - right.endMinutes || left.eventKey.localeCompare(right.eventKey));
    let cluster = [];
    let clusterEnd = -1;

    const flushCluster = () => {
      if (!cluster.length) return;
      const active = [];
      let columns = 0;
      const assigned = cluster.map(event => {
        for (let index = active.length - 1; index >= 0; index -= 1) {
          if (active[index].endMinutes <= event.startMinutes) active.splice(index, 1);
        }
        const occupiedColumns = new Set(active.map(item => item.column));
        let column = 0;
        while (occupiedColumns.has(column)) column += 1;
        active.push({ ...event, column });
        columns = Math.max(columns, column + 1);
        return { ...event, column };
      });
      assigned.forEach(event => laidOut.push({ ...event, columns, overlapGroup: `${event.dateKey}:${event.staffId || 'unassigned'}:${cluster[0].eventKey}` }));
      cluster = [];
      clusterEnd = -1;
    };

    sorted.forEach(event => {
      if (cluster.length && event.startMinutes >= clusterEnd) flushCluster();
      cluster.push(event);
      clusterEnd = Math.max(clusterEnd, event.endMinutes);
    });
    flushCluster();
  });

  return laidOut.sort(compareEvents);
};

const sumIntervals = (intervals = EMPTY_LIST) => asList(intervals)
  .reduce((total, interval) => total + Math.max(0, (interval.endMinutes || 0) - (interval.startMinutes || 0)), 0);

/**
 * Operational day metrics used by the Day board, week cards, and month pulse.
 * `openSlotCount` is the number of configured availability windows not blocked by
 * an appointment; this intentionally matches the existing slot-based capacity model.
 */
export const getDayScheduleSummary = ({
  availabilityIntervals,
  dateKey,
  events = EMPTY_LIST,
  includeStatuses,
  settings = {},
  staffId
} = {}) => {
  const dayEvents = coerceEvents(events).filter(event => matchesScope(event, { dateKey, staffId }));
  const resolvedAvailability = Array.isArray(availabilityIntervals)
    ? availabilityIntervals
    : getAvailabilityIntervals({ dateKey, settings, staffId });
  const openAvailabilityIntervals = getOpenAvailabilityIntervals({
    availabilityIntervals: resolvedAvailability,
    dateKey,
    events: dayEvents,
    includeStatuses,
    staffId
  });
  const conflicts = getScheduleConflicts({ dateKey, events: dayEvents, includeStatuses, staffId });
  const scheduledEvents = dayEvents.filter(event => shouldOccupyTime(event, includeStatuses));
  const mergedAvailability = mergeScheduleIntervals(resolvedAvailability);
  const mergedOpenAvailability = mergeScheduleIntervals(openAvailabilityIntervals);
  const mergedScheduled = mergeScheduleIntervals(scheduledEvents);
  const statusCounts = getStatusCounts(dayEvents);
  const attentionCounts = getAttentionCounts(dayEvents, { conflicts });

  return {
    dateKey: cleanText(dateKey),
    staffId: cleanText(staffId) || 'workspace',
    events: dayEvents,
    scheduledEvents,
    waitlistEvents: dayEvents.filter(event => event.isWaitlist),
    availabilityIntervals: resolvedAvailability,
    openAvailabilityIntervals,
    availabilitySlotCount: resolvedAvailability.length,
    openSlotCount: openAvailabilityIntervals.length,
    bookedCount: scheduledEvents.length,
    bookedMinutes: scheduledEvents.reduce((total, event) => total + event.durationMinutes, 0),
    occupiedMinutes: sumIntervals(mergedScheduled),
    availableMinutes: sumIntervals(mergedAvailability),
    openMinutes: sumIntervals(mergedOpenAvailability),
    statusCounts,
    attentionCounts,
    attentionCount: attentionCounts.total,
    conflicts,
    conflictCount: conflicts.length,
    conflictEventCount: attentionCounts.conflict
  };
};
