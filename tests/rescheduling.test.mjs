import test from 'node:test';
import assert from 'node:assert/strict';
import { availableRescheduleSlots, bookingSlot, businessClock, nextProposal, validateBookingSlot, validWallTime } from '../functions/bookingDomain.js';
import { fitViewport, mapToScreen, screenToMap } from '../src/features/analytics/utils/mapViewport.js';
const now = Date.parse('2026-10-01T06:00:00Z');
const workspace = { timezone: 'Africa/Johannesburg', services: [{ id: 'service', name: 'Consultation', duration: 60 }], availabilityRules: { businessOpenTime: '09:00', businessCloseTime: '17:00', maxAdvanceBookingDays: 90 } };
const booking = { id: 'booking', serviceId: 'service', status: 'confirmed', dateKey: '2026-10-02', time: '09:00', durationMinutes: 60, staffId: 'staff', amountInCents: 10000, paymentStatus: 'paid' };
const slot = { dateKey: '2026-10-02', time: '11:00' };
test('both parties can propose; only the opposite side can accept or counter', () => {
  for (const actor of ['business', 'client']) {
    const current = nextProposal({ booking, actor, action: 'propose', slot, now, id: 'booking' });
    assert.equal(current.status, 'pending'); assert.deepEqual(current.original, bookingSlot(booking));
    assert.throws(() => nextProposal({ current, booking, actor, action: 'accept', expectedRevision: 1, now }), /other party/);
    const other = actor === 'client' ? 'business' : 'client';
    const counter = nextProposal({ current, booking, actor: other, action: 'counter', slot: { ...slot, time: '12:00' }, expectedRevision: 1, now, id: 'booking' });
    assert.equal(counter.revision, 2); assert.equal(counter.proposer, other);
    assert.equal(nextProposal({ current: counter, booking, actor, action: 'accept', expectedRevision: 2, now }).status, 'accepted');
    assert.equal(booking.time, '09:00'); assert.equal(booking.paymentStatus, 'paid');
  }
});
test('stale revisions, stale booking times and competing requests are rejected', () => {
  const current = nextProposal({ booking, actor: 'client', action: 'propose', slot, now });
  assert.throws(() => nextProposal({ current, booking, actor: 'business', action: 'accept', expectedRevision: 0 }), /changed/);
  assert.throws(() => nextProposal({ current, booking: { ...booking, time: '10:00' }, actor: 'business', action: 'accept', expectedRevision: 1 }), /booking changed/);
  assert.throws(() => nextProposal({ current, booking: { ...booking, staffId: 'replacement' }, actor: 'business', action: 'accept', expectedRevision: 1 }), /booking changed/);
  assert.throws(() => nextProposal({ current, booking, actor: 'client', action: 'propose', slot }), /pending proposal/);
  assert.equal(nextProposal({ current, booking, actor: 'client', action: 'withdraw', expectedRevision: 1 }).status, 'withdrawn');
  assert.equal(nextProposal({ current, booking, actor: 'business', action: 'decline', expectedRevision: 1 }).status, 'declined');
});
test('availability checks future times, hours, advance limits, staff overlap and breaks', () => {
  assert.equal(validateBookingSlot(workspace, booking, slot, [booking], now), true);
  assert.throws(() => validateBookingSlot(workspace, booking, { ...slot, time: '18:00' }, [], now), /working hours/);
  assert.throws(() => validateBookingSlot(workspace, booking, { ...slot, dateKey: '2027-10-01' }, [], now), /booking window/);
  assert.throws(() => validateBookingSlot(workspace, booking, slot, [{ ...booking, id: 'other', time: '11:30' }], now), /no longer available/);
  assert.equal(validateBookingSlot(workspace, booking, slot, [{ ...booking, id: 'other', time: '11:30', staffId: 'other-staff' }], now), true);
  const shifts = { ...workspace, staffAvailability: { staff: { days: { '2026-10-02': { status: 'open', open: true, ranges: [{ start: '09:00', end: '17:00' }], breaks: [{ start: '11:00', end: '12:00' }] } } } } };
  assert.throws(() => validateBookingSlot(shifts, booking, slot, [], now), /working hours/);
  assert.ok(availableRescheduleSlots(workspace, booking, slot.dateKey, [], now).every((s) => s.time !== booking.time));
});
test('classes accept only existing sessions with sufficient remaining capacity', () => {
  const ws = { ...workspace, services: [{ id: 'service', scheduleType: 'class_session', capacity: 2, sessions: [{ id: 's1', dateKey: slot.dateKey, time: slot.time, capacity: 2 }] }] };
  const b = { ...booking, scheduleType: 'class_session', partySize: 2 };
  assert.equal(validateBookingSlot(ws, b, slot, [], now), true);
  assert.throws(() => validateBookingSlot(ws, b, slot, [{ ...b, id: 'other', time: slot.time, partySize: 1 }], now), /full/);
  assert.throws(() => validateBookingSlot(ws, b, { ...slot, time: '12:00' }, [], now), /existing session/);
});
test('overnight staff conflicts carry into the next calendar date', () => {
  const ws = { ...workspace, availabilityRules: { businessOpenTime: '22:00', businessCloseTime: '06:00', openWeekdays: ['thu', 'fri'] } };
  const early = { dateKey: '2026-10-02', time: '00:30' };
  assert.equal(validateBookingSlot(ws, booking, early, [], now), true);
  assert.throws(() => validateBookingSlot(ws, booking, early, [{ ...booking, id: 'late', dateKey: '2026-10-01', time: '23:30', durationMinutes: 120 }], now), /no longer available/);
});
test('timezone normalization rejects DST gaps and invalid dates', () => {
  assert.equal(businessClock('Africa/Johannesburg', now).time, '08:00');
  assert.equal(validWallTime('2026-03-08', '02:30', 'America/New_York'), false);
  assert.equal(validWallTime('2026-11-01', '01:30', 'America/New_York'), true);
  assert.equal(validWallTime('2026-02-31', '10:00', 'UTC'), false);
});
test('SVG viewport conversions account for letterboxing and keep pan bounded', () => {
  const rect = { left: 100, top: 100, width: 1000, height: 800 };
  const view = fitViewport(1000, 500, 1.35);
  const point = { x: 650, y: 300 }; const screen = mapToScreen(point, rect, view);
  const back = screenToMap({ x: screen.x + rect.left, y: screen.y + rect.top }, rect, view);
  assert.ok(Math.abs(back.x - point.x) < .0001 && Math.abs(back.y - point.y) < .0001);
  const bounded = fitViewport(1000, 500, 4, { x: -100, y: 10000 });
  assert.equal(bounded.x, 125); assert.equal(bounded.y, 437.5);
});
