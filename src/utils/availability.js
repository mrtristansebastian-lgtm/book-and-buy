import { toDateKey } from './dates';
import { getServiceDurationMinutes, parseDurationMinutes } from './services';
import { getServiceScheduleType } from './scheduleTypes';
import {
  getEffectiveStaffWindows,
  isBusinessOpenOnDate,
  normalizeAvailabilityRules
} from './staffAvailability';

const DEFAULT_OPEN = '09:00';
const DEFAULT_CLOSE = '17:00';

const toMinutes = (hhmm = '') => {
  const [h, m] = String(hhmm).split(':').map(Number);
  if (!Number.isFinite(h)) return 0;
  return h * 60 + (Number.isFinite(m) ? m : 0);
};

const fromMinutes = (mins) => {
  const safe = Math.max(0, Math.round(mins));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/** Build start times from open→close stepped by duration; each slot must finish by close. */
export function buildSlotList(openTime = DEFAULT_OPEN, closeTime = DEFAULT_CLOSE, durationMinutes = 60) {
  const open = toMinutes(openTime);
  const close = toMinutes(closeTime);
  const step = Math.max(15, Number(durationMinutes) || 60);
  if (!(close > open)) return [];
  const slots = [];
  for (let t = open; t + step <= close; t += step) {
    slots.push(fromMinutes(t));
  }
  return slots;
}

function bookingBlockMinutes(booking, services = [], fallback = 60) {
  if (Number(booking?.durationMinutes) > 0) return Math.round(Number(booking.durationMinutes));
  const fromField = parseDurationMinutes(booking?.serviceDuration || booking?.duration);
  if (fromField) return fromField;
  const service = (services || []).find((item) => item.id === booking?.serviceId);
  if (service) return getServiceDurationMinutes(service);
  return Math.max(15, Number(fallback) || 60);
}

function slotFitsWindows(startMin, endMin, windows = []) {
  return windows.some((window) => {
    const open = toMinutes(window.start);
    const close = toMinutes(window.end);
    return startMin >= open && endMin <= close;
  });
}

function collectCandidateStaffIds(service, staffList = [], staffId) {
  if (staffId) return [staffId];
  const assigned = Array.isArray(service?.staffIds) ? service.staffIds.filter(Boolean) : [];
  if (assigned.length) return assigned;
  return (staffList || []).map((member) => member.id).filter(Boolean);
}

/**
 * Build bookable start times for a date.
 * When staffAvailability is provided, slots are the union of free starts across
 * candidate staff (service.staffIds or all staff), intersecting business hours.
 */
export function getDaySlots({
  dateKey,
  bookings = [],
  serviceId,
  openTime = DEFAULT_OPEN,
  closeTime = DEFAULT_CLOSE,
  durationMinutes,
  slotList,
  services = [],
  staff = [],
  staffId,
  staffAvailability,
  availabilityRules
} = {}) {
  if (!dateKey) return [];
  const todayKey = toDateKey(new Date());
  if (dateKey < todayKey) return [];

  const rules = normalizeAvailabilityRules({
    ...(availabilityRules || {}),
    businessOpenTime: openTime || availabilityRules?.businessOpenTime || DEFAULT_OPEN,
    businessCloseTime: closeTime || availabilityRules?.businessCloseTime || DEFAULT_CLOSE
  });

  if (!isBusinessOpenOnDate(dateKey, rules)) return [];

  const service = (services || []).find((item) => item.id === serviceId);
  if (service && getServiceScheduleType(service) === 'class_session') {
    return [];
  }

  const duration = Math.max(
    15,
    Number(durationMinutes) ||
      (service ? getServiceDurationMinutes(service) : 0) ||
      60
  );

  const useStaffWindows = staffAvailability != null;
  const candidateIds = useStaffWindows
    ? collectCandidateStaffIds(service, staff, staffId)
    : [];

  let windows = [{ start: rules.businessOpenTime, end: rules.businessCloseTime }];
  if (useStaffWindows) {
    if (!candidateIds.length) return [];
    const merged = [];
    for (const id of candidateIds) {
      merged.push(...getEffectiveStaffWindows(id, dateKey, staffAvailability, rules));
    }
    // Deduplicate identical ranges
    const seen = new Set();
    windows = merged.filter((range) => {
      const key = `${range.start}-${range.end}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (!windows.length) return [];
  }

  const list = Array.isArray(slotList) && slotList.length
    ? slotList
    : windows.flatMap((window) => buildSlotList(window.start, window.end, duration));

  const uniqueStarts = [...new Set(list)].sort();

  const busyForStaff = (id) =>
    (bookings || [])
      .filter(
        (booking) =>
          (booking.dateKey || booking.date) === dateKey &&
          !['declined', 'cancelled'].includes(String(booking.status || '')) &&
          (!id || !booking.staffId || booking.staffId === id)
      )
      .map((booking) => {
        const start = toMinutes(booking.time);
        const block = bookingBlockMinutes(booking, services, duration);
        return { start, end: start + block, staffId: booking.staffId || '' };
      });

  // Without staff availability map: legacy behaviour (any booking blocks the day)
  if (!useStaffWindows) {
    const busy = busyForStaff('');
    return uniqueStarts
      .filter((slot) => {
        const start = toMinutes(slot);
        const end = start + duration;
        if (!slotFitsWindows(start, end, windows)) return false;
        return !busy.some((block) => start < block.end && end > block.start);
      })
      .map((time) => ({
        time,
        available: true,
        serviceId: serviceId || null
      }));
  }

  // With staff: a start is available if at least one candidate is free in a window
  return uniqueStarts
    .filter((slot) => {
      const start = toMinutes(slot);
      const end = start + duration;
      if (!slotFitsWindows(start, end, windows)) return false;
      return candidateIds.some((id) => {
        const staffWindows = getEffectiveStaffWindows(id, dateKey, staffAvailability, rules);
        if (!slotFitsWindows(start, end, staffWindows)) return false;
        const busy = busyForStaff(id);
        return !busy.some((block) => start < block.end && end > block.start);
      });
    })
    .map((time) => ({
      time,
      available: true,
      serviceId: serviceId || null
    }));
}

export function isDateBookable(dateKey, options = {}) {
  const { minSlots = 1, ...rest } = options;
  return getDaySlots({ dateKey, ...rest }).length >= minSlots;
}
