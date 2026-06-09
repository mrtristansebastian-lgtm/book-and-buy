import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { validateAvailabilityLookupPayload } = require('./availabilityValidators.js');

const availabilityPayload = (overrides = {}) => ({
  appId: ' build-a-booking-v2 ',
  workspaceSlug: ' Studio-Noir ',
  dateKey: '2026-06-08',
  staffId: ' stylist-1 ',
  service: {
    serviceId: ' cutz ',
    serviceDuration: ' 45 min ',
    ...(overrides.service || {})
  },
  ...overrides
});

test('availability payload normalizes the public lookup contract', () => {
  const payload = validateAvailabilityLookupPayload(availabilityPayload());

  assert.equal(payload.appId, 'build-a-booking-v2');
  assert.equal(payload.workspaceSlug, 'studio-noir');
  assert.equal(payload.dateKey, '2026-06-08');
  assert.equal(payload.requestedStaffId, 'stylist-1');
  assert.deepEqual(payload.incoming, {
    serviceId: 'cutz',
    serviceDuration: '45 min'
  });
});

test('availability payload rejects invalid dates, service shape, and unknown service fields', () => {
  assert.throws(
    () => validateAvailabilityLookupPayload(availabilityPayload({ dateKey: '08-06-2026' })),
    /Date is invalid/
  );
  assert.throws(
    () => validateAvailabilityLookupPayload(availabilityPayload({ service: 'cutz' })),
    /Availability service must be an object/
  );
  assert.throws(
    () => validateAvailabilityLookupPayload(availabilityPayload({ service: { unsupported: true } })),
    /Availability service contains unsupported fields/
  );
});

test('availability payload keeps lookup requests capped and requires service identity', () => {
  assert.throws(
    () => validateAvailabilityLookupPayload(availabilityPayload({ service: { serviceDuration: '30 min' } })),
    /Service is required/
  );
  assert.throws(
    () => validateAvailabilityLookupPayload(availabilityPayload({ notes: 'x'.repeat(4_100) })),
    /Availability request is too large/
  );
});
