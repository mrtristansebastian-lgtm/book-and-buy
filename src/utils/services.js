import { getServiceScheduleType } from './scheduleTypes';
import { parseDateKey } from './dates';

export const createServiceId = () =>
  `service-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const DURATION_PRESETS = [30, 45, 60, 90, 120];

export const parseDurationMinutes = (value) => {
  const n = Number(String(value ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};

/** Effective minutes used for schedule availability (fixed duration or minimum). */
export const getServiceDurationMinutes = (service = {}) => {
  if (getServiceScheduleType(service) === 'class_session') {
    const start = sessionWindowStartMs(service);
    const end = sessionWindowEndMs(service);
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      return Math.max(15, Math.round((end - start) / 60000));
    }
    return 60;
  }
  if (service.fixedDuration === false) {
    return (
      parseDurationMinutes(service.minDuration) ||
      parseDurationMinutes(service.duration) ||
      60
    );
  }
  return (
    parseDurationMinutes(service.duration) ||
    parseDurationMinutes(service.minDuration) ||
    60
  );
};

const normalizeTime = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return raw;
  return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`;
};

export const sessionWindowStartMs = (service = {}) => {
  const date = parseDateKey(service.sessionStartDate);
  if (!date) return NaN;
  const [h, m] = String(service.sessionStartTime || '00:00')
    .split(':')
    .map(Number);
  date.setHours(h || 0, m || 0, 0, 0);
  return date.getTime();
};

export const sessionWindowEndMs = (service = {}) => {
  const date = parseDateKey(service.sessionEndDate || service.sessionStartDate);
  if (!date) return NaN;
  const [h, m] = String(service.sessionEndTime || '00:00')
    .split(':')
    .map(Number);
  date.setHours(h || 0, m || 0, 0, 0);
  return date.getTime();
};

export const isValidServiceSessionWindow = (service = {}) => {
  if (!service.sessionStartDate || !service.sessionStartTime) return false;
  if (!service.sessionEndDate || !service.sessionEndTime) return false;
  const start = sessionWindowStartMs(service);
  const end = sessionWindowEndMs(service);
  return Number.isFinite(start) && Number.isFinite(end) && end > start;
};

const formatShortDate = (dateKey = '') => {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey || '';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

/** Compact start→end sticker for spot programmes. */
export const formatServiceSessionLabel = (service = {}) => {
  const startDate = String(service.sessionStartDate || '').trim();
  const endDate = String(service.sessionEndDate || startDate).trim();
  const startTime = normalizeTime(service.sessionStartTime);
  const endTime = normalizeTime(service.sessionEndTime);
  if (!startDate || !startTime || !endTime) return '';

  if (startDate === endDate) {
    return `${formatShortDate(startDate)} · ${startTime}–${endTime}`;
  }
  return `${formatShortDate(startDate)} ${startTime} – ${formatShortDate(endDate)} ${endTime}`;
};

export const formatServiceDuration = (duration = '') => {
  const value = String(duration || '').trim();
  if (!value) return '';
  if (/[a-z]/i.test(value)) return value;
  return `${value} min`;
};

/** Catalog / card label for fixed or minimum duration. */
export const formatServiceDurationLabel = (service = {}) => {
  if (service.fixedDuration === false) {
    const min = parseDurationMinutes(service.minDuration);
    return min ? `Min ${min} min` : '';
  }
  return formatServiceDuration(service.duration);
};

/** End-sticker meta: session window for spots, duration for slots. */
export const formatServiceCardMeta = (service = {}) => {
  if (getServiceScheduleType(service) === 'class_session') {
    return formatServiceSessionLabel(service);
  }
  return formatServiceDurationLabel(service);
};

const ACTIVE_BOOKING_STATUSES = new Set(['pending', 'confirmed', 'waitlist']);

export const countServiceSpotBookings = (service = {}, bookings = []) => {
  const id = service.id;
  if (!id) return 0;
  return (Array.isArray(bookings) ? bookings : []).filter(
    (booking) =>
      booking?.serviceId === id && ACTIVE_BOOKING_STATUSES.has(String(booking.status || ''))
  ).length;
};

export const getServiceOpenSpots = (service = {}, bookings = []) => {
  const capacity = Math.max(1, Math.round(Number(service.capacity || 1) || 1));
  return Math.max(0, capacity - countServiceSpotBookings(service, bookings));
};

/** Remaining capacity label for spot programmes — updates with bookings. */
export const formatServiceSpotsLabel = (service = {}, bookings = []) => {
  if (getServiceScheduleType(service) !== 'class_session') return '';
  const open = getServiceOpenSpots(service, bookings);
  return `${open} spot${open === 1 ? '' : 's'} left`;
};

export const getSpotSessionStatus = (service = {}, now = Date.now()) => {
  const start = sessionWindowStartMs(service);
  const end = sessionWindowEndMs(service);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 'draft';
  if (now < start) return 'upcoming';
  if (now > end) return 'ended';
  return 'live';
};

export const normalizeService = (service = {}, index = 0) => {
  const scheduleType = getServiceScheduleType(service);
  const fixedDuration = service.fixedDuration !== false;
  const duration = service.duration ?? '';
  const minDuration = service.minDuration ?? '';
  const sessionStartDate = String(service.sessionStartDate || '').trim();
  const sessionEndDate = String(service.sessionEndDate || sessionStartDate).trim();
  return {
    ...service,
    id: service.id || createServiceId(),
    name: service.name || `Service ${index + 1}`,
    category: service.category || '',
    description: service.description || '',
    price: service.price ?? '',
    currency: service.currency || 'R',
    priceType: service.priceType || 'fixed',
    duration,
    fixedDuration,
    minDuration: fixedDuration ? minDuration || '' : minDuration || duration || '',
    sessionStartDate,
    sessionStartTime: normalizeTime(service.sessionStartTime),
    sessionEndDate,
    sessionEndTime: normalizeTime(service.sessionEndTime),
    active: service.active !== false,
    staffIds: Array.isArray(service.staffIds) ? service.staffIds : [],
    imageUrls: Array.isArray(service.imageUrls)
      ? service.imageUrls
      : service.image
        ? [service.image]
        : [],
    scheduleType,
    capacity: Math.max(1, Math.round(Number(service.capacity || 1) || 1)),
    approvalRequired: service.approvalRequired ?? false
  };
};

export const normalizeServiceList = (services = []) =>
  (Array.isArray(services) ? services : [])
    .map(normalizeService)
    .filter((service) => service.name?.trim());

export const collectServiceCategories = (services = [], existing = []) => {
  const seen = new Set();
  const out = [];
  for (const label of [...(Array.isArray(existing) ? existing : []), ...services.map((s) => s.category)]) {
    const value = String(label || '').trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
};

export const formatServicePrice = (service = {}) => {
  const priceText = String(service.price ?? '').trim();
  if (service.priceType === 'free') return 'Free';
  if (service.priceType === 'quote') return 'Quote after consult';
  if (!priceText) return '';
  const looksFormatted = /[^\d\s.,-]/.test(priceText);
  const value = looksFormatted ? priceText : `${service.currency || 'R'}${priceText}`;
  if (service.priceType === 'hourly') return `${value}/hr`;
  if (service.priceType === 'from') return `From ${value}`;
  return value;
};

export const getServiceUnitPriceCents = (service = {}) => {
  if (service.priceType === 'quote' || service.priceType === 'free') return 0;
  const digits = String(service.price ?? '').replace(/[^\d.]/g, '');
  const value = Number(digits);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
};
