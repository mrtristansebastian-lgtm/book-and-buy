import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingIntake, isFirstComeService, isUnscheduledBooking } from '../functions/bookingModes.js';
import { availableRescheduleSlots, bookingSlot, validateBookingSlot } from '../functions/bookingDomain.js';
import { applyWorkspaceChanges, readinessIssues } from '../functions/workspaceDomain.js';
import { publicCommerceCatalog, serviceCommerceQuote } from '../functions/commerceRuntime.js';
import { publicProfile } from '../functions/workspaceCommands.js';
import { writeGuardedBooking } from '../functions/rescheduling.js';
import { getLivePublicServiceAvailability } from '../functions/availability.js';
import { validateServiceTiming } from '../functions/serviceTiming.js';

const base = 'artifacts/book-and-buy-v1';
const path = `${base}/users/owner/config/settings`;
const now = Date.parse('2026-10-11T10:00:00Z');
const service = { id: 'cut', name: 'Haircut', price: 320, cost: 120, duration: 45, scheduleType: 'appointment', timingMode: 'availability', staffIds: ['stylist'], variants: [{ id: 'finish', name: 'Cut & finish', price: 520, cost: 180, minDuration: 75, available: true }] };
const workspace = { ownerId: 'owner', slug: 'salon', timezone: 'Africa/Johannesburg', currency: 'R',
  services: [service], bookings: [], staff: [{ id: 'stylist', active: true }],
  paymentGateways: [], website: { published: true, markets: [{ countryCode: 'ZA', enabled: true, catalogMode: 'all' }] },
  availabilityRules: { scheduleMode: 'first_come', staffAssignmentMode: 'client', openWeekdays: [], closedDates: ['2026-10-12'], weekdayHours: Object.fromEntries(['mon','tue','wed','thu','fri','sat','sun'].map(key => [key, { open: false }])) } };
const client = { slug: 'salon', requestId: 'request-1', serviceId: 'cut', variantId: 'finish', bookingMode: 'first_come', clientName: 'Jamie Smith', clientEmail: 'jamie@example.test', clientCountry: 'ZA' };
const auth = { uid: 'owner', token: { email: 'owner@example.test', email_verified: true } };
function store(initial = workspace) {
  const records = new Map([[path, structuredClone(initial)], [`${base}/public/data/workspaces/salon`, { ownerId: 'owner', slug: 'salon', published: true }]]);
  const snap = key => ({ exists: records.has(key), data: () => structuredClone(records.get(key)) });
  let queue = Promise.resolve();
  const db = { doc: key => ({ path: key, get: async () => snap(key) }), runTransaction(callback) {
    const task = queue.then(async () => {
      const writes = []; let wrote = false;
      const result = await callback({ get: async ref => { assert.equal(wrote, false, 'Reads must precede writes'); return snap(ref.path); }, set: (ref, row) => { wrote = true; writes.push([ref.path, row]); } });
      for (const [key, row] of writes) records.set(key, row);
      return result;
    }); queue = task.catch(() => {}); return task;
  } };
  return { records, db };
}

test('first come mode saves, publishes and passes readiness without hours or a gateway', () => {
  const saved = applyWorkspaceChanges({}, [{ section: 'availabilityRules', expectedRevision: 0, patch: { availabilityRules: workspace.availabilityRules } }]);
  assert.equal(saved.availabilityRules.scheduleMode, 'first_come');
  assert.deepEqual(readinessIssues(saved), []);
  assert.equal(publicCommerceCatalog(workspace, 'ZA').availabilityRules.scheduleMode, 'first_come');
  assert.equal(publicProfile(workspace, 'owner').availabilityRules.scheduleMode, 'first_come');
  assert.throws(() => applyWorkspaceChanges({}, [{ section: 'availabilityRules', expectedRevision: 0, patch: { availabilityRules: { scheduleMode: 'invented' } } }]), /booking mode/);
});

test('public intake creates one pending unpaid queue entry on retry without assigning shifts or charging', async () => {
  const { db, records } = store();
  const input = { ...client, amountInCents: 1, status: 'confirmed', paymentStatus: 'paid', paymentMethod: 'stripe', time: '09:00', dateKey: '2026-10-12', staffId: 'stylist' };
  const [first, retry] = await Promise.all([writeGuardedBooking(input, null, db, true), writeGuardedBooking(input, null, db, true)]);
  assert.deepEqual(first, retry);
  assert.equal(first.status, 'pending'); assert.equal(first.paymentStatus, 'unpaid');
  assert.equal(first.bookingMode, 'first_come'); assert.equal(isUnscheduledBooking(first), true);
  assert.equal(first.amountInCents, 52000); assert.equal(first.durationMinutes, 75);
  assert.equal(first.staffId, ''); assert.equal(first.costBasisInCents, undefined);
  const saved = records.get(path).bookings;
  assert.equal(saved.length, 1); assert.equal(saved[0].costBasisInCents, 18000);
  assert.equal(records.get(`${base}/clientAccess/${client.clientEmail}/bookings/${first.id}`).bookingMode, 'first_come');
  assert.equal([...records.keys()].some(key => key.includes('payment_attempts')), false);
  await assert.rejects(writeGuardedBooking({ ...input, clientName: 'Changed' }, null, db, true), /already used/);
});

test('owner can accept a queue request and schedule it without hours after the business mode changes', async () => {
  const { db, records } = store();
  const requested = await writeGuardedBooking(client, null, db, true);
  const confirmed = await writeGuardedBooking({ ownerId: 'owner', expectedRevision: requested.revision, booking: { id: requested.id, status: 'confirmed' } }, auth, db);
  assert.equal(confirmed.status, 'confirmed'); assert.equal(confirmed.time, ''); assert.equal(confirmed.paymentStatus, 'unpaid');
  records.get(path).availabilityRules.scheduleMode = 'time_slots';
  records.get(path).services[0].price = 999;
  const dateKey = new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10);
  const scheduled = await writeGuardedBooking({ ownerId: 'owner', expectedRevision: confirmed.revision, booking: { id: requested.id, date: dateKey, dateKey, time: '20:00' } }, auth, db);
  assert.equal(scheduled.time, '20:00'); assert.equal(scheduled.bookingMode, 'first_come');
  assert.equal(scheduled.amountInCents, 52000); assert.equal(scheduled.paymentStatus, 'unpaid');
});

test('queue entries hold no time; agreed times retain conflict, notice and date validation', () => {
  const booking = { id: 'queue', serviceId: 'cut', bookingMode: 'first_come', status: 'pending', date: '', dateKey: '', time: '', durationMinutes: 75 };
  assert.equal(validateBookingSlot(workspace, booking, bookingSlot(booking), [booking, { ...booking, id: 'other' }], now), true);
  const slot = { dateKey: '2026-10-12', time: '20:00' };
  assert.equal(validateBookingSlot(workspace, booking, slot, [booking], now), true);
  assert.throws(() => validateBookingSlot(workspace, booking, slot, [{ ...booking, id: 'busy', dateKey: slot.dateKey, time: '20:30' }], now), /no longer available/);
  assert.throws(() => validateBookingSlot(workspace, booking, { dateKey: slot.dateKey }, [], now), /valid date and time/);
  assert.throws(() => validateBookingSlot(workspace, booking, { dateKey: '2026-10-10', time: '20:00' }, [], now), /future/);
  assert.throws(() => validateBookingSlot({ ...workspace, availabilityRules: { ...workspace.availabilityRules, bookingNoticeMinutes: 6000 } }, booking, slot, [], now), /minimum booking notice/);
  assert.ok(availableRescheduleSlots(workspace, booking, slot.dateKey, [], now).some(candidate => candidate.time === '20:00'));
});

test('queue mode cannot bypass normal appointments, fixed sessions, arranged timing or capacity', async () => {
  const normal = { ...workspace, availabilityRules: { ...workspace.availabilityRules, scheduleMode: 'time_slots' } };
  await assert.rejects(writeGuardedBooking(client, null, store(normal).db, true), /normal booking flow/);
  assert.throws(() => bookingIntake(workspace, service, {}, null, true), /without selecting a time/);
  const arranged = { ...service, timingMode: 'arranged' };
  assert.equal(isFirstComeService(workspace, arranged), false);
  assert.throws(() => serviceCommerceQuote({ ...workspace, services: [arranged] }, client), /arrange/);
  const spot = { ...service, timingMode: 'fixed', scheduleType: 'class_session', capacity: 1, sessionStartDate: '2026-10-12', sessionStartTime: '10:00' };
  assert.equal(isFirstComeService(workspace, spot), false);
  assert.throws(() => bookingIntake(workspace, spot, client, null, true), /normal booking flow/);
  const booking = { serviceId: spot.id, scheduleType: 'class_session', bookingMode: 'first_come', durationMinutes: 60 };
  assert.throws(() => validateBookingSlot({ ...workspace, services: [spot] }, booking, {}, [], now), /valid date and time/);
  assert.throws(() => validateBookingSlot({ ...workspace, services: [spot] }, booking, { dateKey: spot.sessionStartDate, time: spot.sessionStartTime }, [{ ...booking, id: 'occupied', dateKey: spot.sessionStartDate, time: spot.sessionStartTime, status: 'confirmed' }], now), /full/);
  assert.equal(bookingIntake(workspace, service, {}, { dateKey: '2026-10-12' }, false).bookingMode, 'time_slots', 'Legacy booked times retain their rules');
});

test('public availability is empty for queue services and market restrictions still apply', async () => {
  const { db } = store();
  assert.deepEqual(await getLivePublicServiceAvailability({ slug: 'salon', serviceId: 'cut', countryCode: 'ZA', dateKey: '2026-10-12' }, db), []);
  await assert.rejects(writeGuardedBooking({ ...client, clientCountry: 'US' }, null, db, true), /selected country/);
  const quote = serviceCommerceQuote(workspace, { serviceId: 'cut', countryCode: 'ZA' });
  const { db: changed } = store({ ...workspace, sectionRevisions: { availabilityRules: 1 } });
  await assert.rejects(writeGuardedBooking({ ...client, expectedQuoteRevision: quote.quoteRevision }, null, changed, true), /quote changed/);
});

test('event formats cannot be saved, projected or booked while planning consultations remain', () => {
  const event = { ...service, id: 'event', catalogTemplateId: 'service_category_events_event', scheduleType: 'class_session' };
  assert.match(validateServiceTiming(event), /no longer supported/);
  assert.match(validateServiceTiming({ bookingFormat: 'event' }), /no longer supported/);
  assert.equal(publicCommerceCatalog({ ...workspace, services: [service, event] }, 'ZA').services.length, 1);
  assert.equal(publicProfile({ ...workspace, services: [service, event] }, 'owner').services.length, 1);
  assert.throws(() => serviceCommerceQuote({ ...workspace, services: [event] }, { serviceId: event.id, countryCode: 'ZA' }), /no longer supported/);
});
