import { getServiceScheduleType } from './scheduleTypes';
import { parseDateKey } from './dates';

export const createServiceId = () =>
  `service-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createServiceVariantId = () =>
  `svc-variant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const DURATION_PRESETS = [30, 45, 60, 90, 120];

export const parseDurationMinutes = (value) => {
  const n = Number(String(value ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};

export const normalizeServiceVariant = (variant = {}, index = 0) => ({
  id: variant.id || createServiceVariantId(),
  name: String(variant.name || '').trim() || `Option ${index + 1}`,
  description: String(variant.description || '').trim(),
  price: variant.price ?? '',
  minDuration: variant.minDuration ?? '',
  available: variant.available !== false
});

export const serviceHasVariants = (service = {}) =>
  Array.isArray(service.variants) &&
  service.variants.some((variant) => String(variant?.name || '').trim());

export const getServiceActiveVariants = (service = {}) =>
  (Array.isArray(service.variants) ? service.variants : [])
    .map(normalizeServiceVariant)
    .filter((variant) => variant.name && variant.available !== false);

export const findServiceVariant = (service = {}, variantId = '') => {
  const id = String(variantId || '').trim();
  if (!id) return null;
  return (
    getServiceActiveVariants(service).find((variant) => variant.id === id) ||
    (Array.isArray(service.variants) ? service.variants : [])
      .map(normalizeServiceVariant)
      .find((variant) => variant.id === id) ||
    null
  );
};

/** Effective minutes used for schedule availability (fixed duration or minimum). */
export const getServiceDurationMinutes = (service = {}, variant = null) => {
  if (getServiceScheduleType(service) === 'class_session') {
    const start = sessionWindowStartMs(service);
    const end = sessionWindowEndMs(service);
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      return Math.max(15, Math.round((end - start) / 60000));
    }
    return 60;
  }
  if (variant) {
    return (
      parseDurationMinutes(variant.minDuration) ||
      parseDurationMinutes(service.minDuration) ||
      parseDurationMinutes(service.duration) ||
      60
    );
  }
  if (serviceHasVariants(service)) {
    const mins = getServiceActiveVariants(service)
      .map((row) => parseDurationMinutes(row.minDuration))
      .filter((n) => n > 0);
    if (mins.length) return Math.min(...mins);
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
export const formatServiceDurationLabel = (service = {}, variant = null) => {
  if (variant) {
    const min = parseDurationMinutes(variant.minDuration);
    return min ? `${min} min` : '';
  }
  if (serviceHasVariants(service)) {
    const mins = getServiceActiveVariants(service)
      .map((row) => parseDurationMinutes(row.minDuration))
      .filter((n) => n > 0);
    if (!mins.length) return '';
    const lowest = Math.min(...mins);
    const highest = Math.max(...mins);
    if (lowest === highest) return `${lowest} min`;
    return `From ${lowest} min`;
  }
  if (service.fixedDuration === false) {
    const min = parseDurationMinutes(service.minDuration);
    return min ? `Min ${min} min` : '';
  }
  return formatServiceDuration(service.duration);
};

/** End-sticker meta: session window for spots, duration for slots. */
export const formatServiceCardMeta = (service = {}, variant = null) => {
  if (getServiceScheduleType(service) === 'class_session') {
    return formatServiceSessionLabel(service);
  }
  return formatServiceDurationLabel(service, variant);
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
  const variants = (Array.isArray(service.variants) ? service.variants : [])
    .map(normalizeServiceVariant)
    .filter((variant) => String(variant.name || '').trim());
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
    approvalRequired: service.approvalRequired ?? false,
    variants
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

const formatMoneyLabel = (amount, currency = 'R') => {
  const priceText = String(amount ?? '').trim();
  if (!priceText) return '';
  if (/[^\d\s.,-]/.test(priceText)) return priceText;
  return `${currency || 'R'}${priceText}`;
};

export const formatServicePrice = (service = {}, variant = null) => {
  if (service.priceType === 'free') return 'Free';
  if (service.priceType === 'quote') return 'Quote after consult';

  if (variant) {
    const value = formatMoneyLabel(variant.price, service.currency);
    if (!value) return '';
    if (service.priceType === 'hourly') return `${value}/hr`;
    return value;
  }

  if (serviceHasVariants(service)) {
    const cents = getServiceActiveVariants(service)
      .map((row) => getServiceUnitPriceCents(service, row))
      .filter((n) => n > 0);
    if (cents.length) {
      const lowest = Math.min(...cents);
      const highest = Math.max(...cents);
      const label = formatMoneyLabel(
        (lowest / 100).toFixed(lowest % 100 === 0 ? 0 : 2),
        service.currency
      );
      if (lowest !== highest) return `From ${label}`;
      return label;
    }
  }

  const priceText = String(service.price ?? '').trim();
  if (!priceText) return '';
  const value = formatMoneyLabel(priceText, service.currency);
  if (service.priceType === 'hourly') return `${value}/hr`;
  if (service.priceType === 'from') return `From ${value}`;
  return value;
};

export const getServiceUnitPriceCents = (service = {}, variant = null) => {
  if (service.priceType === 'quote' || service.priceType === 'free') return 0;
  const source = variant?.price ?? service.price;
  const digits = String(source ?? '').replace(/[^\d.]/g, '');
  const value = Number(digits);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
};
