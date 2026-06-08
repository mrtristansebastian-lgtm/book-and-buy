const { defineSecret } = require('firebase-functions/params');
const { cappedMaxInstances } = require('./runtimeOptions');

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

const DEFAULT_APP_ID = process.env.BUILD_A_BOOKING_APP_ID || 'build-a-booking-v2';
const REMINDER_UTC_OFFSET = process.env.BOOKING_REMINDER_UTC_OFFSET || '+02:00';
const REMINDER_TIME_ZONE = process.env.BOOKING_REMINDER_TIME_ZONE || 'Africa/Johannesburg';
const REMINDER_WINDOW_BEHIND_MS = 30 * 60 * 1000;
const REMINDER_WINDOW_AHEAD_MS = 15 * 60 * 1000;
const ENFORCE_APP_CHECK = process.env.BUILD_A_BOOKING_ENFORCE_APP_CHECK === 'true';
const SLOT_LOCK_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const FUNCTION_CPU = process.env.BUILD_A_BOOKING_FUNCTION_CPU === '1' ? 1 : 'gcf_gen1';
const CALLABLE_CONCURRENCY = FUNCTION_CPU === 'gcf_gen1' ? 1 : 40;
const BOOKING_CONCURRENCY = FUNCTION_CPU === 'gcf_gen1' ? 1 : 10;

const publicCallableOptions = {
  region: 'us-central1',
  timeoutSeconds: 30,
  memory: '256MiB',
  cpu: FUNCTION_CPU,
  concurrency: CALLABLE_CONCURRENCY,
  maxInstances: cappedMaxInstances(process.env.BUILD_A_BOOKING_PUBLIC_MAX_INSTANCES, 1),
  ...(ENFORCE_APP_CHECK ? { enforceAppCheck: true } : {})
};

const bookingCallableOptions = {
  ...publicCallableOptions,
  concurrency: BOOKING_CONCURRENCY,
  maxInstances: cappedMaxInstances(process.env.BUILD_A_BOOKING_BOOKING_MAX_INSTANCES, 1)
};

const workerFunctionOptions = {
  region: 'us-central1',
  cpu: FUNCTION_CPU,
  maxInstances: 1
};

const emailCallableOptions = {
  ...publicCallableOptions,
  timeoutSeconds: 30,
  maxInstances: cappedMaxInstances(process.env.BUILD_A_BOOKING_EMAIL_MAX_INSTANCES, 1),
  secrets: [RESEND_API_KEY]
};

const emailWorkerFunctionOptions = {
  ...workerFunctionOptions,
  timeoutSeconds: 30,
  secrets: [RESEND_API_KEY]
};

module.exports = {
  RESEND_API_KEY,
  DEFAULT_APP_ID,
  REMINDER_UTC_OFFSET,
  REMINDER_TIME_ZONE,
  REMINDER_WINDOW_BEHIND_MS,
  REMINDER_WINDOW_AHEAD_MS,
  SLOT_LOCK_TTL_MS,
  IDEMPOTENCY_TTL_MS,
  publicCallableOptions,
  bookingCallableOptions,
  workerFunctionOptions,
  emailCallableOptions,
  emailWorkerFunctionOptions
};
