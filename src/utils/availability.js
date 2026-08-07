import { toDateKey } from './dates';
import { getServiceDurationMinutes, parseDurationMinutes } from './services';
import { getServiceScheduleType } from './scheduleTypes';

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

export function getDaySlots({
  dateKey,
  bookings = [],
  serviceId,
  openTime = DEFAULT_OPEN,
  closeTime = DEFAULT_CLOSE,
  durationMinutes,
  slotList,
  services = []
} = {}) {
  if (!dateKey) return [];
  const todayKey = toDateKey(new Date());
  if (dateKey < todayKey) return [];

  const service = (services || []).find((item) => item.id === serviceId);
  if (service && getServiceScheduleType(service) === 'class_session') {
    return [];
  }

  const open = toMinutes(openTime || DEFAULT_OPEN);
  const close = toMinutes(closeTime || DEFAULT_CLOSE);
  const duration = Math.max(
    15,
    Number(durationMinutes) ||
      (service ? getServiceDurationMinutes(service) : 0) ||
      60
  );

  const list = Array.isArray(slotList) && slotList.length
    ? slotList
    : buildSlotList(openTime || DEFAULT_OPEN, closeTime || DEFAULT_CLOSE, duration);

  const busy = (bookings || [])
    .filter(
      (booking) =>
        (booking.dateKey || booking.date) === dateKey &&
        !['declined', 'cancelled'].includes(String(booking.status || ''))
    )
    .map((booking) => {
      const start = toMinutes(booking.time);
      const block = bookingBlockMinutes(booking, services, duration);
      return { start, end: start + block };
    });

  return list
    .filter((slot) => {
      const start = toMinutes(slot);
      const end = start + duration;
      if (start < open || end > close) return false;
      return !busy.some((block) => start < block.end && end > block.start);
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
