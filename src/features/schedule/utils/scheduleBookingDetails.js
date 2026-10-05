import { formatDisplayDate, parseDateKey, toDateKey } from '../../../utils/dates.js';

export function scheduleDetailsDateLabel(key) {
  const value = String(key || '').trim();
  if (!value) return 'Date not recorded';
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseDateKey(value) : null;
  if (!parsed || toDateKey(parsed) !== value) return 'Date needs review';
  return formatDisplayDate(value);
}

export function scheduleDetailsDuration(value) {
  if (value == null || value === '' || typeof value === 'boolean') return null;
  const minutes = Number(value);
  return Number.isSafeInteger(minutes) && minutes > 0 ? minutes : null;
}

export function scheduleDetailsTimeLabel(time, duration) {
  const value = String(time || '').trim();
  if (!value) return 'Time not recorded';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return 'Time needs review';
  const minutes = scheduleDetailsDuration(duration);
  if (minutes == null) return value;
  const [hour, minute] = value.split(':').map(Number);
  const total = hour * 60 + minute + minutes;
  if (!Number.isSafeInteger(total)) return value;
  const end = `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  const days = Math.floor(total / 1440);
  return `${value}–${end}${days ? ` (+${days} ${days === 1 ? 'day' : 'days'})` : ''}`;
}

export function scheduleDetailsWindowLabel(booking, timing) {
  if (!timing) return scheduleDetailsTimeLabel(booking?.time, booking?.durationMinutes);
  const start = scheduleDetailsTimeLabel(timing.time);
  if (!timing.startValid || start === 'Time needs review' || start === 'Time not recorded') return start === 'Time not recorded' ? start : 'Time needs review';
  const end = scheduleDetailsTimeLabel(timing.endTime);
  const endDate = scheduleDetailsDateLabel(timing.endDateKey);
  if (timing.startAmbiguous || !timing.endValid || end === 'Time needs review' || end === 'Time not recorded' || endDate === 'Date needs review' || endDate === 'Date not recorded') {
    return `${start} · End time not recorded`;
  }
  return `${start}–${end}${timing.endDateKey !== timing.dateKey ? ` (${endDate})` : ''}`;
}

const knownMoney = value => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
export function scheduleDetailsPayment(booking = {}, workspace = {}) {
  return {
    total: knownMoney(booking.amountInCents) ? booking.amountInCents : null,
    paid: knownMoney(booking.amountPaidInCents) ? booking.amountPaidInCents : null,
    quote: booking.servicePriceType === 'quote',
    currency: booking.currency || workspace.currency || 'R'
  };
}
