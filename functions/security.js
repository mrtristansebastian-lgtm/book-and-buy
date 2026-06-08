const crypto = require('crypto');
const { HttpsError } = require('firebase-functions/v2/https');

const PUBLIC_BOOKING_FIELDS = new Set([
  'clientName',
  'clientPhone',
  'clientEmail',
  'clientEmailOptIn',
  'clientBirthday',
  'clientNote',
  'serviceId',
  'serviceName',
  'serviceDescription',
  'servicePrice',
  'servicePriceType',
  'serviceDuration',
  'serviceCategory',
  'staffId',
  'staffName',
  'staffPhotoURL',
  'paymentMethod',
  'paymentGateway',
  'paymentProviderName',
  'paymentStatus',
  'date',
  'dateKey',
  'time',
  'status',
  'notificationChannels'
]);

const AVAILABILITY_SERVICE_FIELDS = new Set(['serviceId', 'serviceDuration']);

const RATE_LIMITS = Object.freeze({
  booking_create: {
    limit: 6,
    windowMs: 10 * 60 * 1000,
    message: 'Too many booking attempts. Please wait a few minutes and try again.'
  },
  availability_lookup: {
    limit: 120,
    windowMs: 10 * 60 * 1000,
    message: 'Too many availability checks. Please wait a moment and try again.'
  },
  auth_email: {
    limit: 5,
    windowMs: 15 * 60 * 1000,
    message: 'Too many email requests. Please wait a few minutes and try again.'
  }
});

const MAX_PUBLIC_BOOKING_PAYLOAD_BYTES = 12_000;
const MAX_AVAILABILITY_PAYLOAD_BYTES = 4_000;

const cleanString = (value, max = 240) => (
  String(value ?? '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
);

const requireString = (value, label, max = 240) => {
  const next = cleanString(value, max);
  if (!next) throw new HttpsError('invalid-argument', `${label} is required.`);
  return next;
};

const rejectUnknownFields = (payload = {}, allowedFields, label) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new HttpsError('invalid-argument', `${label} must be an object.`);
  }
  const unknownFields = Object.keys(payload).filter(key => !allowedFields.has(key));
  if (unknownFields.length) {
    throw new HttpsError('invalid-argument', `${label} contains unsupported fields.`);
  }
};

const assertPattern = (value, pattern, label) => {
  if (!pattern.test(value)) throw new HttpsError('invalid-argument', `${label} is invalid.`);
  return value;
};

const validateEmail = (value = '') => {
  const email = cleanString(value, 160).toLowerCase();
  if (!email) return '';
  return assertPattern(email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Client email');
};

const validateTimeLabel = (value, status) => {
  const time = requireString(value, 'Booking time', 80);
  if (status === 'waitlist' && time.toLowerCase() === 'waitlist') return 'Waitlist';
  const timePattern = /^([01]?\d|2[0-3]):[0-5]\d(?:\s*(?:-|to)\s*([01]?\d|2[0-3]):[0-5]\d)?$/i;
  return assertPattern(time, timePattern, 'Booking time');
};

const safeDocumentId = (value, max = 220) => (
  cleanString(value, max)
    .replace(/[^a-zA-Z0-9@._:-]/g, '-')
    .slice(0, max) || `id-${Date.now()}`
);

const getHeaderValue = (headers = {}, key = '') => {
  const value = headers[key] || headers[key.toLowerCase()] || headers[key.toUpperCase()];
  return Array.isArray(value) ? value[0] : String(value || '');
};

const getRequestIdentity = (request = {}) => {
  const headers = request.rawRequest?.headers || {};
  const forwardedFor = getHeaderValue(headers, 'x-forwarded-for').split(',')[0].trim();
  return forwardedFor ||
    getHeaderValue(headers, 'fastly-client-ip') ||
    getHeaderValue(headers, 'cf-connecting-ip') ||
    request.rawRequest?.ip ||
    request.auth?.uid ||
    request.auth?.token?.email ||
    getHeaderValue(headers, 'user-agent') ||
    'unknown-client';
};

const assertPayloadSize = (payload = {}, maxBytes, label) => {
  const size = Buffer.byteLength(JSON.stringify(payload || {}), 'utf8');
  if (size > maxBytes) {
    throw new HttpsError('invalid-argument', `${label} is too large.`);
  }
};

const hashRateLimitIdentity = ({ appId, identity }) => (
  crypto
    .createHash('sha256')
    .update(`${process.env.RATE_LIMIT_SALT || appId}:${identity}`)
    .digest('hex')
    .slice(0, 40)
);

const assertRateLimit = async ({ db, appId, workspaceSlug, action, request, subject = '' }) => {
  const config = RATE_LIMITS[action];
  if (!config) throw new HttpsError('internal', 'Rate limit is not configured.');

  const nowMs = Date.now();
  const bucket = Math.floor(nowMs / config.windowMs);
  const identityHash = hashRateLimitIdentity({
    appId,
    identity: [getRequestIdentity(request), cleanString(subject, 180).toLowerCase()].filter(Boolean).join('|')
  });
  const rateLimitRef = db
    .collection('artifacts').doc(appId)
    .collection('securityRateLimits')
    .doc(safeDocumentId(`${action}_${workspaceSlug}_${identityHash}_${bucket}`));

  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(rateLimitRef);
    const currentCount = Number(snap.data()?.count || 0);
    if (currentCount >= config.limit) {
      throw new HttpsError('resource-exhausted', config.message);
    }
    transaction.set(rateLimitRef, {
      action,
      workspaceSlug,
      identityHash,
      bucket,
      count: currentCount + 1,
      limit: config.limit,
      windowMs: config.windowMs,
      expiresAtMs: nowMs + config.windowMs,
      expiresAt: new Date(nowMs + config.windowMs),
      updatedAtMs: nowMs
    }, { merge: true });
  });
};

const validateAvailabilityLookupPayload = (data = {}) => {
  assertPayloadSize(data, MAX_AVAILABILITY_PAYLOAD_BYTES, 'Availability request');
  const appId = requireString(data.appId, 'App ID', 120);
  const workspaceSlug = requireString(data.workspaceSlug, 'Workspace slug', 120).toLowerCase();
  const dateKey = assertPattern(requireString(data.dateKey, 'Date', 32), /^\d{4}-\d{2}-\d{2}$/, 'Date');
  const requestedStaffId = cleanString(data.staffId, 120);
  const service = data.service || {};
  rejectUnknownFields(service, AVAILABILITY_SERVICE_FIELDS, 'Availability service');
  return {
    appId,
    workspaceSlug,
    dateKey,
    requestedStaffId,
    incoming: {
      serviceId: requireString(service.serviceId, 'Service', 120),
      serviceDuration: cleanString(service.serviceDuration, 80)
    }
  };
};

const validatePublicBookingPayload = (incoming = {}) => {
  assertPayloadSize(incoming, MAX_PUBLIC_BOOKING_PAYLOAD_BYTES, 'Booking request');
  rejectUnknownFields(incoming, PUBLIC_BOOKING_FIELDS, 'Booking');
  const allowedStatuses = new Set(['pending', 'confirmed', 'waitlist']);
  const status = allowedStatuses.has(cleanString(incoming.status, 40)) ? cleanString(incoming.status, 40) : 'pending';
  const dateKey = assertPattern(requireString(incoming.dateKey, 'Booking date', 32), /^\d{4}-\d{2}-\d{2}$/, 'Booking date');

  return {
    clientName: requireString(incoming.clientName, 'Client name', 120),
    clientPhone: cleanString(incoming.clientPhone, 60),
    clientEmail: validateEmail(incoming.clientEmail),
    clientEmailOptIn: Boolean(incoming.clientEmailOptIn && incoming.clientEmail),
    clientBirthday: cleanString(incoming.clientBirthday, 80),
    clientNote: cleanString(incoming.clientNote, 1000),
    serviceId: requireString(incoming.serviceId, 'Service', 120),
    serviceName: cleanString(incoming.serviceName, 180),
    serviceDescription: cleanString(incoming.serviceDescription, 700),
    servicePrice: cleanString(incoming.servicePrice, 80),
    servicePriceType: cleanString(incoming.servicePriceType, 40),
    serviceDuration: cleanString(incoming.serviceDuration, 80),
    serviceCategory: cleanString(incoming.serviceCategory, 120),
    staffId: cleanString(incoming.staffId, 120),
    staffName: cleanString(incoming.staffName, 120),
    staffPhotoURL: cleanString(incoming.staffPhotoURL, 500),
    date: requireString(incoming.date, 'Booking date label', 120),
    dateKey,
    time: validateTimeLabel(incoming.time, status),
    status,
    paymentMethod: cleanString(incoming.paymentMethod, 60).toLowerCase(),
    paymentGateway: cleanString(incoming.paymentGateway || incoming.paymentMethod, 60).toLowerCase(),
    paymentProviderName: cleanString(incoming.paymentProviderName, 120)
  };
};

const getPublishedService = ({ booking, workspace }) => {
  const services = Array.isArray(workspace.services) ? workspace.services : [];
  return services.find(service => cleanString(service.id, 120) === booking.serviceId && service.active !== false) || null;
};

const getPublicStaff = (workspace = {}) => (
  Array.isArray(workspace.publicStaff) ? workspace.publicStaff : []
);

const alignBookingWithWorkspace = ({ booking, workspace, availabilityRules }) => {
  const service = getPublishedService({ booking, workspace });
  if (!service) {
    throw new HttpsError('failed-precondition', 'This service is not available for online booking.');
  }

  if (availabilityRules.staffAssignmentMode === 'client') {
    if (!booking.staffId) throw new HttpsError('invalid-argument', 'Choose a staff member for this service.');
    const staff = getPublicStaff(workspace).find(member => cleanString(member.id, 120) === booking.staffId);
    if (!staff) throw new HttpsError('failed-precondition', 'That staff member is not available for online booking.');
  }

  return {
    ...booking,
    serviceId: cleanString(service.id, 120),
    serviceName: cleanString(service.name, 180),
    serviceDescription: cleanString(service.description, 700),
    servicePrice: cleanString(service.price, 80),
    servicePriceType: cleanString(service.priceType, 40),
    serviceDuration: cleanString(service.duration, 80),
    serviceCategory: cleanString(service.category, 120)
  };
};

module.exports = {
  alignBookingWithWorkspace,
  assertRateLimit,
  cleanString,
  requireString,
  validateAvailabilityLookupPayload,
  validatePublicBookingPayload
};
