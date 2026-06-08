const { HttpsError } = require('firebase-functions/v2/https');

const cleanString = (value, max = 240) => (
  String(value || '').trim().slice(0, max)
);

const requireString = (value, label, max = 240) => {
  const next = cleanString(value, max);
  if (!next) throw new HttpsError('invalid-argument', `${label} is required.`);
  return next;
};

const safeLockId = (dateKey, time) => (
  `${cleanString(dateKey, 32)}_${cleanString(time, 32)}`
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 120)
);

const safeDocumentId = (value, max = 180) => (
  cleanString(value, max)
    .replace(/[^a-zA-Z0-9@._:-]/g, '-')
    .slice(0, max) || `id-${Date.now()}`
);

const safeThreadId = (ownerId, bookingId) => (
  `${cleanString(ownerId, 80)}_${cleanString(bookingId, 80)}`
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 160)
);

const normalizeEmail = (email = '') => cleanString(email, 180).toLowerCase();

const isValidEmail = (email = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));

const timestampValue = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value?.toMillis) return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Date.now();
};

module.exports = {
  cleanString,
  requireString,
  safeLockId,
  safeDocumentId,
  safeThreadId,
  normalizeEmail,
  isValidEmail,
  timestampValue
};
