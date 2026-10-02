import { WEEKDAY_KEYS, normalizeAvailabilityRules } from '../../../utils/staffAvailability.js';

export function seedWeekdayHours(availabilityRules = {}) {
  const rules = normalizeAvailabilityRules(availabilityRules);
  return Object.fromEntries(WEEKDAY_KEYS.map((key) => {
    const row = rules.weekdayHours?.[key] || {};
    return [key, {
      open: Boolean(row.open),
      openTime: row.openTime || rules.businessOpenTime || '09:00',
      closeTime: row.closeTime || rules.businessCloseTime || '17:00'
    }];
  }));
}

export function buildBusinessHoursPatch(draft) {
  const openWeekdays = WEEKDAY_KEYS.filter((key) => draft[key]?.open);
  const validTime = (value) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value || '');
  if (!openWeekdays.length || openWeekdays.some((key) => !validTime(draft[key].openTime) || !validTime(draft[key].closeTime))) return null;
  const seed = draft[openWeekdays[0]];
  return { weekdayHours: draft, openWeekdays, businessOpenTime: seed.openTime, businessCloseTime: seed.closeTime };
}
