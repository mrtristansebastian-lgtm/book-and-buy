import {
  FINANCE_PERIODS,
  formatMoney,
  getPeriodBounds,
  periodTitle
} from '../../finance/utils/financeLedger';
import { buildChartGeometry } from '../../finance/utils/financeChartScale';
import { LIVE_WINDOW_MS } from '../../../shared/analytics/beacon';

export { FINANCE_PERIODS as ANALYTICS_PERIODS, formatMoney, periodTitle, getPeriodBounds };

const DAY_MS = 24 * 60 * 60 * 1000;

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
  const liveCutoff = now - LIVE_WINDOW_MS;
  const liveSessions = sessions.filter(
    (s) => Number(s.lastSeenAt) >= liveCutoff && !s.isBot
  );
  const activeCarts = carts.filter(
    (c) =>
      (c.status === 'active' || c.status === 'checkout') &&
      Number(c.updatedAt) >= now - 30 * 60 * 1000 &&
      (c.items?.length || 0) > 0
  );
  const activeCheckouts = carts.filter(
    (c) => c.status === 'checkout' && Number(c.updatedAt) >= now - 30 * 60 * 1000
  );
  return {
    liveVisitors: liveSessions.length,
    activeCarts: activeCarts.length,
    activeCheckouts: activeCheckouts.length,
    livePaths: rankCounts(liveSessions.map((s) => s.path || '/')).slice(0, 5)
  };
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

  const productViews = events.filter((e) => e.type === 'product_view').length;
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
  const productViews = events.filter((e) => e.type === 'product_view').length;
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

export function buildSalesSeries({
  events = [],
  orders = [],
  bookings = [],
  periodId = 'week',
  customRange = {}
} = {}) {
  const { start, end } = getPeriodBounds(periodId, customRange);
  const points = new Map();

  const bump = (at, cents) => {
    const t = Number(at) || 0;
    if (!inBounds(t, start, end)) return;
    const day = new Date(t);
    day.setHours(0, 0, 0, 0);
    const key = day.getTime();
    const prev = points.get(key) || { at: key, label: '', valueCents: 0, amountInCents: 0 };
    prev.valueCents += cents;
    prev.amountInCents = prev.valueCents;
    prev.label = day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    points.set(key, prev);
  };

  for (const e of events) {
    if (e.type === 'purchase' || e.type === 'booking_confirmed') {
      bump(e.at, Number(e.valueCents) || 0);
    }
  }
  for (const o of orders || []) {
    if (String(o.paymentStatus || '').toLowerCase() === 'paid') {
      bump(o.timestamp || o.paidAt, Number(o.totalCents) || Number(o.amountInCents) || 0);
    }
  }
  for (const b of bookings || []) {
    if (String(b.paymentStatus || '').toLowerCase() === 'paid') {
      bump(b.paidAt || b.timestamp, Number(b.amountInCents) || 0);
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
        valueCents: 0,
        amountInCents: 0
      });
    }
  }

  return series;
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
      .filter((e) => e.type === 'product_view' || e.type === 'add_to_cart')
      .map((e) => e.productName || e.productId || 'Product')
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
        Number(c.updatedAt) >= now - 24 * 60 * 60 * 1000 &&
        (c.items?.length || 0) > 0
    )
    .sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt))
    .slice(0, 12)
    .map((c) => ({
      id: c.cartId,
      status: c.status,
      valueCents: c.valueCents || 0,
      itemCount: (c.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0),
      updatedAt: c.updatedAt,
      items: c.items || []
    }));
}

export { buildChartGeometry };

/** Realistic demo payload so local/unconfigured mode still feels finished. */
export function buildDemoAnalytics({ now = Date.now() } = {}) {
  const day = DAY_MS;
  const sessions = [];
  const events = [];
  const carts = [];
  const geos = [
    { country: 'ZA', region: 'Gauteng', city: 'Johannesburg' },
    { country: 'ZA', region: 'Western Cape', city: 'Cape Town' },
    { country: 'GB', region: 'England', city: 'London' },
    { country: 'US', region: 'California', city: 'Los Angeles' },
    { country: 'AU', region: 'NSW', city: 'Sydney' }
  ];
  const paths = ['/home', '/buy', '/book', '/buy/loaf-01', '/checkout'];
  const products = ['Sourdough loaf', 'Weekend brunch', 'Gift box', 'Flat white'];

  for (let i = 0; i < 48; i += 1) {
    const at = now - Math.floor(Math.random() * 10) * day - Math.floor(Math.random() * 12) * 3600000;
    const sid = `demo_s_${i}`;
    const geo = geos[i % geos.length];
    sessions.push({
      sessionId: sid,
      startedAt: at,
      lastSeenAt: i < 4 ? now - i * 8000 : at + 120000,
      path: paths[i % paths.length],
      referrer: i % 3 === 0 ? 'https://instagram.com' : i % 5 === 0 ? 'https://google.com' : '',
      ...geo,
      device: i % 2 === 0 ? 'mobile' : 'desktop',
      isBot: false
    });
    events.push({ type: 'page_view', sessionId: sid, at, path: paths[i % paths.length] });
    if (i % 2 === 0) {
      events.push({
        type: 'product_view',
        sessionId: sid,
        at: at + 30000,
        productId: `p${i % 4}`,
        productName: products[i % 4]
      });
    }
    if (i % 3 === 0) {
      events.push({
        type: 'add_to_cart',
        sessionId: sid,
        at: at + 60000,
        productName: products[i % 4],
        valueCents: 12000 + (i % 5) * 2500
      });
    }
    if (i % 5 === 0) {
      events.push({
        type: 'begin_checkout',
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

  for (let i = 0; i < 5; i += 1) {
    carts.push({
      cartId: `demo_cart_${i}`,
      sessionId: `demo_s_${i}`,
      status: i === 0 ? 'checkout' : 'active',
      valueCents: 15000 + i * 3500,
      updatedAt: now - i * 45000,
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
