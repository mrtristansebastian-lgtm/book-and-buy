import test from 'node:test';
import assert from 'node:assert/strict';
import { REPORT_STATISTICS, getReportStatistic, buildReportDashboard, buildReportHistory } from '../src/features/analytics/utils/reportCatalog.js';
import { dedupeReportEvents, reportTimestampMs } from '../src/features/analytics/utils/trafficReports.js';

const day = 86400000;
const start = new Date(2026, 9, 1).getTime();
const at = start + 12 * 3600000;
const end = start + 3 * day - 1;
const session = (id, extra = {}) => ({ sessionId: id, startedAt: at, lastSeenAt: at,
  analyticsVersion: 2, visitorId: `visitor_${id}`, visitorFirstSeenAt: at, isReturningVisitor: false, ...extra });
const event = (id, type, extra = {}) => ({ id, type, at, sessionId: 'visit-a', analyticsVersion: 2,
  visitorId: 'visitor_visit-a', visitorFirstSeenAt: at, isReturningVisitor: false, ...extra });
const classified = (id, type, extra = {}) => event(id, type, { source: 'places', discoverySurface: 'buy', discoveryVersion: 1, ...extra });
const options = extra => ({ start, end, now: end, ...extra });
const value = (report, id) => report.stats[id].value;

test('report statistics have unique IDs and omit bounce rate and popular pages', () => {
  assert.equal(new Set(REPORT_STATISTICS.map(row => row.id)).size, REPORT_STATISTICS.length);
  assert.equal(REPORT_STATISTICS.some(row => /bounce|popular.pages/i.test(`${row.id} ${row.label}`)), false);
  assert.equal(REPORT_STATISTICS.some(row => /_clicks$/.test(row.id) || /offer clicks/i.test(row.label)), false);
  for (const id of ['product_views', 'service_views', 'buy_page_views', 'book_page_views']) {
    assert.match(REPORT_STATISTICS.find(row => row.id === id)?.label || '', /page views/i, `${id} names page views clearly`);
  }
  for (const id of ['product_discovery_views', 'service_discovery_views']) {
    assert.equal(REPORT_STATISTICS.find(row => row.id === id)?.label, 'Views from discovery');
  }
  assert.equal(REPORT_STATISTICS.find(row => row.id === 'places_reach')?.label, 'Reach');
  assert.equal(REPORT_STATISTICS.find(row => row.id === 'places_reach')?.distinct, true);
  for (const id of ['buy_reach', 'book_reach']) {
    assert.equal(REPORT_STATISTICS.find(row => row.id === id)?.label, 'Reach');
    assert.equal(REPORT_STATISTICS.find(row => row.id === id)?.distinct, true);
  }
  assert.equal(REPORT_STATISTICS.find(row => row.id === 'places_profile_views')?.label, 'Profile views from Places');
  assert.equal(REPORT_STATISTICS.some(row => ['places_impressions', 'places_opens', 'buy_impressions', 'book_impressions'].includes(row.id)), false);
});

test('classified Places, Find products and Find services activity stays separate from legacy discovery', () => {
  const report = buildReportDashboard(options({ events: [
    classified('places-imp', 'discovery_visit', { discoverySurface: 'places', discoveryAction: 'impression', discoveryTarget: 'business' }),
    classified('places-open', 'discovery_visit', { discoverySurface: 'places', discoveryAction: 'business_open' }),
    classified('places-profile-view', 'page_view', { discoverySurface: 'places', path: '/business/cafe/home' }),
    classified('buy-imp', 'discovery_visit', { discoveryAction: 'impression', discoveryTarget: 'product' }),
    classified('buy-business-imp', 'discovery_visit', { discoveryAction: 'impression', discoveryTarget: 'business' }),
    classified('buy-click', 'product_view', { interaction: 'click', discoveryAction: 'offer_click', itemKind: 'product', productId: 'p1' }),
    classified('later-store-click', 'product_view', { interaction: 'click', itemKind: 'product', productId: 'p2' }),
    classified('buy-page', 'product_view', { interaction: 'view', itemKind: 'product', productId: 'p1' }),
    classified('places-product-page', 'product_view', { discoverySurface: 'places', interaction: 'view', itemKind: 'product', productId: 'p2' }),
    classified('book-imp', 'discovery_visit', { discoverySurface: 'book', discoveryAction: 'impression', discoveryTarget: 'service' }),
    classified('book-click', 'product_view', { discoverySurface: 'book', interaction: 'click', discoveryAction: 'offer_click', itemKind: 'service', serviceId: 's1' }),
    classified('book-page', 'product_view', { discoverySurface: 'book', interaction: 'view', itemKind: 'service', serviceId: 's1' }),
    event('legacy-open', 'discovery_visit', { source: 'places' })
  ] }));
  assert.equal(value(report, 'places_reach'), 1);
  assert.equal(value(report, 'places_profile_views'), 1);
  assert.equal(value(report, 'buy_reach'), 1);
  assert.equal(value(report, 'buy_page_views'), 1);
  assert.equal(value(report, 'book_reach'), 1);
  assert.equal(value(report, 'book_page_views'), 1);
  assert.equal(value(report, 'product_discovery_views'), 2, 'product page views include both Find and Places attribution without counting clicks');
  assert.equal(value(report, 'service_discovery_views'), 1);
  assert.equal(report.unclassifiedDiscovery, 1);
});

test('Places reach counts distinct visitors once across visits and sessions within the period', () => {
  const first = classified('listing-a', 'discovery_visit', { discoverySurface: 'places', discoveryAction: 'impression', discoveryTarget: 'business', visitorId: 'person-a' });
  const report = buildReportDashboard(options({ events: [first, first,
    classified('listing-a-again', 'discovery_visit', { discoverySurface: 'places', discoveryAction: 'impression', discoveryTarget: 'business', visitorId: 'person-a', sessionId: 'another-visit', at: at + day }),
    classified('listing-b', 'discovery_visit', { discoverySurface: 'places', discoveryAction: 'impression', discoveryTarget: 'business', visitorId: 'person-b' }),
    classified('unrelated-find-listing', 'discovery_visit', { discoveryAction: 'impression', discoveryTarget: 'product', visitorId: 'person-c' })
  ] }));
  assert.equal(value(report, 'places_reach'), 2);
  assert.deepEqual(buildReportHistory({ report, metricId: 'places_reach' }).series.map(row => row.raw), [2, 1, 0]);
  assert.equal(value(report, 'places_reach'), 2, 'The same visitor may appear in daily totals without inflating period reach');
});

for (const [surface, kind] of [['buy', 'product'], ['book', 'service']]) {
  test(`Find ${surface} reach counts each visitor once across different listings and sessions`, () => {
    const impression = (id, extra = {}) => classified(id, 'discovery_visit', {
      discoverySurface: surface, discoveryAction: 'impression', discoveryTarget: kind,
      itemKind: kind, itemId: id, ...extra
    });
    const first = impression('listing-a', { visitorId: 'person-a' });
    const report = buildReportDashboard(options({ events: [first, first,
      impression('listing-b', { visitorId: 'person-a' }),
      impression('listing-a-again', { visitorId: 'person-a', sessionId: 'another-visit', at: at + day }),
      impression('listing-c', { visitorId: 'person-b' }),
      impression('other-kind', { visitorId: 'person-c', discoveryTarget: kind === 'product' ? 'service' : 'product' }),
      impression('business-listing', { visitorId: undefined, discoveryTarget: 'business' }),
      impression('outside-period', { visitorId: 'person-d', at: start - 1 })
    ] }));
    const metricId = `${surface}_reach`;
    assert.equal(value(report, metricId), 2);
    assert.equal(report.stats[metricId].available, true);
    const history = buildReportHistory({ report, metricId });
    assert.deepEqual(history.series.map(row => row.raw), [2, 1, 0]);
    assert.equal(history.series.reduce((total, row) => total + row.raw, 0), 3,
      'daily unique visitors can repeat while the full period deduplicates them');
    assert.equal(value(report, metricId), 2);
    assert.equal(getReportStatistic(`${surface}_impressions`).id, metricId,
      'previous detail links resolve to the new reach statistic');
    assert.deepEqual(buildReportHistory({ report, metricId: `${surface}_impressions` }).series, history.series);
  });

  test(`Find ${surface} reach needs identity on every relevant listing but supports measured zero`, () => {
    const impression = (id, extra = {}) => classified(id, 'discovery_visit', {
      discoverySurface: surface, discoveryAction: 'impression', discoveryTarget: kind, ...extra
    });
    const metricId = `${surface}_reach`;
    for (const visitorId of [undefined, '', '   ', 123]) {
      const report = buildReportDashboard(options({ events: [
        impression('known-listing', { visitorId: 'person-a' }),
        impression('unknown-listing', { visitorId })
      ] }));
      assert.equal(value(report, metricId), null);
      assert.equal(report.stats[metricId].available, false);
      assert.deepEqual(buildReportHistory({ report, metricId }).series, []);
    }
    const measured = buildReportDashboard(options({ tracking: { discoverySurfaces: [surface] } }));
    assert.equal(value(measured, metricId), 0);
    assert.deepEqual(buildReportHistory({ report: measured, metricId }).series.map(row => row.raw), [0, 0, 0]);
    assert.equal(value(buildReportDashboard(options({})), metricId), null);
  });
}

test('missing Find services reach identity does not hide a complete Find products reach measurement', () => {
  const report = buildReportDashboard(options({ events: [
    classified('product-listing', 'discovery_visit', { discoveryAction: 'impression', discoveryTarget: 'product', visitorId: 'person-a' }),
    classified('service-listing', 'discovery_visit', { discoverySurface: 'book', discoveryAction: 'impression', discoveryTarget: 'service', visitorId: undefined })
  ] }));
  assert.equal(value(report, 'buy_reach'), 1);
  assert.equal(value(report, 'book_reach'), null);
});

test('Places profile views require actual home page views rather than opening clicks or other pages', () => {
  const click = classified('listing-click', 'discovery_visit', { discoverySurface: 'places', discoveryAction: 'business_open' });
  assert.equal(value(buildReportDashboard(options({ events: [click] })), 'places_profile_views'), 0);
  const view = classified('home-view', 'page_view', { discoverySurface: 'places', path: '/business/cafe/home' });
  const report = buildReportDashboard(options({ events: [click, view, view,
    classified('product-page', 'page_view', { discoverySurface: 'places', path: '/business/cafe/buy' }),
    classified('contact-page', 'page_view', { discoverySurface: 'places', path: '/business/cafe/contact' }),
    classified('find-home-page', 'page_view', { discoverySurface: 'buy', path: '/business/cafe/home' }),
    event('unclassified-home-page', 'page_view', { source: 'places', path: '/business/cafe/home' })
  ] }));
  assert.equal(value(report, 'places_profile_views'), 1);
  assert.deepEqual(buildReportHistory({ report, metricId: 'places_profile_views' }).series.map(row => row.raw), [1, 0, 0]);
  const explicitHome = buildReportDashboard(options({ events: [classified('explicit-home', 'page_view', { discoverySurface: 'places', page: 'home' })] }));
  assert.equal(value(explicitHome, 'places_profile_views'), 1, 'Explicit home-page metadata supports views without a recorded path');
});

test('Places reach stays unavailable when impressions lack visitor identity, while instrumented zeros remain measured', () => {
  const report = buildReportDashboard(options({ events: [
    classified('known-listing', 'discovery_visit', { discoverySurface: 'places', discoveryAction: 'impression', discoveryTarget: 'business' }),
    classified('unknown-listing', 'discovery_visit', { discoverySurface: 'places', discoveryAction: 'impression', discoveryTarget: 'business', visitorId: undefined })
  ] }));
  assert.equal(value(report, 'places_reach'), null);
  assert.equal(report.stats.places_reach.available, false);
  assert.deepEqual(buildReportHistory({ report, metricId: 'places_reach' }).series, []);
  const measured = buildReportDashboard(options({ tracking: { discoverySurfaces: ['places'] } }));
  assert.equal(value(measured, 'places_reach'), 0);
  assert.equal(value(measured, 'places_profile_views'), 0);
  assert.deepEqual(buildReportHistory({ report: measured, metricId: 'places_reach' }).series.map(row => row.raw), [0, 0, 0]);
  const missing = buildReportDashboard(options({}));
  assert.equal(value(missing, 'places_reach'), null);
});

test('legacy generic discovery outcomes remain usable without fabricating a Places or Find split', () => {
  const report = buildReportDashboard(options({ sessions: [session('visit-a', { source: 'places' })],
    events: [event('legacy-open', 'discovery_visit', { source: 'places' })],
    orders: [{ id: 'order-a', timestamp: at, analyticsSource: 'places', analyticsSessionId: 'visit-a' }],
    bookings: [{ id: 'booking-a', timestamp: at, analyticsSource: 'places', analyticsSessionId: 'visit-a' }] }));
  assert.equal(value(report, 'discovery_orders'), 1);
  assert.equal(value(report, 'discovery_bookings'), 1);
  assert.equal(value(report, 'places_orders'), null);
  assert.equal(value(report, 'buy_orders'), null);
  assert.equal(value(report, 'book_bookings'), null);
});

test('discovery impressions do not create website visitors, sessions, page views or discovery visits', () => {
  const report = buildReportDashboard(options({ events: [classified('imp', 'discovery_visit', {
    source: 'direct', discoveryAction: 'impression', discoveryTarget: 'product'
  })], tracking: { visitorIdentity: true, pageViews: true } }));
  assert.equal(value(report, 'visitors'), 0);
  assert.equal(value(report, 'sessions'), 0);
  assert.equal(value(report, 'page_views'), 0);
  assert.equal(report.discovery.metrics.profileVisits, null);
  assert.equal(value(report, 'buy_reach'), 1);
});

test('discovery outcomes count actual records; forged event claims cannot override an authoritative direct source', () => {
  const report = buildReportDashboard(options({ events: [
    classified('open', 'discovery_visit', { discoveryAction: 'business_open' }),
    classified('created', 'purchase', { orderId: 'real-order' }),
    classified('forged', 'purchase', { orderId: 'direct-order' }),
    classified('nonexistent', 'purchase', { orderId: 'missing-order' }),
    classified('booked', 'booking_confirmed', { bookingIds: ['real-booking'] })
  ], orders: [
    { id: 'real-order', timestamp: at, source: 'public_shop', analyticsSessionId: 'visit-a' },
    { id: 'real-order', timestamp: at, source: 'public_shop', analyticsSessionId: 'visit-a' },
    { id: 'direct-order', timestamp: at, analyticsSource: 'direct', discoverySurface: 'buy' }
  ], bookings: [{ id: 'real-booking', timestamp: at, analyticsSource: 'places', analyticsSessionId: 'visit-a' }] }));
  assert.equal(value(report, 'discovery_orders'), 1);
  assert.equal(value(report, 'buy_orders'), 1);
  assert.equal(value(report, 'discovery_bookings'), 1);
  assert.equal(value(report, 'book_bookings'), 0, 'Find Buy can also lead to bookings without relabeling the source');
});

test('long history ranges include the recent end of the selected period', () => {
  const earlier = new Date(1990, 0, 1).getTime();
  const report = buildReportDashboard({ start: earlier, end, now: end, events: [event('recent', 'page_view')], tracking: { pageViews: true } });
  const history = buildReportHistory({ report, metricId: 'page_views', periodId: 'custom' });
  assert.equal(history.unit, 'year');
  assert.equal(history.series.at(-1).raw, 1);
  assert.equal(history.series.reduce((total, row) => total + row.raw, 0), 1);
});

test('one visit can create two distinct message conversations; retry IDs cannot double-count them', () => {
  const first = classified('message_lead_thread-a', 'message_lead');
  const second = classified('message_lead_thread-b', 'message_lead');
  const report = buildReportDashboard(options({ sessions: [session('visit-a', { source: 'places' })],
    events: [first, first, second] }));
  assert.equal(value(report, 'discovery_messages'), 2);
  assert.equal(value(report, 'places_messages'), 0);
});

test('additive histories partition event and record totals once across dates and include measured zero days', () => {
  const first = classified('add-a', 'add_to_cart', { commerceVersion: 1, itemKind: 'product', productId: 'p1' });
  const second = classified('add-b', 'add_to_cart', { at: at + day, commerceVersion: 1, itemKind: 'product', productId: 'p1' });
  const firstView = classified('view-a', 'product_view', { commerceVersion: 1, interaction: 'view', itemKind: 'product', productId: 'p1' });
  const secondView = classified('view-b', 'product_view', { at: at + day, commerceVersion: 1, interaction: 'view', itemKind: 'product', productId: 'p1' });
  const report = buildReportDashboard(options({ products: [{ id: 'p1', name: 'Product' }],
    events: [first, first, second, firstView, firstView, secondView], orders: [
      { id: 'order-a', timestamp: at, analyticsSource: 'places', discoverySurface: 'buy' },
      { id: 'order-b', timestamp: at + day, analyticsSource: 'places', discoverySurface: 'buy' }
    ] }));
  for (const metricId of ['product_adds', 'buy_adds', 'buy_orders', 'discovery_orders', 'product_discovery_views', 'buy_page_views']) {
    const history = buildReportHistory({ report, metricId });
    assert.deepEqual(history.series.map(row => row.raw), [1, 1, 0], metricId);
    assert.equal(history.series.reduce((total, row) => total + row.raw, 0), value(report, metricId));
  }
});

test('daily distinct visitors may repeat, while returning visitor history keeps the selected-period cohort', () => {
  const events = [
    event('new-day-one', 'page_view', { visitorId: 'new-visitor', visitorFirstSeenAt: at }),
    event('new-day-two', 'page_view', { at: at + day, visitorId: 'new-visitor', visitorFirstSeenAt: at, isReturningVisitor: true }),
    event('return-day-one', 'page_view', { visitorId: 'old-visitor', visitorFirstSeenAt: start - day, isReturningVisitor: true }),
    event('return-day-two', 'page_view', { at: at + day, visitorId: 'old-visitor', visitorFirstSeenAt: start - day, isReturningVisitor: true })
  ];
  const report = buildReportDashboard(options({ events }));
  assert.equal(value(report, 'visitors'), 2);
  assert.equal(value(report, 'returning_visitors'), 1);
  assert.deepEqual(buildReportHistory({ report, metricId: 'visitors' }).series.map(row => row.raw), [2, 2, 0]);
  assert.deepEqual(buildReportHistory({ report, metricId: 'returning_visitors' }).series.map(row => row.raw), [1, 1, 0]);
});

test('all-time returning visitor history keeps its overall cohort instead of reclassifying new visitors every day', () => {
  const events = [
    event('new-day-one', 'page_view', { visitorId: 'new-visitor', visitorFirstSeenAt: at }),
    event('new-day-two', 'page_view', { at: at + day, visitorId: 'new-visitor', visitorFirstSeenAt: at, isReturningVisitor: true }),
    event('old-day-one', 'page_view', { visitorId: 'old-visitor', visitorFirstSeenAt: start - day, isReturningVisitor: true }),
    event('old-day-two', 'page_view', { at: at + day, visitorId: 'old-visitor', visitorFirstSeenAt: start - day, isReturningVisitor: true })
  ];
  const report = buildReportDashboard({ events, now: end });
  assert.equal(value(report, 'returning_visitors'), 1);
  assert.deepEqual(buildReportHistory({ report, metricId: 'returning_visitors', periodId: 'all' }).series.map(row => row.raw), [1, 1, 0]);
});

test('cart snapshot history counts only each cart latest state and groups it by latest activity', () => {
  const report = buildReportDashboard(options({ cartTracking: true, carts: [
    { cartId: 'cart-a', sessionId: 'visit-a', updatedAt: at, status: 'abandoned', items: [] },
    { cartId: 'cart-a', sessionId: 'visit-a', updatedAt: at + day, status: 'converted', items: [{ quantity: 1 }] },
    { cartId: 'cart-b', sessionId: 'visit-b', updatedAt: at, status: 'active', items: [{ quantity: 1 }] },
    { cartId: 'cart-c', sessionId: 'visit-c', updatedAt: at, status: 'abandoned', items: [] }
  ] }));
  assert.equal(value(report, 'active_carts'), 3, 'emptied abandoned carts are included in overall activity');
  assert.equal(value(report, 'abandoned_carts'), 2);
  assert.deepEqual(buildReportHistory({ report, metricId: 'active_carts' }).series.map(row => row.raw), [2, 1, 0]);
  assert.deepEqual(buildReportHistory({ report, metricId: 'abandoned_carts' }).series.map(row => row.raw), [2, 0, 0]);
});

const measuredTracking = { visitorIdentity: true, pageViews: true, offerViews: true, discoveryViews: true,
  cartAdds: true, itemAdds: true, checkout: true, places: true, messageLeads: true,
  attribution: true, discoverySurfaces: ['places', 'book', 'buy'] };

function completeReportFixture() {
  const sessions = []; const events = []; const orders = []; const bookings = []; const carts = [];
  const earlier = new Date(2022, 9, 1, 12).getTime();
  for (let index = 0; index < 12; index += 1) {
    const when = index === 0 ? earlier : at + (index % 10) * day;
    const id = `session-${index}`;
    const surface = ['places', 'buy', 'book'][index % 3];
    const identity = { sessionId: id, visitorId: `person-${index % 5}`, visitorFirstSeenAt: earlier,
      startedAt: when, lastSeenAt: when, isReturningVisitor: true, analyticsVersion: 2, source: 'places' };
    sessions.push(identity);
    const observation = { ...identity, at: when, discoverySurface: surface, discoveryVersion: 1, commerceVersion: 1 };
    const add = (suffix, type, extra = {}) => events.push({ ...observation, id: `${id}-${suffix}`, type, ...extra });
    add('home', 'page_view', { page: 'home' });
    add('product', 'product_view', { itemKind: 'product', productId: 'p1', interaction: 'view' });
    add('service', 'product_view', { itemKind: 'service', serviceId: 's1', interaction: 'view' });
    add('cart-product', 'add_to_cart', { itemKind: 'product', productId: 'p1' });
    add('cart-service', 'add_to_cart', { itemKind: 'service', serviceId: 's1' });
    add('checkout', 'begin_checkout');
    add('ordered', 'purchase', { orderId: `order-${index}` });
    add('booked', 'booking_confirmed', { bookingIds: [`booking-${index}`] });
    add('message', 'message_lead', { threadId: `thread-${index}` });
    add('shown', 'discovery_visit', { discoveryAction: 'impression',
      discoveryTarget: surface === 'places' ? 'business' : surface === 'buy' ? 'product' : 'service' });
    orders.push({ id: `order-${index}`, timestamp: when, analyticsSource: 'places', analyticsSessionId: id });
    bookings.push({ id: `booking-${index}`, timestamp: when, analyticsSource: 'places', analyticsSessionId: id });
    carts.push({ cartId: `cart-${index}`, sessionId: id, updatedAt: when,
      status: index % 3 === 0 ? 'converted' : index % 3 === 1 ? 'active' : 'abandoned', items: [{ quantity: 1 }] });
  }
  events.push(events[10]);
  sessions.push(session('bot-session', { isBot: true }));
  events.push(classified('bot-view', 'product_view', { sessionId: 'bot-session', itemKind: 'product', productId: 'p1' }));
  return { sessions, events, orders, bookings, carts, cartTracking: true, tracking: measuredTracking,
    products: [{ id: 'p1', name: 'Product' }], services: [{ id: 's1', name: 'Service' }],
    start, end: start + 31 * day - 1, now: start + 31 * day - 1, earlier };
}

for (const periodId of ['month', 'all']) {
  test(`optimized ${periodId} histories match full dashboard buckets for every statistic`, () => {
    const fixture = completeReportFixture();
    const selected = periodId === 'all' ? { ...fixture, start: null, end: null } : fixture;
    const from = selected.start ?? fixture.earlier;
    const report = buildReportDashboard(selected);
    for (const metric of REPORT_STATISTICS) {
      assert.equal(report.stats[metric.id].available, true, `${metric.id} is measured in the fixture`);
      const history = buildReportHistory({ report, metricId: metric.id, periodId });
      assert.ok(history.series.length > 0, metric.id);
      for (const row of history.series) {
        const fullBucket = buildReportDashboard({ ...selected, start: Math.max(row.at, from), end: row.end,
          visitorCohortStart: from });
        assert.equal(row.raw, fullBucket.stats[metric.id].value ?? 0,
          `${metric.id} disagrees with full calculation at ${new Date(row.at).toISOString()}`);
      }
    }
  });
}

test('indexed outcome attribution preserves scan ordering, undated observations and authoritative sources', () => {
  const events = [
    classified('first-tie', 'purchase', { orderId: 'linked-tie', discoverySurface: 'places' }),
    classified('second-tie', 'purchase', { orderId: 'linked-tie', discoverySurface: 'book' }),
    classified('undated-link', 'purchase', { orderId: 'linked-undated', at: undefined, discoverySurface: 'book' }),
    classified('dated-link', 'purchase', { orderId: 'linked-undated', discoverySurface: 'buy' }),
    classified('fallback-before', 'discovery_visit', { sessionId: 'fallback', at: at - 1, discoverySurface: 'places' }),
    classified('fallback-first', 'discovery_visit', { sessionId: 'fallback', discoverySurface: 'buy' }),
    classified('fallback-second', 'discovery_visit', { sessionId: 'fallback', discoverySurface: 'book' }),
    classified('fallback-future', 'discovery_visit', { sessionId: 'fallback', at: at + 1, discoverySurface: 'book' }),
    classified('undated-entry', 'discovery_visit', { sessionId: 'undated', at: undefined, discoverySurface: 'places' }),
    classified('booking-link', 'booking_confirmed', { bookingIds: ['booking-linked'], discoverySurface: 'book' }),
    classified('bot-link', 'purchase', { orderId: 'bot-claim', sessionId: 'bot', discoverySurface: 'buy' }),
    classified('impression-entry', 'discovery_visit', { sessionId: 'impression-only', discoveryAction: 'impression', discoverySurface: 'buy' })
  ];
  const orders = [
    { id: 'linked-tie', timestamp: at }, { id: 'linked-undated', timestamp: at },
    { id: 'fallback-record', timestamp: at, analyticsSessionId: 'fallback' },
    { id: 'undated-entry-record', timestamp: at, analyticsSessionId: 'undated' },
    { id: 'direct-record', timestamp: at, analyticsSource: 'direct', discoverySurface: 'buy', analyticsSessionId: 'fallback' },
    { id: 'explicit-record', timestamp: at, analyticsSource: 'places', discoverySurface: 'book' },
    { id: 'bot-claim', timestamp: at },
    { id: 'unseen-record', timestamp: at, analyticsSessionId: 'impression-only' },
    { id: 'unknown-date', analyticsSessionId: 'fallback' }
  ];
  const bookings = [{ id: 'booking-linked', timestamp: at },
    { id: 'booking-fallback', timestamp: at, attribution: { source: 'places', sessionId: 'fallback' } }];
  // Independent scan baseline: this is the outcome lookup used before indexing.
  const classifiedEvents = dedupeReportEvents(events).filter(row => row.sessionId !== 'bot');
  const eventAt = row => reportTimestampMs(row.at ?? row.startedAt ?? row.timestamp ?? row.createdAt ?? row.updatedAt);
  const surfaceByScan = (record, kind) => {
    const authoritative = record.analyticsSource || record.attribution?.source;
    if (authoritative && authoritative !== 'places') return null;
    const explicit = record.discoverySurface || record.attribution?.discoverySurface;
    if (['places', 'buy', 'book'].includes(explicit)) return explicit;
    const field = kind === 'orders' ? 'orderId' : 'bookingId';
    const links = classifiedEvents.filter(row => row[field] === record.id ||
      (kind === 'bookings' && row.bookingIds?.includes(record.id)));
    if (links.length) return links.sort((a, b) => eventAt(b) - eventAt(a))[0].discoverySurface;
    const recordAt = reportTimestampMs(record.timestamp ?? record.createdAt ?? record.at);
    return classifiedEvents.filter(row => row.sessionId === (record.analyticsSessionId || record.attribution?.sessionId) &&
      row.discoveryAction !== 'impression' && eventAt(row) <= recordAt)
      .sort((a, b) => eventAt(b) - eventAt(a))[0]?.discoverySurface || null;
  };
  const report = buildReportDashboard(options({ events, orders, bookings,
    sessions: [session('bot', { isBot: true })], tracking: measuredTracking }));
  for (const [kind, records] of [['orders', orders], ['bookings', bookings]]) {
    for (const surface of ['places', 'buy', 'book']) {
      const expected = new Set(records.filter(row => {
        const createdAt = reportTimestampMs(row.timestamp);
        return createdAt !== null && createdAt >= start && createdAt <= end && surfaceByScan(row, kind) === surface;
      }).map(row => row.id)).size;
      if (report.stats[`${surface}_${kind}`]) assert.equal(value(report, `${surface}_${kind}`), expected, `${surface} ${kind}`);
    }
  }
  assert.equal(value(report, 'places_orders'), 2);
  assert.equal(value(report, 'buy_orders'), 2);
  assert.equal(value(report, 'book_bookings'), 1);
});

test('history calls rebuild observations rather than retaining stale event, record or cart indexes', () => {
  const observations = options({ tracking: measuredTracking, cartTracking: true,
    events: [classified('first-order', 'purchase', { orderId: 'order', discoverySurface: 'buy' })],
    orders: [{ id: 'order', timestamp: at }], carts: [] });
  const report = buildReportDashboard(observations);
  const history = metricId => buildReportHistory({ report, metricId }).series.map(row => row.raw);
  assert.deepEqual(history('buy_orders'), [1, 0, 0]);
  observations.events.push(classified('updated-order', 'purchase', { orderId: 'order', at: at + 1, discoverySurface: 'places' }));
  observations.carts.push({ cartId: 'new-cart', updatedAt: at, status: 'active', items: [] });
  assert.deepEqual(history('buy_orders'), [0, 0, 0]);
  assert.deepEqual(history('places_orders'), [1, 0, 0]);
  assert.deepEqual(history('active_carts'), [1, 0, 0]);
  observations.orders[0].analyticsSource = 'direct';
  assert.deepEqual(history('places_orders'), [0, 0, 0]);
  const freshReport = buildReportDashboard(observations);
  assert.equal(value(freshReport, 'places_orders'), 0, 'a new overview never inherits a previous record lookup');
});

test('dashboard and optimized histories leave frozen input observations unchanged', () => {
  const fixture = completeReportFixture();
  const freeze = value => {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze);
    return Object.freeze(value);
  };
  const before = JSON.stringify(fixture);
  freeze(fixture);
  const report = buildReportDashboard(fixture);
  for (const metric of REPORT_STATISTICS) buildReportHistory({ report, metricId: metric.id, periodId: 'month' });
  assert.equal(JSON.stringify(fixture), before);
});
