export const createServiceId = () => `service-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const normalizeService = (service = {}, index = 0) => ({
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
  bookingNote: service.bookingNote || ''
});

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
  ...overrides
});

export const formatServicePrice = (service = {}) => {
  const rawPrice = service.price ?? '';
  const priceText = String(rawPrice).trim();
  if (!priceText) return '';
  const looksFormatted = /[^\d\s.,-]/.test(priceText);
  const value = looksFormatted ? priceText : `${service.currency || 'R'}${priceText}`;
  if (service.priceType === 'hourly') return `${value}/hr`;
  if (service.priceType === 'from') return `From ${value}`;
  if (service.priceType === 'quote') return 'Quote after consult';
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
  service.priceType
].filter(Boolean).join(' ').toLowerCase();
