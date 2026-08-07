/**
 * Client-compatible availability helper for Cloud Functions (Phase 2 stub).
 * Keep in sync with src/utils/availability.js slot generation rules.
 */

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

function buildSlotList(openTime = DEFAULT_OPEN, closeTime = DEFAULT_CLOSE, durationMinutes = 60) {
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

function parseDurationMinutes(value) {
  const n = Number(String(value ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

function bookingBlockMinutes(booking, fallback = 60) {
  if (Number(booking?.durationMinutes) > 0) return Math.round(Number(booking.durationMinutes));
  const fromField = parseDurationMinutes(booking?.serviceDuration || booking?.duration);
  if (fromField) return fromField;
  return Math.max(15, Number(fallback) || 60);
}

export function buildPublicAvailability({
  dateKey,
  bookings = [],
  openTime = DEFAULT_OPEN,
  closeTime = DEFAULT_CLOSE,
  durationMinutes = 60,
  slotList
} = {}) {
  if (!dateKey) return [];
  const open = toMinutes(openTime);
  const close = toMinutes(closeTime);
  const duration = Math.max(15, Number(durationMinutes) || 60);
  const list = Array.isArray(slotList) && slotList.length
    ? slotList
    : buildSlotList(openTime, closeTime, duration);

  const busy = (bookings || [])
    .filter(
      (booking) =>
        (booking.dateKey || booking.date) === dateKey &&
        !['declined', 'cancelled'].includes(String(booking.status || ''))
    )
    .map((booking) => {
      const start = toMinutes(booking.time);
      const block = bookingBlockMinutes(booking, duration);
      return { start, end: start + block };
    });

  return list
    .filter((slot) => {
      const start = toMinutes(slot);
      const end = start + duration;
      if (start < open || end > close) return false;
      return !busy.some((block) => start < block.end && end > block.start);
    })
    .map((time) => ({ time, available: true }));
}
