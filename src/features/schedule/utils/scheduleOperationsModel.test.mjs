import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findScheduleConflict,
  getAvailabilityIntervals,
  getDayScheduleSummary,
  getOpenAvailabilityIntervals,
  getScheduleConflicts,
  getScheduleEventsForDateAndStaff,
  getStatusCounts,
  indexScheduleEvents,
  layoutScheduleOverlaps,
  normalizeScheduleEvents
} from './scheduleOperationsModel.js';

const services = [
  { id: 'cut', name: 'Haircut', duration: '60 min' },
  { id: 'colour', name: 'Colour', duration: '90 min' }
];

const staffList = [
  { id: 'ava', name: 'Ava Stone', title: 'Stylist', photoURL: '/ava.jpg' },
  { id: 'kai', name: 'Kai Brown', title: 'Colourist' }
];

const booking = (overrides = {}) => ({
  id: 'booking-1',
  clientName: 'Nandi',
  dateKey: '2026-08-03',
  serviceId: 'cut',
  staffId: 'ava',
  status: 'confirmed',
  time: '09:00',
  ...overrides
});

test('normalizes existing booking records without mutating the booking shape', () => {
  const original = booking({
    serviceDuration: '1h 30m',
    rescheduleStatus: 'requested'
  });
  const [event] = normalizeScheduleEvents({ bookings: [original], services, staffList, todayStr: '2026-08-01' });

  assert.equal(event.booking, original);
  assert.equal(event.endMinutes, 630);
  assert.equal(event.durationMinutes, 90);
  assert.equal(event.serviceName, 'Haircut');
  assert.equal(event.staffName, 'Ava Stone');
  assert.deepEqual(event.attentionReasons, ['reschedule']);
  assert.equal(event.isScheduled, true);
});

test('normalization retains waitlist and declined bookings as non-placeable board records', () => {
  const events = normalizeScheduleEvents({
    bookings: [
      booking({ id: 'waitlist', status: 'waitlisted', time: 'Waitlist' }),
      booking({ id: 'declined', status: 'declined' })
    ],
    services,
    todayStr: '2026-08-01'
  });

  assert.equal(events.find(event => event.id === 'waitlist').isWaitlist, true);
  assert.equal(events.find(event => event.id === 'waitlist').isScheduled, false);
  assert.equal(events.find(event => event.id === 'declined').isDeclined, true);
  assert.equal(events.find(event => event.id === 'declined').isScheduled, false);
});

test('indexes date and staff event maps for board lanes', () => {
  const events = normalizeScheduleEvents({
    bookings: [booking(), booking({ id: 'booking-2', staffId: 'kai', time: '10:00' })],
    services,
    staffList,
    todayStr: '2026-08-01'
  });
  const index = indexScheduleEvents(events);

  assert.equal(index.byDate.get('2026-08-03').length, 2);
  assert.deepEqual(
    getScheduleEventsForDateAndStaff(index, '2026-08-03', 'ava').map(event => event.id),
    ['booking-1']
  );
  assert.equal(index.byId.get('booking-2').staffName, 'Kai Brown');
});

test('builds staff-specific availability ranges and honours a closed day override', () => {
  const settings = {
    availableTimes: ['09:00', '10:30'],
    scheduleDefaults: { duration: 60 },
    staffCalendars: {
      ava: {
        availableTimes: ['08:00 - 09:30', '10:00 - 11:00'],
        schedule: {
          '2026-08-04': { available: false, times: [] }
        }
      }
    }
  };

  const staffIntervals = getAvailabilityIntervals({ settings, dateKey: '2026-08-03', staffId: 'ava' });
  assert.deepEqual(staffIntervals.map(interval => [interval.start, interval.end]), [['08:00', '09:30'], ['10:00', '11:00']]);
  assert.deepEqual(getAvailabilityIntervals({ settings, dateKey: '2026-08-04', staffId: 'ava' }), []);
});

test('counts only unblocked availability windows and reports day attention', () => {
  const events = normalizeScheduleEvents({
    bookings: [
      booking(),
      booking({ id: 'pending', time: '10:30', status: 'pending' }),
      booking({ id: 'waitlist', status: 'waitlist', time: 'Waitlist' })
    ],
    services,
    staffList,
    todayStr: '2026-08-01'
  });
  const intervals = [
    { dateKey: '2026-08-03', staffId: 'ava', startMinutes: 540, endMinutes: 600 },
    { dateKey: '2026-08-03', staffId: 'ava', startMinutes: 630, endMinutes: 690 },
    { dateKey: '2026-08-03', staffId: 'ava', startMinutes: 720, endMinutes: 780 }
  ];
  const open = getOpenAvailabilityIntervals({ availabilityIntervals: intervals, events, dateKey: '2026-08-03', staffId: 'ava' });
  const summary = getDayScheduleSummary({ availabilityIntervals: intervals, events, dateKey: '2026-08-03', staffId: 'ava' });

  assert.equal(open.length, 1);
  assert.equal(summary.openSlotCount, 1);
  assert.equal(summary.bookedCount, 2);
  assert.equal(summary.attentionCounts.pending, 1);
  assert.equal(summary.attentionCounts.waitlist, 1);
  assert.equal(summary.attentionCount, 2);
});

test('detects duration overlap rather than only identical start times', () => {
  const events = normalizeScheduleEvents({
    bookings: [
      booking({ id: 'first', time: '09:00', serviceId: 'colour' }),
      booking({ id: 'waitlist', status: 'waitlist', time: 'Waitlist' }),
      booking({ id: 'next-staff', staffId: 'kai', time: '09:30' })
    ],
    services,
    staffList,
    todayStr: '2026-08-01'
  });
  const conflict = findScheduleConflict({
    candidate: booking({ id: 'candidate', time: '10:00', serviceId: 'cut' }),
    events,
    services,
    staffList,
    todayStr: '2026-08-01'
  });

  assert.equal(conflict?.id, 'first');
  assert.equal(getScheduleConflicts({ events }).length, 0);
});

test('lays out overlapping events in columns while adjacent events reuse a lane', () => {
  const events = normalizeScheduleEvents({
    bookings: [
      booking({ id: 'first', time: '09:00', serviceId: 'colour' }),
      booking({ id: 'second', time: '09:30', serviceId: 'cut' }),
      booking({ id: 'third', time: '10:30', serviceId: 'cut' })
    ],
    services,
    todayStr: '2026-08-01'
  });
  const laidOut = layoutScheduleOverlaps(events);

  assert.equal(laidOut.find(event => event.id === 'first').columns, 2);
  assert.equal(laidOut.find(event => event.id === 'second').columns, 2);
  assert.equal(laidOut.find(event => event.id === 'third').columns, 1);
  assert.equal(laidOut.find(event => event.id === 'third').column, 0);
  assert.deepEqual(getStatusCounts(events), {
    total: 3,
    scheduled: 3,
    confirmed: 3,
    pending: 0,
    completed: 0,
    waitlist: 0,
    declined: 0,
    other: 0,
    reschedule: 0
  });
});
