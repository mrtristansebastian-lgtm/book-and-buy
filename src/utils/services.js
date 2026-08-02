import {
  getServiceScheduleType,
  normalizeScheduleType,
  scheduleTypeRequiresApproval
} from './scheduleTypes.js';

export const createServiceId = () => `service-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const asList = (value) => (Array.isArray(value) ? value : []);
const normalizeTicketLevel = (entry, index = 0) => {
  const raw = typeof entry === 'string' ? { label: entry } : (entry || {});
  const label = String(raw.label || raw.name || raw.type || '').trim().slice(0, 80);
  if (!label && !raw.price && !raw.capacity && !raw.duration) return null;
  return {
    id: String(raw.id || `ticket-${index}`).trim(),
    label: label || `Tier ${index + 1}`,
    price: String(raw.price ?? '').trim().slice(0, 80),
    capacity: String(raw.capacity ?? '').trim().slice(0, 40),
    duration: String(raw.duration ?? raw.durationMinutes ?? '').trim().slice(0, 40),
    note: String(raw.note || raw.description || '').trim().slice(0, 180)
  };
};

const normalizeTicketLevels = (service = {}) => (
  [...asList(service.ticketLevels), ...asList(service.scheduleConfig?.ticketLevels)]
    .map(normalizeTicketLevel)
    .filter(Boolean)
    .slice(0, 20)
);

const normalizeScheduleConfig = (service = {}) => {
  const ticketLevels = normalizeTicketLevels(service);
  return {
    capacity: Math.max(1, Math.round(Number(service.capacity || service.scheduleCapacity || 1) || 1)),
    sessionLabel: service.sessionLabel || service.scheduleConfig?.sessionLabel || '',
    ticketLevels,
    sessions: asList(service.sessions).filter(Boolean).slice(0, 100)
  };
};

export const normalizeService = (service = {}, index = 0) => {
  const scheduleType = getServiceScheduleType(service);
  const scheduleConfig = normalizeScheduleConfig(service);
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
    imageUrls: Array.isArray(service.imageUrls) ? service.imageUrls : [],
    templateId: service.templateId || '',
    bookingNote: service.bookingNote || '',
    scheduleType,
    bookingType: scheduleType,
    serviceType: scheduleType,
    scheduleConfig,
    capacity: scheduleConfig.capacity,
    ticketLevels: scheduleConfig.ticketLevels,
    approvalRequired: service.approvalRequired ?? scheduleTypeRequiresApproval(scheduleType)
  };
};

export const normalizeServiceList = (services = []) => (
  Array.isArray(services) ? services.map(normalizeService).filter(service => service.name?.trim()) : []
);

export const createServiceFromTemplate = (template = {}, overrides = {}) => normalizeService({
  id: createServiceId(),
  name: template.name || 'New service',
  category: template.category || '',
  description: template.description || '',
  price: template.price || '',
  currency: template.currency || 'R',
  priceType: template.priceType || 'fixed',
  duration: template.duration || '',
  staffIds: [],
  imageUrls: [],
  templateId: template.id || '',
  bookingNote: template.bookingNote || '',
  scheduleType: normalizeScheduleType(template.scheduleType || template.bookingType || template.serviceType || 'appointment'),
  ...overrides
});

export const formatServicePrice = (service = {}) => {
  const rawPrice = service.price ?? '';
  const priceText = String(rawPrice).trim();
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

export const summarizeService = (service = {}) => (
  [service.name, formatServiceDuration(service.duration), formatServicePrice(service)]
    .filter(Boolean)
    .join(' / ')
);

export const buildServiceSearchText = (service = {}) => [
  service.name,
  service.category,
  service.description,
  service.price,
  service.duration,
  service.priceType,
  service.scheduleType,
  service.bookingType,
  service.serviceType
].filter(Boolean).join(' ').toLowerCase();
