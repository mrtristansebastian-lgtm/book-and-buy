import { toDateKey } from '../../../utils/dates.js';
import { normalizeStaffAvailabilityEntry, getStaffDayWindows, weekdayKeyFromDate, setStaffDayOverride } from '../../../utils/staffAvailability.js';

// One visible calendar month: recurring shifts and dated overrides, without an unbounded scan.
export function listActiveShifts(staffId, entry, rules, month, today, lastDate = '') {
  if (!staffId || !entry) return [];
  const normalized = normalizeStaffAvailabilityEntry(entry, staffId, rules.businessOpenTime, rules.businessCloseTime);
  const rows = [];
  for (let day = 1; day <= new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(); day += 1) {
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    const key = toDateKey(date);
    if (key < today || (lastDate && key > lastDate)) continue;
    if (!getStaffDayWindows(staffId, key, { [staffId]: normalized }, rules).length) continue;
    const override = normalized.days[key];
    const template = normalized.weekTemplate[weekdayKeyFromDate(date)];
    const ranges = override && override.status !== 'break' ? override.ranges : template.ranges;
    const breaks = override?.status === 'break' ? override.ranges : override?.breaks || [];
    (ranges || []).forEach((range, index) => rows.push({ date: key, index, ...range, ranges, breaks, recurring: !override }));
  }
  return rows;
}

export function removeActiveShift(entry, row, rules) {
  const ranges = row.ranges.filter((_, index) => index !== row.index);
  return setStaffDayOverride(entry, row.date, {
    status: ranges.length ? 'open' : 'off', open: Boolean(ranges.length), ranges,
    breaks: ranges.length ? row.breaks : [], source: 'manual'
  }, rules.businessOpenTime || '09:00', rules.businessCloseTime || '17:00');
}
