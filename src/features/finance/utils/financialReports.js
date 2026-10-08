import { dedupeReportEvents, reportTimestampMs } from '../../analytics/utils/trafficReports.js';

const DAY = 86400000;
const metric = (id, label, description, format = 'money', extra = {}) => ({ id, label, description, format, ratio: format === 'percent', average: /_aov$/.test(id), ...extra });
const profitDescription = 'Money left from paid sales after their saved product or service costs. This is before refunds, delivery, payment fees, tax and running your business. Every included sale needs a saved cost, even when that cost is zero.';
const marginDescription = 'The share of your paid product or service sales left after their saved costs. For example, a 25% margin means 25c is left from each R1 of sales. This is before refunds and your other business expenses.';
const discoveryGroups = [
  ['discovery', 'Discovery', 'Revenue and profit gained through Places, Discovery Buy and Discovery Book.', 'Places, Discovery Buy or Discovery Book'],
  ['places', 'Places', 'The paid business your Places listing brings you.', 'Places'],
  ['buy', 'Discovery products', 'Revenue and profit from customers who found you on Discovery Buy.', 'Discovery Buy'],
  ['book', 'Discovery services', 'Revenue and profit from customers who found you on Discovery Book.', 'Discovery Book']
];

export const FINANCIAL_REPORT_GROUPS = [
  { id: 'revenue', title: 'Revenue', description: 'Money paid to your business and money refunded to customers.', metrics: [
    metric('revenue', 'Paid revenue', 'The total paid on your product orders and bookings in this period, before refunds. Unpaid orders and booking requests are not included.'),
    metric('refunds', 'Refunds', 'Money actually refunded to customers in this period. A refund counts on its refund date, even if the original sale was earlier.'),
    metric('net_revenue', 'Revenue after refunds', 'Paid revenue minus the refunds made in this period. This can be negative when you refund older sales. It does not subtract your costs.'),
    metric('paid_receipts', 'Paid receipts', 'How many product orders and bookings were paid in this period. Each receipt counts once, even when payment is later refunded.', 'count')
  ] },
  { id: 'profit', title: 'Profit & costs', description: 'What your paid sales leave after saved product and service costs.', metrics: [
    metric('gross_profit', 'Gross profit', profitDescription),
    metric('direct_costs', 'Direct costs', 'The product and service costs saved on the sales paid in this period. These are the costs recorded when each sale was created, so changing a price or cost later does not change this history.'),
    metric('gross_margin', 'Gross margin', marginDescription, 'percent')
  ] },
  { id: 'products', title: 'Products', description: 'Revenue, profit and paid orders across all your product traffic.', metrics: [
    metric('product_revenue', 'Paid revenue', 'The total paid on your product orders in this period, before refunds. The receipt total can include delivery and tax.'),
    metric('paid_orders', 'Paid orders', 'How many product orders were paid in this period. Each order counts once.', 'count'),
    metric('product_profit', 'Gross profit', `For product orders only: ${profitDescription.toLowerCase()}`),
    metric('product_margin', 'Gross margin', `For product orders only: ${marginDescription.toLowerCase()}`, 'percent')
  ] },
  { id: 'services', title: 'Services', description: 'Revenue, profit and paid bookings across all your service traffic.', metrics: [
    metric('booking_revenue', 'Paid revenue', 'The total paid on your service bookings in this period, before refunds. A request that has not been paid is not included.'),
    metric('paid_bookings', 'Paid bookings', 'How many service bookings were paid in this period. Each booking counts once.', 'count'),
    metric('booking_profit', 'Gross profit', `For service bookings only: ${profitDescription.toLowerCase()}`),
    metric('booking_margin', 'Gross margin', `For service bookings only: ${marginDescription.toLowerCase()}`, 'percent')
  ] },
  { id: 'payments', title: 'Payments due', description: 'The current payment status of receipts created in this period.', metrics: [
    metric('unpaid_value', 'Unpaid value', 'The saved total of receipts created in this period that are still unpaid. This shows what is due now, not what was due on each past date.', 'money', { snapshot: true }),
    metric('pending_value', 'Awaiting confirmation', 'The saved total of receipts created in this period with a payment waiting to be confirmed. It becomes paid revenue once payment is confirmed.', 'money', { snapshot: true }),
    metric('pending_receipts', 'Pending receipts', 'How many receipts created in this period currently have a payment waiting to be confirmed.', 'count', { snapshot: true }),
    metric('failed_receipts', 'Failed payments', 'How many receipts created in this period currently have a failed payment. A successful retry removes the receipt from this count.', 'count', { snapshot: true })
  ] },
  { id: 'averages', title: 'Average values', description: 'What customers spend on an average paid order, booking or receipt.', metrics: [
    metric('order_aov', 'Average order value', 'Paid product-order revenue divided by the number of paid product orders in this period. The receipt total can include delivery and tax. Refunds are shown separately.'),
    metric('booking_aov', 'Average booking value', 'Paid booking revenue divided by the number of paid bookings in this period. Refunds are shown separately.'),
    metric('receipt_aov', 'Average receipt value', 'Paid revenue divided by all paid product orders and bookings in this period. Refunds are shown separately.')
  ] },
  { id: 'conversion', title: 'Conversion', description: 'How browsing and checkout turn into orders and booking requests.', metrics: [
    metric('order_conversion', 'Order conversion', 'Of the tracked visits that opened a product page in this period, the percentage that then placed an order during the same visit and period. Placing an order counts before payment. Orders you add manually are not included.', 'percent'),
    metric('booking_conversion', 'Booking conversion', 'Of the tracked visits that opened a service page in this period, the percentage that then sent a booking request during the same visit and period. Sending a request counts before approval or payment. Bookings you add manually are not included.', 'percent'),
    metric('checkout_completion', 'Checkout completion', 'Of the tracked visits that started checkout in this period, the percentage that then created an order or booking request during the same visit and period. Each visit counts once, even with several requests.', 'percent'),
    metric('cart_abandonment', 'Cart abandonment', 'Of the carts last used in this period, the percentage currently abandoned. A cart is abandoned when emptied before checkout or left with items for at least 30 minutes. Returning to it or checking out can change this rate.', 'percent', { snapshot: true })
  ] },
  ...discoveryGroups.map(([id, title, description, name]) => ({ id, title, description, metrics: [
    metric(`${id}_revenue`, 'Paid revenue', `The total paid in this period on orders and bookings from customers who found you through ${name}. The visit that led to the sale can have happened earlier. Refunds are shown separately.`, 'money', { channel: id }),
    metric(`${id}_profit`, 'Gross profit', `Gross profit from paid sales brought in through ${name}. We subtract the saved product and service costs, before refunds and other business expenses. Each included sale needs its own saved cost.`, 'money', { channel: id }),
    metric(`${id}_paid_receipts`, 'Paid receipts', `How many orders and bookings paid in this period came from customers who found you through ${name}. Each receipt counts once.`, 'count', { channel: id }),
    metric(`${id}_revenue_share`, 'Share of revenue', `The percentage of all paid revenue in this period brought in through ${name}. For example, 20% means this discovery source brought in R20 of every R100 paid.`, 'percent', { channel: id })
  ] }))
];

export const FINANCIAL_REPORT_STATISTICS = FINANCIAL_REPORT_GROUPS.flatMap(group => group.metrics.map(row => ({ ...row, groupId: group.id, groupTitle: group.title })));
export const getFinancialStatistic = id => FINANCIAL_REPORT_STATISTICS.find(row => row.id === id);

const text = value => String(value ?? '').trim();
const cents = value => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
const currencyKey = value => ({ R: 'ZAR', '$': 'USD', '€': 'EUR', '£': 'GBP' })[text(value).toUpperCase()] || text(value).toUpperCase() || 'ZAR';
const inPeriod = (at, start, end) => at !== null && Number.isFinite(at) && (start == null || at >= start) && (end == null || at <= end);
const sourceId = row => text(row.sourceId || row.id?.replace(/^(order|booking):/, ''));
const sessionId = row => text(row.analyticsSessionId || row.attribution?.sessionId);
const eventTime = row => reportTimestampMs(row.at ?? row.timestamp ?? row.createdAt);
const createdTime = row => row.createdAtAuthoritative === false ? null : reportTimestampMs(row.actualCreatedAt ?? row.createdAt ?? row.timestamp);
const paidTime = row => row.paidAtAuthoritative === false ? null : reportTimestampMs(row.actualPaidAt ?? row.paidAt);
const refundTime = row => row.refundedAtAuthoritative === false ? null : reportTimestampMs(row.refundedAt);
const paidReceipt = row => row.paymentStatus === 'paid' || (row.paymentStatus === 'refunded' && paidTime(row) !== null);
const amount = row => row.amountAuthoritative === false ? null : cents(row.amountInCents);
const itemRevenue = row => cents(row.source === 'booking' ? row.serviceRevenueInCents : row.productRevenueInCents);
const cost = row => cents(row.costBasisInCents);
const refundAmount = row => cents(row.refundedAmountInCents) ?? (row.refundIsFull === true ? amount(row) : null);
const hasRefund = row => row.paymentStatus === 'refunded' || cents(row.refundedAmountInCents) > 0 || refundTime(row) !== null;
const ratio = (top, bottom) => bottom > 0 ? top / bottom * 100 : null;
const sum = (rows, read) => rows.reduce((total, row) => total + read(row), 0);

function distinctLedger(rows) {
  const map = new Map();
  rows.filter(Boolean).forEach((row, index) => {
    const key = row.id || `${row.source}:${sourceId(row) || index}`;
    const prior = map.get(key);
    if (!prior || (reportTimestampMs(row.updatedAt) ?? 0) >= (reportTimestampMs(prior.updatedAt) ?? 0)) map.set(key, row);
  });
  return [...map.values()];
}

function prepare(options) {
  const observed = options.reportTraffic?.options || options.trafficOptions || {};
  const bots = new Set((observed.sessions || []).filter(row => row.isBot).map(row => text(row.sessionId || row.id)));
  const events = dedupeReportEvents(observed.events || []).filter(row => !bots.has(text(row.sessionId)));
  const entries = new Map();
  const links = new Map();
  events.filter(row => ['places', 'book', 'buy'].includes(row.discoverySurface) && row.discoveryAction !== 'impression').forEach(row => {
    const at = eventTime(row);
    if (at === null) return;
    const key = text(row.sessionId);
    const group = entries.get(key) || [];
    group.push({ at, surface: row.discoverySurface });
    entries.set(key, group);
    for (const [kind, ids] of [['order', [row.orderId]], ['booking', [row.bookingId, ...(row.bookingIds || [])]]]) {
      ids.filter(id => id != null).forEach(id => {
        const linkKey = `${kind}:${id}`;
        const previous = links.get(linkKey);
        if (!previous || at > previous.at) links.set(linkKey, { at, surface: row.discoverySurface });
      });
    }
  });
  entries.forEach(rows => rows.sort((a, b) => b.at - a.at));
  const surfaceFor = row => {
    const origin = row.analyticsSource || row.attribution?.source;
    if (origin && origin !== 'places') return null;
    const explicit = row.discoverySurface || row.attribution?.discoverySurface;
    if (['places', 'book', 'buy'].includes(explicit)) return explicit;
    const linked = links.get(`${row.source}:${sourceId(row)}`);
    if (linked) return linked.surface;
    const at = createdTime(row);
    return at === null ? null : entries.get(sessionId(row))?.find(entry => entry.at <= at)?.surface || null;
  };
  const allRows = distinctLedger(options.ledger || []);
  const nativeCurrency = currencyKey(options.currency || 'R');
  const rows = allRows.filter(row => currencyKey(row.currency || options.currency) === nativeCurrency);
  const surfaceRows = new Map(rows.map(row => [row, surfaceFor(row)]));
  const orderRecords = observed.orders || [];
  const bookingRecords = observed.bookings || [];
  const recordFromLedger = (row, kind) => ({ id: sourceId(row), analyticsSessionId: sessionId(row), timestamp: createdTime(row), source: kind });
  const allOrders = orderRecords.length ? orderRecords : rows.filter(row => row.source === 'order').map(row => recordFromLedger(row, 'order'));
  const allBookings = bookingRecords.length ? bookingRecords : rows.filter(row => row.source === 'booking').map(row => recordFromLedger(row, 'booking'));
  const serviceIds = new Set((observed.services || []).map(row => text(row.id)));
  const productIds = new Set((observed.products || []).map(row => text(row.id)));
  const itemKind = row => row.itemKind === 'product' || row.itemKind === 'service' ? row.itemKind : row.serviceId ? 'service' : row.productId ? (serviceIds.has(text(row.productId)) && !productIds.has(text(row.productId)) ? 'service' : 'product') : null;
  return { observed, bots, events, allRows, rows, surfaceRows, allOrders, allBookings, itemKind };
}

function conversion(context, options, kind) {
  if (options.trackingCoverage === false || context.observed.complete === false) return { value: null, available: false, unavailableReason: 'This rate needs a complete set of visits and checkout activity for the selected period.' };
  const { start, end } = options;
  const candidates = context.events.filter(row => row.discoveryAction !== 'impression' && inPeriod(eventTime(row), start, end));
  const views = candidates.filter(row => row.type === 'product_view' && row.interaction !== 'click');
  if (kind !== 'checkout' && views.some(row => !context.itemKind(row))) return { value: null, available: false, unavailableReason: 'Some older page views do not say whether they were products or services.' };
  const eligible = kind === 'checkout' ? candidates.filter(row => row.type === 'begin_checkout') : views.filter(row => context.itemKind(row) === kind);
  const visits = new Map();
  eligible.forEach(row => {
    const id = text(row.sessionId);
    if (id) visits.set(id, Math.min(visits.get(id) ?? Infinity, eventTime(row)));
  });
  if (eligible.some(row => !text(row.sessionId))) return { value: null, available: false, unavailableReason: 'Some older activity cannot be linked to a visit yet.' };
  const records = kind === 'product' ? context.allOrders : kind === 'service' ? context.allBookings : [...context.allOrders, ...context.allBookings];
  const converted = new Set();
  records.forEach(row => {
    const id = sessionId(row);
    const at = reportTimestampMs(row.timestamp ?? row.createdAt);
    if (row.id && !row.isBot && !context.bots.has(id) && visits.has(id) && inPeriod(at, start, end) && at >= visits.get(id)) converted.add(id);
  });
  const value = ratio(converted.size, visits.size);
  return { value, available: value !== null, numerator: converted.size, denominator: visits.size,
    unavailableReason: value === null ? `There are no ${kind === 'checkout' ? 'checkout starts' : `${kind} page visits`} to compare in this period yet.` : '' };
}

function buildMetrics(options, context) {
  const { start = null, end = null, now = Date.now() } = options;
  const paid = context.rows.filter(row => paidReceipt(row) && inPeriod(paidTime(row), start, end));
  const refunded = context.rows.filter(row => hasRefund(row) && inPeriod(refundTime(row), start, end));
  const created = context.rows.filter(row => inPeriod(createdTime(row), start, end));
  // A receipt cannot be paid or refunded before it was created. Only use a
  // trustworthy creation date here; scheduled booking dates cannot rule it out.
  const mayBelongToPeriod = row => end == null || createdTime(row) === null || createdTime(row) <= end;
  const undatedPaid = context.rows.filter(row => ['paid', 'refunded'].includes(row.paymentStatus) && paidTime(row) === null && mayBelongToPeriod(row));
  const paidDateMissing = undatedPaid.length > 0;
  const productDateMissing = undatedPaid.some(row => row.source !== 'booking');
  const bookingDateMissing = undatedPaid.some(row => row.source !== 'order');
  const refundDateMissing = context.rows.some(row => hasRefund(row) && refundTime(row) === null && mayBelongToPeriod(row) &&
    (end == null || paidTime(row) === null || paidTime(row) <= end));
  const creationDateMissing = status => context.rows.some(row => row.paymentStatus === status && createdTime(row) === null);
  const state = (value, available = value !== null, unavailableReason = '', extra = {}) => ({ value: available ? value : null, available, unavailableReason, ...extra });
  const money = (rows, read = amount, dateMissing = false, dateName = 'payment or refund') => {
    const missing = rows.filter(row => read(row) === null).length;
    const available = !dateMissing && !missing;
    return state(available ? sum(rows, read) : null, available, dateMissing ? `Some receipts are missing their ${dateName} date, so this total cannot be placed in the right period.` : missing ? 'Some receipts are missing their original saved total. Today’s prices are not used to fill the gap.' : '', { receiptCount: rows.length, missingAmountCount: missing });
  };
  const profitability = (rows, dateMissing = paidDateMissing) => {
    const missing = rows.filter(row => itemRevenue(row) === null || cost(row) === null).length;
    const available = !missing && !dateMissing;
    const revenue = available ? sum(rows, itemRevenue) : null;
    const costs = available ? sum(rows, cost) : null;
    const reason = missing ? 'Add costs to your products and services so new sales save them. Some sales in this period are missing a saved cost or item total, so their profit is unavailable.' : dateMissing ? 'Some paid receipts are missing their payment date.' : '';
    return { profit: state(available ? revenue - costs : null, available, reason), costs: state(costs, available, reason), margin: state(available ? ratio(revenue - costs, revenue) : null, available && revenue > 0, reason || 'There are no paid item sales to calculate a margin yet.') };
  };
  const revenue = money(paid, amount, paidDateMissing);
  const refunds = money(refunded, refundAmount, refundDateMissing);
  const profits = profitability(paid);
  const products = paid.filter(row => row.source === 'order');
  const bookings = paid.filter(row => row.source === 'booking');
  const productMoney = money(products, amount, productDateMissing);
  const bookingMoney = money(bookings, amount, bookingDateMissing);
  const productProfit = profitability(products, productDateMissing);
  const bookingProfit = profitability(bookings, bookingDateMissing);
  const average = (rows, total) => state(total.available && rows.length ? Math.round(total.value / rows.length) : null, total.available && rows.length > 0, total.unavailableReason || 'There are no paid receipts to average in this period yet.');
  const stats = {
    revenue, refunds,
    net_revenue: state(revenue.available && refunds.available ? revenue.value - refunds.value : null, revenue.available && refunds.available, revenue.unavailableReason || refunds.unavailableReason),
    paid_receipts: state(paid.length, !paidDateMissing, paidDateMissing ? 'Some paid receipts are missing their payment date.' : ''),
    gross_profit: profits.profit, direct_costs: profits.costs, gross_margin: profits.margin,
    product_revenue: productMoney, paid_orders: state(products.length, !productDateMissing, productMoney.unavailableReason), product_profit: productProfit.profit, product_margin: productProfit.margin,
    booking_revenue: bookingMoney, paid_bookings: state(bookings.length, !bookingDateMissing, bookingMoney.unavailableReason), booking_profit: bookingProfit.profit, booking_margin: bookingProfit.margin,
    unpaid_value: money(created.filter(row => row.paymentStatus === 'unpaid'), amount, creationDateMissing('unpaid'), 'creation'),
    pending_value: money(created.filter(row => row.paymentStatus === 'pending'), amount, creationDateMissing('pending'), 'creation'),
    pending_receipts: state(created.filter(row => row.paymentStatus === 'pending').length, !creationDateMissing('pending'), creationDateMissing('pending') ? 'Some pending receipts are missing their creation date.' : ''),
    failed_receipts: state(created.filter(row => row.paymentStatus === 'failed').length, !creationDateMissing('failed'), creationDateMissing('failed') ? 'Some failed receipts are missing their creation date.' : ''),
    order_aov: average(products, productMoney), booking_aov: average(bookings, bookingMoney), receipt_aov: average(paid, revenue),
    order_conversion: conversion(context, options, 'product'), booking_conversion: conversion(context, options, 'service'), checkout_completion: conversion(context, options, 'checkout')
  };
  const latestCarts = new Map();
  (context.observed.carts || []).filter(row => !row.isBot && !context.bots.has(text(row.sessionId))).forEach((row, index) => {
    const key = text(row.cartId || row.id || row.sessionId) || `cart:${index}`;
    const at = reportTimestampMs(row.updatedAt ?? row.serverUpdatedAt);
    if (!latestCarts.has(key) || at >= latestCarts.get(key).at) latestCarts.set(key, { row, at });
  });
  const carts = [...latestCarts.values()].filter(({ at }) => inPeriod(at, start, end));
  const abandoned = carts.filter(({ row, at }) => row.status === 'abandoned' || (['active', 'checkout'].includes(row.status) && row.items?.some(item => Number(item.quantity) > 0) && now - at >= 30 * 60000)).length;
  const cartAvailable = context.observed.cartTracking === true && context.observed.complete !== false && options.trackingCoverage !== false;
  stats.cart_abandonment = state(cartAvailable ? ratio(abandoned, carts.length) : null, cartAvailable && carts.length > 0, cartAvailable ? 'There are no carts to compare in this period yet.' : 'This rate needs complete cart tracking for the selected period.', { numerator: abandoned, denominator: carts.length });

  const identified = paid.filter(row => ['direct', 'places'].includes(row.analyticsSource || row.attribution?.source) || context.surfaceRows.get(row));
  const instrumented = context.events.some(row => Number(row.discoveryVersion) >= 1) || context.observed.tracking?.attribution === true;
  for (const [id] of discoveryGroups) {
    const attributionKnown = (id === 'discovery' ? identified.length > 0 : paid.some(row => context.surfaceRows.get(row) || (row.analyticsSource || row.attribution?.source) === 'direct')) || instrumented || paid.length === 0;
    const selected = paid.filter(row => id === 'discovery' ? (row.analyticsSource || row.attribution?.source) === 'places' || context.surfaceRows.get(row) : context.surfaceRows.get(row) === id);
    // An undated direct receipt cannot change discovery revenue. An unclassified
    // discovery receipt might belong to any surface, so those totals stay unknown.
    const channelDateMissing = undatedPaid.some(row => {
      const origin = row.analyticsSource || row.attribution?.source;
      if (origin === 'direct') return false;
      const surface = context.surfaceRows.get(row);
      return !surface || id === 'discovery' || surface === id;
    });
    const channelMoney = money(selected, amount, channelDateMissing);
    const channelProfit = profitability(selected, channelDateMissing).profit;
    const legacy = paid.filter(row => (row.analyticsSource || row.attribution?.source) === 'places' && !context.surfaceRows.get(row)).length;
    const coverageNote = `${paid.length - identified.length ? `${paid.length - identified.length} paid ${paid.length - identified.length === 1 ? 'receipt has' : 'receipts have'} no saved discovery source and ${paid.length - identified.length === 1 ? 'is' : 'are'} left out here. ` : ''}${id !== 'discovery' && legacy ? `${legacy} older discovery ${legacy === 1 ? 'receipt does' : 'receipts do'} not name Places, Discovery Buy or Discovery Book. ${legacy === 1 ? 'It is' : 'They are'} included in Discovery totals only.` : ''}`.trim();
    const reason = !attributionKnown ? 'These receipts do not have discovery tracking yet. New visits and sales will save where the customer found you.' : '';
    const attach = value => ({ ...value, value: attributionKnown ? value.value : null, available: attributionKnown && value.available, unavailableReason: reason || value.unavailableReason, coverageNote });
    stats[`${id}_revenue`] = attach(channelMoney);
    stats[`${id}_profit`] = attach(channelProfit);
    stats[`${id}_paid_receipts`] = attach(state(selected.length, !channelDateMissing, channelDateMissing ? 'Some paid receipts from this source are missing their payment date.' : ''));
    stats[`${id}_revenue_share`] = attach(state(channelMoney.available && revenue.available ? ratio(channelMoney.value, revenue.value) : null, channelMoney.available && revenue.available && revenue.value > 0, channelMoney.unavailableReason || revenue.unavailableReason || 'There is no paid revenue to compare in this period yet.'));
  }
  return stats;
}

/** Money uses immutable receipts. Browser events only link visits and discovery sources. */
export function buildFinancialReport(options = {}) {
  const resolved = { start: null, end: null, now: Date.now(), currency: 'R', ...options };
  const context = prepare(resolved);
  const stats = buildMetrics(resolved, context);
  const omittedCurrencyCount = context.allRows.length - context.rows.length;
  const assumedCurrencyCount = context.rows.filter(row => row.currencyAssumed || !row.currency).length;
  const notes = [
    omittedCurrencyCount ? `${omittedCurrencyCount} ${omittedCurrencyCount === 1 ? 'receipt uses' : 'receipts use'} another currency and ${omittedCurrencyCount === 1 ? 'is' : 'are'} excluded. Currency totals are not converted or added together.` : '',
    assumedCurrencyCount ? `${assumedCurrencyCount} older ${assumedCurrencyCount === 1 ? 'receipt uses' : 'receipts use'} your business currency because no currency was saved.` : '',
    resolved.trackingCoverage === false || context.observed.complete === false ? 'Some visits or checkout activity could not be loaded. Conversion rates are unavailable until the selected period has complete tracking.' : ''
  ].filter(Boolean);
  return { stats, options: resolved, currency: resolved.currency, notes, omittedCurrencyCount, assumedCurrencyCount };
}

/** Ratios and averages are rebuilt from each interval; they are never summed or averaged. */
export function buildFinancialHistory({ report, metricId, periodId = 'week' } = {}) {
  const metric = getFinancialStatistic(metricId);
  if (!metric || !report?.stats[metricId]?.available) return { series: [], unit: 'day' };
  const options = report.options;
  const context = prepare(options);
  const times = [...context.rows.flatMap(row => [createdTime(row), paidTime(row), refundTime(row)]), ...context.events.map(eventTime)]
    .filter(at => at !== null && at <= options.now);
  const from = options.start ?? (times.length ? Math.min(...times) : options.now);
  const to = Math.min(options.end ?? options.now, options.now);
  if (to < from) return { series: [], unit: 'day' };
  const days = (to - from) / DAY;
  const unit = periodId === 'day' || days <= 1 ? 'hour' : days > 3650 ? 'year' : days > 120 ? 'month' : days > 45 ? 'week' : 'day';
  const cursor = new Date(from);
  if (unit === 'hour') cursor.setMinutes(0, 0, 0);
  else { cursor.setHours(0, 0, 0, 0); if (unit === 'month' || unit === 'year') cursor.setDate(1); if (unit === 'year') cursor.setMonth(0); }
  const series = [];
  while (cursor.getTime() <= to && series.length < 150) {
    const at = cursor.getTime();
    if (unit === 'hour') cursor.setHours(cursor.getHours() + 1);
    else if (unit === 'year') cursor.setFullYear(cursor.getFullYear() + Math.max(1, Math.ceil(days / 365 / 120)));
    else if (unit === 'month') cursor.setMonth(cursor.getMonth() + 1);
    else cursor.setDate(cursor.getDate() + (unit === 'week' ? 7 : 1));
    const end = Math.min(cursor.getTime() - 1, to);
    const value = buildMetrics({ ...options, start: Math.max(at, from), end }, context)[metricId];
    const raw = value?.available ? value.value : null;
    const label = new Date(at).toLocaleString(undefined, unit === 'hour' ? { hour: 'numeric' } : unit === 'year' ? { year: 'numeric' } : unit === 'month' ? { month: 'short', year: 'numeric' } : { month: 'short', day: 'numeric' });
    series.push({ at, end, label, raw, amountInCents: raw === null ? null : metric.format === 'money' ? raw : raw * 100 });
  }
  return { series, unit };
}
