import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nextAnonymousIdentity, doNotTrackEnabled, anonymousMetadata } from '../src/shared/analytics/anonymousIdentity.js';
import { verifiedAnalyticsAttribution } from '../functions/analyticsAttribution.js';
import { placeMarketOrder } from '../functions/marketOrders.js';
import { writeGuardedBooking } from '../functions/rescheduling.js';

const now = 1_800_000_000_000;
let sequence = 0;
const createId = () => `anonymous_${++sequence}`;
const make = (input = {}) => nextAnonymousIdentity({ now, createId, ...input });

test('new and returning visitors are anonymous, stable within a session and scoped by caller storage', () => {
  const first = make();
  assert.equal(first.session.isReturningVisitor, false);
  const active = make({ storedSession: first.session, storedVisitor: first.visitor, now: now + 1000 });
  assert.equal(active.session.id, first.session.id);
  assert.equal(active.session.isReturningVisitor, false);
  const returning = make({ storedSession: active.session, storedVisitor: first.visitor, now: now + 31 * 60_000 });
  assert.notEqual(returning.session.id, first.session.id);
  assert.equal(returning.session.visitorId, first.session.visitorId);
  assert.equal(returning.session.isReturningVisitor, true);
  assert.equal(make().session.visitorId === first.session.visitorId, false);
  assert.deepEqual(Object.keys(anonymousMetadata(first.session)).sort(),
    ['analyticsVersion', 'isReturningVisitor', 'source', 'visitorFirstSeenAt', 'visitorId']);
});

test('explicit Places entry starts an attributed session; navigation preserves source, inactivity does not', () => {
  const direct = make();
  const places = make({ storedSession: direct.session, storedVisitor: direct.visitor, source: 'places', now: now + 100 });
  assert.notEqual(places.session.id, direct.session.id);
  assert.equal(places.session.source, 'places');
  assert.equal(places.session.isReturningVisitor, false);
  const page = make({ storedSession: places.session, storedVisitor: places.visitor, now: now + 500 });
  assert.equal(page.session.id, places.session.id);
  assert.equal(page.session.source, 'places');
  const later = make({ storedSession: page.session, storedVisitor: places.visitor, now: now + 31 * 60_000 });
  assert.equal(later.session.source, 'direct');
});

test('legacy sessions receive new IDs rather than inventing historical visitor/source metadata', () => {
  const legacy = { id: 'legacy_session', startedAt: now - 100, lastActivityAt: now };
  const next = make({ storedSession: legacy });
  assert.notEqual(next.session.id, legacy.id);
  assert.equal(next.session.analyticsVersion, 2);
  assert.equal(next.session.isReturningVisitor, false);
});

test('DNT is respected for current and legacy browser indicators', () => {
  assert.equal(doNotTrackEnabled({ doNotTrack: '1' }, null), true);
  assert.equal(doNotTrackEnabled({ msDoNotTrack: 'yes' }, null), true);
  assert.equal(doNotTrackEnabled(null, { doNotTrack: '1' }), true);
  assert.equal(doNotTrackEnabled({ doNotTrack: '0' }, null), false);
});

const data = { analyticsSessionId: 'anonymous_session', analyticsSource: 'places' };
const session = { sessionId: data.analyticsSessionId, ownerId: 'business', slug: 'shop', analyticsVersion: 2, source: 'places' };
test('authoritative orders/bookings accept only a matching business session and source', async () => {
  assert.deepEqual(await verifiedAnalyticsAttribution(data, 'business', 'shop', async () => session), data);
  for (const invalid of [null, { ...session, ownerId: 'other' }, { ...session, slug: 'other' },
    { ...session, source: 'direct' }, { ...session, analyticsVersion: 1 }]) {
    assert.deepEqual(await verifiedAnalyticsAttribution(data, 'business', 'shop', async () => invalid), {});
  }
  let reads = 0;
  assert.deepEqual(await verifiedAnalyticsAttribution({}, 'business', 'shop', async () => { reads++; }), {});
  assert.equal(reads, 0);
  await assert.rejects(verifiedAnalyticsAttribution({ ...data, analyticsSource: 'forged' }, 'business', 'shop', async () => session));
  await assert.rejects(verifiedAnalyticsAttribution({ ...data, analyticsSessionId: '../private' }, 'business', 'shop', async () => session));
  await assert.rejects(verifiedAnalyticsAttribution({ analyticsSessionId: data.analyticsSessionId }, 'business', 'shop', async () => session));
});

test('first-message analytics follows successful send and cannot count empty threads or retries', () => {
  const api = readFileSync(new URL('../src/features/client-app/clientThreadsApi.js', import.meta.url), 'utf8');
  const beacon = readFileSync(new URL('../src/shared/analytics/beacon.ts', import.meta.url), 'utf8');
  assert.match(api, /where\('from', '==', 'client'\), limit\(1\)/);
  assert.ok(api.indexOf('await batch.commit()') < api.indexOf('if (firstClientMessage) void reportMessageLead'));
  assert.match(beacon, /`message_lead_\$\{threadId\}`/);
  assert.match(beacon, /function canWriteCommerce\(\): boolean \{\s*return canWritePresence\(\)/);
  assert.match(beacon, /getAnalyticsSessionId[\s\S]*?if \(!canWritePresence\(\)/);
});

test('rules keep visitor fields bounded, sources explicit and session identity immutable', () => {
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  assert.match(rules, /visitorId\.matches\('\^\[a-zA-Z0-9_-\]\{8,80\}\$'\)/);
  assert.match(rules, /source in \['places', 'direct'\]/);
  assert.match(rules, /analyticsIdentityUnchanged\(\)/);
  assert.match(rules, /allow update, delete: if false/);
});

function fixtureDb({ analyticsSession = session } = {}) {
  const base = 'artifacts/book-and-buy-v1';
  const settingsPath = `${base}/users/business/config/settings`;
  const rows = new Map([
    [`${base}/public/data/workspaces/shop`, { ownerId: 'business', slug: 'shop' }],
    [settingsPath, { slug: 'shop', brandName: 'Test shop', currency: 'R', orders: [], bookings: [],
      products: [{ id: 'p', name: 'Product', price: 30, active: true }],
      services: [{ id: 's', name: 'Service', durationMinutes: 60, price: 50 }],
      timezone: 'UTC', availabilityRules: { openWeekdays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], businessOpenTime: '09:00', businessCloseTime: '17:00' } }]
  ]);
  if (analyticsSession) rows.set(`${base}/analyticsSessions/${data.analyticsSessionId}`, analyticsSession);
  const snapshot = (path) => ({ exists: rows.has(path), data: () => rows.get(path) });
  const db = {
    doc: (path) => ({ path, get: async () => snapshot(path) }),
    runTransaction: async (action) => {
      const pending = [];
      const result = await action({ get: async (ref) => snapshot(ref.path),
        update: (ref, patch) => pending.push(() => rows.set(ref.path, { ...rows.get(ref.path), ...patch })),
        set: (ref, value) => pending.push(() => rows.set(ref.path, value)) });
      pending.forEach((write) => write());
      return result;
    }
  };
  return { db, rows, settingsPath };
}

test('order attribution survives idempotent retry without changing prices/payment/status/source', async () => {
  const { db, rows, settingsPath } = fixtureDb();
  const input = { ...data, slug: 'shop', requestId: 'order_request', items: [{ productId: 'p', quantity: 2 }],
    client: { clientName: 'Client', clientEmail: 'client@example.test' }, paymentMethod: 'cash' };
  const first = await placeMarketOrder(input, null, db);
  const retry = await placeMarketOrder(input, null, db);
  assert.equal(first.id, retry.id);
  assert.equal(rows.get(settingsPath).orders.length, 1);
  assert.equal(first.analyticsSource, 'places');
  assert.equal(first.analyticsSessionId, data.analyticsSessionId);
  assert.equal(first.amountInCents, 6000);
  assert.equal(first.status, 'pending');
  assert.equal(first.paymentStatus, 'manual_pending');
  assert.equal(first.source, 'public_shop');
  const unverified = fixtureDb({ analyticsSession: { ...session, ownerId: 'another' } });
  const without = await placeMarketOrder(input, null, unverified.db);
  assert.equal('analyticsSource' in without, false);
  assert.equal(without.amountInCents, first.amountInCents);
});

test('public bookings retain verified attribution across canonical copies and retry', async () => {
  const { db, rows, settingsPath } = fixtureDb();
  const day = new Date(Date.now() + 4 * 86400_000).toISOString().slice(0, 10);
  const input = { ...data, slug: 'shop', requestId: 'booking_request', serviceId: 's', date: day,
    dateKey: day, time: '10:00', clientName: 'Client', clientEmail: 'client@example.test', amountInCents: 1, status: 'confirmed' };
  const booking = await writeGuardedBooking(input, null, db, true);
  const retry = await writeGuardedBooking(input, null, db, true);
  assert.equal(booking.id, retry.id);
  assert.equal(rows.get(settingsPath).bookings.length, 1);
  assert.equal(booking.analyticsSource, 'places');
  assert.equal(booking.amountInCents, 5000);
  assert.equal(booking.status, 'pending');
  assert.equal(booking.paymentStatus, 'unpaid');
  assert.equal(booking.source, 'public');
  assert.equal(rows.get(`artifacts/book-and-buy-v1/users/business/bookings/${booking.id}`).analyticsSource, 'places');
  assert.equal(rows.get(`artifacts/book-and-buy-v1/clientAccess/client@example.test/bookings/${booking.id}`).analyticsSessionId, data.analyticsSessionId);
});
