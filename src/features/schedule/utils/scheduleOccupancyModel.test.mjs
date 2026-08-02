import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getBookingOccupancyUnits,
  getScheduleOccupancyConflicts
} from './scheduleOccupancyModel.js';

const booking = (overrides = {}) => ({
  id: `booking-${Math.random()}`,
  clientName: 'Client',
  dateKey: '2026-08-02',
  time: '09:00',
  status: 'confirmed',
  serviceId: 'svc',
  serviceDuration: '60',
  staffId: 'staff-1',
  ...overrides
});

test('appointment occupancy uses staff date time ranges', () => {
  const units = getBookingOccupancyUnits({ booking: booking() });

  assert.equal(units.length, 1);
  assert.equal(units[0].key, 'appointment:staff-1:2026-08-02');
  assert.equal(units[0].startMinutes, 540);
  assert.equal(units[0].endMinutes, 600);
});

test('class capacity conflicts only when seats exceed capacity', () => {
  const services = [{ id: 'class', scheduleType: 'class_session', capacity: 2 }];
  const conflicts = getScheduleOccupancyConflicts({
    services,
    bookings: [
      booking({ id: 'a', serviceId: 'class', scheduleType: 'class_session', partySize: 1 }),
      booking({ id: 'b', serviceId: 'class', scheduleType: 'class_session', partySize: 1 }),
      booking({ id: 'c', serviceId: 'class', scheduleType: 'class_session', partySize: 1 })
    ]
  });

  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].type, 'capacity');
  assert.equal(conflicts[0].seats, 3);
  assert.equal(conflicts[0].capacity, 2);
});

test('retired mobile jobs normalize to appointment staff windows', () => {
  const bookings = [
    booking({ id: 'm1', scheduleType: 'mobile_job', staffId: 'mobile-1', time: '09:00', serviceDuration: '120' }),
    booking({ id: 'm2', scheduleType: 'mobile_job', staffId: 'mobile-1', time: '10:00', serviceDuration: '60' })
  ];

  const conflicts = getScheduleOccupancyConflicts({ bookings });

  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].type, 'range');
  assert.equal(conflicts[0].key, 'appointment:mobile-1:2026-08-02');
});

test('retired event packages normalize to seat capacity units', () => {
  const units = getBookingOccupancyUnits({
    booking: booking({ id: 'e1', serviceId: 'event', scheduleType: 'event_package', partySize: 2 })
  });

  assert.equal(units.length, 1);
  assert.equal(units[0].type, 'capacity');
  assert.equal(units[0].key, 'class_session:event:2026-08-02:09:00');
  assert.equal(units[0].seats, 2);
});
