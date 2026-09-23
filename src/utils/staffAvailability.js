import { addDays, parseDateKey, toDateKey } from './dates';
import {
  alignTimeToWindowMinutes,
  minutesToTime,
  resolveTimeWindowMinutes,
  timeToMinutes
} from './scheduleTime';

export {
  alignTimeToWindowMinutes,
  minutesToTime,
  resolveTimeWindowMinutes,
  timeToMinutes
} from './scheduleTime';

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
  if (timeToMinutes(start) == null || timeToMinutes(end) == null) return null;
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
    const base = resolveTimeWindowMinutes(window.start, window.end);
    const blocked = resolveTimeWindowMinutes(exclusion.start, exclusion.end);
    let pieces = [{ start: base.start, end: base.end }];
    [-24 * 60, 0, 24 * 60].forEach((shift) => {
      const blockedStart = blocked.start + shift;
      const blockedEnd = blocked.end + shift;
      pieces = pieces.flatMap((piece) => {
        if (blockedEnd <= piece.start || blockedStart >= piece.end) return [piece];
        const next = [];
        if (blockedStart > piece.start) next.push({ start: piece.start, end: blockedStart });
        if (blockedEnd < piece.end) next.push({ start: blockedEnd, end: piece.end });
        return next;
      });
    });
    pieces.forEach((piece) => {
      if (piece.end <= piece.start) return;
      out.push({ start: minutesToTime(piece.start), end: minutesToTime(piece.end) });
    });
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
  const dayWindow = resolveTimeWindowMinutes(hours.openTime, hours.closeTime);
  const dayStart = dayWindow.start;
  const dayEnd = dayWindow.end;
  const span = Math.max(1, dayEnd - dayStart);

  const toSegments = (range, kind) => {
    const rangeWindow = resolveTimeWindowMinutes(range?.start, range?.end, {
      fallbackStart: dayStart,
      fallbackEnd: dayEnd
    });
    return [-24 * 60, 0, 24 * 60]
      .map((shift) => ({
        start: rangeWindow.start + shift,
        end: rangeWindow.end + shift
      }))
      .map(({ start, end }) => ({
        clippedStart: Math.max(dayStart, start),
        clippedEnd: Math.min(dayEnd, end)
      }))
      .filter(({ clippedStart, clippedEnd }) => clippedEnd > clippedStart)
      .map(({ clippedStart, clippedEnd }) => ({
        kind,
        start: range.start,
        end: range.end,
        startMinutes: clippedStart,
        endMinutes: clippedEnd,
        leftPct: ((clippedStart - dayStart) / span) * 100,
        widthPct: ((clippedEnd - clippedStart) / span) * 100
      }));
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
    segments.push(...toSegments(range, 'open'));
  });

  if (status === 'break' && Array.isArray(explicit?.ranges)) {
    explicit.ranges.forEach((range) => {
      segments.push(...toSegments(range, 'break'));
    });
  } else if (Array.isArray(explicit?.breaks)) {
    explicit.breaks.forEach((range) => {
      segments.push(...toSegments(range, 'break'));
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
  const dayWindow = resolveTimeWindowMinutes(hours.openTime, hours.closeTime);
  const dayStart = dayWindow.start;
  const dayEnd = dayWindow.end;

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
  const dayWindow = resolveTimeWindowMinutes(hours.openTime, hours.closeTime);
  const dayStart = dayWindow.start;
  const dayEnd = dayWindow.end;
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
    const rawStart = timeToMinutes(booking.time);
    const start = alignTimeToWindowMinutes(rawStart, dayStart, dayEnd);
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
const intersectRangeParts = (a, b) => {
  if (!a || !b) return null;
  const aWindow = resolveTimeWindowMinutes(a.start, a.end);
  const bWindow = resolveTimeWindowMinutes(b.start, b.end);
  return [-24 * 60, 0, 24 * 60]
    .map((shift) => ({
      start: Math.max(aWindow.start, bWindow.start + shift),
      end: Math.min(aWindow.end, bWindow.end + shift)
    }))
    .filter((range) => range.end > range.start)
    .map((range) => ({ start: minutesToTime(range.start), end: minutesToTime(range.end) }));
};

export const intersectRanges = (a, b) => intersectRangeParts(a, b)?.[0] || null;

export const intersectWindowLists = (listA = [], listB = []) => {
  const out = [];
  for (const a of listA) {
    for (const b of listB) {
      out.push(...(intersectRangeParts(a, b) || []));
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
  const rawStart = timeToMinutes(booking?.time);
  const duration = Math.max(15, Number(booking?.durationMinutes) || 60);
  const hours = getBusinessHoursForDate(dateKey, availabilityRules);
  const businessWindow = resolveTimeWindowMinutes(hours.openTime, hours.closeTime);
  const start = alignTimeToWindowMinutes(rawStart, businessWindow.start, businessWindow.end);
  const end = start == null ? null : start + duration;
  if (start == null || end == null) {
    return { code: 'invalid-time', label: 'Booking time needs attention' };
  }

  if (!hours.open) {
    return { code: 'business-closed', label: 'Business is closed' };
  }
  const businessStart = businessWindow.start;
  const businessEnd = businessWindow.end;
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

  const timeline = getStaffDayTimeline(
    staffId,
    dateKey,
    staffAvailability,
    availabilityRules
  );
  const fitsWorkingWindow = (timeline.segments || [])
    .filter((segment) => segment.kind === 'open')
    .some((segment) => start >= segment.startMinutes && end <= segment.endMinutes);
  if (fitsWorkingWindow) return null;

  const overlapsBreak = (timeline.segments || [])
    .filter((segment) => segment.kind === 'break')
    .some((segment) => start < segment.endMinutes && end > segment.startMinutes);

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
