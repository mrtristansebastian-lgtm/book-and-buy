import { toDateKey } from './dates';

const DEFAULT_OPEN = '09:00';
const DEFAULT_CLOSE = '17:00';
const DEFAULT_SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

const toMinutes = (hhmm = '') => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + (m || 0);
};

export function getDaySlots({
  dateKey,
  bookings = [],
  serviceId,
  openTime = DEFAULT_OPEN,
  closeTime = DEFAULT_CLOSE,
  slotList = DEFAULT_SLOTS
} = {}) {
  if (!dateKey) return [];
  const todayKey = toDateKey(new Date());
  if (dateKey < todayKey) return [];

  const open = toMinutes(openTime);
  const close = toMinutes(closeTime);
  const taken = new Set(
    bookings
      .filter(
        (booking) =>
          (booking.dateKey || booking.date) === dateKey &&
          !['declined', 'cancelled'].includes(String(booking.status || ''))
      )
      .map((booking) => booking.time)
  );

  return slotList
    .filter((slot) => {
      const mins = toMinutes(slot);
      return mins >= open && mins < close && !taken.has(slot);
    })
    .map((time) => ({
      time,
      available: true,
      serviceId: serviceId || null
    }));
}

export function isDateBookable(dateKey, { bookings = [], minSlots = 1 } = {}) {
  return getDaySlots({ dateKey, bookings }).length >= minSlots;
}
