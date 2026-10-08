import {
  FINANCE_PERIODS,
  formatMoney,
  getPeriodBounds,
  periodTitle
} from '../../finance/utils/financeLedger';
import { buildChartGeometry } from '../../finance/utils/financeChartScale';
import {
  LIVE_COMMERCE_WINDOW_MS,
  LIVE_VISITOR_WINDOW_MS,
  liveActivityMs,
  validGeoCoordinates
} from '../../../shared/analytics/livePresence';

export { FINANCE_PERIODS as ANALYTICS_PERIODS, formatMoney, periodTitle, getPeriodBounds };

const DAY_MS = 24 * 60 * 60 * 1000;
const LIVE_WINDOW_MS = LIVE_VISITOR_WINDOW_MS;
const LIVE_CART_WINDOW_MS = LIVE_COMMERCE_WINDOW_MS;

function inBounds(at, start, end) {
  const t = Number(at) || 0;
  if (start != null && t < start) return false;
  if (end != null && t > end) return false;
  return true;
}

function rate(num, den) {
  if (!den) return 0;
  return Math.round((num / den) * 1000) / 10;
}

export function filterByPeriod(rows, periodId, customRange, timeKey = 'at') {
  const { start, end } = getPeriodBounds(periodId, customRange);
  return (rows || []).filter((row) => inBounds(row[timeKey], start, end));
}

export function computeLiveStrip({ sessions = [], carts = [], now = Date.now() } = {}) {
  const liveSessions = liveSessionRows(sessions, now);
  const activeCarts = carts.filter(
    (c) =>
      (c.status === 'active' || c.status === 'checkout') &&
      Number(c.updatedAt) >= now - LIVE_CART_WINDOW_MS &&
      (c.items?.length || 0) > 0
  );
  const activeCheckouts = activeCarts.filter((c) => c.status === 'checkout');
  return {
    liveVisitors: liveSessions.length,
    activeCarts: activeCarts.length,
    activeCheckouts: activeCheckouts.length,
    livePaths: rankCounts(liveSessions.map((s) => s.path || '/')).slice(0, 5)
  };
}

/** Current, non-bot sessions for the Live Stats operations view. */
export function liveSessionRows(sessions = [], now = Date.now()) {
  const liveCutoff = now - LIVE_WINDOW_MS;
  const seen = new Set();
  return (sessions || [])
    .filter((session) => liveActivityMs(session) >= liveCutoff && !session.isBot)
    .sort((a, b) => liveActivityMs(b) - liveActivityMs(a))
    .filter((session, index) => {
      const key = session.visitorId ? `visitor:${session.visitorId}` : `session:${session.sessionId || session.id || index}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((session, index) => {
      const latitude = session.latitude;
      const longitude = session.longitude;
      const hasCoordinates = validGeoCoordinates(latitude, longitude);
      return {
        id:
          session.sessionId ||
          session.id ||
          `${String(session.path || '/')}-${liveActivityMs(session)}-${index}`,
        visitorId: typeof session.visitorId === 'string' ? session.visitorId : '',
        path: String(session.path || '/'),
        city: String(session.city || '').trim(),
        region: String(session.region || '').trim(),
        country: String(session.country || '').trim(),
        device: String(session.device || '').trim().toLowerCase(),
        latitude: hasCoordinates ? latitude : null,
        longitude: hasCoordinates ? longitude : null,
        lastSeenAt: liveActivityMs(session)
      };
    });
}

export function formatLiveRelativeTime(at, now = Date.now()) {
  const diff = Math.max(0, Number(now || Date.now()) - Number(at || 0));
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10) return 'now';
  if (seconds < 60) return `${seconds}s ago`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function computeAnalyticsKpis({
  sessions = [],
  events = [],
  carts = [],
  orders = [],
  bookings = []
} = {}) {
  const sessionIds = new Set(sessions.map((s) => s.sessionId).filter(Boolean));
  const sessionsCount = sessionIds.size || sessions.length;
  const uniqueVisitors = sessionsCount;

  const productViews = events.filter((e) => e.type === 'product_view' && e.interaction !== 'click').length;
  const addToCarts = events.filter((e) => e.type === 'add_to_cart').length;
  const checkouts = events.filter((e) => e.type === 'begin_checkout').length;
  const purchases = events.filter(
    (e) => e.type === 'purchase' || e.type === 'booking_confirmed'
  );

  const paidOrders = (orders || []).filter(
    (o) => String(o.paymentStatus || '').toLowerCase() === 'paid'
  );
  const paidBookings = (bookings || []).filter(
    (b) => String(b.paymentStatus || '').toLowerCase() === 'paid'
  );

  const revenueCents =
    paidOrders.reduce((sum, o) => sum + (Number(o.totalCents) || Number(o.amountInCents) || 0), 0) +
    paidBookings.reduce((sum, b) => sum + (Number(b.amountInCents) || 0), 0) +
    purchases.reduce((sum, e) => sum + (Number(e.valueCents) || 0), 0);

  // Prefer ledger-style paid counts when available; fall back to purchase events.
  const conversionCount = Math.max(
    paidOrders.length + paidBookings.length,
    purchases.length
  );
  const aov =
    conversionCount > 0 ? Math.round(revenueCents / conversionCount) : 0;

  return {
    sessions: sessionsCount,
    uniqueVisitors,
    conversionRate: rate(conversionCount, sessionsCount),
    aovCents: aov,
    revenueCents,
    addToCartRate: rate(addToCarts, Math.max(productViews, sessionsCount)),
    productViews,
    addToCarts,
    checkouts,
    purchases: conversionCount,
    abandonedCarts: carts.filter((c) => c.status === 'abandoned').length
  };
}

export function computeFunnel({ events = [], sessions = [] } = {}) {
  const sessionsCount = new Set(sessions.map((s) => s.sessionId).filter(Boolean)).size ||
    sessions.length;
  const productViews = events.filter((e) => e.type === 'product_view' && e.interaction !== 'click').length;
  const addToCart = events.filter((e) => e.type === 'add_to_cart').length;
  const checkout = events.filter((e) => e.type === 'begin_checkout').length;
  const purchase = events.filter(
    (e) => e.type === 'purchase' || e.type === 'booking_confirmed'
  ).length;

  const steps = [
    { id: 'sessions', label: 'Sessions', value: sessionsCount },
    { id: 'product_view', label: 'Product views', value: Math.max(productViews, sessionsCount) },
    { id: 'add_to_cart', label: 'Add to cart', value: addToCart },
    { id: 'checkout', label: 'Checkout', value: checkout },
    { id: 'purchase', label: 'Purchase', value: purchase }
  ];
  const peak = Math.max(...steps.map((s) => s.value), 1);
  return steps.map((step) => ({
    ...step,
    pct: Math.round((step.value / peak) * 100)
  }));
}

/** Metrics the reports chart can plot. */
export const CHART_METRICS = [
  { id: 'revenue', label: 'Revenue', format: 'money', lede: 'Paid revenue over time' },
  { id: 'profit', label: 'Product profit', format: 'money', lede: 'Revenue minus product cost' },
  { id: 'sessions', label: 'Sessions', format: 'count', lede: 'Sessions started per day' },
  { id: 'visitors', label: 'Visitors', format: 'count', lede: 'Unique sessions per day' },
  { id: 'conversion', label: 'Conversion rate', format: 'percent', lede: 'Purchases ÷ sessions' },
  { id: 'add_to_cart', label: 'Add to carts', format: 'count', lede: 'Add-to-cart events' },
  { id: 'abandoned', label: 'Abandoned carts', format: 'count', lede: 'Carts marked abandoned' }
];

function dayKey(at) {
  const day = new Date(Number(at) || 0);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
}

export function buildSalesSeries(opts = {}) {
  return buildMetricSeries({ ...opts, metricId: 'revenue' });
}

/**
 * Build a day-bucketed series for the selected chart metric.
 * amountInCents holds chartable values:
 * - money: cents
 * - count: count * 100 (so geometry stays integer-friendly)
 * - percent: rate*10 stored as cents-like (12.5% → 1250) — formatted specially
 */
export function buildMetricSeries({
  metricId = 'revenue',
  events = [],
  sessions = [],
  carts = [],
  orders = [],
  bookings = [],
  products = [],
  periodId = 'week',
  customRange = {}
} = {}) {
  const { start, end } = getPeriodBounds(periodId, customRange);
  const meta = CHART_METRICS.find((m) => m.id === metricId) || CHART_METRICS[0];
  const points = new Map();

  const ensure = (at) => {
    const t = Number(at) || 0;
    if (!inBounds(t, start, end)) return null;
    const key = dayKey(t);
    if (!points.has(key)) {
      const d = new Date(key);
      points.set(key, {
        at: key,
        label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        amountInCents: 0,
        valueCents: 0,
        raw: 0,
        sessions: 0,
        purchases: 0
      });
    }
    return points.get(key);
  };

  const bumpMoney = (at, cents) => {
    const row = ensure(at);
    if (!row) return;
    row.raw += cents;
    row.valueCents = row.raw;
    row.amountInCents = row.raw;
  };

  const bumpCount = (at, n = 1) => {
    const row = ensure(at);
    if (!row) return;
    row.raw += n;
    row.valueCents = row.raw;
    // Store count×100 so finance chart scale stays well-behaved
    row.amountInCents = row.raw * 100;
  };

  if (metricId === 'revenue') {
    for (const e of events) {
      if (e.type === 'purchase' || e.type === 'booking_confirmed') {
        bumpMoney(e.at, Number(e.valueCents) || 0);
      }
    }
    for (const o of orders || []) {
      if (String(o.paymentStatus || '').toLowerCase() === 'paid') {
        bumpMoney(o.timestamp || o.paidAt, Number(o.totalCents) || Number(o.amountInCents) || 0);
      }
    }
    for (const b of bookings || []) {
      if (String(b.paymentStatus || '').toLowerCase() === 'paid') {
        bumpMoney(b.paidAt || b.timestamp, Number(b.amountInCents) || 0);
      }
    }
  } else if (metricId === 'profit') {
    // Lazy import avoided — use inline parse matching getProductUnitCostCents
    const costOf = (line) => {
      const list = products || [];
      const product =
        list.find((p) => p.id === line.productId || p.id === line.id) ||
        list.find((p) => p.name === line.name);
      if (!product) return 0;
      const variant =
        (product.variants || []).find((v) => v.id === line.variantId) || null;
      const source = variant?.cost ?? product.cost;
      const digits = String(source ?? '').replace(/[^\d.]/g, '');
      const value = Number(digits);
      if (!Number.isFinite(value)) return 0;
      return Math.round(value * 100);
    };
    for (const o of orders || []) {
      if (String(o.paymentStatus || '').toLowerCase() !== 'paid') continue;
      const at = o.timestamp || o.paidAt;
      const items = o.items || o.lineItems || [];
      if (!items.length) {
        bumpMoney(at, Number(o.totalCents) || Number(o.amountInCents) || 0);
        continue;
      }
      let profit = 0;
      for (const line of items) {
        const qty = Number(line.quantity) || 1;
        const lineTotal =
          Number(line.lineTotalCents) ||
          (Number(line.unitPriceCents) || 0) * qty;
        profit += lineTotal - costOf(line) * qty;
      }
      bumpMoney(at, Math.max(0, profit));
    }
  } else if (metricId === 'sessions' || metricId === 'visitors') {
    for (const s of sessions || []) {
      bumpCount(s.startedAt || s.lastSeenAt, 1);
    }
  } else if (metricId === 'add_to_cart') {
    for (const e of events || []) {
      if (e.type === 'add_to_cart') bumpCount(e.at, 1);
    }
  } else if (metricId === 'abandoned') {
    for (const c of carts || []) {
      if (c.status === 'abandoned') bumpCount(c.updatedAt, 1);
    }
  } else if (metricId === 'conversion') {
    for (const s of sessions || []) {
      const row = ensure(s.startedAt || s.lastSeenAt);
      if (row) row.sessions += 1;
    }
    for (const e of events || []) {
      if (e.type === 'purchase' || e.type === 'booking_confirmed') {
        const row = ensure(e.at);
        if (row) row.purchases += 1;
      }
    }
    for (const o of orders || []) {
      if (String(o.paymentStatus || '').toLowerCase() === 'paid') {
        const row = ensure(o.timestamp || o.paidAt);
        if (row) row.purchases += 1;
      }
    }
    for (const row of points.values()) {
      const pct = row.sessions > 0 ? (row.purchases / row.sessions) * 100 : 0;
      row.raw = Math.round(pct * 10) / 10;
      row.valueCents = row.raw;
      row.amountInCents = Math.round(row.raw * 100);
    }
  }

  let series = [...points.values()].sort((a, b) => a.at - b.at);
  if (!series.length) {
    const from = start ?? Date.now() - 7 * DAY_MS;
    const to = end ?? Date.now();
    for (let t = from; t <= to; t += DAY_MS) {
      const d = new Date(t);
      d.setHours(0, 0, 0, 0);
      series.push({
        at: d.getTime(),
        label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        amountInCents: 0,
        valueCents: 0,
        raw: 0
      });
    }
  }
  void meta;
  return series;
}

export function formatChartValue(value, format = 'money', currency = 'R') {
  if (format === 'count') {
    return String(Math.round(Number(value) || 0));
  }
  if (format === 'percent') {
    const n = Number(value) || 0;
    return `${n % 1 ? n.toFixed(1) : n}%`;
  }
  return formatMoney(value, currency);
}

/** Map series point amountInCents → display number for tooltips / axis. */
export function chartPointDisplay(point, format = 'money') {
  const amount = Number(point?.amountInCents) || 0;
  if (format === 'count') return Math.round(amount / 100);
  if (format === 'percent') return amount / 100;
  return amount;
}

export function rankCounts(values = []) {
  const map = new Map();
  for (const raw of values) {
    const key = String(raw || '').trim() || '—';
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export function rollupGeo(sessions = []) {
  const rows = rankCounts(
    sessions.map((s) => {
      const city = s.city || '';
      const country = s.country || '';
      if (city && country) return `${city}, ${country}`;
      return country || city || 'Unknown';
    })
  );
  const peak = rows[0]?.count || 1;
  return rows.slice(0, 8).map((row) => ({
    ...row,
    pct: Math.round((row.count / peak) * 100)
  }));
}

export function rankPaths(sessions = [], events = []) {
  const fromSessions = sessions.map((s) => s.path || '/');
  const fromEvents = events
    .filter((e) => e.type === 'page_view')
    .map((e) => e.path || '/');
  return rankCounts([...fromSessions, ...fromEvents]).slice(0, 8);
}

export function rankProducts(events = []) {
  return rankCounts(
    events
      .filter((e) => (e.type === 'product_view' && e.interaction !== 'click') || e.type === 'add_to_cart')
      .map((e) => e.itemName || e.serviceName || e.productName || e.serviceId || e.productId || 'Offer')
  ).slice(0, 8);
}

export function rankReferrers(sessions = []) {
  return rankCounts(
    sessions.map((s) => {
      const ref = String(s.referrer || '').trim();
      if (!ref) return 'Direct';
      try {
        return new URL(ref).hostname.replace(/^www\./, '');
      } catch {
        return ref.slice(0, 40);
      }
    })
  ).slice(0, 8);
}

export function activeCartRows(carts = [], now = Date.now()) {
  return (carts || [])
    .filter(
      (c) =>
        (c.status === 'active' || c.status === 'checkout') &&
        Number(c.updatedAt) >= now - LIVE_CART_WINDOW_MS &&
        (c.items?.length || 0) > 0
    )
    .sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt))
    .slice(0, 12)
    .map((c) => ({
      id: c.cartId || c.id || `${c.status}-${Number(c.updatedAt || 0)}`,
      status: c.status,
      valueCents: c.valueCents || 0,
      itemCount: (c.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0),
      updatedAt: c.updatedAt,
      items: c.items || []
    }));
}

export { buildChartGeometry };

/** Realistic demo payload so local/unconfigured mode still feels finished. */
export function buildDemoAnalytics({ now = Date.now(), orders = [], bookings = [], products: catalogProducts = [], services: catalogServices = [] } = {}) {
  const day = DAY_MS;
  const sessions = [];
  const events = [];
  const carts = [];
  const geos = [
    { country: 'ZA', region: 'Gauteng', city: 'Johannesburg', latitude: -26.2, longitude: 28.0 },
    { country: 'ZA', region: 'Western Cape', city: 'Cape Town', latitude: -33.9, longitude: 18.4 },
    { country: 'GB', region: 'England', city: 'London', latitude: 51.5, longitude: -0.1 },
    { country: 'US', region: 'California', city: 'Los Angeles', latitude: 34.1, longitude: -118.2 },
    { country: 'AU', region: 'NSW', city: 'Sydney', latitude: -33.9, longitude: 151.2 }
  ];
  const paths = ['/home', '/buy', '/book', '/buy/loaf-01', '/checkout'];
  const products = ['Sourdough loaf', 'Weekend brunch', 'Gift box', 'Flat white'];
  const offers = [
    ...(catalogProducts.length ? catalogProducts.slice(0, 4) : products.map((name, index) => ({ id: `p${index}`, name }))).map(item => ({ ...item, kind: 'product' })),
    ...(catalogServices.length ? catalogServices.slice(0, 2) : [{ id: 'cooking', name: 'Cooking' }, { id: 'baking', name: 'Baking' }]).map(item => ({ ...item, kind: 'service' }))
  ];

  for (let i = 0; i < 48; i += 1) {
    const at = now - (i % 10) * day - (i % 12) * 3600000 - 180000;
    const sid = `demo_s_${i}`;
    const geo = geos[i % geos.length];
    const discoverySurface = i % 3 === 0 ? ['places', 'buy', 'book'][Math.floor(i / 3) % 3] : '';
    const candidates = discoverySurface === 'book' ? offers.filter(item => item.kind === 'service') : discoverySurface === 'buy' ? offers.filter(item => item.kind === 'product') : offers;
    const offer = candidates[Math.floor(i / 2) % candidates.length];
    const offerData = { commerceVersion: 1, itemKind: offer.kind, itemName: offer.name,
      ...(offer.kind === 'service' ? { serviceId: offer.id } : { productId: offer.id }) };
    sessions.push({
      analyticsVersion: 2,
      visitorId: `demo_visitor_${i % 24}`,
      visitorFirstSeenAt: i % 4 === 0 ? now - 30 * day : at,
      isReturningVisitor: i % 4 === 0,
      source: i % 3 === 0 ? 'places' : 'direct',
      engagedTimeMs: (i % 6) * 8000,
      engaged: (i % 6) * 8000 >= 10000,
      pageViewCount: 1,
      ...(i >= 4 ? { endedAt: at + (i % 6) * 8000 } : {}),
      sessionId: sid,
      startedAt: at,
      lastSeenAt:
        i < 4
          ? now - i * 8000
          : Math.min(at + 120000, now - LIVE_WINDOW_MS - 1000),
      path: paths[i % paths.length],
      referrer: i % 3 === 0 ? 'https://instagram.com' : i % 5 === 0 ? 'https://google.com' : '',
      ...geo,
      device: i % 2 === 0 ? 'mobile' : 'desktop',
      isBot: false
    });
    events.push({ id: `demo_page_${i}`, analyticsVersion: 2, source: i % 3 === 0 ? 'places' : 'direct', type: 'page_view', sessionId: sid, at, path: paths[i % paths.length] });
    if (i % 3 === 0) {
      events.push({ id: `demo_discovery_${i}`, analyticsVersion: 2, source: 'places', type: 'discovery_visit', discoveryAction: 'business_open', discoveryTarget: 'business', sessionId: sid, at: at + 1000, path: `/app/discovery/${discoverySurface}` });
      events.push({ id: `demo_impression_${i}`, analyticsVersion: 2, source: 'direct', type: 'discovery_visit', discoveryAction: 'impression', discoveryTarget: discoverySurface === 'places' ? 'business' : offer.kind, ...offerData, sessionId: sid, at: at + 500 });
      if (i < 24 && i % 6 === 0) events.push({ id: `demo_lead_${i}`, analyticsVersion: 2, source: 'places', type: 'message_lead', threadId: `demo_thread_${i}`, sessionId: sid, at: at + 2000 });
    }
    if (i % 2 === 0) {
      events.push({
        type: 'product_view',
        ...offerData,
        interaction: 'view',
        sessionId: sid,
        at: at + 30000,
      });
      if (i % 4 === 0) events.push({ id: `demo_click_${i}`, type: 'product_view', interaction: 'click', ...(discoverySurface && discoverySurface !== 'places' ? { discoveryAction: 'offer_click' } : {}),
        ...offerData, sessionId: sid, at: at + 29000 });
    }
    if (i % 3 === 0) {
      events.push({
        type: 'add_to_cart',
        ...offerData,
        sessionId: sid,
        at: at + 60000,
        valueCents: 12000 + (i % 5) * 2500
      });
    }
    if (i % 5 === 0) {
      events.push({
        type: 'begin_checkout',
        commerceVersion: 1,
        sessionId: sid,
        at: at + 90000,
        valueCents: 18000
      });
    }
    if (i % 7 === 0) {
      events.push({
        type: 'purchase',
        sessionId: sid,
        at: at + 120000,
        valueCents: 22000 + (i % 4) * 4000
      });
    }
  }

  // Repeated browser identities retain one first-seen date across their sessions.
  const visitorFirstSeen = new Map();
  for (const session of sessions) visitorFirstSeen.set(session.visitorId, Math.min(visitorFirstSeen.get(session.visitorId) ?? Infinity, session.visitorFirstSeenAt));
  for (const session of sessions) {
    session.visitorFirstSeenAt = visitorFirstSeen.get(session.visitorId);
    session.isReturningVisitor = session.startedAt > session.visitorFirstSeenAt;
  }
  for (const [type, source, records] of [['purchase', 'order', orders], ['booking_confirmed', 'booking', bookings]]) {
    records.slice(0, 3).forEach((record, index) => {
      if (!record.id) return;
      const session = sessions[index * 3];
      events.push({ id: `demo_${source}_${record.id}`, analyticsVersion: 2, source: 'places', type,
        sessionId: session.sessionId, at: Number(record.timestamp) || now - index * day,
        ...(source === 'order' ? { orderId: record.id } : { bookingId: record.id }) });
    });
  }
  const sessionsById = new Map(sessions.map(session => [session.sessionId, session]));
  for (const event of events) {
    const session = sessionsById.get(event.sessionId);
    if (!session) continue;
    Object.assign(event, { analyticsVersion: 2, visitorId: session.visitorId,
      visitorFirstSeenAt: session.visitorFirstSeenAt, isReturningVisitor: session.isReturningVisitor,
      source: session.source });
    const index = Number(session.sessionId.split('_').at(-1));
    if (session.source === 'places') Object.assign(event, { discoveryVersion: 1, discoverySurface: ['places', 'buy', 'book'][Math.floor(index / 3) % 3] });
  }

  for (let i = 0; i < 5; i += 1) {
    carts.push({
      cartId: `demo_cart_${i}`,
      sessionId: `demo_s_${i}`,
      status: i === 0 ? 'checkout' : i === 2 ? 'converted' : i === 3 ? 'abandoned' : 'active',
      valueCents: 15000 + i * 3500,
      updatedAt: i === 4 ? now - 3600000 : now - i * 45000,
      items: [
        {
          name: products[i % products.length],
          quantity: 1 + (i % 2),
          unitPriceCents: 8500
        }
      ]
    });
  }

  return { sessions, events, carts, isDemo: true };
}
