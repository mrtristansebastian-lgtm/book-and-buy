import { getServiceScheduleType } from './scheduleTypes';

export const createServiceId = () =>
  `service-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const DURATION_PRESETS = [30, 45, 60, 90, 120];

export const parseDurationMinutes = (value) => {
  const n = Number(String(value ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};

/** Effective minutes used for schedule availability (fixed duration or minimum). */
export const getServiceDurationMinutes = (service = {}) => {
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

export const normalizeService = (service = {}, index = 0) => {
  const scheduleType = getServiceScheduleType(service);
  const fixedDuration = service.fixedDuration !== false;
  const duration = service.duration ?? '';
  const minDuration = service.minDuration ?? '';
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

export const getServiceUnitPriceCents = (service = {}) => {
  if (service.priceType === 'quote' || service.priceType === 'free') return 0;
  const digits = String(service.price ?? '').replace(/[^\d.]/g, '');
  const value = Number(digits);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
};
