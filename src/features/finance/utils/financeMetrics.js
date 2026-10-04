import { formatMoney, getPeriodBounds, normalizeFinanceCurrency } from './financeLedger';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Financial views are derived only from authoritative booking/order receipts. */
export const FINANCE_METRICS = Object.freeze([
  { id: 'revenue', label: 'Revenue', format: 'money', description: 'Paid bookings and product orders', chartDescription: 'Cumulative paid revenue', emptyLabel: 'No paid revenue in this period yet.' },
  { id: 'booking_revenue', label: 'Booking revenue', format: 'money', description: 'Revenue from paid booking receipts', chartDescription: 'Cumulative paid booking revenue', emptyLabel: 'No paid booking receipts in this period yet.' },
  { id: 'product_sales', label: 'Product sales', format: 'money', description: 'Revenue from paid product-order receipts', chartDescription: 'Cumulative paid product-order revenue', emptyLabel: 'No paid product orders in this period yet.' },
  { id: 'places_revenue', label: 'Places revenue', format: 'money', description: 'Paid receipts with verified Places discovery attribution', chartDescription: 'Cumulative paid revenue attributed to Places', emptyLabel: 'No paid receipts attributed to Places in this period.' },
  { id: 'profit', label: 'Product profit', format: 'money', description: 'Product sales less recorded transaction cost', chartDescription: 'Cumulative gross product profit · excludes delivery, fees and tax', emptyLabel: 'No paid product orders in this period yet.' },
  { id: 'aov', label: 'Average order value', format: 'money', description: 'Average value of paid product orders', chartDescription: 'Running average of paid product-order totals', emptyLabel: 'No paid product orders to average in this period yet.' },
  { id: 'average_monthly_revenue', label: 'Average monthly revenue', format: 'money', description: 'Paid revenue per calendar month covered', chartDescription: 'Running paid revenue per calendar month covered', emptyLabel: 'No paid revenue to average in this period yet.' },
  { id: 'pending_payments', label: 'Pending payments', format: 'money', description: 'Receipts with payment awaiting confirmation', chartDescription: 'Cumulative value of currently pending receipts', emptyLabel: 'No pending payment receipts in this period.' },
  { id: 'paid_transactions', label: 'Paid transactions', format: 'count', description: 'Paid booking and product-order receipts', chartDescription: 'Cumulative paid receipt count', emptyLabel: 'No paid transactions in this period yet.' },
  { id: 'refunds', label: 'Refunds', format: 'money', description: 'Recorded refunded receipt totals', chartDescription: 'Cumulative refunded receipt totals', emptyLabel: 'No refunded receipts in this period.' }
]);

export function getFinanceMetric(id = 'revenue') {
  return FINANCE_METRICS.find((metric) => metric.id === id) || FINANCE_METRICS[0];
}

export function formatFinanceMetricValue(value, format = 'money', currency = 'R', { axis = false } = {}) {
  if (value == null || !Number.isFinite(Number(value))) return 'Unavailable';
  if (format === 'count') return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Number(value) / 100);
  return formatMoney(Number(value), currency, { decimals: axis ? false : 'auto' });
}

const finiteAmount = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const safeSnapshot = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const timeOf = (row, metricId) => Number(metricId === 'refunds' ? row.refundedAt || row.createdAt : row.paidAt || row.createdAt);
const inBounds = (at, { start, end }) => Number.isFinite(at) && (start == null || at >= start) && (end == null || at <= end);

function calendarMonths(start, end) {
  const from = new Date(start);
  const to = new Date(end);
  return Math.max(1, (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth() + 1);
}

function distinctReceipts(ledger) {
  const seen = new Set();
  return (ledger || []).filter((row) => {
    if (!row?.id) return Boolean(row);
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

function metricRows(ledger, metricId) {
  if (metricId === 'pending_payments') return ledger.filter((row) => row.paymentStatus === 'pending');
  if (metricId === 'refunds') return ledger.filter((row) => row.paymentStatus === 'refunded');
  const paid = ledger.filter((row) => row.paymentStatus === 'paid');
  if (metricId === 'booking_revenue') return paid.filter((row) => row.source === 'booking');
  if (metricId === 'places_revenue') return paid.filter((row) => row.analyticsSource === 'places');
  if (['product_sales', 'profit', 'aov'].includes(metricId)) return paid.filter((row) => row.source === 'order');
  return paid;
}

function rowValue(row, metricId) {
  if (metricId === 'paid_transactions') return 100;
  if (metricId === 'profit') return row.productRevenueInCents - row.costBasisInCents;
  return finiteAmount(metricId === 'refunds' ? row.refundedAmountInCents ?? row.amountInCents : row.amountInCents);
}

function hasMetricAmount(row, metricId) {
  if (metricId === 'paid_transactions' || metricId === 'profit') return true;
  if (metricId === 'refunds' && safeSnapshot(row.refundedAmountInCents)) return true;
  return row.amountAuthoritative !== false && safeSnapshot(row.amountInCents);
}

function seriesLabel(at, periodId) {
  return periodId === 'day'
    ? new Date(at).toLocaleTimeString(undefined, { hour: 'numeric' })
    : new Date(at).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

function buildSeries(rows, metric, bounds, periodId, rangeStart, rangeEnd) {
  if (!rows.length || !Number.isFinite(rangeStart) || !Number.isFinite(rangeEnd) || rangeEnd < rangeStart) return [];
  let bucketMs = periodId === 'day' ? 60 * 60 * 1000 : DAY_MS;
  if (periodId === 'all' || periodId === 'custom') bucketMs = Math.max(DAY_MS, Math.ceil((rangeEnd - rangeStart) / 14));
  const buckets = [];
  for (let at = rangeStart; at <= rangeEnd && buckets.length < 750; at += bucketMs) buckets.push({ at, total: 0, count: 0 });
  if (!buckets.length) buckets.push({ at: rangeStart, total: 0, count: 0 });
  if (buckets.at(-1).at < rangeEnd) buckets.push({ at: rangeEnd, total: 0, count: 0 });
  for (const row of rows) {
    const at = timeOf(row, metric.id);
    if (!inBounds(at, bounds) || at < rangeStart || at > rangeEnd) continue;
    let index = buckets.findIndex((bucket, i) => at >= bucket.at && (!buckets[i + 1] || at < buckets[i + 1].at));
    if (index < 0) index = buckets.length - 1;
    buckets[index].total += rowValue(row, metric.id);
    buckets[index].count += 1;
  }
  let total = 0;
  let count = 0;
  return buckets.map((bucket) => {
    total += bucket.total;
    count += bucket.count;
    const amountInCents = metric.id === 'aov'
      ? (count ? Math.round(total / count) : 0)
      : metric.id === 'average_monthly_revenue'
        ? Math.round(total / calendarMonths(rangeStart, bucket.at))
        : total;
    return { at: bucket.at, amountInCents, label: seriesLabel(bucket.at, periodId) };
  });
}

export function buildFinanceMetricView({ ledger = [], metricId = 'revenue', periodId = 'all', customRange = {}, currency = 'R', now = Date.now() } = {}) {
  const metric = getFinanceMetric(metricId);
  const bounds = getPeriodBounds(periodId, customRange, now);
  const allReceipts = distinctReceipts(ledger);
  const nativeCurrency = normalizeFinanceCurrency(currency);
  const sameCurrency = (row) => normalizeFinanceCurrency(row.currency || currency) === nativeCurrency;
  const allMetricRows = metricRows(allReceipts, metric.id).filter((row) => inBounds(timeOf(row, metric.id), bounds));
  const omittedCurrencyCount = allMetricRows.filter((row) => !sameCurrency(row)).length;
  const assumedCurrencyCount = allMetricRows.filter((row) => sameCurrency(row) && (row.currencyAssumed || !row.currency)).length;
  const receipts = allReceipts.filter(sameCurrency);
  const nativeRows = allMetricRows.filter(sameCurrency);
  const missingAmountCount = nativeRows.filter((row) => !hasMetricAmount(row, metric.id)).length;
  const rows = nativeRows.filter((row) => hasMetricAmount(row, metric.id));
  const timestamps = receipts.map((row) => Number(row.paidAt || row.createdAt)).filter(Number.isFinite);
  const rangeStart = bounds.start ?? (timestamps.length ? Math.min(...timestamps) : now);
  const rowTimes = rows.map((row) => timeOf(row, metric.id));
  const rangeEnd = bounds.end ?? Math.max(now, ...rowTimes);
  const monthsCovered = calendarMonths(rangeStart, rangeEnd);
  const costAvailable = metric.id !== 'profit' || (rows.length > 0 && rows.every((row) =>
    safeSnapshot(row.costBasisInCents) && safeSnapshot(row.productRevenueInCents)));
  const periodPaid = receipts.filter((row) => row.paymentStatus === 'paid' && inBounds(timeOf(row, metric.id), bounds));
  const attributed = periodPaid.filter((row) => ['places', 'direct'].includes(row.analyticsSource));
  const attributionAvailable = metric.id !== 'places_revenue' || attributed.length > 0;
  const amountAvailable = nativeRows.length === 0 || rows.length > 0;
  const available = costAvailable && attributionAvailable && amountAvailable;
  const unavailableReason = !amountAvailable
    ? 'Unavailable: original receipt totals were not recorded. Current catalog prices are not used as historical revenue.'
    : !costAvailable
    ? 'Product profit is unavailable: transaction cost snapshots are missing. Current catalog costs are not used as historical costs.'
    : !attributionAvailable
      ? 'Places revenue is unavailable for this period: these receipts do not contain verified discovery-source tracking.'
      : '';
  const total = available ? rows.reduce((sum, row) => sum + rowValue(row, metric.id), 0) : null;
  const value = total == null ? null : metric.id === 'aov'
    ? (rows.length ? Math.round(total / rows.length) : 0)
    : metric.id === 'average_monthly_revenue'
      ? Math.round(total / monthsCovered)
      : total;
  const description = metric.id === 'average_monthly_revenue'
      ? `Paid revenue ÷ ${monthsCovered} calendar ${monthsCovered === 1 ? 'month' : 'months'} covered. Not a projection.`
      : metric.id === 'places_revenue'
        ? `Verified Places-attributed paid receipts only. ${periodPaid.length - attributed.length} untracked ${periodPaid.length - attributed.length === 1 ? 'receipt is' : 'receipts are'} excluded.`
      : metric.id === 'refunds' && rows.some((row) => !row.refundedAt)
        ? 'Recorded refunded receipt totals. Receipts without a refund date use their original receipt date.'
        : metric.description;
  const currencyNote = [
    omittedCurrencyCount ? `${omittedCurrencyCount} ${omittedCurrencyCount === 1 ? 'receipt in another currency is' : 'receipts in other currencies are'} excluded. No currency conversion.` : '',
    assumedCurrencyCount ? `${assumedCurrencyCount} legacy ${assumedCurrencyCount === 1 ? 'receipt uses' : 'receipts use'} the business currency because no currency was recorded.` : ''
  ].filter(Boolean).join(' ');
  const amountNote = missingAmountCount
    ? `${missingAmountCount} ${missingAmountCount === 1 ? 'receipt is' : 'receipts are'} excluded because the original total was not recorded.`
    : '';
  const coverageNote = [amountNote, currencyNote].filter(Boolean).join(' ');
  return {
    metric, value, available, unavailableReason, receiptCount: rows.length, omittedCurrencyCount, assumedCurrencyCount, missingAmountCount,
    description: [description, coverageNote].filter(Boolean).join(' '), currencyNote, coverageNote,
    series: available ? buildSeries(rows, metric, bounds, periodId, rangeStart, rangeEnd) : []
  };
}
