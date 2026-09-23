import { addDays, parseDateKey, toDateKey } from './dates';

export const WEEKDAY_KEYS = Object.freeze(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);

const DEFAULT_OPEN = '09:00';
const DEFAULT_CLOSE = '17:00';

const normalizeTime = (value, fallback = '09:00') => {
  const raw = String(value || '').trim();
  if (/^\d{2}:\d{2}$/.test(raw)) return raw;
  return fallback;
};

const normalizeRange = (range = {}) => {
  const start = normalizeTime(range.start, DEFAULT_OPEN);
  const end = normalizeTime(range.end, DEFAULT_CLOSE);
  if (start >= end) return null;
  return { start, end };
};

const normalizeRanges = (
  ranges,
  fallbackOpen = DEFAULT_OPEN,
  fallbackClose = DEFAULT_CLOSE,
  { allowEmpty = false } = {}
) => {
  const list = Array.isArray(ranges) ? ranges : [];
  const cleaned = list.map(normalizeRange).filter(Boolean);
  if (cleaned.length) return cleaned;
  if (allowEmpty) return [];
  const fallback = normalizeRange({ start: fallbackOpen, end: fallbackClose });
  return fallback ? [fallback] : [];
};

const subtractRangeFromList = (windows = [], exclusion = null) => {
  if (!exclusion) return windows;
  const out = [];
  for (const window of windows) {
    if (exclusion.end <= window.start || exclusion.start >= window.end) {
      out.push(window);
      continue;
    }
    const before = normalizeRange({ start: window.start, end: exclusion.start });
    const after = normalizeRange({ start: exclusion.end, end: window.end });
    if (before) out.push(before);
    if (after) out.push(after);
  }
  return out;
};

const subtractRangesFromList = (windows = [], exclusions = []) => {
  let next = [...windows];
  for (const exclusion of exclusions) {
    next = subtractRangeFromList(next, exclusion);
  }
  return next;
};

export const weekdayKeyFromDate = (date) => {
  const d = date instanceof Date ? date : parseDateKey(date) || new Date();
  return WEEKDAY_KEYS[(d.getDay() + 6) % 7];
};

export const createDefaultWeekTemplate = (
  openTime = DEFAULT_OPEN,
  closeTime = DEFAULT_CLOSE,
  openWeekdays = ['mon', 'tue', 'wed', 'thu', 'fri']
) => {
  const openSet = new Set(openWeekdays);
  const template = {};
  for (const key of WEEKDAY_KEYS) {
    const open = openSet.has(key);
    template[key] = {
      open,
      ranges: open ? [{ start: openTime, end: closeTime }] : []
    };
  }
  return template;
};

export const normalizeWeekTemplate = (
  template = {},
  openTime = DEFAULT_OPEN,
  closeTime = DEFAULT_CLOSE
) => {
  const base = createDefaultWeekTemplate(openTime, closeTime);
  const next = {};
  for (const key of WEEKDAY_KEYS) {
    const row = template?.[key] || base[key];
    const open = row?.open !== false;
    next[key] = {
      open,
      ranges: open ? normalizeRanges(row?.ranges, openTime, closeTime) : []
    };
  }
  return next;
};

export const normalizeStaffDay = (
  day = {},
  openTime = DEFAULT_OPEN,
  closeTime = DEFAULT_CLOSE
) => {
  let status = day?.status;
  if (
    status !== 'open' &&
    status !== 'break' &&
    status !== 'off' &&
    status !== 'leave'
  ) {
    status = day?.open === false ? 'off' : 'open';
  }
  const open = status === 'open';
  const source =
    day?.source === 'template' || day?.source === 'status' ? day.source : 'manual';
  const ranges =
    open
      ? normalizeRanges(day?.ranges, openTime, closeTime)
      : status === 'break'
        ? normalizeRanges(day?.ranges, openTime, closeTime, { allowEmpty: true })
        : [];
  const breaks = open
    ? normalizeRanges(day?.breaks, openTime, closeTime, { allowEmpty: true })
    : [];
  return {
    status,
    open,
    ranges,
    breaks,
    note: String(day?.note || '').trim(),
    source
  };
};

export const normalizeStaffAvailabilityEntry = (
  entry = {},
  staffId = '',
  openTime = DEFAULT_OPEN,
  closeTime = DEFAULT_CLOSE
) => {
  const id = String(entry.staffId || staffId || '').trim();
  const days = {};
  const rawDays = entry.days && typeof entry.days === 'object' ? entry.days : {};
  for (const [key, value] of Object.entries(rawDays)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
    days[key] = normalizeStaffDay(value, openTime, closeTime);
  }
  const blocks = (Array.isArray(entry.blocks) ? entry.blocks : [])
    .map((block) => {
      const startDate = String(block?.startDate || '').trim();
      const endDate = String(block?.endDate || startDate).trim();
      if (!startDate) return null;
      return {
        id: block.id || `block-${startDate}-${endDate}`,
        startDate,
        endDate,
        startTime: block.startTime ? normalizeTime(block.startTime) : '',
        endTime: block.endTime ? normalizeTime(block.endTime) : '',
        reason: String(block.reason || '').trim()
      };
    })
    .filter(Boolean);

  return {
    staffId: id,
    weekTemplate: normalizeWeekTemplate(entry.weekTemplate, openTime, closeTime),
    days,
    blocks
  };
};

export const normalizeStaffAvailabilityMap = (
  map = {},
  staffList = [],
  openTime = DEFAULT_OPEN,
  closeTime = DEFAULT_CLOSE
) => {
  const next = {};
  const ids = new Set([
    ...Object.keys(map || {}),
    ...(staffList || []).map((member) => member?.id).filter(Boolean)
  ]);
  for (const id of ids) {
    next[id] = normalizeStaffAvailabilityEntry(map?.[id] || { staffId: id }, id, openTime, closeTime);
  }
  return next;
};

const clampAdvanceBookingDays = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.round(parsed);
  if (rounded <= 0) return 0;
  return Math.min(3650, rounded);
};

export const normalizeAvailabilityRules = (rules = {}) => {
  const openTime = normalizeTime(rules.businessOpenTime, DEFAULT_OPEN);
  const closeTime = normalizeTime(rules.businessCloseTime, DEFAULT_CLOSE);
  const legacyWeekdays = Array.isArray(rules.openWeekdays)
    ? rules.openWeekdays.filter((key) => WEEKDAY_KEYS.includes(key))
    : ['mon', 'tue', 'wed', 'thu', 'fri'];
  const legacyOpenSet = new Set(legacyWeekdays.length ? legacyWeekdays : ['mon', 'tue', 'wed', 'thu', 'fri']);
  const rawWeekdayHours =
    rules.weekdayHours && typeof rules.weekdayHours === 'object' ? rules.weekdayHours : {};

  const weekdayHours = {};
  WEEKDAY_KEYS.forEach((key) => {
    const row = rawWeekdayHours[key] || {};
    const open = row.open != null ? Boolean(row.open) : legacyOpenSet.has(key);
    weekdayHours[key] = {
      open,
      openTime: normalizeTime(row.openTime, openTime),
      closeTime: normalizeTime(row.closeTime, closeTime)
    };
  });

  const openWeekdays = WEEKDAY_KEYS.filter((key) => weekdayHours[key].open);
  const seedDay = openWeekdays[0] || 'mon';
  const closedDates = (Array.isArray(rules.closedDates) ? rules.closedDates : [])
    .map((key) => String(key || '').trim())
    .filter((key) => /^\d{4}-\d{2}-\d{2}$/.test(key));

  let maxAdvanceBookingDays = 90;
  if (rules.maxAdvanceBookingDays != null && rules.maxAdvanceBookingDays !== '') {
    maxAdvanceBookingDays = clampAdvanceBookingDays(rules.maxAdvanceBookingDays) ?? 90;
  } else if (rules.maxAdvanceBooking != null && rules.maxAdvanceBooking !== '') {
    maxAdvanceBookingDays = clampAdvanceBookingDays(rules.maxAdvanceBooking) ?? 90;
  }

  const untilRaw = String(rules.maxAdvanceBookingUntil || '').trim();
  const maxAdvanceBookingUntil = /^\d{4}-\d{2}-\d{2}$/.test(untilRaw) ? untilRaw : '';

  return {
    ...rules,
    businessOpenTime: weekdayHours[seedDay].openTime,
    businessCloseTime: weekdayHours[seedDay].closeTime,
    openWeekdays: openWeekdays.length ? openWeekdays : ['mon', 'tue', 'wed', 'thu', 'fri'],
    weekdayHours,
    closedDates: [...new Set(closedDates)].sort(),
    maxAdvanceBookingDays,
    maxAdvanceBooking: String(maxAdvanceBookingDays),
    maxAdvanceBookingUntil
  };
};

/** Hours for a specific calendar date (closed dates + weekday schedule). */
export const getBusinessHoursForDate = (dateKey, availabilityRules = {}) => {
  const rules = normalizeAvailabilityRules(availabilityRules);
  const fallback = {
    open: false,
    openTime: rules.businessOpenTime,
    closeTime: rules.businessCloseTime
  };
  if (!dateKey) return fallback;
  if ((rules.closedDates || []).includes(dateKey)) return fallback;
  const date = parseDateKey(dateKey);
  if (!date) return fallback;
  const weekday = weekdayKeyFromDate(date);
  const row = rules.weekdayHours?.[weekday] || fallback;
  return {
    open: Boolean(row.open),
    openTime: row.openTime || rules.businessOpenTime,
    closeTime: row.closeTime || rules.businessCloseTime
  };
};

/** Business open on dateKey? */
export const isBusinessOpenOnDate = (dateKey, availabilityRules = {}) =>
  getBusinessHoursForDate(dateKey, availabilityRules).open;

/** Resolve effective ranges for a staff member on a date (explicit day overrides template). */
export const getStaffDayWindows = (
  staffId,
  dateKey,
  staffAvailability = {},
  availabilityRules = {}
) => {
  const rules = normalizeAvailabilityRules(availabilityRules);
  if (!isBusinessOpenOnDate(dateKey, rules)) return [];
  if (!staffId) return [{ start: rules.businessOpenTime, end: rules.businessCloseTime }];

  const entry = normalizeStaffAvailabilityEntry(
    staffAvailability?.[staffId] || { staffId },
    staffId,
    rules.businessOpenTime,
    rules.businessCloseTime
  );

  const inBlock = (entry.blocks || []).some((block) => {
    if (dateKey < block.startDate || dateKey > block.endDate) return false;
    // All-day block when no times
    if (!block.startTime && !block.endTime) return true;
    return false; // timed blocks handled at slot level
  });
  if (inBlock) return [];

  const explicit = entry.days?.[dateKey];
  if (explicit) {
    if (
      explicit.status === 'off' ||
      explicit.status === 'leave' ||
      (!explicit.open && explicit.status !== 'break')
    ) {
      return [];
    }
    if (explicit.status === 'break') {
      const breakRanges = explicit.ranges || [];
      if (!breakRanges.length) return [];
      const weekday = weekdayKeyFromDate(dateKey);
      const template = entry.weekTemplate?.[weekday];
      const base =
        template?.open && template.ranges?.length
          ? template.ranges
          : [{ start: rules.businessOpenTime, end: rules.businessCloseTime }];
      return subtractRangesFromList(base, breakRanges);
    }
    if (!explicit.open) return [];
    const base = explicit.ranges || [];
    const dayBreaks = explicit.breaks || [];
    return dayBreaks.length ? subtractRangesFromList(base, dayBreaks) : base;
  }

  const weekday = weekdayKeyFromDate(dateKey);
  const template = entry.weekTemplate?.[weekday];
  if (!template?.open) return [];
  return template.ranges || [];
};

/** Calendar color status for a staff day. */
export const resolveCalendarDayStatus = (
  staffId,
  dateKey,
  staffAvailability = {},
  availabilityRules = {}
) => {
  if (!isBusinessOpenOnDate(dateKey, availabilityRules)) return 'business-closed';
  const rules = normalizeAvailabilityRules(availabilityRules);
  const entry = normalizeStaffAvailabilityEntry(
    staffAvailability?.[staffId] || { staffId },
    staffId,
    rules.businessOpenTime,
    rules.businessCloseTime
  );
  const explicit = entry.days?.[dateKey];
  if (explicit) {
    if (explicit.status === 'break') return 'break';
    if (explicit.status === 'leave') return 'leave';
    if (explicit.status === 'off' || !explicit.open) return 'off';
    return 'open';
  }
  const windows = getStaffDayWindows(staffId, dateKey, staffAvailability, availabilityRules);
  return windows.length ? 'open' : 'off';
};

const timeToMinutes = (hhmm = '') => {
  const match = String(hhmm || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

/**
 * Mini day meter segments for Availability calendar cells.
 * Domain is business open→close. Open = bookable; break = exclusion windows.
 */
export const getStaffDayTimeline = (
  staffId,
  dateKey,
  staffAvailability = {},
  availabilityRules = {}
) => {
  const status = resolveCalendarDayStatus(
    staffId,
    dateKey,
    staffAvailability,
    availabilityRules
  );
  const rules = normalizeAvailabilityRules(availabilityRules);
  const hours = getBusinessHoursForDate(dateKey, rules);
  let dayStart = timeToMinutes(hours.openTime) ?? 9 * 60;
  let dayEnd = timeToMinutes(hours.closeTime) ?? 17 * 60;
  if (dayEnd <= dayStart) {
    dayStart = 0;
    dayEnd = 24 * 60;
  }
  const span = Math.max(1, dayEnd - dayStart);

  const toSegment = (range, kind) => {
    const start = timeToMinutes(range?.start);
    const end = timeToMinutes(range?.end);
    if (start == null || end == null || end <= start) return null;
    const clippedStart = Math.max(dayStart, start);
    const clippedEnd = Math.min(dayEnd, end);
    if (clippedEnd <= clippedStart) return null;
    return {
      kind,
      start: range.start,
      end: range.end,
      leftPct: ((clippedStart - dayStart) / span) * 100,
      widthPct: ((clippedEnd - clippedStart) / span) * 100
    };
  };

  if (status === 'business-closed' || status === 'leave' || status === 'off') {
    return { status, segments: [], dayStart, dayEnd };
  }

  const entry = normalizeStaffAvailabilityEntry(
    staffAvailability?.[staffId] || { staffId },
    staffId,
    hours.openTime,
    hours.closeTime
  );
  const explicit = entry.days?.[dateKey];
  const bookable = getStaffDayWindows(
    staffId,
    dateKey,
    staffAvailability,
    availabilityRules
  );
  const segments = [];

  bookable.forEach((range) => {
    const seg = toSegment(range, 'open');
    if (seg) segments.push(seg);
  });

  if (status === 'break' && Array.isArray(explicit?.ranges)) {
    explicit.ranges.forEach((range) => {
      const seg = toSegment(range, 'break');
      if (seg) segments.push(seg);
    });
  } else if (Array.isArray(explicit?.breaks)) {
    explicit.breaks.forEach((range) => {
      const seg = toSegment(range, 'break');
      if (seg) segments.push(seg);
    });
  }

  return { status, segments, dayStart, dayEnd };
};

/** Sentinel focus id for overall business availability (not a staff member). */
export const BUSINESS_AVAILABILITY_ID = 'business';

/** Day meter for overall business open hours (no staff shifts/breaks). */
export const getBusinessDayTimeline = (dateKey, availabilityRules = {}) => {
  const rules = normalizeAvailabilityRules(availabilityRules);
  const hours = getBusinessHoursForDate(dateKey, rules);
  let dayStart = timeToMinutes(hours.openTime) ?? 9 * 60;
  let dayEnd = timeToMinutes(hours.closeTime) ?? 17 * 60;
  if (dayEnd <= dayStart) {
    dayStart = 0;
    dayEnd = 24 * 60;
  }

  if (!hours.open) {
    return { status: 'business-closed', segments: [], dayStart, dayEnd };
  }

  return {
    status: 'open',
    segments: [
      {
        kind: 'open',
        start: hours.openTime,
        end: hours.closeTime,
        leftPct: 0,
        widthPct: 100
      }
    ],
    dayStart,
    dayEnd
  };
};

const minutesToHHMM = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

/**
 * Schedule agenda day meter: optional staff open/break + confirmed booking segments.
 */
export const getScheduleDayTimeline = ({
  staffId = '',
  dateKey,
  staffAvailability = {},
  availabilityRules = {},
  bookings = []
} = {}) => {
  const rules = normalizeAvailabilityRules(availabilityRules);
  const hours = getBusinessHoursForDate(dateKey, rules);
  let dayStart = timeToMinutes(hours.openTime) ?? 9 * 60;
  let dayEnd = timeToMinutes(hours.closeTime) ?? 17 * 60;
  if (dayEnd <= dayStart) {
    dayStart = 0;
    dayEnd = 24 * 60;
  }
  const span = Math.max(1, dayEnd - dayStart);

  const base = staffId
    ? getStaffDayTimeline(staffId, dateKey, staffAvailability, availabilityRules)
    : {
        status: hours.open ? 'open' : 'business-closed',
        segments: [],
        dayStart,
        dayEnd
      };

  const segments = [...(base.segments || [])];

  const dayBookings = (bookings || []).filter((booking) => {
    const key = String(booking?.dateKey || booking?.date || '').trim();
    if (key !== dateKey) return false;
    if (staffId && booking.staffId && booking.staffId !== staffId) return false;
    return true;
  });

  dayBookings.forEach((booking) => {
    const start = timeToMinutes(booking.time);
    if (start == null) return;
    const duration = Math.max(15, Number(booking.durationMinutes) || 60);
    const end = start + duration;
    const clippedStart = Math.max(dayStart, start);
    const clippedEnd = Math.min(dayEnd, end);
    if (clippedEnd <= clippedStart) return;
    const startLabel = minutesToHHMM(start);
    const endLabel = minutesToHHMM(end);
    segments.push({
      kind: 'booking',
      id: booking.id,
      start: startLabel,
      end: endLabel,
      leftPct: ((clippedStart - dayStart) / span) * 100,
      widthPct: ((clippedEnd - clippedStart) / span) * 100,
      title: `${startLabel}–${endLabel} · ${booking.clientName || 'Client'} · ${
        booking.serviceName || 'Service'
      }`
    });
  });

  return {
    status:
      segments.some((segment) => segment.kind === 'booking') &&
      (base.status === 'leave' ||
        base.status === 'off' ||
        base.status === 'business-closed')
        ? 'open'
        : base.status,
    segments,
    dayStart: base.dayStart ?? dayStart,
    dayEnd: base.dayEnd ?? dayEnd
  };
};

/** Apply open / break / off across an inclusive date range (staff days only). */
export const applyStatusToRange = (
  entry,
  startDateKey,
  endDateKey,
  status = 'open',
  openTime = DEFAULT_OPEN,
  closeTime = DEFAULT_CLOSE,
  ranges = null
) => {
  const normalized = normalizeStaffAvailabilityEntry(entry, entry?.staffId, openTime, closeTime);
  let start = parseDateKey(startDateKey);
  let end = parseDateKey(endDateKey);
  if (!start || !end) return normalized;
  if (start > end) {
    const swap = start;
    start = end;
    end = swap;
  }
  const nextStatus =
    status === 'break' || status === 'off' || status === 'leave' ? status : 'open';
  const days = { ...normalized.days };
  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
    const key = toDateKey(cursor);
    const existing = days[key];
    if (nextStatus === 'open') {
      const nextRanges =
        Array.isArray(ranges) && ranges.length
          ? ranges
          : existing?.status === 'open' && Array.isArray(existing.ranges) && existing.ranges.length
            ? existing.ranges
            : [{ start: openTime, end: closeTime }];
      days[key] = normalizeStaffDay(
        { status: 'open', open: true, ranges: nextRanges, source: 'status' },
        openTime,
        closeTime
      );
    } else if (nextStatus === 'break') {
      const breakRanges =
        Array.isArray(ranges) && ranges.length
          ? ranges
          : existing?.status === 'break' && Array.isArray(existing.ranges) && existing.ranges.length
            ? existing.ranges
            : [{ start: openTime, end: closeTime }];
      days[key] = normalizeStaffDay(
        { status: 'break', open: false, ranges: breakRanges, source: 'status' },
        openTime,
        closeTime
      );
    } else {
      days[key] = normalizeStaffDay(
        { status: nextStatus, open: false, ranges: [], source: 'status' },
        openTime,
        closeTime
      );
    }
  }
  return { ...normalized, days };
};

/** Apply business closed (or reopen) across inclusive dates on availabilityRules.closedDates. */
export const applyBusinessClosedToRange = (
  availabilityRules = {},
  startDateKey,
  endDateKey,
  closed = true
) => {
  const rules = normalizeAvailabilityRules(availabilityRules);
  let start = parseDateKey(startDateKey);
  let end = parseDateKey(endDateKey);
  if (!start || !end) return rules;
  if (start > end) {
    const swap = start;
    start = end;
    end = swap;
  }
  const set = new Set(rules.closedDates || []);
  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
    const key = toDateKey(cursor);
    if (closed) set.add(key);
    else set.delete(key);
  }
  return { ...rules, closedDates: [...set].sort() };
};

/** Intersect two HH:MM ranges; return null if empty. */
export const intersectRanges = (a, b) => {
  if (!a || !b) return null;
  const start = a.start > b.start ? a.start : b.start;
  const end = a.end < b.end ? a.end : b.end;
  if (start >= end) return null;
  return { start, end };
};

export const intersectWindowLists = (listA = [], listB = []) => {
  const out = [];
  for (const a of listA) {
    for (const b of listB) {
      const hit = intersectRanges(a, b);
      if (hit) out.push(hit);
    }
  }
  return out;
};

export const getBusinessDayWindows = (dateKey, availabilityRules = {}) => {
  const hours = getBusinessHoursForDate(dateKey, availabilityRules);
  if (!hours.open) return [];
  return [{ start: hours.openTime, end: hours.closeTime }];
};

/** Effective bookable windows for staff on a day = business ∩ staff. */
export const getEffectiveStaffWindows = (
  staffId,
  dateKey,
  staffAvailability = {},
  availabilityRules = {}
) => {
  const business = getBusinessDayWindows(dateKey, availabilityRules);
  const staff = getStaffDayWindows(staffId, dateKey, staffAvailability, availabilityRules);
  return intersectWindowLists(business, staff);
};

/**
 * Pure availability check for a confirmed booking. It never changes the booking;
 * Schedule uses the result to keep the card visible while explaining the conflict.
 */
export const getBookingAvailabilityConflict = ({
  booking,
  staffId = booking?.staffId || '',
  dateKey = String(booking?.dateKey || booking?.date || '').trim(),
  staffAvailability = {},
  availabilityRules = {}
} = {}) => {
  const start = timeToMinutes(booking?.time);
  const duration = Math.max(15, Number(booking?.durationMinutes) || 60);
  const end = start == null ? null : start + duration;
  if (start == null || end == null) {
    return { code: 'invalid-time', label: 'Booking time needs attention' };
  }

  const hours = getBusinessHoursForDate(dateKey, availabilityRules);
  if (!hours.open) {
    return { code: 'business-closed', label: 'Business is closed' };
  }
  const businessStart = timeToMinutes(hours.openTime);
  const businessEnd = timeToMinutes(hours.closeTime);
  if (
    businessStart == null ||
    businessEnd == null ||
    start < businessStart ||
    end > businessEnd
  ) {
    return { code: 'outside-business-hours', label: 'Outside business hours' };
  }
  if (!staffId) return null;

  const status = resolveCalendarDayStatus(
    staffId,
    dateKey,
    staffAvailability,
    availabilityRules
  );
  if (status === 'leave') return { code: 'staff-leave', label: 'Staff member is on leave' };
  if (status === 'off') return { code: 'staff-off', label: 'Staff member is off' };
  if (status === 'business-closed') {
    return { code: 'business-closed', label: 'Business is closed' };
  }

  const windows = getEffectiveStaffWindows(
    staffId,
    dateKey,
    staffAvailability,
    availabilityRules
  );
  const fitsWorkingWindow = windows.some((window) => {
    const windowStart = timeToMinutes(window.start);
    const windowEnd = timeToMinutes(window.end);
    return windowStart != null && windowEnd != null && start >= windowStart && end <= windowEnd;
  });
  if (fitsWorkingWindow) return null;

  const timeline = getStaffDayTimeline(
    staffId,
    dateKey,
    staffAvailability,
    availabilityRules
  );
  const overlapsBreak = (timeline.segments || [])
    .filter((segment) => segment.kind === 'break')
    .some((segment) => {
      const breakStart = timeToMinutes(segment.start);
      const breakEnd = timeToMinutes(segment.end);
      return breakStart != null && breakEnd != null && start < breakEnd && end > breakStart;
    });

  return overlapsBreak
    ? { code: 'during-break', label: 'Overlaps a staff break' }
    : { code: 'outside-shift', label: 'Outside this staff member’s shift' };
};

export const applyWeekTemplateToDays = (
  entry,
  fromDateKey,
  weeks = 4,
  openTime = DEFAULT_OPEN,
  closeTime = DEFAULT_CLOSE
) => {
  const start = parseDateKey(fromDateKey) || new Date();
  const total = Math.max(1, Math.round(Number(weeks) || 4)) * 7;
  const endKey = toDateKey(addDays(start, total - 1));
  return applyWeekTemplateToRange(entry, toDateKey(start), endKey, openTime, closeTime);
};

/** Apply week template across an inclusive start→end date range. */
export const applyWeekTemplateToRange = (
  entry,
  startDateKey,
  endDateKey,
  openTime = DEFAULT_OPEN,
  closeTime = DEFAULT_CLOSE
) => {
  const normalized = normalizeStaffAvailabilityEntry(entry, entry?.staffId, openTime, closeTime);
  let start = parseDateKey(startDateKey);
  let end = parseDateKey(endDateKey);
  if (!start || !end) return normalized;
  if (start > end) {
    const swap = start;
    start = end;
    end = swap;
  }
  const days = { ...normalized.days };
  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
    const key = toDateKey(cursor);
    const weekday = weekdayKeyFromDate(cursor);
    const template = normalized.weekTemplate[weekday];
    days[key] = normalizeStaffDay(
      {
        status: template?.open ? 'open' : 'off',
        open: Boolean(template?.open),
        ranges: template?.open ? [...(template.ranges || [])] : [],
        note: '',
        source: 'template'
      },
      openTime,
      closeTime
    );
  }
  return { ...normalized, days };
};

export const setStaffDayOverride = (
  entry,
  dateKey,
  patch = {},
  openTime = DEFAULT_OPEN,
  closeTime = DEFAULT_CLOSE
) => {
  const normalized = normalizeStaffAvailabilityEntry(entry, entry?.staffId, openTime, closeTime);
  return {
    ...normalized,
    days: {
      ...normalized.days,
      [dateKey]: normalizeStaffDay(
        { ...(normalized.days[dateKey] || {}), ...patch, source: 'manual' },
        openTime,
        closeTime
      )
    }
  };
};

export const createStaffAvailabilityForRoster = (
  staffList = [],
  openTime = DEFAULT_OPEN,
  closeTime = DEFAULT_CLOSE,
  weeksAhead = 8
) => {
  const map = {};
  const today = toDateKey(new Date());
  for (const member of staffList || []) {
    if (!member?.id) continue;
    let entry = normalizeStaffAvailabilityEntry(
      {
        staffId: member.id,
        weekTemplate: createDefaultWeekTemplate(openTime, closeTime)
      },
      member.id,
      openTime,
      closeTime
    );
    entry = applyWeekTemplateToDays(entry, today, weeksAhead, openTime, closeTime);
    map[member.id] = entry;
  }
  return map;
};
