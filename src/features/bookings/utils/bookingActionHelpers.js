import { getLocalDateStr } from '../../../utils/dates';
import { getServiceScheduleType } from '../../../utils/scheduleTypes';
import {
  buildSupportThreadId,
  normalizeEmail
} from '../../communications/communicationsModel';

export { buildSupportThreadId };

const paymentProviderNames = {
  cash: 'Cash',
  manual_eft: 'Direct EFT',
  stripe: 'Stripe',
  yoco: 'Yoco',
  payfast: 'PayFast',
  paystack: 'Paystack'
};

const paymentGateways = new Set(['stripe', 'yoco', 'payfast', 'paystack']);

const parsePriceNumber = (value) => Number(String(value || '').replace(/[^\d.]/g, ''));

export const parseAmountToCents = (value) => {
  const normalized = String(value || '')
    .replace(/[^0-9.,-]/g, '')
    .replace(',', '.');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : 0;
};

export const buildPublicBookingIdempotencyKey = ({ workspaceSlug, formData = {}, dateKey, date, time, serviceId }) => {
  const identity = normalizeEmail(formData.email || '') || String(formData.phone || formData.name || 'guest').trim().toLowerCase();
  return [
    workspaceSlug || 'workspace',
    identity || 'client',
    serviceId || formData.serviceId || 'service',
    formData.staffId || 'staff',
    dateKey || date || 'date',
    time || 'time'
  ]
    .join('|')
    .replace(/[^a-zA-Z0-9|@._:-]/g, '-')
    .slice(0, 180);
};

export const buildOwnerBookingIdempotencyKey = ({ ownerId, booking = {} }) => {
  const identity = normalizeEmail(booking.clientEmail || '') || String(booking.clientPhone || booking.clientName || 'client').trim().toLowerCase();
  return [
    ownerId || 'workspace',
    booking.source || 'owner-booking',
    identity || 'client',
    booking.serviceId || booking.serviceName || 'service',
    booking.staffId || 'staff',
    booking.dateKey || booking.date || 'date',
    booking.time || 'time'
  ]
    .join('|')
    .replace(/[^a-zA-Z0-9|@._:-]/g, '-')
    .slice(0, 180);
};

export const createBookingRecordFromFlow = ({ formData, date, dateKey, status, time, extra = {} }) => ({
  clientName: formData.name,
  clientPhone: formData.phone,
  clientEmail: formData.email || '',
  clientCountry: formData.country || '',
  clientBirthday: formData.birthday || '',
  clientNote: formData.note || '',
  clientEmailOptIn: Boolean(formData.emailOptIn && formData.email),
  serviceId: formData.serviceId || '',
  serviceName: formData.serviceName || '',
  serviceDescription: formData.serviceDescription || '',
  servicePrice: formData.servicePrice || '',
  servicePriceType: formData.servicePriceType || '',
  serviceDuration: formData.serviceDuration || '',
  serviceCategory: formData.serviceCategory || '',
  scheduleType: formData.scheduleType || formData.serviceScheduleType || 'appointment',
  serviceScheduleType: formData.serviceScheduleType || formData.scheduleType || 'appointment',
  scheduleResourceId: formData.scheduleResourceId || '',
  scheduleResourceName: formData.scheduleResourceName || '',
  scheduleSessionId: formData.scheduleSessionId || '',
  scheduleSessionName: formData.scheduleSessionName || '',
  partySize: formData.partySize || '',
  staffId: formData.staffId || '',
  staffName: formData.staffName || '',
  staffPhotoURL: formData.staffPhotoURL || '',
  paymentMethod: formData.paymentMethod || '',
  paymentGateway: formData.paymentGateway || '',
  paymentProviderName: formData.paymentProviderName || '',
  paymentStatus: formData.paymentMethod ? 'manual_pending' : 'unpaid',
  paymentReference: '',
  notificationChannels: {
    email: Boolean(formData.email && formData.emailOptIn),
    portal: Boolean(formData.email)
  },
  date,
  dateKey: dateKey || null,
  time,
  status,
  ...extra
});

export const createManualBookingRecordFromForm = ({ formData, settings, workspaceServices }) => {
  const bookingDateKey = String(formData.get('bookingDate') || '').trim();
  const bookingDate = bookingDateKey ? new Date(`${bookingDateKey}T00:00:00`) : new Date();
  const selectedServiceId = String(formData.get('serviceId') || 'custom');
  const selectedService = workspaceServices.find(service => service.id === selectedServiceId) || null;
  const customServiceName = String(formData.get('customServiceName') || '').trim();
  const serviceName = selectedService?.name || customServiceName || 'Manual service';
  const servicePrice = String(selectedService?.price ?? formData.get('servicePrice') ?? '').trim();
  const serviceDuration = String(selectedService?.duration ?? formData.get('serviceDuration') ?? '').trim();
  const serviceCategory = String(selectedService?.category ?? formData.get('serviceCategory') ?? '').trim();
  const scheduleType = selectedService ? getServiceScheduleType(selectedService) : 'appointment';
  const paymentMethod = String(formData.get('paymentMethod') || '').trim();
  const paymentProviderName = paymentProviderNames[paymentMethod] || '';
  const priceNumber = parsePriceNumber(servicePrice);
  const clientEmail = String(formData.get('clientEmail') || '').trim();
  const now = Date.now();

  return {
    clientName: String(formData.get('clientName') || '').trim(),
    clientPhone: String(formData.get('clientPhone') || '').trim(),
    clientEmail,
    clientCountry: String(formData.get('clientCountry') || '').trim(),
    clientBirthday: String(formData.get('clientBirthday') || '').trim(),
    clientNote: String(formData.get('clientNote') || '').trim(),
    clientEmailOptIn: Boolean(clientEmail),
    serviceId: selectedService?.id || '',
    serviceName,
    serviceDescription: selectedService?.description || '',
    servicePrice,
    servicePriceType: selectedService?.priceType || 'fixed',
    serviceDuration,
    serviceCategory,
    scheduleType,
    serviceScheduleType: scheduleType,
    scheduleResourceId: selectedService?.resourceId || selectedService?.resourceLabel || selectedService?.resourceName || '',
    scheduleResourceName: selectedService?.resourceLabel || selectedService?.resourceName || '',
    scheduleSessionId: selectedService?.sessionId || selectedService?.sessionLabel || '',
    scheduleSessionName: selectedService?.sessionLabel || '',
    amountInCents: Number.isFinite(priceNumber) ? Math.round(priceNumber * 100) : 0,
    currency: settings.currency || 'ZAR',
    paymentMethod,
    paymentGateway: paymentGateways.has(paymentMethod) ? paymentMethod : '',
    paymentProviderName,
    paymentStatus: String(formData.get('paymentStatus') || (paymentMethod ? 'manual_pending' : 'unpaid')),
    paymentReference: String(formData.get('paymentReference') || '').trim(),
    notificationChannels: {
      email: Boolean(clientEmail),
      portal: Boolean(clientEmail)
    },
    date: bookingDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    dateKey: bookingDateKey || getLocalDateStr(bookingDate),
    time: String(formData.get('bookingTime') || '').trim(),
    status: String(formData.get('bookingStatus') || 'confirmed'),
    staffId: String(formData.get('staffId') || '').trim(),
    noShowHistory: false,
    source: 'manual-owner',
    timestamp: now,
    createdAt: now,
    updatedAt: now
  };
};

export const createManualBookingRecordFromChat = ({ payload = {}, settings, workspaceServices }) => {
  const bookingDateKey = String(payload.bookingDate || '').trim() || getLocalDateStr(new Date());
  const bookingDate = new Date(`${bookingDateKey}T00:00:00`);
  const selectedService = workspaceServices.find(service => service.id === payload.serviceId) || null;
  const serviceName = selectedService?.name || String(payload.serviceName || '').trim() || 'Manual service';
  const servicePrice = String(selectedService?.price ?? payload.servicePrice ?? '').trim();
  const serviceDuration = String(selectedService?.duration ?? payload.serviceDuration ?? '').trim();
  const scheduleType = selectedService ? getServiceScheduleType(selectedService) : 'appointment';
  const priceNumber = parsePriceNumber(servicePrice);
  const clientEmail = String(payload.clientEmail || '').trim();
  const now = Date.now();

  return {
    clientName: String(payload.clientName || '').trim(),
    clientPhone: String(payload.clientPhone || '').trim(),
    clientEmail,
    clientCountry: String(payload.clientCountry || '').trim(),
    clientBirthday: String(payload.clientBirthday || '').trim(),
    clientNote: String(payload.clientNote || '').trim(),
    clientEmailOptIn: Boolean(clientEmail),
    serviceId: selectedService?.id || '',
    serviceName,
    serviceDescription: selectedService?.description || '',
    servicePrice,
    servicePriceType: selectedService?.priceType || 'fixed',
    serviceDuration,
    serviceCategory: selectedService?.category || '',
    scheduleType,
    serviceScheduleType: scheduleType,
    scheduleResourceId: selectedService?.resourceId || selectedService?.resourceLabel || selectedService?.resourceName || '',
    scheduleResourceName: selectedService?.resourceLabel || selectedService?.resourceName || '',
    scheduleSessionId: selectedService?.sessionId || selectedService?.sessionLabel || '',
    scheduleSessionName: selectedService?.sessionLabel || '',
    amountInCents: Number.isFinite(priceNumber) ? Math.round(priceNumber * 100) : 0,
    currency: settings.currency || 'ZAR',
    paymentMethod: '',
    paymentGateway: '',
    paymentProviderName: '',
    paymentStatus: 'unpaid',
    paymentReference: '',
    notificationChannels: {
      email: Boolean(clientEmail),
      portal: Boolean(clientEmail)
    },
    date: bookingDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    dateKey: bookingDateKey,
    time: String(payload.bookingTime || '').trim(),
    status: String(payload.bookingStatus || 'confirmed'),
    staffId: String(payload.staffId || '').trim(),
    noShowHistory: false,
    source: 'support-chat',
    threadId: String(payload.threadId || ''),
    timestamp: now,
    createdAt: now,
    updatedAt: now
  };
};
