const { cleanString } = require('./functionUtils');

const supportedReminderKeys = new Set(['24h', '2h']);

const normalizeNotificationJobPayload = (job = {}) => {
  const ownerId = cleanString(job.ownerId, 120);
  const bookingId = cleanString(job.bookingId, 160);
  return {
    type: cleanString(job.type, 80),
    ownerId,
    bookingId,
    hasBookingReference: Boolean(ownerId && bookingId),
    channels: {
      email: Boolean(job.channels?.email),
      clientPortal: job.channels?.clientPortal !== false
    }
  };
};

const normalizeReminderQueueJobPayload = (job = {}) => {
  const ownerId = cleanString(job.ownerId, 120);
  const bookingId = cleanString(job.bookingId, 120);
  const reminderKey = cleanString(job.reminderKey, 20);
  return {
    ownerId,
    bookingId,
    reminderKey,
    isSupported: Boolean(ownerId && bookingId && supportedReminderKeys.has(reminderKey)),
    title: cleanString(job.title, 180),
    body: cleanString(job.body, 500)
  };
};

module.exports = {
  normalizeNotificationJobPayload,
  normalizeReminderQueueJobPayload,
  supportedReminderKeys
};
