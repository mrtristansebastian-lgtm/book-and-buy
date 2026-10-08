/**
 * Client-compatible availability helper for Cloud Functions (Phase 2 stub).
 * Keep in sync with src/utils/availability.js slot generation rules.
 */

import { getFirestore } from 'firebase-admin/firestore';
import { availableRescheduleSlots } from './bookingDomain.js';
import { loadPublishedCommerce, serviceCommerceQuote } from './commerceRuntime.js';

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

/** Live public reads expose slots only, never clients or booking records. */
export async function getLivePublicServiceAvailability(data, db = getFirestore()) {
  const { workspace } = await loadPublishedCommerce(data.slug, db);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.dateKey || '')) throw new Error('Choose a valid date.');
  const quote = serviceCommerceQuote(workspace,data);
  const service = workspace.services.find((item) => item.id === quote.serviceId);
  const partySize = data.partySize ?? 1;
  if (!Number.isSafeInteger(partySize) || partySize < 1 || partySize > 100) throw new Error('Invalid party size.');
  if (data.staffId && !(service.staffIds || []).includes(data.staffId)) throw new Error('Choose an available staff member.');
  const staffIds = data.staffId ? [data.staffId] : service.staffIds?.length ? service.staffIds : [''];
  const slots = new Map();
  for (const staffId of staffIds) {
    const booking = { id: '__availability__', serviceId: service.id, durationMinutes: quote.durationMinutes, scheduleType: service.scheduleType || 'appointment', staffId, partySize };
    for (const slot of availableRescheduleSlots(workspace,booking,data.dateKey,workspace.bookings || [])) {
      const key = `${slot.time}:${slot.scheduleSessionId || ''}:${staffId}`;
      slots.set(key,{ ...slot, staffId, available: true });
    }
  }
  return [...slots.values()].sort((a,b) => a.time.localeCompare(b.time));
}
