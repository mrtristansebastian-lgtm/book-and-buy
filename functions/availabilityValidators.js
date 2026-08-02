const { HttpsError } = require('firebase-functions/v2/https');

const AVAILABILITY_SERVICE_FIELDS = new Set(['serviceId', 'serviceDuration', 'scheduleType', 'serviceScheduleType']);
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

const assertPayloadSize = (payload = {}, maxBytes, label) => {
  const size = Buffer.byteLength(JSON.stringify(payload || {}), 'utf8');
  if (size > maxBytes) {
    throw new HttpsError('invalid-argument', `${label} is too large.`);
  }
};

const assertPattern = (value, pattern, label) => {
  if (!pattern.test(value)) throw new HttpsError('invalid-argument', `${label} is invalid.`);
  return value;
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

const validateAvailabilityLookupPayload = (data = {}) => {
  const payload = data && typeof data === 'object' ? data : {};
  assertPayloadSize(payload, MAX_AVAILABILITY_PAYLOAD_BYTES, 'Availability request');
  const appId = requireString(payload.appId, 'App ID', 120);
  const workspaceSlug = requireString(payload.workspaceSlug, 'Workspace slug', 120).toLowerCase();
  const dateKey = assertPattern(requireString(payload.dateKey, 'Date', 32), /^\d{4}-\d{2}-\d{2}$/, 'Date');
  const requestedStaffId = cleanString(payload.staffId, 120);
  const service = payload.service || {};
  rejectUnknownFields(service, AVAILABILITY_SERVICE_FIELDS, 'Availability service');

  return {
    appId,
    workspaceSlug,
    dateKey,
    requestedStaffId,
    incoming: {
      serviceId: requireString(service.serviceId, 'Service', 120),
      serviceDuration: cleanString(service.serviceDuration, 80),
      scheduleType: cleanString(service.scheduleType || service.serviceScheduleType, 60)
    }
  };
};

module.exports = {
  validateAvailabilityLookupPayload
};
