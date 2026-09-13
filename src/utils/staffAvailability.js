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
  if (status !== 'open' && status !== 'break' && status !== 'off') {
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
  return {
    status,
    open,
    ranges,
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
  const weekdays = Array.isArray(rules.openWeekdays)
    ? rules.openWeekdays.filter((key) => WEEKDAY_KEYS.includes(key))
    : ['mon', 'tue', 'wed', 'thu', 'fri'];
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
    businessOpenTime: openTime,
    businessCloseTime: closeTime,
    openWeekdays: weekdays.length ? weekdays : ['mon', 'tue', 'wed', 'thu', 'fri'],
    closedDates: [...new Set(closedDates)].sort(),
    maxAdvanceBookingDays,
    maxAdvanceBooking: String(maxAdvanceBookingDays),
    maxAdvanceBookingUntil
  };
};

/** Business open on dateKey? */
export const isBusinessOpenOnDate = (dateKey, availabilityRules = {}) => {
  const rules = normalizeAvailabilityRules(availabilityRules);
  if (!dateKey) return false;
  if ((rules.closedDates || []).includes(dateKey)) return false;
  const date = parseDateKey(dateKey);
  if (!date) return false;
  const weekday = weekdayKeyFromDate(date);
  return (rules.openWeekdays || []).includes(weekday);
};

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
    if (explicit.status === 'off' || (!explicit.open && explicit.status !== 'break')) return [];
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
    return explicit.ranges || [];
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
    if (explicit.status === 'off' || !explicit.open) return 'leave';
    return 'open';
  }
  const windows = getStaffDayWindows(staffId, dateKey, staffAvailability, availabilityRules);
  return windows.length ? 'open' : 'leave';
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
  const nextStatus = status === 'break' || status === 'off' ? status : 'open';
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
  const rules = normalizeAvailabilityRules(availabilityRules);
  if (!isBusinessOpenOnDate(dateKey, rules)) return [];
  return [{ start: rules.businessOpenTime, end: rules.businessCloseTime }];
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
