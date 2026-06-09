import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  normalizeNotificationJobPayload,
  normalizeReminderQueueJobPayload,
  supportedReminderKeys
} = require('./notificationValidators.js');

test('notification job payload normalizes booking references and safe channel flags', () => {
  const payload = normalizeNotificationJobPayload({
    type: ' new-booking-request ',
    ownerId: ' owner-1 ',
    bookingId: ' booking-1 ',
    channels: { email: 1 }
  });

  assert.deepEqual(payload, {
    type: 'new-booking-request',
    ownerId: 'owner-1',
    bookingId: 'booking-1',
    hasBookingReference: true,
    channels: {
      email: true,
      clientPortal: true
    }
  });
});

test('notification job payload marks missing booking references without throwing', () => {
  const payload = normalizeNotificationJobPayload({ channels: { clientPortal: false } });

  assert.equal(payload.hasBookingReference, false);
  assert.equal(payload.channels.email, false);
  assert.equal(payload.channels.clientPortal, false);
});

test('reminder queue job accepts only supported reminder keys and caps display copy', () => {
  const payload = normalizeReminderQueueJobPayload({
    ownerId: ' owner-1 ',
    bookingId: ' booking-1 ',
    reminderKey: '24h',
    title: ` ${'Tomorrow '.repeat(40)}`,
    body: ` ${'Open portal '.repeat(80)}`
  });

  assert.equal(supportedReminderKeys.has(payload.reminderKey), true);
  assert.equal(payload.isSupported, true);
  assert.equal(payload.title.length, 180);
  assert.equal(payload.body.length, 500);
});

test('reminder queue job rejects missing references or unknown reminder keys', () => {
  assert.equal(normalizeReminderQueueJobPayload({ ownerId: 'owner-1', reminderKey: '24h' }).isSupported, false);
  assert.equal(normalizeReminderQueueJobPayload({ ownerId: 'owner-1', bookingId: 'booking-1', reminderKey: '1h' }).isSupported, false);
});
