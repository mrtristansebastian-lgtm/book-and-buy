import { buildTrafficReport, buildPlacesReport, dedupeReportEvents, reportTimestampMs } from './trafficReports.js';
import { buildCommerceReport } from './commerceReports.js';

const metric = (id, label, description, extra = {}) => ({ id, label, description, format: 'count', ...extra });
export const REPORT_GROUPS = [
  { id: 'audience', title: 'Audience', description: 'Your overall website audience and browsing activity.', metrics: [
    metric('visitors', 'Unique visitors', 'How many different visitors opened your website in this period. Someone visiting several times still counts once.', { trafficKey: 'uniqueVisitors', distinct: true, visitorBased: true }),
    metric('sessions', 'Sessions', 'How many visits to your website started in this period. One visitor can make several visits.', { trafficKey: 'sessions' }),
    metric('page_views', 'Page views', 'How many times your website pages were opened. Opening the same page again adds another view.', { trafficKey: 'pageViews' }),
    metric('returning_visitors', 'Returning visitors', 'How many visitors came back after first visiting before this period. Someone returning several times still counts once.', { trafficKey: 'returningVisitors', distinct: true, visitorBased: true })
  ] },
  ...['product', 'service'].map(kind => ({ id: `${kind}s`, title: kind === 'product' ? 'Products' : 'Services', description: `Your overall ${kind} activity across all traffic sources.`, metrics: [
    metric(`${kind}_views`, `${kind === 'product' ? 'Product' : 'Service'} page views`, `How many times your ${kind} pages were opened, wherever the visitor came from. Clicking a listing counts only when its page opens.`, { commerceKey: `${kind}Views`, kind }),
    metric(`${kind}_discovery_views`, 'Views from discovery', `How many ${kind} page views came after someone found you through Places, Find Buy or Find Book. These views are also included in your total ${kind} page views.`, { commerceKey: `${kind}DiscoveryViews`, kind }),
    metric(`${kind}_adds`, 'Add-to-carts', `How many times a ${kind} was added to a cart, including increases to its quantity. Adding three of the same ${kind} at once counts as one addition.`, { commerceKey: `${kind}Adds`, kind })
  ] })),
  { id: 'checkout', title: 'Carts & checkout', description: 'How customers use their carts and move through checkout.', metrics: [
    metric('active_carts', 'Carts with activity', 'How many carts were used in this period, including carts later emptied or checked out. A cart counts once, on the date it was last used.', { snapshot: true }),
    metric('abandoned_carts', 'Abandoned carts', 'How many carts were emptied before checkout, or left with items and no activity for 30 minutes. A cart can stop counting here if the customer returns or checks out.', { commerceKey: 'abandonedCarts', snapshot: true }),
    metric('checkout_starts', 'Checkout starts', 'How many times someone started the checkout details step. Starting checkout again counts as another start.', { commerceKey: 'checkoutStarts' }),
    metric('submitted_checkouts', 'Submitted checkouts', 'How many checkouts finished by creating an order or booking request. This does not mean the customer has paid yet.', { commerceKey: 'submittedCheckouts' })
  ] },
  { id: 'discovery', title: 'Discovery outcomes', description: 'Messages, orders and booking requests gained through Places, Find Buy and Find Book.', metrics: [
    metric('discovery_messages', 'Message leads', 'How many new conversations started after someone found you through Places, Find Buy or Find Book. A conversation counts once, when the customer sends their first message.', { discoveryKey: 'messageLeads', distinct: true }),
    metric('discovery_orders', 'Product orders', 'How many product orders came from visitors who found you through Places, Find Buy or Find Book. An order counts even if payment is still due.', { discoveryKey: 'orders' }),
    metric('discovery_bookings', 'Booking requests', 'How many booking requests came from visitors who found you through Places, Find Buy or Find Book. A request may still need your approval or payment.', { discoveryKey: 'bookings' })
  ] },
  { id: 'places', title: 'Places', description: 'How your Places listing reaches visitors and brings them to your business.', metrics: [
    metric('places_reach', 'Reach', 'How many different visitors saw your business listing on Places. Each visitor counts once, even if they see it again. A listing counts as seen when at least half of it is on screen.', { surface: 'places', action: 'reach', distinct: true, visitorBased: true }),
    metric('places_profile_views', 'Profile views from Places', 'How many times your business profile opened after someone clicked your Places listing. Clicking the listing alone does not count.', { surface: 'places', action: 'profileViews' }),
    metric('places_messages', 'Message leads', 'How many new conversations came from visitors who found you on Places. Each conversation counts once, when the customer sends their first message.', { surface: 'places', action: 'messages', distinct: true }),
    metric('places_orders', 'Product orders', 'How many product orders came from visitors who found you on Places. An order counts even if payment is still due.', { surface: 'places', action: 'orders' }),
    metric('places_bookings', 'Booking requests', 'How many booking requests came from visitors who found you on Places. A request may still need your approval or payment.', { surface: 'places', action: 'bookings' })
  ] },
  ...[['buy', 'Find products', 'product', 'orders', 'Product orders'], ['book', 'Find services', 'service', 'bookings', 'Booking requests']].map(([surface, title, kind, outcome, outcomeLabel]) => ({
    id: surface, title, description: `The reach and ${kind} activity your business gains from Find ${surface === 'buy' ? 'Buy' : 'Book'}.`, metrics: [
      metric(`${surface}_reach`, 'Reach', `How many different visitors saw your ${kind}s on Find ${surface === 'buy' ? 'Buy' : 'Book'}. Each visitor counts once, even if they see several listings. A listing counts as seen when at least half of it is on screen.`, { surface, action: 'reach', kind, distinct: true, visitorBased: true }),
      metric(`${surface}_page_views`, `${kind === 'product' ? 'Product' : 'Service'} page views`, `How many times your ${kind} pages opened after someone found you on Find ${surface === 'buy' ? 'Buy' : 'Book'}. Clicking a listing alone does not count.`, { surface, action: 'views', kind }),
      metric(`${surface}_adds`, 'Add-to-carts', `How many times visitors from Find ${surface === 'buy' ? 'Buy' : 'Book'} added a ${kind} to their cart or increased its quantity. Adding three of the same ${kind} at once counts as one addition.`, { surface, action: 'adds', kind }),
      metric(`${surface}_checkouts`, 'Checkout starts', `How many times visitors from Find ${surface === 'buy' ? 'Buy' : 'Book'} started checkout. Starting checkout again counts as another start.`, { surface, action: 'checkouts' }),
      metric(`${surface}_${outcome}`, outcomeLabel, `How many ${outcome === 'orders' ? 'product orders' : 'booking requests'} came from visitors who found you on Find ${surface === 'buy' ? 'Buy' : 'Book'}. ${outcome === 'orders' ? 'An order counts even if payment is still due.' : 'A request may still need your approval or payment.'}`, { surface, action: outcome })
    ]
  }))
];
export const REPORT_STATISTICS = REPORT_GROUPS.flatMap(group => group.metrics.map(row => ({ ...row, groupId: group.id, groupTitle: group.title })));
const REPORT_STATISTIC_ALIASES = { buy_impressions: 'buy_reach', book_impressions: 'book_reach' };
export const getReportStatistic = id => REPORT_STATISTICS.find(row => row.id === (REPORT_STATISTIC_ALIASES[id] || id));
const timestamp = row => reportTimestampMs(row.at ?? row.startedAt ?? row.timestamp ?? row.createdAt ?? row.updatedAt);
const within = (at, start, end) => at != null && (start == null || at >= start) && (end == null || at <= end);
const sid = row => String(row.sessionId || row.id || '');
const source = row => row.analyticsSource || row.attribution?.source || row.source;
const recordTime = row => reportTimestampMs(row.timestamp ?? row.createdAt ?? row.at);
const reachImpression = (row, metric) => row.discoverySurface === metric.surface && row.type === 'discovery_visit' && row.discoveryAction === 'impression' && row.discoveryTarget === (metric.kind || 'business');
const trackedVisitorId = row => typeof row.visitorId === 'string' ? row.visitorId.trim() : '';

/** Index immutable observations once so history buckets share the same attribution lookup. */
function prepareReportContext({ sessions = [], events = [], carts = [] } = {}) {
  const bots = new Set(sessions.filter(row => row.isBot).map(sid));
  const allEvents = dedupeReportEvents(events).filter(row => !bots.has(row.sessionId));
  const classified = allEvents.filter(row => ['places', 'book', 'buy'].includes(row.discoverySurface));
  const links = { orders: new Map(), bookings: new Map() };
  const entries = new Map();
  const cache = { orders: new WeakMap(), bookings: new WeakMap() };
  const link = (kind, id, row) => {
    const previous = links[kind].get(id);
    if (!previous || (timestamp(row) ?? 0) > (timestamp(previous) ?? 0)) links[kind].set(id, row);
  };
  for (const row of classified) {
    if (row.orderId !== undefined) link('orders', row.orderId, row);
    if (row.bookingId !== undefined) link('bookings', row.bookingId, row);
    if (Array.isArray(row.bookingIds)) row.bookingIds.forEach(id => link('bookings', id, row));
    if (row.discoveryAction !== 'impression') {
      const group = entries.get(row.sessionId) || [];
      group.push({ at: timestamp(row) ?? 0, surface: row.discoverySurface });
      entries.set(row.sessionId, group);
    }
  }
  entries.forEach(group => group.sort((a, b) => b.at - a.at));
  const recordSurface = (record, kind) => {
    if (cache[kind].has(record)) return cache[kind].get(record);
    let surface = null;
    const authoritativeSource = record.analyticsSource || record.attribution?.source;
    if (!authoritativeSource || authoritativeSource === 'places') {
      const explicit = record.discoverySurface || record.attribution?.discoverySurface;
      if (['places', 'book', 'buy'].includes(explicit)) surface = explicit;
      else if (links[kind].has(record.id)) surface = links[kind].get(record.id).discoverySurface;
      else {
        const group = entries.get(record.analyticsSessionId || record.attribution?.sessionId) || [];
        const at = recordTime(record) ?? 0;
        let low = 0; let high = group.length - 1; let match = -1;
        while (low <= high) {
          const middle = Math.floor((low + high) / 2);
          if (group[middle].at <= at) { match = middle; high = middle - 1; }
          else low = middle + 1;
        }
        if (match >= 0) surface = group[match].surface;
      }
    }
    cache[kind].set(record, surface);
    return surface;
  };
  const latestCarts = new Map();
  carts.filter(row => !row.isBot && !bots.has(row.sessionId)).forEach(row => {
    const key = row.cartId || row.id || row.sessionId;
    if (!key) return;
    if (!latestCarts.has(key) || reportTimestampMs(row.updatedAt) >= reportTimestampMs(latestCarts.get(key).updatedAt)) latestCarts.set(key, row);
  });
  return { allEvents, classified, recordSurface, latestCarts };
}

/** Surface attribution is event metadata. Legacy generic discovery is never relabelled Places. */
export function buildReportDashboard(options = {}) {
  return buildReportMetrics(options, REPORT_STATISTICS, prepareReportContext(options));
}

/** Build only the requested statistics; the overview requests the complete catalog. */
function buildReportMetrics(options, metrics, context) {
  const { sessions = [], events = [], carts = [], orders = [], bookings = [], start = null, end = null, now = Date.now(), cartTracking = false } = options;
  const { allEvents, classified, recordSurface, latestCarts } = context;
  const activity = allEvents.filter(row => within(timestamp(row), start, end));
  const traffic = metrics.some(metric => metric.trafficKey) ? buildTrafficReport(options) : null;
  const commerce = metrics.some(metric => metric.commerceKey) ? buildCommerceReport(options) : null;
  const discovery = metrics.some(metric => metric.discoveryKey) ? buildPlacesReport(options) : null;
  const classifiedInPeriod = classified.filter(row => within(timestamp(row), start, end));
  const channelValue = metric => {
    const rows = classifiedInPeriod.filter(row => row.discoverySurface === metric.surface);
    if (metric.action === 'orders' || metric.action === 'bookings') {
      const records = metric.action === 'orders' ? orders : bookings;
      return new Set(records.filter(row => row.id && within(recordTime(row), start, end) && recordSurface(row, metric.action) === metric.surface).map(row => row.id)).size;
    }
    const matches = rows.filter(row => {
      if (metric.action === 'reach') return reachImpression(row, metric);
      if (metric.action === 'profileViews') return row.type === 'page_view' && (row.page === 'home' || /\/home(?:[?#]|$)/.test(String(row.path || '')));
      if (metric.action === 'views') return row.type === 'product_view' && row.interaction !== 'click' && row.itemKind === metric.kind;
      if (metric.action === 'adds') return row.type === 'add_to_cart' && row.itemKind === metric.kind;
      if (metric.action === 'checkouts') return row.type === 'begin_checkout';
      return row.type === 'message_lead';
    });
    return metric.action === 'reach' ? new Set(matches.map(trackedVisitorId).filter(Boolean)).size : metric.action === 'messages' ? new Set(matches.map(row => row.threadId || row.id || row.sessionId)).size : matches.length;
  };
  const stats = {};
  for (const metric of metrics) {
    let value = null;
    let available = false;
    if (metric.trafficKey) { value = traffic.metrics[metric.trafficKey]; available = traffic.availability[metric.trafficKey]; }
    else if (metric.commerceKey) { value = commerce.metrics[metric.commerceKey]; available = commerce.availability[metric.commerceKey]; }
    else if (metric.discoveryKey) { value = discovery.metrics[metric.discoveryKey]; available = discovery.availability[metric.discoveryKey]; }
    else if (metric.id === 'active_carts') {
      available = cartTracking;
      value = [...latestCarts.values()].filter(row => within(reportTimestampMs(row.updatedAt), start, end)).length;
    } else {
      // A versioned observation proves this channel is instrumented, including a measured zero.
      available = options.tracking?.discoverySurfaces?.includes(metric.surface) || classifiedInPeriod.some(row => Number(row.discoveryVersion) >= 1);
      if (metric.action === 'reach') available = available && classifiedInPeriod.filter(row => reachImpression(row, metric)).every(row => Boolean(trackedVisitorId(row)));
      value = channelValue(metric);
    }
    stats[metric.id] = { value: available ? value : null, available };
  }
  return { stats, traffic, commerce, discovery,
    unclassifiedDiscovery: activity.filter(row => source(row) === 'places' && !row.discoverySurface && row.type === 'discovery_visit').length,
    options: { ...options, now } };
}

/** One history row per hour/day/week/month, bounded for all-time and long custom ranges. */
export function buildReportHistory({ report, metricId, periodId = 'week' }) {
  const metric = getReportStatistic(metricId);
  if (!metric || !report.stats[metric.id]?.available) return { series: [], unit: 'day' };
  const options = report.options;
  // Rebuild for each call so updated observations cannot reuse stale attribution.
  // All buckets within this history share the index and record lookup cache.
  const context = prepareReportContext(options);
  const times = [...(options.sessions || []), ...(options.events || []), ...(options.carts || []), ...(options.orders || []), ...(options.bookings || [])].map(timestamp).filter(at => at != null && at <= options.now);
  const from = options.start ?? (times.length ? Math.min(...times) : options.now);
  const to = Math.min(options.end ?? options.now, options.now);
  const days = (to - from) / 86400000;
  const unit = periodId === 'day' || days <= 1 ? 'hour' : days > 3650 ? 'year' : days > 120 ? 'month' : days > 45 ? 'week' : 'day';
  const cursor = new Date(from);
  if (unit === 'hour') cursor.setMinutes(0, 0, 0);
  else { cursor.setHours(0, 0, 0, 0); if (unit === 'month' || unit === 'year') cursor.setDate(1); if (unit === 'year') cursor.setMonth(0); }
  const series = [];
  // Keep metric availability based on the full period; an empty bucket is a measured zero.
  const tracking = { ...options.tracking, visitorIdentity: true, pageViews: true, offerViews: true, discoveryViews: true, offerClicks: true, cartAdds: true, itemAdds: true, checkout: true, places: true, messageLeads: true, attribution: true, discoverySurfaces: ['places', 'book', 'buy'] };
  while (cursor.getTime() <= to && series.length < 150) {
    const at = cursor.getTime();
    if (unit === 'hour') cursor.setHours(cursor.getHours() + 1);
    else if (unit === 'year') cursor.setFullYear(cursor.getFullYear() + Math.max(1, Math.ceil(days / 365 / 120)));
    else if (unit === 'month') cursor.setMonth(cursor.getMonth() + 1);
    else cursor.setDate(cursor.getDate() + (unit === 'week' ? 7 : 1));
    const end = Math.min(cursor.getTime() - 1, to);
    const bucket = buildReportMetrics({ ...options, start: Math.max(at, from), end, visitorCohortStart: options.start ?? from, tracking }, [metric], context);
    const raw = bucket.stats[metric.id]?.value ?? 0;
    const label = new Date(at).toLocaleString(undefined, unit === 'hour' ? { hour: 'numeric' } : unit === 'year' ? { year: 'numeric' } : unit === 'month' ? { month: 'short', year: 'numeric' } : { month: 'short', day: 'numeric' });
    series.push({ at, end, label, raw, amountInCents: raw * 100 });
  }
  return { series, unit };
}
