import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as livePresence from '../src/shared/analytics/livePresence.js';
import * as anonymousIdentity from '../src/shared/analytics/anonymousIdentity.js';
import * as discovery from '../src/shared/analytics/discoveryAttribution.js';

function beaconFixture({ dnt = '0', now = Date.now() } = {}) {
  const writes = [];
  const storage = new Map();
  let sequence = 0;
  let currentTime = now;
  class FixtureDate extends Date { static now() { return currentTime; } }
  const dependencies = {
    'firebase/firestore': {
      doc: (...parts) => parts.length === 1 ? `${parts[0]}/auto_${++sequence}` : parts.slice(1).join('/'),
      collection: (...parts) => parts.slice(1).join('/'),
      serverTimestamp: () => ({ seconds: 1 }),
      setDoc: async (path, data) => { writes.push({ path, data }); }
    },
    '../../config/appConfig': { APP_ID: 'test-app' },
    '../firebase/client': { getFirebase: () => ({ db: {} }), isFirebaseConfigured: () => true },
    '../firebase/paths': {
      analyticsCartPath: (appId, id) => ['artifacts', appId, 'analyticsCarts', id],
      analyticsSessionPath: (appId, id) => ['artifacts', appId, 'analyticsSessions', id]
    },
    './livePresence': livePresence,
    './anonymousIdentity': anonymousIdentity,
    './discoveryAttribution': discovery
  };
  const context = {
    exports: {}, require: name => dependencies[name],
    navigator: { userAgent: 'Mozilla/5.0', doNotTrack: dnt },
    window: { location: { pathname: '/', hash: '#/test-shop/buy' } },
    document: { visibilityState: 'visible', referrer: '' },
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    crypto: { randomUUID: () => `anonymous_${++sequence}` },
    fetch: async () => ({ ok: false }),
    AbortController, setTimeout, clearTimeout, URL, Date: FixtureDate
  };
  const source = readFileSync(new URL('../src/shared/analytics/beacon.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(compiled, context);
  return { api: context.exports, writes, storage, advance: milliseconds => { currentTime += milliseconds; },
    events: () => writes.filter(row => row.path.includes('analyticsEvents')) };
}

test('discovery attribution expires with its anonymous visit and never falls back to a legacy Places label', () => {
  assert.deepEqual(discovery.discoveryEventMetadata({ sessionId: 'new', stored: { sessionId: 'old', surface: 'buy' } }), {});
  assert.deepEqual(discovery.discoveryEventMetadata({ sessionId: 'same', stored: { sessionId: 'same', source: 'places' } }), {});
  assert.deepEqual(discovery.discoveryEventMetadata({ sessionId: 'same', stored: { sessionId: 'same', surface: 'buy' } }), { discoveryVersion: 1, discoverySurface: 'buy' });
  assert.deepEqual(discovery.discoveryEventMetadata({ surface: 'book', sessionId: 'same', stored: { sessionId: 'same', surface: 'buy' } }), { discoveryVersion: 1, discoverySurface: 'book' });
});

test('Find offer clicks carry surface through views, additions and checkout without inventing business opens', async () => {
  const { api, events } = beaconFixture();
  const context = { ownerId: 'owner-a', slug: 'shop-a', source: 'places', discoverySurface: 'buy' };
  api.reportDiscoveryVisit(context, { surface: 'buy', target: 'offer' });
  api.reportOfferClick(context, { id: 'product-a', name: 'Product A', kind: 'product' });
  api.reportProductView({ ownerId: 'owner-a', slug: 'shop-a' }, { id: 'product-a', kind: 'product' });
  await api.trackAnalyticsEvent('add_to_cart', { ownerId: 'owner-a', slug: 'shop-a' });
  await api.trackAnalyticsEvent('begin_checkout', { ownerId: 'owner-a', slug: 'shop-a' });
  await api.trackAnalyticsEvent('purchase', { ownerId: 'owner-a', slug: 'shop-a' }, { orderId: 'order-a' });
  const rows = events().map(row => row.data);
  assert.equal(rows.length, 5);
  assert.equal(rows.some(row => row.discoveryAction === 'business_open'), false);
  assert.equal(rows[0].discoveryAction, 'offer_click');
  assert.equal(rows[0].productId, 'product-a');
  assert.equal(rows.every(row => row.discoverySurface === 'buy' && row.source === 'places'), true);
  api.reportOfferClick({ ownerId: 'owner-a', slug: 'shop-a' }, { id: 'product-b', kind: 'product' });
  assert.equal(events().at(-1).data.discoverySurface, 'buy');
  assert.equal(events().at(-1).data.discoveryAction, undefined, 'later storefront clicks are not Find clicks');
  await api.trackAnalyticsEvent('page_view', { ownerId: 'owner-a', slug: 'another-shop' });
  assert.equal(events().at(-1).data.discoverySurface, undefined);
});

test('Places and Find business links record explicit business opens on their actual surfaces', () => {
  const { api, events } = beaconFixture();
  for (const surface of ['places', 'book', 'buy']) {
    api.reportDiscoveryVisit({ ownerId: 'owner-a', slug: 'shop-a' }, { surface });
  }
  assert.deepEqual(events().map(row => row.data.discoverySurface), ['places', 'book', 'buy']);
  assert.equal(events().every(row => row.data.discoveryAction === 'business_open'), true);
  assert.equal(events()[1].data.path, '/app/discovery/book');
});

test('receipt acquisition is saved with presence and stays stable through navigation and other discovery clicks', async () => {
  const { api, writes, advance } = beaconFixture();
  const context = { ownerId: 'owner-a', slug: 'shop-a' };
  api.reportDiscoveryVisit(context, { surface: 'buy', target: 'offer' });
  await api.getAnalyticsAttribution(context);
  const presence = () => writes.filter(row => row.path.includes('analyticsSessions'));
  assert.equal(presence().at(-1).data.acquisitionSurface, 'buy');
  const sessionId = presence().at(-1).data.sessionId;
  api.reportDiscoveryVisit(context, { surface: 'book', target: 'offer' });
  await api.getAnalyticsAttribution(context);
  assert.equal(presence().at(-1).data.acquisitionSurface, 'buy');
  assert.equal(presence().at(-1).data.sessionId, sessionId);
  advance(31 * 60_000);
  await api.getAnalyticsAttribution(context);
  assert.equal(presence().at(-1).data.source, 'direct');
  assert.equal(presence().at(-1).data.acquisitionSurface, undefined);
});

test('visible listing impressions are unique, do not create presence, and do not claim a discovery visit', () => {
  const { api, events, writes } = beaconFixture();
  const context = { ownerId: 'owner-a', slug: 'shop-a' };
  const item = { id: 'product-a', name: 'Product A', kind: 'product' };
  api.reportDiscoveryImpression(context, 'buy', item);
  api.reportDiscoveryImpression(context, 'buy', item);
  api.reportDiscoveryImpression(context, 'places');
  assert.equal(events().length, 2);
  assert.equal(writes.some(row => row.path.includes('analyticsSessions')), false);
  assert.equal(events()[0].data.source, 'direct');
  assert.equal(events()[0].data.discoveryAction, 'impression');
  assert.equal(events()[0].data.discoveryTarget, 'product');
  assert.equal(events()[1].data.discoveryTarget, 'business');
});

test('impressions use isolated identities and cannot predate or prime the first actual business visit', async () => {
  const firstSeen = Date.parse('2026-10-01T10:00:00Z');
  const { api, events, storage, advance } = beaconFixture({ now: firstSeen });
  const context = { ownerId: 'owner-a', slug: 'shop-a' };
  api.reportDiscoveryImpression(context, 'places');
  const impression = events()[0].data;
  assert.equal(storage.has('bb_analytics_sid:owner-a:shop-a'), false);
  assert.equal(storage.has('bb_analytics_visitor:owner-a:shop-a'), false);
  assert.equal(storage.has('bb_analytics_discovery:owner-a:shop-a'), false);
  advance(86400000);
  await api.trackAnalyticsEvent('page_view', context);
  const actualVisit = events().at(-1).data;
  assert.notEqual(actualVisit.sessionId, impression.sessionId);
  assert.notEqual(actualVisit.visitorId, impression.visitorId);
  assert.equal(actualVisit.visitorFirstSeenAt, firstSeen + 86400000);
  assert.equal(actualVisit.isReturningVisitor, false);
  assert.equal(actualVisit.source, 'direct');
  assert.equal(actualVisit.discoverySurface, undefined);
  const storedVisit = storage.get('bb_analytics_sid:owner-a:shop-a');
  const storedVisitor = storage.get('bb_analytics_visitor:owner-a:shop-a');
  api.reportDiscoveryImpression(context, 'buy', { id: 'p1', kind: 'product' });
  assert.equal(storage.get('bb_analytics_sid:owner-a:shop-a'), storedVisit);
  assert.equal(storage.get('bb_analytics_visitor:owner-a:shop-a'), storedVisitor);
});

test('discovery tracking respects opt-out for impressions and entry actions', () => {
  const { api, writes } = beaconFixture({ dnt: '1' });
  const context = { ownerId: 'owner-a', slug: 'shop-a' };
  api.reportDiscoveryImpression(context, 'places');
  api.reportDiscoveryVisit(context);
  api.reportOfferClick(context, { id: 'product-a', kind: 'product' });
  assert.equal(writes.length, 0);
});

test('checkout cart cleanup preserves conversion while a subsequent addition starts new activity', async () => {
  const { api, writes } = beaconFixture();
  const context = { ownerId: 'owner-a', slug: 'shop-a' };
  const items = [{ productId: 'p1', kind: 'product', quantity: 1 }];
  await api.upsertAnalyticsCart(context, { status: 'converted', items });
  await api.upsertAnalyticsCart(context, { status: 'abandoned', items: [] });
  const cartWrites = () => writes.filter(row => row.path.includes('analyticsCarts'));
  assert.equal(cartWrites().length, 1);
  assert.equal(cartWrites()[0].data.status, 'converted');
  await api.upsertAnalyticsCart(context, { status: 'active', items });
  await api.upsertAnalyticsCart(context, { status: 'abandoned', items: [] });
  assert.equal(cartWrites().length, 3);
  assert.equal(cartWrites().at(-1).data.status, 'abandoned');
});
