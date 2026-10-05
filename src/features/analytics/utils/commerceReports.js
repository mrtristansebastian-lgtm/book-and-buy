import { dedupeReportEvents, reportTimestampMs } from './trafficReports.js';

export const CART_ABANDONMENT_MS = 30 * 60 * 1000;
const text = value => String(value ?? '').trim();
const inPeriod = (at, start, end) => at !== null &&
  (start == null || at >= start) && (end == null || at <= end);

/** Counts observed offer interactions; missing historical item tracking stays unavailable. */
export function buildCommerceReport({
  sessions = [], events = [], carts = [], products = [], services = [],
  start = null, end = null, now = Date.now(), cartTracking = false, tracking = {}
} = {}) {
  const botSessions = new Set(sessions.filter(row => row?.isBot).map(row => row.sessionId || row.id));
  const observed = dedupeReportEvents(events).filter(row =>
    !botSessions.has(row.sessionId) && inPeriod(reportTimestampMs(row.at ?? row.createdAt), start, end));
  const catalog = new Map();
  const names = new Map();
  for (const [kind, records] of [['product', products], ['service', services]]) {
    for (const record of records) {
      const item = { id: text(record.id), name: text(record.name) || text(record.id), kind };
      catalog.set(`${kind}:${item.id}`, item);
      const key = item.name.toLowerCase();
      names.set(key, names.has(key) ? null : item);
    }
  }
  const identify = row => {
    let kind = row.itemKind || row.kind;
    if (kind === 'book') kind = 'service';
    if (kind === 'buy') kind = 'product';
    const id = text(row.serviceId || row.productId || row.itemId);
    if (kind !== 'service' && kind !== 'product') {
      if (row.serviceId || /\/book(?:\/|$)/.test(text(row.path))) kind = 'service';
      else if (catalog.has(`service:${id}`) && !catalog.has(`product:${id}`)) kind = 'service';
      else if (row.productId || /\/buy(?:\/|$)/.test(text(row.path))) kind = 'product';
    }
    const name = text(row.serviceName || row.productName || row.itemName);
    const known = catalog.get(`${kind}:${id}`) || names.get(name.toLowerCase());
    if (known) return known;
    if (!['product', 'service'].includes(kind) || (!id && !name)) return null;
    return { id: id || name, name: name || id, kind };
  };
  const views = observed.filter(row => row.type === 'product_view' && row.interaction !== 'click');
  const sessionsById = new Map(sessions.map(row => [row.sessionId || row.id, row]));
  const acquisition = row => row.analyticsSource || row.source || sessionsById.get(row.sessionId)?.source;
  const fromDiscovery = row => acquisition(row) === 'places' || ['places', 'book', 'buy'].includes(row.discoverySurface);
  const clicks = observed.filter(row => row.type === 'product_view' && row.interaction === 'click');
  const adds = observed.filter(row => row.type === 'add_to_cart');
  const modern = observed.some(row => Number(row.commerceVersion) >= 1);
  const viewsAvailable = tracking.offerViews === true || views.length > 0 ||
    [...sessions, ...observed].some(row => Number(row.analyticsVersion) >= 2);
  const discoveryViewsAvailable = viewsAvailable && (tracking.discoveryViews === true || views.every(row =>
    ['direct', 'places'].includes(acquisition(row)) || ['places', 'book', 'buy'].includes(row.discoverySurface)));
  const clicksAvailable = tracking.offerClicks === true || modern || clicks.length > 0;
  const addsAvailable = tracking.cartAdds === true || adds.length > 0 || modern;
  const itemAddsAvailable = addsAvailable && (tracking.itemAdds === true || modern || adds.some(row => identify(row))) && adds.every(row => identify(row));
  const rows = new Map();
  const totals = { productViews: 0, serviceViews: 0, productDiscoveryViews: 0, serviceDiscoveryViews: 0, productClicks: 0, serviceClicks: 0, productAdds: 0, serviceAdds: 0 };
  let unclassifiedViews = 0; let unclassifiedClicks = 0;
  for (const [metric, records] of [['Views', views], ['Clicks', clicks], ['Adds', adds]]) {
    for (const record of records) {
      const item = identify(record);
      if (!item) {
        if (metric === 'Views') unclassifiedViews += 1;
        if (metric === 'Clicks') unclassifiedClicks += 1;
        continue;
      }
      totals[`${item.kind}${metric}`] += 1;
      const key = `${item.kind}:${item.id}`;
      const row = rows.get(key) || { ...item, views: 0, discoveryViews: 0, clicks: 0, adds: 0 };
      row[metric.toLowerCase()] += 1;
      if (metric === 'Views' && fromDiscovery(record)) {
        totals[`${item.kind}DiscoveryViews`] += 1;
        row.discoveryViews += 1;
      }
      rows.set(key, row);
    }
  }

  // Select each cart's latest snapshot before period filtering, so a completed
  // cart cannot also be counted from an earlier active/abandoned snapshot.
  const latestCarts = new Map();
  carts.filter(row => row && !row.isBot && !botSessions.has(row.sessionId)).forEach((row, index) => {
    const key = text(row.cartId || row.id || row.sessionId) || `unknown:${index}`;
    const at = reportTimestampMs(row.updatedAt ?? row.serverUpdatedAt);
    const previous = latestCarts.get(key);
    if (!previous || (at ?? -1) >= (previous.at ?? -1)) latestCarts.set(key, { row, at });
  });
  const periodCarts = [...latestCarts.values()].filter(({ at }) => inPeriod(at, start, end));
  const abandonedCarts = periodCarts.filter(({ row, at }) => row.status === 'abandoned' ||
    (['active', 'checkout'].includes(row.status) && row.items?.some(item => Number(item.quantity) > 0) && now - at >= CART_ABANDONMENT_MS)).length;
  const checkoutStarts = observed.filter(row => row.type === 'begin_checkout');
  const submissions = observed.filter(row => row.type === 'purchase');
  const submittedKeys = new Set(submissions.map((row, index) => row.orderId ? `order:${row.orderId}` : row.checkoutId || row.id || `submission:${index}`));
  const checkoutAvailable = tracking.checkout === true || modern || checkoutStarts.length > 0 || submissions.length > 0;
  const availability = {
    productViews: viewsAvailable && !unclassifiedViews, serviceViews: viewsAvailable && !unclassifiedViews,
    productDiscoveryViews: discoveryViewsAvailable && !unclassifiedViews, serviceDiscoveryViews: discoveryViewsAvailable && !unclassifiedViews,
    productClicks: clicksAvailable && !unclassifiedClicks, serviceClicks: clicksAvailable && !unclassifiedClicks,
    productAdds: itemAddsAvailable, serviceAdds: itemAddsAvailable,
    cartAdds: addsAvailable, abandonedCarts: cartTracking,
    checkoutStarts: checkoutAvailable, submittedCheckouts: checkoutAvailable
  };
  const metrics = { ...totals, cartAdds: adds.length, abandonedCarts, checkoutStarts: checkoutStarts.length, submittedCheckouts: submittedKeys.size };
  for (const key of Object.keys(metrics)) if (!availability[key]) metrics[key] = null;
  return {
    metrics, availability,
    items: [...rows.values()].sort((a, b) => b.views + b.clicks + b.adds - a.views - a.clicks - a.adds || a.name.localeCompare(b.name)),
    itemAvailability: { views: viewsAvailable, discoveryViews: discoveryViewsAvailable, clicks: clicksAvailable, adds: itemAddsAvailable },
    unclassifiedAdds: adds.filter(row => !identify(row)).length
  };
}
