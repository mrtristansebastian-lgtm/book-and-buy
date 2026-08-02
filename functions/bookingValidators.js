const { HttpsError } = require('firebase-functions/v2/https');
const { cleanString, normalizeEmail, requireString } = require('./functionUtils');
const { normalizeScheduleType } = require('./scheduleTypes');

const bookingTimestamp = (value, fallback) => (
  Number.isFinite(Number(value)) ? Number(value) : fallback()
);

const assertBookingDateKey = (value) => {
  const dateKey = cleanString(value, 32);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new HttpsError('invalid-argument', 'Booking date is invalid.');
  }
  return dateKey;
};

const assertBookingTime = (value) => {
  const time = requireString(value, 'Booking time', 80);
  if (time !== 'Waitlist' && !/^([01]?\d|2[0-3]):[0-5]\d(?:\s*(?:-|to)\s*([01]?\d|2[0-3]):[0-5]\d)?$/i.test(time)) {
    throw new HttpsError('invalid-argument', 'Booking time is invalid.');
  }
  return time;
};

const normalizeAmountInCents = (incoming = {}) => {
  const amountInCents = Number(incoming.amountInCents || incoming.amountPaidInCents || 0);
  return Number.isFinite(amountInCents) ? Math.max(0, Math.round(amountInCents)) : 0;
};

const validateOwnerBookingPayload = (incoming = {}, { serverTimestamp = () => Date.now() } = {}) => {
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    throw new HttpsError('invalid-argument', 'Booking must be an object.');
  }
  const status = cleanString(incoming.status || 'confirmed', 40).toLowerCase();
  const timestampFallback = () => Date.now();

  return {
    clientName: requireString(incoming.clientName, 'Client name', 120),
    clientPhone: cleanString(incoming.clientPhone, 60),
    clientEmail: normalizeEmail(incoming.clientEmail),
    clientCountry: cleanString(incoming.clientCountry, 120),
    clientBirthday: cleanString(incoming.clientBirthday, 80),
    clientNote: cleanString(incoming.clientNote, 1000),
    clientEmailOptIn: Boolean(incoming.clientEmailOptIn && incoming.clientEmail),
    serviceId: cleanString(incoming.serviceId, 120),
    serviceName: cleanString(incoming.serviceName, 180),
    serviceDescription: cleanString(incoming.serviceDescription, 700),
    servicePrice: cleanString(incoming.servicePrice, 80),
    servicePriceType: cleanString(incoming.servicePriceType, 40),
    serviceDuration: cleanString(incoming.serviceDuration, 80),
    serviceCategory: cleanString(incoming.serviceCategory, 120),
    scheduleType: normalizeScheduleType(incoming.scheduleType || incoming.serviceScheduleType || incoming.bookingType || incoming.serviceType),
    serviceScheduleType: normalizeScheduleType(incoming.serviceScheduleType || incoming.scheduleType || incoming.bookingType || incoming.serviceType),
    scheduleResourceId: cleanString(incoming.scheduleResourceId, 120),
    scheduleResourceName: cleanString(incoming.scheduleResourceName, 160),
    scheduleSessionId: cleanString(incoming.scheduleSessionId, 120),
    scheduleSessionName: cleanString(incoming.scheduleSessionName, 160),
    partySize: cleanString(incoming.partySize, 40),
    amountInCents: normalizeAmountInCents(incoming),
    currency: cleanString(incoming.currency || 'ZAR', 12).toUpperCase(),
    staffId: cleanString(incoming.staffId, 120),
    staffName: cleanString(incoming.staffName, 120),
    staffPhotoURL: cleanString(incoming.staffPhotoURL, 500),
    paymentMethod: cleanString(incoming.paymentMethod, 60).toLowerCase(),
    paymentGateway: cleanString(incoming.paymentGateway || incoming.paymentMethod, 60).toLowerCase(),
    paymentProviderName: cleanString(incoming.paymentProviderName, 120),
    paymentStatus: cleanString(incoming.paymentStatus || (incoming.paymentMethod ? 'manual_pending' : 'unpaid'), 60).toLowerCase(),
    paymentReference: cleanString(incoming.paymentReference, 180),
    notificationChannels: {
      email: Boolean(incoming.notificationChannels?.email || incoming.clientEmailOptIn),
      portal: Boolean(incoming.notificationChannels?.portal || incoming.clientEmail)
    },
    date: requireString(incoming.date, 'Booking date label', 120),
    dateKey: assertBookingDateKey(incoming.dateKey),
    time: assertBookingTime(incoming.time),
    status: status || 'confirmed',
    noShowHistory: Boolean(incoming.noShowHistory),
    source: cleanString(incoming.source || 'manual-owner', 120),
    threadId: cleanString(incoming.threadId, 160),
    timestamp: bookingTimestamp(incoming.timestamp, timestampFallback),
    createdAt: Number.isFinite(Number(incoming.createdAt)) ? Number(incoming.createdAt) : serverTimestamp(),
    updatedAt: Number.isFinite(Number(incoming.updatedAt)) ? Number(incoming.updatedAt) : serverTimestamp()
  };
};

const validateCreateOwnerBookingRequestPayload = ({
  data = {},
  authUid = '',
  defaultAppId,
  serverTimestamp
}) => ({
  appId: requireString(data.appId || defaultAppId, 'App ID', 120),
  ownerId: requireString(data.ownerId || authUid, 'Workspace owner', 120),
  idempotencyKey: cleanString(data.idempotencyKey, 180),
  rawBooking: validateOwnerBookingPayload(data.booking || {}, { serverTimestamp })
});

const validateCreatePublicBookingRequestPayload = ({ data = {} }) => {
  const rawBooking = data.booking || {};
  return {
    appId: requireString(data.appId, 'App ID', 120),
    workspaceSlug: requireString(data.workspaceSlug, 'Workspace slug', 120).toLowerCase(),
    rawBooking,
    idempotencyKey: cleanString(data.idempotencyKey || rawBooking.idempotencyKey, 180)
  };
};

module.exports = {
  assertBookingDateKey,
  assertBookingTime,
  validateCreateOwnerBookingRequestPayload,
  validateCreatePublicBookingRequestPayload,
  validateOwnerBookingPayload
};
