import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  validateAuthVerificationEmailContext,
  validatePasswordResetEmailPayload,
  validateSendBookingClientEmailPayload
} = require('./emailValidators.js');

test('auth verification email context requires signed-in valid email account', () => {
  assert.throws(() => validateAuthVerificationEmailContext(null), /Sign in before sending a verification email/);
  assert.throws(
    () => validateAuthVerificationEmailContext({ uid: 'owner_123', token: { email: 'not-an-email' } }),
    /missing a valid email/
  );

  assert.deepEqual(validateAuthVerificationEmailContext({
    uid: 'owner_123',
    token: {
      email: ' OWNER@EXAMPLE.COM ',
      email_verified: true
    }
  }), {
    email: 'owner@example.com',
    alreadyVerified: true
  });
});

test('password reset payload normalizes and validates email', () => {
  assert.deepEqual(validatePasswordResetEmailPayload({
    email: ' CLIENT@EXAMPLE.COM '
  }), {
    email: 'client@example.com'
  });
  assert.throws(() => validatePasswordResetEmailPayload({ email: 'bad' }), /valid email address/);
});

test('booking client email payload keeps only supported templates and object extras', () => {
  const payload = validateSendBookingClientEmailPayload({
    data: {
      appId: 'build-a-booking-v2',
      bookingId: 'booking_123',
      templateKey: 'runningLate',
      extra: { minutes: 12 }
    },
    authUid: 'owner_123',
    defaultAppId: 'fallback-app'
  });

  assert.equal(payload.appId, 'build-a-booking-v2');
  assert.equal(payload.ownerId, 'owner_123');
  assert.equal(payload.bookingId, 'booking_123');
  assert.equal(payload.templateKey, 'runningLate');
  assert.deepEqual(payload.extra, { minutes: 12 });

  assert.throws(
    () => validateSendBookingClientEmailPayload({
      data: { bookingId: 'booking_123', templateKey: 'unsupported' },
      authUid: 'owner_123',
      defaultAppId: 'build-a-booking-v2'
    }),
    /Email template is not supported/
  );

  assert.deepEqual(validateSendBookingClientEmailPayload({
    data: { bookingId: 'booking_123', templateKey: 'confirmed', extra: ['ignored'] },
    authUid: 'owner_123',
    defaultAppId: 'build-a-booking-v2'
  }).extra, {});
});
