import { getProductUnitPriceCents } from '../../../utils/products';

const DAY_MS = 24 * 60 * 60 * 1000;

export const FINANCE_PERIODS = [
  { id: 'all', label: 'All time', title: 'All time' },
  { id: 'day', label: 'Day', title: 'Today' },
  { id: 'week', label: 'Week', title: 'This week' },
  { id: 'month', label: 'Month', title: 'This month' },
  { id: 'custom', label: 'Custom', title: 'Custom range' }
];

export const CURRENCY_OPTIONS = [
  { id: 'R', label: 'ZAR', symbol: 'R' },
  { id: 'USD', label: 'USD', symbol: '$' },
  { id: 'EUR', label: 'EUR', symbol: '€' }
];

/** Map raw payment statuses onto finance ledger buckets. */
export function normalizeFinanceStatus(raw = '') {
  const value = String(raw || '').toLowerCase();
  if (value === 'paid') return 'paid';
  if (value === 'manual_pending' || value === 'pending') return 'pending';
  if (value === 'failed') return 'failed';
  if (value === 'refunded') return 'refunded';
  if (value === 'unpaid' || value === 'checkout_ready') return 'unpaid';
  return value || 'unpaid';
}

export function formatMoney(cents = 0, currency = 'R', { decimals = false } = {}) {
  const amount = Number(cents || 0) / 100;
  const useDecimals = decimals || Math.abs(amount % 1) > 0.001;
  const [intPart, frac = ''] = amount.toFixed(useDecimals ? 2 : 0).split('.');
  const spaced = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const symbol = CURRENCY_OPTIONS.find((item) => item.id === currency)?.symbol || currency || 'R';
  return useDecimals ? `${symbol} ${spaced},${frac}` : `${symbol} ${spaced}`;
}

function serviceAmountCents(booking, services = []) {
  if (Number.isFinite(booking.amountInCents)) return Number(booking.amountInCents);
  const service = services.find((item) => item.id === booking.serviceId);
  if (!service) return 0;
  const price = Number(service.price);
  if (Number.isFinite(price)) return Math.round(price * 100);
  return getProductUnitPriceCents(service);
}

function bookingTimestamp(booking) {
  if (Number(booking.paidAt)) return Number(booking.paidAt);
  if (Number(booking.timestamp)) return Number(booking.timestamp);
  if (booking.dateKey || booking.date) {
    const key = booking.dateKey || booking.date;
    const [y, m, d] = String(key).split('-').map(Number);
    if (y && m && d) {
      const hours = String(booking.time || '12:00').split(':');
      return new Date(y, m - 1, d, Number(hours[0]) || 12, Number(hours[1]) || 0).getTime();
    }
  }
  return Date.now();
}

function methodLabel(method = '') {
  const value = String(method || '').toLowerCase();
  if (value === 'stripe' || value === 'card') return 'Card';
  if (value === 'paystack') return 'Paystack';
  if (value === 'manual_eft') return 'Manual EFT';
  if (value === 'cash') return 'Cash';
  return method || '—';
}

/**
 * Unify bookings + product orders into a single finance ledger.
 */
export function buildFinanceLedger({ bookings = [], orders = [], services = [], brandName = '' } = {}) {
  const fromBookings = (bookings || []).map((booking) => {
    const createdAt = bookingTimestamp(booking);
    return {
      id: `booking:${booking.id}`,
      sourceId: booking.id,
      source: 'booking',
      clientName: booking.clientName || 'Client',
      clientEmail: booking.clientEmail || '',
      title: booking.serviceName || 'Booking',
      lineItems: [
        {
          name: booking.serviceName || 'Booking',
          quantity: 1,
          lineTotalCents: serviceAmountCents(booking, services)
        }
      ],
      amountInCents: serviceAmountCents(booking, services),
      currency: booking.currency || 'R',
      paymentStatus: normalizeFinanceStatus(booking.paymentStatus),
      method: methodLabel(booking.paymentMethod || booking.paymentGateway || ''),
      createdAt,
      paidAt: booking.paymentStatus === 'paid' ? Number(booking.paidAt) || createdAt : null,
      reference: booking.paymentReference || booking.id,
      brandName
    };
  });

  const fromOrders = (orders || []).map((order) => {
    const createdAt = Number(order.timestamp) || Date.now();
    return {
      id: `order:${order.id}`,
      sourceId: order.id,
      source: 'order',
      clientName: order.clientName || 'Customer',
      clientEmail: order.clientEmail || '',
      title:
        order.items?.length === 1
          ? order.items[0].name
          : `${order.items?.length || 0} products`,
      lineItems: (order.items || []).map((item) => ({
        name: item.name || 'Item',
        quantity: item.quantity || 1,
        lineTotalCents: item.lineTotalCents ?? 0
      })),
      amountInCents: Number(order.amountInCents) || 0,
      currency: order.currency || 'R',
      paymentStatus: normalizeFinanceStatus(order.paymentStatus),
      method: methodLabel(order.paymentMethod),
      createdAt,
      paidAt: order.paymentStatus === 'paid' ? Number(order.paidAt) || createdAt : null,
      reference: order.paymentReference || order.id,
      brandName
    };
  });

  return [...fromBookings, ...fromOrders].sort((a, b) => b.createdAt - a.createdAt);
}

export function getPeriodBounds(periodId, customRange = {}, now = Date.now()) {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const startOfDay = (date) => {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next.getTime();
  };

  if (periodId === 'day') {
    return { start: startOfDay(now), end: end.getTime() };
  }
  if (periodId === 'week') {
    const start = new Date(now);
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
    return { start: startOfDay(start), end: end.getTime() };
  }
  if (periodId === 'month') {
    const start = new Date(now);
    start.setDate(1);
    return { start: startOfDay(start), end: end.getTime() };
  }
  if (periodId === 'custom') {
    const from = customRange.from ? startOfDay(customRange.from) : null;
    const to = customRange.to
      ? (() => {
          const d = new Date(customRange.to);
          d.setHours(23, 59, 59, 999);
          return d.getTime();
        })()
      : end.getTime();
    return { start: from, end: to };
  }
  return { start: null, end: null };
}

export function filterLedgerByPeriod(ledger = [], periodId = 'all', customRange = {}) {
  const { start, end } = getPeriodBounds(periodId, customRange);
  if (start == null && end == null) return ledger;
  return ledger.filter((row) => {
    const ts = row.paidAt || row.createdAt;
    if (start != null && ts < start) return false;
    if (end != null && ts > end) return false;
    return true;
  });
}

export function filterLedgerRows(
  ledger = [],
  { status = 'all', query = '', sort = 'newest' } = {}
) {
  const needle = String(query || '')
    .trim()
    .toLowerCase();
  let rows = ledger;
  if (status && status !== 'all') {
    rows = rows.filter((row) => row.paymentStatus === status);
  }
  if (needle) {
    rows = rows.filter((row) => {
      const hay = [row.clientName, row.title, row.reference, row.method, row.source]
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    });
  }
  const sorted = [...rows].sort((a, b) =>
    sort === 'oldest' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt
  );
  return sorted;
}

export function computeFinanceMetrics(ledger = [], periodId = 'all', now = Date.now()) {
  const paid = ledger.filter((row) => row.paymentStatus === 'paid');
  const pending = ledger.filter((row) => row.paymentStatus === 'pending');
  const totalRevenueInCents = paid.reduce((sum, row) => sum + (row.amountInCents || 0), 0);
  const pendingInCents = pending.reduce((sum, row) => sum + (row.amountInCents || 0), 0);

  let averageMonthlyInCents = totalRevenueInCents;
  if (periodId === 'all' || periodId === 'custom') {
    const timestamps = paid.map((row) => row.paidAt || row.createdAt).filter(Boolean);
    if (timestamps.length) {
      const earliest = Math.min(...timestamps);
      const months = Math.max(1, (now - earliest) / (30 * DAY_MS));
      averageMonthlyInCents = Math.round(totalRevenueInCents / months);
    } else {
      averageMonthlyInCents = 0;
    }
  } else if (periodId === 'month') {
    averageMonthlyInCents = totalRevenueInCents;
  } else if (periodId === 'week') {
    averageMonthlyInCents = Math.round(totalRevenueInCents * (30 / 7));
  } else if (periodId === 'day') {
    averageMonthlyInCents = Math.round(totalRevenueInCents * 30);
  }

  return {
    totalRevenueInCents,
    averageMonthlyInCents,
    pendingInCents,
    paidCount: paid.length,
    pendingCount: pending.length
  };
}

/**
 * Build cumulative paid revenue points for the chart.
 */
export function buildRevenueSeries(ledger = [], periodId = 'all', customRange = {}, now = Date.now()) {
  const paid = ledger
    .filter((row) => row.paymentStatus === 'paid')
    .map((row) => ({
      at: row.paidAt || row.createdAt,
      amount: row.amountInCents || 0
    }))
    .sort((a, b) => a.at - b.at);

  if (!paid.length) return [];

  const { start, end } = getPeriodBounds(periodId, customRange);
  const rangeStart = start ?? paid[0].at;
  const rangeEnd = end ?? now;

  let bucketMs = DAY_MS;
  if (periodId === 'day') bucketMs = 60 * 60 * 1000;
  else if (periodId === 'week') bucketMs = DAY_MS;
  else if (periodId === 'month') bucketMs = DAY_MS;
  else bucketMs = Math.max(DAY_MS, Math.ceil((rangeEnd - rangeStart) / 8));

  const buckets = [];
  for (let t = rangeStart; t <= rangeEnd; t += bucketMs) {
    buckets.push({ at: t, amount: 0 });
  }
  if (!buckets.length || buckets[buckets.length - 1].at < rangeEnd) {
    buckets.push({ at: rangeEnd, amount: 0 });
  }

  paid.forEach((point) => {
    if (point.at < rangeStart || point.at > rangeEnd) return;
    let idx = buckets.findIndex((bucket, i) => {
      const next = buckets[i + 1];
      return point.at >= bucket.at && (!next || point.at < next.at);
    });
    if (idx < 0) idx = buckets.length - 1;
    buckets[idx].amount += point.amount;
  });

  let running = 0;
  return buckets.map((bucket) => {
    running += bucket.amount;
    return {
      at: bucket.at,
      amountInCents: running,
      label: formatSeriesLabel(bucket.at, periodId)
    };
  });
}

function formatSeriesLabel(ts, periodId) {
  const d = new Date(ts);
  if (periodId === 'day') {
    return d.toLocaleTimeString(undefined, { hour: 'numeric' });
  }
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

export function ledgerToCsv(rows = []) {
  const header = [
    'Date',
    'Source',
    'Client',
    'Title',
    'Status',
    'Method',
    'Amount',
    'Currency',
    'Reference'
  ];
  const lines = rows.map((row) =>
    [
      new Date(row.createdAt).toISOString(),
      row.source,
      csvEscape(row.clientName),
      csvEscape(row.title),
      row.paymentStatus,
      row.method,
      (row.amountInCents / 100).toFixed(2),
      row.currency,
      csvEscape(row.reference)
    ].join(',')
  );
  return [header.join(','), ...lines].join('\n');
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function periodTitle(periodId, customRange = {}) {
  const meta = FINANCE_PERIODS.find((item) => item.id === periodId);
  if (periodId === 'custom' && (customRange.from || customRange.to)) {
    const from = customRange.from
      ? new Date(customRange.from).toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short'
        })
      : '…';
    const to = customRange.to
      ? new Date(customRange.to).toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short'
        })
      : '…';
    return `${from} – ${to}`;
  }
  return meta?.title || 'All time';
}
