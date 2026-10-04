import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildTrafficReport, buildPlacesReport, buildTrafficSeries,
  dedupeReportSessions, reportTimestampMs, REPORT_METRICS
} from '../src/features/analytics/utils/trafficReports.js';

const at = Date.parse('2026-10-04T10:00:00Z');
const day = 86400000;
const session = (id, extra = {}) => ({ sessionId: id, startedAt: at, lastSeenAt: at + 60000,
  analyticsVersion: 2, visitorId: `visitor-${id}`, visitorFirstSeenAt: at,
  isReturningVisitor: false, source: 'direct', ...extra });
const event = (id, type, extra = {}) => ({ id, type, at, analyticsVersion: 2, sessionId: 's1', ...extra });

test('legacy sessions remain sessions: unique, returning and engagement values are unavailable', () => {
  const report = buildTrafficReport({ sessions: [{ sessionId: 'old', startedAt: at, lastSeenAt: at + 90000 }] });
  assert.equal(report.metrics.sessions, 1);
  assert.equal(report.metrics.uniqueVisitors, null);
  assert.equal(report.metrics.returningVisitors, null);
  assert.equal(report.metrics.pageViews, null);
  assert.equal(report.metrics.averageDurationMs, null);
  assert.equal(report.metrics.bounceRate, null);
  assert.equal(report.coverage.legacySessions, 1);
});

test('one browser with multiple sessions is one visitor; bot sessions and their events are excluded', () => {
  const sessions = [session('s1', { visitorId: 'same' }), session('s2', { visitorId: 'same' }), session('bot', { isBot: true })];
  const report = buildTrafficReport({ sessions, events: [event('bot-view', 'page_view', { sessionId: 'bot' })] });
  assert.equal(report.metrics.sessions, 2);
  assert.equal(report.metrics.uniqueVisitors, 1);
  assert.equal(report.metrics.pageViews, 0);
});

test('mixed legacy identity data is not misreported as a complete unique visitor total', () => {
  const report = buildTrafficReport({ sessions: [session('new'), { sessionId: 'old', startedAt: at }] });
  assert.equal(report.metrics.sessions, 2);
  assert.equal(report.metrics.uniqueVisitors, null);
  assert.equal(report.coverage.knownUniqueVisitors, 1);
  assert.equal(report.coverage.unidentifiedSessions, 1);
});

test('visitor activity inside the period is counted when its session began before the period', () => {
  const options = { start: at, end: at + day, sessions: [session('older', { startedAt: at - 60000 })],
    events: [event('current-view', 'page_view', { sessionId: 'older', visitorId: 'visitor-older', visitorFirstSeenAt: at - 60000, isReturningVisitor: true, path: '/home' })] };
  const report = buildTrafficReport(options);
  assert.equal(report.metrics.sessions, 0);
  assert.equal(report.metrics.uniqueVisitors, 1);
  assert.equal(report.metrics.returningVisitors, 1);
  assert.deepEqual(buildTrafficSeries({ ...options, metricId: 'visitors' }).map(row => row.raw), [1, 0]);
});

test('session snapshot retries merge by id, preserving earliest start and latest measurements', () => {
  const rows = dedupeReportSessions([session('s1', { startedAt: at - 20000, lastSeenAt: at }), session('s1', { engagedTimeMs: 20000 })]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].startedAt, at - 20000);
  assert.equal(rows[0].engagedTimeMs, 20000);
});

test('page views count recorded events only, not session paths, and document retries do not inflate them', () => {
  const report = buildTrafficReport({ sessions: [session('s1', { path: '/home' })], events: [
    event('a', 'page_view', { path: '/home?secret=x' }), event('a', 'page_view', { path: '/home?secret=x' }),
    event('b', 'page_view', { path: '/home?other=y' }), event('c', 'purchase', { valueCents: 100000 })
  ] });
  assert.equal(report.metrics.pageViews, 2);
  assert.deepEqual(report.popularPages, [{ label: '/home', count: 2, pct: 100 }]);
});

test('new/returning classification uses visitor first seen date within the report period', () => {
  const report = buildTrafficReport({ start: at - day, end: at + day, sessions: [
    session('s1', { visitorFirstSeenAt: at - 10 * day, isReturningVisitor: true }),
    session('s2'), session('s3', { visitorId: 'visitor-s2', isReturningVisitor: true })
  ] });
  assert.equal(report.metrics.newVisitors, 1);
  assert.equal(report.metrics.returningVisitors, 1);
});

test('engagement uses explicit active time; bounce uses only measured completed sessions', () => {
  const report = buildTrafficReport({ sessions: [
    session('s1', { engagedTimeMs: 0, endedAt: at + 1000 }),
    session('s2', { engagedTimeMs: 20000, endedAt: at + 20000 }),
    session('s3', { engagedTimeMs: 10000 })
  ] });
  assert.equal(report.metrics.engagementRate, 66.7);
  assert.equal(report.metrics.bounceRate, 50);
  assert.equal(report.metrics.averageDurationMs, 10000);
  const legacyEnded = buildTrafficReport({ sessions: [session('s1', { engagedTimeMs: 0, endedAt: at }), { sessionId: 'old', startedAt: at, endedAt: at + 1000 }] });
  assert.equal(legacyEnded.metrics.bounceRate, null);
});

test('missing location/referrer/device metadata stays Unknown, not fabricated Direct traffic', () => {
  const report = buildTrafficReport({ sessions: [session('s1'), session('s2', { referrer: '', device: 'mobile', country: 'ZA' }),
    session('s3', { referrer: 'https://www.google.com/search?q=private', source: 'direct' }), session('s4', { source: 'places' })] });
  assert.equal(report.referrers.find(row => row.label === 'Unknown').count, 1);
  assert.equal(report.referrers.find(row => row.label === 'Direct').count, 1);
  assert.equal(report.referrers.find(row => row.label === 'google.com').count, 1);
  assert.equal(report.referrers.find(row => row.label === 'Book & Buy Places').count, 1);
  assert.equal(report.devices.find(row => row.label === 'Unknown').count, 3);
});

test('Places visits and successful message leads deduplicate sessions and thread ids', () => {
  const report = buildPlacesReport({ sessions: [session('s1', { source: 'places' })], events: [
    event('v1', 'discovery_visit'), event('v2', 'discovery_visit'),
    event('lead1', 'message_lead', { threadId: 'thread-a' }), event('lead2', 'message_lead', { threadId: 'thread-a' }),
    event('start', 'thread_created')
  ] });
  assert.equal(report.metrics.profileVisits, 1);
  assert.equal(report.metrics.messageLeads, 1);
  assert.equal(buildPlacesReport({ sessions: [{ sessionId: 'old', startedAt: at }], events: [] }).metrics.profileVisits, null);
});

test('Places outcomes require authoritative records; event money and non-existent ids never count', () => {
  const order = { id: 'order-a', timestamp: at, analyticsSource: 'places', analyticsSessionId: 's1', paymentStatus: 'paid', amountInCents: 10000 };
  const receipt = { source: 'order', sourceId: 'order-a', paymentStatus: 'paid', amountInCents: 10000, currency: 'R', paidAt: at };
  const report = buildPlacesReport({ sessions: [session('s1', { source: 'places' })],
    orders: [order, order], bookings: [{ id: 'booking-a', timestamp: at, analyticsSource: 'places', analyticsSessionId: 's1', paymentStatus: 'unpaid' }],
    events: [event('buy1', 'purchase', { orderId: 'order-a', valueCents: 10000 }), event('buy2', 'purchase', { orderId: 'fake', valueCents: 1000000 })],
    ledger: [receipt, receipt, { source: 'booking', sourceId: 'booking-a', paymentStatus: 'unpaid', amountInCents: 8000, currency: 'R', createdAt: at }] });
  assert.equal(report.metrics.orders, 1);
  assert.equal(report.metrics.bookings, 1);
  assert.equal(report.metrics.paidRevenueCents, 10000);
  assert.equal(report.metrics.conversionRate, 100);
});

test('paid revenue uses payment date independently of order creation date and never mixes currencies', () => {
  const orders = [{ id: 'r', timestamp: at - 10 * day, analyticsSource: 'places' }, { id: 'u', timestamp: at - 10 * day, analyticsSource: 'places' }];
  const ledger = [{ source: 'order', sourceId: 'r', paymentStatus: 'paid', paidAt: at, amountInCents: 1000, currency: 'R' },
    { source: 'order', sourceId: 'u', paymentStatus: 'paid', paidAt: at, amountInCents: 2000, currency: 'USD' }];
  const report = buildPlacesReport({ start: at - day, end: at + day, orders, ledger });
  assert.equal(report.metrics.orders, 0);
  assert.equal(report.metrics.paidRevenueCents, null);
  assert.equal(report.coverage.mixedCurrencies, true);
  assert.equal(report.revenueByCurrency.length, 2);
});

test('unknown record dates and unknown paid amounts remain unavailable instead of becoming zeros', () => {
  const report = buildPlacesReport({ start: at - day, end: at + day, orders: [{ id: 'old', analyticsSource: 'places' }],
    ledger: [{ source: 'order', sourceId: 'old', paymentStatus: 'paid', paidAt: at, currency: 'R' }] });
  assert.equal(report.metrics.orders, null);
  assert.equal(report.metrics.paidRevenueCents, null);
  assert.equal(report.coverage.unknownAmounts, 1);
});

test('server-verified non-Places attribution overrides a conflicting browser event claim', () => {
  const report = buildPlacesReport({ sessions: [session('s1', { source: 'places' })],
    orders: [{ id: 'direct-order', timestamp: at, analyticsSource: 'direct', analyticsSessionId: 's1' }],
    events: [event('claimed', 'purchase', { orderId: 'direct-order', source: 'places' })],
    ledger: [{ source: 'order', sourceId: 'direct-order', paymentStatus: 'paid', paidAt: at, amountInCents: 10000, currency: 'R' }] });
  assert.equal(report.metrics.orders, 0);
  assert.equal(report.metrics.paidRevenueCents, 0);
});

test('equivalent currency names share one paid revenue bucket without inventing exchange rates', () => {
  const report = buildPlacesReport({ orders: [{ id: 'a', timestamp: at, analyticsSource: 'places' }, { id: 'b', timestamp: at, analyticsSource: 'places' }],
    ledger: [{ source: 'order', sourceId: 'a', paymentStatus: 'paid', paidAt: at, amountInCents: 1000, currency: 'R' },
      { source: 'order', sourceId: 'b', paymentStatus: 'paid', paidAt: at, amountInCents: 2000, currency: 'ZAR' }] });
  assert.equal(report.metrics.paidRevenueCents, 3000);
  assert.deepEqual(report.revenueByCurrency, [{ currency: 'ZAR', amountInCents: 3000 }]);
});

test('daily visitor series is identity-deduplicated and count-only, with truthful missing-data handling', () => {
  const sessions = [session('s1', { visitorId: 'same' }), session('s2', { visitorId: 'same' }), session('s3', { startedAt: at + day, visitorId: 'same', isReturningVisitor: true })];
  const series = buildTrafficSeries({ metricId: 'visitors', sessions, events: [event('money', 'purchase', { valueCents: 999999 })] });
  assert.deepEqual(series.map(row => row.raw), [1, 1]);
  assert.deepEqual(series.map(row => row.amountInCents), [100, 100]);
  assert.deepEqual(buildTrafficSeries({ metricId: 'visitors', sessions: [{ sessionId: 'legacy', startedAt: at }] }), []);
  assert.ok(REPORT_METRICS.every(metric => metric.format === 'count'));
});

test('new and returning daily visitor series follow first-seen day, including business timezone boundaries', () => {
  const sessions = [session('a', { visitorId: 'same' }), session('b', { startedAt: at + day, visitorId: 'same', isReturningVisitor: true })];
  assert.deepEqual(buildTrafficSeries({ metricId: 'new_visitors', sessions }).map(row => row.raw), [1]);
  assert.deepEqual(buildTrafficSeries({ metricId: 'returning_visitors', sessions }).map(row => row.raw), [1]);
  const late = Date.parse('2026-10-04T23:30:00Z');
  const series = buildTrafficSeries({ metricId: 'sessions', sessions: [session('late', { startedAt: late })], timeZone: 'Africa/Johannesburg' });
  assert.equal(new Date(series[0].at).toISOString().slice(0, 10), '2026-10-05');
});

test('date boundaries, Firestore timestamps and explicit empty tracking preserve actual zeros', () => {
  assert.equal(reportTimestampMs({ seconds: 10, nanoseconds: 500000000 }), 10500);
  const report = buildTrafficReport({ start: at, end: at, sessions: [session('a'), session('b', { startedAt: at - 1 })], complete: false });
  assert.equal(report.metrics.sessions, 1);
  assert.equal(report.coverage.complete, false);
  const series = buildTrafficSeries({ metricId: 'page_views', start: at, end: at + day, tracking: { pageViews: true } });
  assert.deepEqual(series.map(row => row.raw), [0, 0]);
});

test('v2 demo identities and discovery outcomes are deterministic fixtures, never event-based revenue', () => {
  const code = readFileSync(new URL('../src/features/analytics/utils/analyticsMetrics.js', import.meta.url), 'utf8');
  const fixtureSource = code.slice(code.indexOf('export function buildDemoAnalytics')).replace('export function', 'function');
  const buildDemo = new Function('DAY_MS', 'LIVE_WINDOW_MS', `${fixtureSource}; return buildDemoAnalytics;`)(day, 60000);
  const demo = buildDemo({ now: at });
  assert.deepEqual(demo, buildDemo({ now: at }));
  const traffic = buildTrafficReport(demo);
  const places = buildPlacesReport({ ...demo, ledger: [] });
  assert.equal(traffic.metrics.sessions, 48);
  assert.equal(traffic.metrics.uniqueVisitors, 24);
  assert.ok(places.metrics.profileVisits > 0);
  assert.ok(places.metrics.messageLeads > 0);
  assert.equal(places.metrics.paidRevenueCents, 0);
});
