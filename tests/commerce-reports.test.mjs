import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCommerceReport, CART_ABANDONMENT_MS } from '../src/features/analytics/utils/commerceReports.js';
import { cartAdditions } from '../src/shared/analytics/cartTracking.js';

const at = Date.parse('2026-10-04T10:00:00Z');
const products = [{ id: 'p1', name: 'Coffee beans' }];
const services = [{ id: 's1', name: 'Coffee tasting' }];
const event = (id, type, extra = {}) => ({ id, type, at, sessionId: 'visitor', source: 'direct', commerceVersion: 1, ...extra });
const product = { itemKind: 'product', productId: 'p1' };
const service = { itemKind: 'service', serviceId: 's1' };
const cart = (id, extra = {}) => ({ cartId: id, sessionId: 'visitor', updatedAt: at, status: 'active', items: [{ quantity: 1 }], ...extra });

test('product and service views, clicks and adds are distinct observed actions', () => {
  const report = buildCommerceReport({ products, services, events: [
    event('pv', 'product_view', { ...product, interaction: 'view' }),
    event('sv', 'product_view', { ...service, interaction: 'view' }),
    event('pc', 'product_view', { ...product, interaction: 'click' }),
    event('sc', 'product_view', { ...service, interaction: 'click' }),
    event('pa', 'add_to_cart', { ...product, addedQuantity: 4 }),
    event('sa', 'add_to_cart', { ...service, addedQuantity: 2 })
  ] });
  assert.deepEqual(report.metrics, { productViews: 1, serviceViews: 1, productDiscoveryViews: 0, serviceDiscoveryViews: 0, productClicks: 1, serviceClicks: 1,
    productAdds: 1, serviceAdds: 1, cartAdds: 2, abandonedCarts: null, checkoutStarts: 0, submittedCheckouts: 0 });
  assert.deepEqual(report.items, [
    { id: 'p1', name: 'Coffee beans', kind: 'product', views: 1, discoveryViews: 0, clicks: 1, adds: 1 },
    { id: 's1', name: 'Coffee tasting', kind: 'service', views: 1, discoveryViews: 0, clicks: 1, adds: 1 }
  ]);
});

test('a card click does not inflate detail page views', () => {
  const report = buildCommerceReport({ products, events: [event('click', 'product_view', { ...product, interaction: 'click' })],
    sessions: [{ sessionId: 'visitor', analyticsVersion: 2 }] });
  assert.equal(report.metrics.productClicks, 1);
  assert.equal(report.metrics.productViews, 0);
  assert.equal(report.items[0].views, 0);
});

test('missing historical tracking stays unavailable instead of showing fabricated zero totals', () => {
  const report = buildCommerceReport({ sessions: [{ sessionId: 'old', startedAt: at }] });
  assert.ok(Object.values(report.metrics).every(value => value === null));
  assert.deepEqual(report.itemAvailability, { views: false, discoveryViews: false, clicks: false, adds: false });
  const measuredViews = buildCommerceReport({ sessions: [{ sessionId: 'new', analyticsVersion: 2 }] });
  assert.equal(measuredViews.metrics.productViews, 0);
  assert.equal(measuredViews.metrics.productClicks, null);
  assert.equal(measuredViews.metrics.productAdds, null);
});

test('discovery page views include recorded Places and Find attribution while direct visits stay separate', () => {
  const report = buildCommerceReport({ products, services, sessions: [{ sessionId: 'from-places', source: 'places', analyticsVersion: 2 }], events: [
    event('direct-product', 'product_view', product),
    event('places-product', 'product_view', { ...product, source: 'places' }),
    event('find-product', 'product_view', { ...product, discoverySurface: 'buy' }),
    event('listing-product', 'product_view', { ...product, discoverySurface: 'places' }),
    event('session-product', 'product_view', { ...product, source: undefined, sessionId: 'from-places' }),
    event('direct-service', 'product_view', service),
    event('find-service', 'product_view', { ...service, discoverySurface: 'book' }),
    event('places-service', 'product_view', { ...service, source: 'places' }),
    event('product-click', 'product_view', { ...product, source: 'places', interaction: 'click' }),
    event('service-click', 'product_view', { ...service, discoverySurface: 'book', interaction: 'click' })
  ] });
  assert.equal(report.metrics.productViews, 5);
  assert.equal(report.metrics.productDiscoveryViews, 4);
  assert.equal(report.metrics.serviceViews, 3);
  assert.equal(report.metrics.serviceDiscoveryViews, 2);
  assert.equal(report.items.find(row => row.id === 'p1').discoveryViews, 4);
  assert.equal(report.items.find(row => row.id === 's1').discoveryViews, 2);
  assert.equal(report.itemAvailability.discoveryViews, true);
});

test('card clicks from discovery do not become discovery page views', () => {
  const report = buildCommerceReport({ products, services, sessions: [{ sessionId: 'visitor', analyticsVersion: 2 }], events: [
    event('product-click', 'product_view', { ...product, source: 'places', interaction: 'click' }),
    event('service-click', 'product_view', { ...service, discoverySurface: 'book', interaction: 'click' })
  ] });
  assert.equal(report.metrics.productViews, 0);
  assert.equal(report.metrics.productDiscoveryViews, 0);
  assert.equal(report.metrics.serviceViews, 0);
  assert.equal(report.metrics.serviceDiscoveryViews, 0);
});

test('unknown historical acquisition keeps discovery views unavailable without hiding observed page views', () => {
  const report = buildCommerceReport({ products, events: [
    { id: 'historical-view', type: 'product_view', at, productId: 'p1', sessionId: 'legacy' },
    event('classified-view', 'product_view', { ...product, source: 'places' })
  ] });
  assert.equal(report.metrics.productViews, 2);
  assert.equal(report.metrics.productDiscoveryViews, null);
  assert.equal(report.itemAvailability.discoveryViews, false);
});

test('measured zero discovery views stay zero for direct traffic and an empty instrumented period', () => {
  const direct = buildCommerceReport({ products, events: [event('direct-view', 'product_view', product)] });
  assert.equal(direct.metrics.productDiscoveryViews, 0);
  assert.equal(direct.itemAvailability.discoveryViews, true);
  const empty = buildCommerceReport({ sessions: [{ sessionId: 'instrumented', analyticsVersion: 2 }] });
  assert.equal(empty.metrics.productDiscoveryViews, 0);
  assert.equal(empty.metrics.serviceDiscoveryViews, 0);
});

test('legacy generic cart adds remain countable without claiming per-item totals', () => {
  const report = buildCommerceReport({ products, services, events: [
    { id: 'legacy-add', type: 'add_to_cart', at, sessionId: 'visitor', itemCount: 2 },
    event('known-add', 'add_to_cart', product)
  ] });
  assert.equal(report.metrics.cartAdds, 2);
  assert.equal(report.metrics.productAdds, null);
  assert.equal(report.metrics.serviceAdds, null);
  assert.equal(report.unclassifiedAdds, 1);
  assert.equal(report.itemAvailability.adds, false);
});

test('legacy service views resolve from the catalog and item kind aliases remain compatible', () => {
  const report = buildCommerceReport({ products, services, events: [
    { id: 'legacy-service', type: 'product_view', at, productId: 's1' },
    event('book-click', 'product_view', { kind: 'book', itemId: 's1', interaction: 'click' }),
    event('buy-add', 'add_to_cart', { kind: 'buy', itemId: 'p1' })
  ] });
  assert.equal(report.metrics.serviceViews, 1);
  assert.equal(report.metrics.productViews, 0);
  assert.equal(report.metrics.serviceClicks, 1);
  assert.equal(report.metrics.productAdds, 1);
});

test('ambiguous item names do not invent product or service totals', () => {
  const report = buildCommerceReport({ products: [{ id: 'p', name: 'Consultation' }],
    services: [{ id: 's', name: 'Consultation' }], events: [event('unknown-view', 'product_view', { itemName: 'Consultation' })] });
  assert.equal(report.metrics.productViews, null);
  assert.equal(report.metrics.serviceViews, null);
  assert.deepEqual(report.items, []);
});

test('event document retries, out-of-period events and bots do not inflate totals', () => {
  const view = event('view', 'product_view', product);
  const report = buildCommerceReport({ products, start: at, end: at + 1000,
    sessions: [{ sessionId: 'bot', isBot: true }], events: [
      view, view, event('before', 'product_view', { ...product, at: at - 1 }),
      event('after', 'product_view', { ...product, at: at + 1001 }),
      event('bot-session', 'product_view', { ...product, sessionId: 'bot' }),
      event('bot-event', 'product_view', { ...product, isBot: true }),
      event('end-boundary', 'product_view', { ...product, at: at + 1000 })
    ] });
  assert.equal(report.metrics.productViews, 2);
});

test('legacy retry signatures preserve a view and click occurring at the same time', () => {
  const view = { type: 'product_view', at, sessionId: 'visitor', ...product, interaction: 'view', commerceVersion: 1 };
  const click = { ...view, interaction: 'click' };
  const report = buildCommerceReport({ products, events: [view, view, click, click] });
  assert.equal(report.metrics.productViews, 1);
  assert.equal(report.metrics.productClicks, 1);
});

test('the latest converted cart snapshot prevents a stale abandoned snapshot being counted', () => {
  const report = buildCommerceReport({ cartTracking: true, now: at + CART_ABANDONMENT_MS, carts: [
    cart('complete', { status: 'abandoned', updatedAt: at - 60000 }),
    cart('complete', { status: 'converted', updatedAt: at }),
    cart('complete', { status: 'active', updatedAt: at - 120000 })
  ] });
  assert.equal(report.metrics.abandonedCarts, 0);
});

test('inactive unfinished carts become abandoned at 30 minutes, with explicit abandonment immediate', () => {
  const now = at + CART_ABANDONMENT_MS;
  const report = buildCommerceReport({ cartTracking: true, now, carts: [
    cart('at-threshold'), cart('checkout', { status: 'checkout' }),
    cart('recent', { updatedAt: at + 1 }), cart('explicit', { status: 'abandoned', updatedAt: now }),
    cart('empty', { items: [] }), cart('zero', { items: [{ quantity: 0 }] }),
    cart('complete', { status: 'converted' }), cart('unknown', { status: 'unknown' }),
    cart('bot', { isBot: true })
  ] });
  assert.equal(report.metrics.abandonedCarts, 3);
});

test('cart period filtering uses the latest activity and excludes known bot sessions', () => {
  const report = buildCommerceReport({ cartTracking: true, start: at - 1000, end: at, now: at + CART_ABANDONMENT_MS,
    sessions: [{ sessionId: 'bot', isBot: true }], carts: [
      cart('completed-later', { status: 'abandoned', updatedAt: at }),
      cart('completed-later', { status: 'converted', updatedAt: at + 1 }),
      cart('too-old', { status: 'abandoned', updatedAt: at - 1001 }),
      cart('bot-session', { status: 'abandoned', sessionId: 'bot' }),
      cart('included', { status: 'abandoned', updatedAt: { seconds: at / 1000 } })
    ] });
  assert.equal(report.metrics.abandonedCarts, 1);
});

test('cart query failure leaves abandonment unavailable while a successful empty query reports zero', () => {
  assert.equal(buildCommerceReport({ carts: [cart('abandoned', { status: 'abandoned' })] }).metrics.abandonedCarts, null);
  assert.equal(buildCommerceReport({ cartTracking: true }).metrics.abandonedCarts, 0);
});

test('checkout event retries and repeated order submissions count only one submitted checkout each', () => {
  const start = event('start', 'begin_checkout');
  const report = buildCommerceReport({ events: [start, start,
    event('submitted-order', 'purchase', { orderId: 'order-1' }),
    event('order-retry', 'purchase', { orderId: 'order-1' }),
    event('submitted-checkout', 'purchase', { checkoutId: 'checkout-2' }),
    event('checkout-retry', 'purchase', { checkoutId: 'checkout-2' }),
    event('different-order', 'purchase', { orderId: 'order-3' })
  ] });
  assert.equal(report.metrics.checkoutStarts, 1);
  assert.equal(report.metrics.submittedCheckouts, 3);
});

test('explicit tracking capability distinguishes an observed zero from missing checkout measurements', () => {
  const report = buildCommerceReport({ tracking: { offerViews: true, offerClicks: true, cartAdds: true, checkout: true } });
  assert.equal(report.metrics.productViews, 0);
  assert.equal(report.metrics.serviceClicks, 0);
  assert.equal(report.metrics.cartAdds, 0);
  assert.equal(report.metrics.checkoutStarts, 0);
  assert.equal(report.metrics.submittedCheckouts, 0);
});

test('cart additions capture only positive quantity increments and retain item metadata', () => {
  const previous = [{ lineKey: 'beans', kind: 'product', productId: 'p1', quantity: 2, unitPriceCents: 1000 },
    { lineKey: 'tasting', kind: 'service', serviceId: 's1', quantity: 2 }];
  const current = [{ ...previous[0], quantity: 5 }, { ...previous[1], quantity: 1 }];
  assert.deepEqual(cartAdditions(previous, current), [{ ...current[0], addedQuantity: 3 }]);
  assert.deepEqual(cartAdditions(current, current), []);
  assert.deepEqual(cartAdditions(previous, []), []);
});

test('same-size cart replacements and new variants each create an item add', () => {
  const previous = [{ kind: 'product', productId: 'p1', variantId: 'small', quantity: 1 }];
  const replacement = [{ kind: 'service', serviceId: 's1', quantity: 1 }];
  assert.deepEqual(cartAdditions(previous, replacement), [{ ...replacement[0], addedQuantity: 1 }]);
  const variant = { ...previous[0], variantId: 'large' };
  assert.deepEqual(cartAdditions(previous, [...previous, variant]), [{ ...variant, addedQuantity: 1 }]);
});

test('restored cart contents and price edits do not count as fresh additions', () => {
  const restored = [{ lineKey: 'existing', kind: 'product', productId: 'p1', quantity: '2', unitPriceCents: 1000 }];
  assert.deepEqual(cartAdditions(restored, restored), []);
  assert.deepEqual(cartAdditions(restored, [{ ...restored[0], unitPriceCents: 1500 }]), []);
  const increased = { ...restored[0], quantity: '3' };
  assert.deepEqual(cartAdditions(restored, [increased]), [{ ...increased, addedQuantity: 1 }]);
});
