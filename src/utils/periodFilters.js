import { addDays, formatDisplayDate, parseDateKey, toDateKey } from './dates';

export const PERIOD_OPTIONS = [
  { id: 'all', label: 'All time' },
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'custom', label: 'Custom' }
];

export function startOfWeek(date) {
  return addDays(date, -((date.getDay() + 6) % 7));
}

export function getPeriodRange(dayKey, period = 'day', customRange = {}) {
  if (period === 'all') {
    return { start: '0000-01-01', end: '9999-12-31' };
  }
  if (period === 'custom') {
    const start = customRange.from || dayKey || toDateKey(new Date());
    const end = customRange.to || customRange.from || start;
    return start <= end ? { start, end } : { start: end, end: start };
  }
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

export function formatPeriodLabel(dayKey, period = 'day', customRange = {}) {
  if (period === 'all') return 'All time';
  if (period === 'custom') {
    const { start, end } = getPeriodRange(dayKey, 'custom', customRange);
    if (start === end) return formatDisplayDate(start);
    const startDate = parseDateKey(start);
    const endDate = parseDateKey(end);
    if (!startDate || !endDate) return 'Custom range';
    const sameMonth = startDate.getMonth() === endDate.getMonth();
    const left = startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const right = endDate.toLocaleDateString(undefined, {
      month: sameMonth ? undefined : 'short',
      day: 'numeric'
    });
    return `${left} – ${right}`;
  }
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
    return `${left} - ${right}`;
  }
  return formatDisplayDate(dayKey);
}

export function shiftPeriod(dayKey, period, direction) {
  if (period === 'all' || period === 'custom') return dayKey;
  const date = parseDateKey(dayKey) || new Date();
  if (period === 'week') return toDateKey(addDays(date, direction * 7));
  if (period === 'month') {
    return toDateKey(new Date(date.getFullYear(), date.getMonth() + direction, 1));
  }
  return toDateKey(addDays(date, direction));
}

export function isDateKeyInPeriod(dateKey, range) {
  const key = String(dateKey || '').trim();
  return Boolean(key && key >= range.start && key <= range.end);
}
