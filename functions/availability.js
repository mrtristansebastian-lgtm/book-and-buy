/**
 * Client-compatible availability helper for Cloud Functions (Phase 2 stub).
 * Wire to getPublicServiceAvailability callable when Firebase backend is reattached.
 */

const DEFAULT_SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

const toMinutes = (hhmm = '') => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + (m || 0);
};

export function buildPublicAvailability({
  dateKey,
  bookings = [],
  openTime = '09:00',
  closeTime = '17:00',
  slotList = DEFAULT_SLOTS
} = {}) {
  if (!dateKey) return [];
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
    .map((time) => ({ time, available: true }));
}
