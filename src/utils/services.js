import { getServiceScheduleType } from './scheduleTypes';

export const createServiceId = () =>
  `service-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const normalizeService = (service = {}, index = 0) => {
  const scheduleType = getServiceScheduleType(service);
  return {
    ...service,
    id: service.id || createServiceId(),
    name: service.name || `Service ${index + 1}`,
    category: service.category || '',
    description: service.description || '',
    price: service.price ?? '',
    currency: service.currency || 'R',
    priceType: service.priceType || 'fixed',
    duration: service.duration || '',
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
