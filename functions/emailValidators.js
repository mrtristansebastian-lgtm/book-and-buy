const { HttpsError } = require('firebase-functions/v2/https');
const { cleanString, isValidEmail, normalizeEmail, requireString } = require('./functionUtils');

const allowedBookingEmailTemplates = new Set([
  'bookingReceived',
  'confirmed',
  'declined',
  'waitlist',
  'runningLate',
  'review',
  'reminder24h',
  'reminder2h'
]);

const validateAuthVerificationEmailContext = (auth = null) => {
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in before sending a verification email.');
  }
  const email = normalizeEmail(auth.token?.email || '');
  if (!isValidEmail(email)) {
    throw new HttpsError('failed-precondition', 'This account is missing a valid email address.');
  }
  return {
    email,
    alreadyVerified: auth.token?.email_verified === true
  };
};

const validatePasswordResetEmailPayload = (data = {}) => {
  const email = normalizeEmail(data.email || '');
  if (!isValidEmail(email)) {
    throw new HttpsError('invalid-argument', 'Enter a valid email address.');
  }
  return { email };
};

const validateSendBookingClientEmailPayload = ({
  data = {},
  authUid = '',
  defaultAppId
}) => {
  const templateKey = cleanString(data.templateKey, 40);
  if (!allowedBookingEmailTemplates.has(templateKey)) {
    throw new HttpsError('invalid-argument', 'Email template is not supported.');
  }
  const extra = data.extra && typeof data.extra === 'object' && !Array.isArray(data.extra) ? data.extra : {};
  return {
    appId: requireString(data.appId || defaultAppId, 'App ID', 120),
    ownerId: requireString(data.ownerId || authUid, 'Workspace owner', 120),
    bookingId: requireString(data.bookingId, 'Booking', 160),
    templateKey,
    extra
  };
};

module.exports = {
  allowedBookingEmailTemplates,
  validateAuthVerificationEmailContext,
  validatePasswordResetEmailPayload,
  validateSendBookingClientEmailPayload
};
