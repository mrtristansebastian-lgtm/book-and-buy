import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { respondToReschedule, writeGuardedBooking } from '../functions/rescheduling.js';
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const enabled = !!process.env.FIRESTORE_EMULATOR_HOST;
if (enabled) initializeApp({ projectId: 'demo-book-buy' });
test('Firestore transaction protects acceptance, copies and duplicate requests', { skip: !enabled }, async () => {
  const db = getFirestore(); const owner = 'test-owner'; const threadId = 'test-thread';
  const base = 'artifacts/book-and-buy-v1';
  const day = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const booking = { id: 'test-booking', serviceId: 'service', serviceName: 'Consultation', clientEmail: 'client@example.test', status: 'confirmed', date: day, dateKey: day, time: '09:00', durationMinutes: 60, revision: 0, paymentStatus: 'paid', amountInCents: 10000 };
  await db.doc(`${base}/users/${owner}/config/settings`).set({ timezone: 'UTC', services: [{ id: 'service', name: 'Consultation', duration: 60 }], bookings: [booking], availabilityRules: { openWeekdays: ['mon','tue','wed','thu','fri','sat','sun'], businessOpenTime: '09:00', businessCloseTime: '17:00' } });
  await db.doc(`${base}/clientThreads/${threadId}`).set({ ownerId: owner, bookingId: booking.id, clientEmail: booking.clientEmail });
  await db.doc(`${base}/users/${owner}/rescheduleProposals/${booking.id}`).delete();
  const client = { uid: 'client', token: { email: booking.clientEmail, email_verified: true } };
  const business = { uid: owner, token: { email: 'owner@example.test', email_verified: true } };
  const proposed = await respondToReschedule({ threadId, action: 'propose', requestId: crypto.randomUUID(), slot: { dateKey: day, time: '11:00' } }, client, db);
  assert.equal(proposed.proposal.status, 'pending');
  assert.equal((await db.doc(`${base}/users/${owner}/config/settings`).get()).data().bookings[0].time, '09:00');
  await assert.rejects(respondToReschedule({ threadId, action: 'accept', expectedRevision: 1, requestId: crypto.randomUUID() }, client, db), /other party/);
  await assert.rejects(respondToReschedule({ threadId, action: 'accept', expectedRevision: 0, requestId: crypto.randomUUID() }, business, db), /changed/);
  const request = { threadId, action: 'accept', expectedRevision: 1, requestId: crypto.randomUUID() };
  const results = await Promise.all([respondToReschedule(request, business, db), respondToReschedule(request, business, db)]);
  assert.equal(results[0].proposal.status, 'accepted');
  const saved = (await db.doc(`${base}/users/${owner}/config/settings`).get()).data().bookings[0];
  assert.equal(saved.time, '11:00'); assert.equal(saved.paymentStatus, 'paid'); assert.equal(saved.amountInCents, 10000);
  assert.equal((await db.doc(`${base}/clientAccess/${booking.clientEmail}/bookings/${booking.id}`).get()).data().time, '11:00');
  await assert.rejects(writeGuardedBooking({ ownerId: owner, booking: { id: booking.id, time: '12:00' }, expectedRevision: 0 }, business, db), /changed/);
  await assert.rejects(respondToReschedule({ threadId, action: 'propose', requestId: crypto.randomUUID(), slot: { dateKey: day, time: '12:00' } }, { uid: 'stranger', token: { email: 'stranger@example.test', email_verified: true } }, db), /cannot change/);
});

test('counters, withdrawals, declines and disabled client policy retain the original booking', { skip: !enabled }, async () => {
  const db = getFirestore(); const owner = 'reschedule-state-owner'; const threadId = 'reschedule-state-thread';
  const base = 'artifacts/book-and-buy-v1'; const settings = db.doc(`${base}/users/${owner}/config/settings`);
  const day = new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10);
  const booking = { id: 'state-booking', serviceId: 'service', serviceName: 'Consultation', clientEmail: 'state-client@example.test', status: 'confirmed', date: day, dateKey: day, time: '09:00', durationMinutes: 60, revision: 0, paymentStatus: 'paid', amountInCents: 10000 };
  await settings.set({ timezone: 'UTC', services: [{ id: 'service', name: 'Consultation', duration: 60 }], bookings: [booking], availabilityRules: { openWeekdays: ['mon','tue','wed','thu','fri','sat','sun'], businessOpenTime: '09:00', businessCloseTime: '17:00' } });
  await db.doc(`${base}/clientThreads/${threadId}`).set({ ownerId: owner, bookingId: booking.id, clientEmail: booking.clientEmail });
  await db.doc(`${base}/users/${owner}/rescheduleProposals/${booking.id}`).delete();
  const client = { uid: 'state-client', token: { email: booking.clientEmail, email_verified: true } };
  const business = { uid: owner, token: { email: 'owner@example.test', email_verified: true } };
  const act = (action, actor, revision, time) => respondToReschedule({ threadId, action, requestId: crypto.randomUUID(), expectedRevision: revision, ...(time ? { slot: { dateKey: day, time } } : {}) }, actor, db);
  const first = await act('propose', business, 0, '11:00');
  const counter = await act('counter', client, first.proposal.revision, '12:00');
  assert.equal(counter.proposal.proposer, 'client');
  await assert.rejects(act('accept', business, first.proposal.revision), /changed/);
  assert.equal((await act('withdraw', client, counter.proposal.revision)).proposal.status, 'withdrawn');
  const next = await act('propose', client, 0, '13:00');
  assert.equal((await act('decline', business, next.proposal.revision)).proposal.status, 'declined');
  assert.equal((await settings.get()).data().bookings[0].time, '09:00');
  await settings.update({ 'availabilityRules.reschedulingAllowed': false });
  await assert.rejects(act('propose', client, 0, '14:00'), /does not allow client/);
  const byBusiness = await act('propose', business, 0, '14:00');
  assert.equal((await act('accept', client, byBusiness.proposal.revision)).proposal.status, 'accepted');
  const saved = (await settings.get()).data().bookings[0];
  assert.equal(saved.time, '14:00'); assert.equal(saved.paymentStatus, 'paid');
  assert.ok((await db.doc(`${base}/users/${owner}/rescheduleProposals/${booking.id}`).get()).data().serverUpdatedAt.toMillis() > 0);
});

test('a competing booking and reschedule acceptance cannot both take the same slot', { skip: !enabled }, async () => {
  const db = getFirestore(); const owner = 'reschedule-race-owner'; const threadId = 'reschedule-race-thread';
  const base = 'artifacts/book-and-buy-v1'; const settings = db.doc(`${base}/users/${owner}/config/settings`);
  const day = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  const booking = { id: 'race-booking', serviceId: 'service', serviceName: 'Consultation', clientEmail: 'race-client@example.test', status: 'confirmed', date: day, dateKey: day, time: '09:00', durationMinutes: 60, staffId: 'staff', revision: 0 };
  await settings.set({ timezone: 'UTC', services: [{ id: 'service', name: 'Consultation', duration: 60 }], bookings: [booking], availabilityRules: { openWeekdays: ['mon','tue','wed','thu','fri','sat','sun'], businessOpenTime: '09:00', businessCloseTime: '17:00' } });
  await db.doc(`${base}/clientThreads/${threadId}`).set({ ownerId: owner, bookingId: booking.id, clientEmail: booking.clientEmail });
  await db.doc(`${base}/users/${owner}/rescheduleProposals/${booking.id}`).delete();
  const client = { uid: 'race-client', token: { email: booking.clientEmail, email_verified: true } };
  const business = { uid: owner, token: { email: 'owner@example.test', email_verified: true } };
  const proposed = await respondToReschedule({ threadId, action: 'propose', requestId: crypto.randomUUID(), slot: { dateKey: day, time: '11:00' } }, client, db);
  const results = await Promise.allSettled([
    respondToReschedule({ threadId, action: 'accept', expectedRevision: proposed.proposal.revision, requestId: crypto.randomUUID() }, business, db),
    writeGuardedBooking({ ownerId: owner, booking: { ...booking, id: 'competing-booking', clientEmail: 'other@example.test', time: '11:00' } }, business, db)
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.match(results.find((result) => result.status === 'rejected').reason.message, /no longer available/);
  assert.equal((await settings.get()).data().bookings.filter((item) => item.time === '11:00').length, 1);
});
