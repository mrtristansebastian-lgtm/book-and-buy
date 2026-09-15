import { addDays, parseDateKey, toDateKey } from '../../../utils/dates';

export const WEEKDAY_LABELS = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun'
};

export const STATUS_OPTIONS = [
  { id: 'open', label: 'Working' },
  { id: 'off', label: 'Off day' },
  { id: 'leave', label: 'Leave' }
];

/** Paint / cycle statuses — break is day-specific only */
export const STAFF_PAINT_OPTIONS = [
  { id: 'open', label: 'Working' },
  { id: 'off', label: 'Off day' },
  { id: 'leave', label: 'Leave' }
];

export const BUSINESS_STATUS_OPTIONS = [
  { id: 'open', label: 'Available' },
  { id: 'business-closed', label: 'Closed' }
];

export function formatWindowDate(dateKey = '') {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function clampMonthAnchor(anchor, todayKey, maxBookableDateKey) {
  const today = parseDateKey(todayKey) || new Date();
  const minMonth = startOfMonth(today);
  let next = startOfMonth(anchor instanceof Date ? anchor : new Date());
  if (next < minMonth) next = minMonth;
  if (maxBookableDateKey) {
    const maxDate = parseDateKey(maxBookableDateKey);
    if (maxDate) {
      const maxMonth = startOfMonth(maxDate);
      if (next > maxMonth) next = maxMonth;
    }
  }
  return next;
}

export function mapCalendarStatusToDraft(status) {
  if (status === 'business-closed') return 'business-closed';
  if (status === 'leave') return 'leave';
  if (status === 'off') return 'off';
  // Legacy break days edit as Working + break rows in the feed
  return 'open';
}

export function rangesAreValid(ranges = []) {
  return (ranges || []).some(
    (range) => range?.start && range?.end && String(range.end) > String(range.start)
  );
}

export function statusTileLabel(status, businessFocus = false) {
  if (status === 'business-closed') return 'Closed';
  if (status === 'break') return 'Break';
  if (status === 'leave') return 'Leave';
  if (status === 'off') return 'Off';
  return businessFocus ? 'Available' : 'Working';
}

export function orderedDateSpan(startKey, endKey) {
  let start = parseDateKey(startKey);
  let end = parseDateKey(endKey || startKey);
  if (!start) return { startKey: '', endKey: '', keys: [] };
  if (!end) end = start;
  if (start > end) {
    const swap = start;
    start = end;
    end = swap;
  }
  const keys = [];
  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
    keys.push(toDateKey(cursor));
  }
  return { startKey: toDateKey(start), endKey: toDateKey(end), keys };
}

export function staffInitials(name = '') {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function staffPhoto(member) {
  return member?.photoURL || member?.imageUrl || '';
}
