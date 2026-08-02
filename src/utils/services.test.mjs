import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeService } from './services.js';

test('service schedule type normalization keeps legacy appointment fallback', () => {
  const service = normalizeService({ id: 'legacy', name: 'Legacy cut', duration: '45' });

  assert.equal(service.scheduleType, 'appointment');
  assert.equal(service.bookingType, 'appointment');
  assert.equal(service.serviceType, 'appointment');
});

test('service schedule type aliases are normalized and mirrored', () => {
  const service = normalizeService({ id: 'class', name: 'Workshop', bookingType: 'workshop', capacity: '12' });

  assert.equal(service.scheduleType, 'class_session');
  assert.equal(service.bookingType, 'class_session');
  assert.equal(service.serviceType, 'class_session');
  assert.equal(service.capacity, 12);
});

test('retired schedule types normalize into supported appointment and spot flows', () => {
  assert.equal(normalizeService({ name: 'Home repair', scheduleType: 'mobile_job' }).scheduleType, 'appointment');
  assert.equal(normalizeService({ name: 'Market', scheduleType: 'event_package' }).scheduleType, 'class_session');
  assert.equal(normalizeService({ name: 'Consult', scheduleType: 'appointment' }).approvalRequired, false);
});

test('spot services keep duration and capacity on the service', () => {
  const service = normalizeService({
    name: 'Workshop',
    scheduleType: 'class_session',
    duration: '120',
    capacity: '15'
  });

  assert.equal(service.duration, '120');
  assert.equal(service.capacity, 15);
});
