import assert from 'node:assert/strict';
import test from 'node:test';
import { createBookingDeskModel, sortBookingRows } from './bookingDeskModel.js';

const today = new Date(2026, 5, 8);
const bookings = [
  {
    id: 'pending-today',
    amountInCents: 15000,
    clientEmail: 'nomsa@example.com',
    clientName: 'Nomsa Dlamini',
    dateKey: '2026-06-08',
    paymentMethod: 'manual_eft',
    paymentStatus: 'manual_pending',
    serviceName: 'Consultation',
    staffId: 'staff-ava',
    status: 'pending',
    time: '09:00',
    timestamp: 100
  },
  {
    id: 'waitlist-tomorrow',
    amountInCents: 5000,
    clientName: 'Chris Jacobs',
    dateKey: '2026-06-09',
    paymentStatus: 'unpaid',
    serviceName: 'Check-in',
    status: 'waitlist',
    time: '14:30',
    timestamp: 200
  },
  {
    id: 'confirmed-paid',
    amountInCents: 30000,
    clientName: 'Aisha Khan',
    dateKey: '2026-06-10',
    paymentGateway: 'cash',
    paymentStatus: 'paid',
    serviceName: 'Premium Session',
    status: 'confirmed',
    time: '11:00',
    timestamp: 300
  },
  {
    id: 'past-completed',
    amountInCents: 12000,
    clientName: 'Past Client',
    dateKey: '2026-06-01',
    paymentStatus: 'paid',
    serviceName: 'Completed Session',
    status: 'completed',
    time: '10:00',
    timestamp: 50
  },
  {
    id: 'declined-future',
    amountInCents: 7000,
    clientName: 'Declined Client',
    dateKey: '2026-06-11',
    paymentStatus: 'unpaid',
    serviceName: 'Declined Session',
    status: 'declined',
    time: '12:00',
    timestamp: 400
  }
];

test('booking desk model filters review rows inside the selected week', () => {
  const model = createBookingDeskModel({
    bookingDeskPeriod: 'week',
    bookingFilter: 'review',
    now: today,
    visibleBookings: bookings
  });

  assert.deepEqual(model.filteredRows.map(booking => booking.id), ['waitlist-tomorrow', 'pending-today']);
  assert.equal(model.review, 2);
  assert.equal(model.pending, 1);
  assert.equal(model.waitlist, 1);
  assert.equal(model.period.id, 'week');
});

test('booking desk model searches staff names and applies payment filters', () => {
  const staff = [{ id: 'staff-ava', name: 'Ava Manager' }];
  const searchModel = createBookingDeskModel({
    bookingFilter: 'all',
    bookingSearch: 'ava manager',
    now: today,
    safeStaffList: staff,
    visibleBookings: bookings
  });
  assert.deepEqual(searchModel.filteredRows.map(booking => booking.id), ['pending-today']);

  const paidModel = createBookingDeskModel({
    bookingFilter: 'confirmed',
    bookingPaymentFilter: 'paid',
    now: today,
    visibleBookings: bookings
  });
  assert.deepEqual(paidModel.filteredRows.map(booking => booking.id), ['confirmed-paid']);
  assert.equal(paidModel.total, 2);
});

test('booking desk model falls back to upcoming when an unknown filter is requested', () => {
  const model = createBookingDeskModel({
    bookingFilter: 'not-real',
    now: today,
    visibleBookings: bookings
  });

  assert.equal(model.activeFilter, 'upcoming');
  assert.deepEqual(model.filteredRows.map(booking => booking.id), [
    'confirmed-paid',
    'waitlist-tomorrow',
    'pending-today'
  ]);
});

test('booking desk sorting keeps amount and client options deterministic', () => {
  assert.deepEqual(sortBookingRows(bookings, 'amount-high').map(booking => booking.id).slice(0, 2), [
    'confirmed-paid',
    'pending-today'
  ]);
  assert.deepEqual(sortBookingRows(bookings, 'client').map(booking => booking.id).slice(0, 2), [
    'confirmed-paid',
    'waitlist-tomorrow'
  ]);
});
