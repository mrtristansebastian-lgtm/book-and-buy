import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  assertBookingDateKey,
  assertBookingTime,
  validateCreateOwnerBookingRequestPayload,
  validateCreatePublicBookingRequestPayload,
  validateOwnerBookingPayload
} = require('./bookingValidators.js');

const ownerBooking = (overrides = {}) => ({
  clientName: 'Launch Client',
  clientEmail: ' CLIENT@EXAMPLE.COM ',
  clientPhone: '+27 82 000 0000',
  clientCountry: ' South Africa ',
  serviceId: 'svc_launch',
  serviceName: 'Launch Service',
  serviceDuration: '60 min',
  amountInCents: 12345.6,
  currency: 'zar',
  staffId: 'staff_1',
  paymentMethod: 'cash',
  date: '10 June 2026',
  dateKey: '2026-06-10',
  time: '10:30',
  timestamp: 1781080200000,
  ...overrides
});

test('owner booking payload normalizes launch-critical booking fields', () => {
  const booking = validateOwnerBookingPayload(ownerBooking(), {
    serverTimestamp: () => 'SERVER_TIMESTAMP'
  });

  assert.equal(booking.clientName, 'Launch Client');
  assert.equal(booking.clientEmail, 'client@example.com');
  assert.equal(booking.clientCountry, 'South Africa');
  assert.equal(booking.amountInCents, 12346);
  assert.equal(booking.currency, 'ZAR');
  assert.equal(booking.paymentGateway, 'cash');
  assert.equal(booking.paymentStatus, 'manual_pending');
  assert.equal(booking.notificationChannels.email, false);
  assert.equal(booking.notificationChannels.portal, true);
  assert.equal(booking.createdAt, 'SERVER_TIMESTAMP');
  assert.equal(booking.updatedAt, 'SERVER_TIMESTAMP');
});

test('owner booking payload rejects invalid shape, date, and time', () => {
  assert.throws(() => validateOwnerBookingPayload(null), /Booking must be an object/);
  assert.throws(() => validateOwnerBookingPayload(ownerBooking({ dateKey: '06-10-2026' })), /Booking date is invalid/);
  assert.throws(() => validateOwnerBookingPayload(ownerBooking({ time: '25:00' })), /Booking time is invalid/);
  assert.equal(assertBookingDateKey('2026-06-10'), '2026-06-10');
  assert.equal(assertBookingTime('Waitlist'), 'Waitlist');
});

test('owner booking callable payload preserves app, owner, idempotency, and validated booking', () => {
  const payload = validateCreateOwnerBookingRequestPayload({
    data: {
      idempotencyKey: 'owner-create-1',
      booking: ownerBooking({ clientEmailOptIn: true })
    },
    authUid: 'owner_123',
    defaultAppId: 'build-a-booking-v2',
    serverTimestamp: () => 'SERVER_TIMESTAMP'
  });

  assert.equal(payload.appId, 'build-a-booking-v2');
  assert.equal(payload.ownerId, 'owner_123');
  assert.equal(payload.idempotencyKey, 'owner-create-1');
  assert.equal(payload.rawBooking.clientEmailOptIn, true);
  assert.equal(payload.rawBooking.notificationChannels.email, true);
});

test('public booking callable payload normalizes slug and keeps public booking object untouched for public validator', () => {
  const booking = { clientName: 'Public Client', idempotencyKey: 'booking-public-1' };
  const payload = validateCreatePublicBookingRequestPayload({
    data: {
      appId: 'build-a-booking-v2',
      workspaceSlug: 'Your-Business',
      booking
    }
  });

  assert.equal(payload.appId, 'build-a-booking-v2');
  assert.equal(payload.workspaceSlug, 'your-business');
  assert.equal(payload.idempotencyKey, 'booking-public-1');
  assert.equal(payload.rawBooking, booking);
});
