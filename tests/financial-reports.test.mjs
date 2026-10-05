import test from 'node:test';
import assert from 'node:assert/strict';
import { FINANCIAL_REPORT_GROUPS, FINANCIAL_REPORT_STATISTICS, getFinancialStatistic, buildFinancialReport, buildFinancialHistory } from '../src/features/finance/utils/financialReports.js';

const day = 86400000;
const start = new Date(2026, 9, 1).getTime();
const at = start + 12 * 3600000;
const end = start + 3 * day - 1;
const receipt = (id, extra = {}) => ({ id: `order:${id}`, sourceId: id, source: 'order', paymentStatus: 'paid',
  createdAt: at, paidAt: at + 3600000, currency: 'R', amountAuthoritative: true,
  amountInCents: 12000, productRevenueInCents: 10000, costBasisInCents: 3000, analyticsSource: 'direct', ...extra });
const booking = (id, extra = {}) => receipt(id, { id: `booking:${id}`, source: 'booking',
  amountInCents: 10000, productRevenueInCents: null, serviceRevenueInCents: 10000, costBasisInCents: 4000, ...extra });
const event = (id, type, extra = {}) => ({ id, type, at, sessionId: 's1', ...extra });
const options = extra => ({ start, end, now: end, currency: 'R', ...extra });
const value = (report, id) => report.stats[id].value;
const report = extra => buildFinancialReport(options(extra));

test('financial catalog covers nonredundant business financial categories with clear units', () => {
  assert.equal(FINANCIAL_REPORT_STATISTICS.length, 42);
  assert.equal(new Set(FINANCIAL_REPORT_STATISTICS.map(row => row.id)).size, 42);
  assert.equal(FINANCIAL_REPORT_GROUPS.length, 11);
  assert.equal(getFinancialStatistic('revenue').format, 'money');
  assert.equal(getFinancialStatistic('order_conversion').ratio, true);
  assert.equal(getFinancialStatistic('order_aov').average, true);
  assert.equal(getFinancialStatistic('paid_orders').format, 'count');
  assert.equal(getFinancialStatistic('gross_profit').groupId, 'profit');
  assert.equal(getFinancialStatistic('missing'), undefined);
});

test('paid revenue, actual refunds and gross profit use their separate financial bases', () => {
  const data = report({ ledger: [receipt('p1'), booking('b1'), receipt('r1', {
    paymentStatus: 'refunded', createdAt: at - 32 * day, paidAt: at - 31 * day, refundedAt: at + day,
    amountInCents: 5000, refundedAmountInCents: 4000
  }), receipt('due', { paymentStatus: 'unpaid', paidAt: null })] });
  assert.equal(value(data, 'revenue'), 22000);
  assert.equal(value(data, 'refunds'), 4000);
  assert.equal(value(data, 'net_revenue'), 18000);
  assert.equal(value(data, 'paid_receipts'), 2);
  assert.equal(value(data, 'gross_profit'), 13000, 'Delivery and tax in receipt total are not product profit');
  assert.equal(value(data, 'direct_costs'), 7000);
  assert.equal(value(data, 'gross_margin'), 65);
  assert.equal(value(data, 'product_revenue'), 12000);
  assert.equal(value(data, 'booking_revenue'), 10000);
  assert.equal(value(data, 'paid_orders'), 1);
  assert.equal(value(data, 'paid_bookings'), 1);
  assert.equal(value(data, 'order_aov'), 12000);
  assert.equal(value(data, 'booking_aov'), 10000);
  assert.equal(value(data, 'receipt_aov'), 11000);
});

test('refunds never guess the full receipt amount and require an actual refund date', () => {
  const refunded = receipt('r1', { paymentStatus: 'refunded', refundedAt: at + day, refundedAmountInCents: null });
  assert.equal(value(report({ ledger: [refunded] }), 'refunds'), null);
  assert.equal(value(report({ ledger: [{ ...refunded, refundIsFull: true }] }), 'refunds'), 12000);
  assert.equal(value(report({ ledger: [{ ...refunded, refundedAmountInCents: 3000 }] }), 'refunds'), 3000);
  const undated = report({ ledger: [{ ...refunded, refundedAt: null, refundedAmountInCents: 3000 }] });
  assert.equal(value(undated, 'refunds'), null);
  assert.equal(value(undated, 'net_revenue'), null);
  assert.match(undated.stats.refunds.unavailableReason, /date/);
});

test('a refunded payment still contributes its original paid receipt and later refund separately', () => {
  const data = report({ ledger: [receipt('r1', { paymentStatus: 'refunded', refundedAt: at + day, refundedAmountInCents: 12000 })] });
  assert.equal(value(data, 'revenue'), 12000);
  assert.equal(value(data, 'refunds'), 12000);
  assert.equal(value(data, 'net_revenue'), 0);
  assert.equal(value(data, 'paid_receipts'), 1);
});

test('payment dates govern revenue, creation dates govern payment pipeline and conversion', () => {
  const oldPaid = receipt('old', { createdAt: start - 5 * day, paidAt: start });
  const newUnpaid = receipt('new', { paymentStatus: 'pending', paidAt: null, createdAt: end });
  const futurePaid = receipt('later', { paidAt: end + 1 });
  const data = report({ ledger: [oldPaid, newUnpaid, futurePaid] });
  assert.equal(value(data, 'revenue'), 12000);
  assert.equal(value(data, 'pending_value'), 12000);
  assert.equal(value(data, 'pending_receipts'), 1);
  assert.equal(value(data, 'paid_receipts'), 1);
  assert.equal(value(report({ ledger: [{ ...oldPaid, paidAtAuthoritative: false }] }), 'revenue'), null, 'A display fallback date is not an actual payment date');
});

test('finance never fills missing historical amounts or costs with current catalog data', () => {
  const data = report({ ledger: [receipt('good'), receipt('missing', { amountAuthoritative: false, costBasisInCents: null })], products: [{ id: 'missing', price: 200, cost: 25 }] });
  assert.equal(value(data, 'revenue'), null);
  assert.equal(value(data, 'paid_receipts'), 2, 'Missing money does not erase a recorded payment');
  assert.equal(value(data, 'gross_profit'), null);
  assert.equal(value(data, 'direct_costs'), null);
  assert.equal(value(data, 'order_aov'), null);
  assert.equal(value(report({ ledger: [booking('missing-cost', { costBasisInCents: null })] }), 'booking_profit'), null);
  assert.match(data.stats.gross_profit.unavailableReason, /saved cost/);
});

test('recorded zero costs are valid and signed losses remain visible', () => {
  assert.equal(value(report({ ledger: [receipt('zero-cost', { costBasisInCents: 0 })] }), 'gross_profit'), 10000);
  const data = report({ ledger: [receipt('loss', { costBasisInCents: 15000 })] });
  assert.equal(value(data, 'gross_profit'), -5000);
  assert.equal(value(data, 'gross_margin'), -50);
  const history = buildFinancialHistory({ report: data, metricId: 'gross_profit' });
  assert.equal(history.series[0].amountInCents, -5000);
});

test('native currency aliases match and other currencies are never silently combined', () => {
  const data = report({ ledger: [receipt('a', { currency: 'ZAR' }), receipt('b', { currency: 'USD', amountInCents: 990000 }), booking('c', { currency: 'R' })] });
  assert.equal(value(data, 'revenue'), 22000);
  assert.equal(value(data, 'paid_receipts'), 2);
  assert.equal(data.omittedCurrencyCount, 1);
  assert.match(data.notes.join(' '), /another currency/);
});

test('receipt retries and repeated snapshots cannot inflate financial totals', () => {
  const first = receipt('retry');
  const data = report({ ledger: [first, { ...first }, booking('other')] });
  assert.equal(value(data, 'revenue'), 22000);
  assert.equal(value(data, 'paid_receipts'), 2);
});

test('pending, unpaid and failed receipts show current status grouped by receipt creation date', () => {
  const data = report({ ledger: [receipt('unpaid', { paymentStatus: 'unpaid', paidAt: null }),
    receipt('pending', { paymentStatus: 'pending', paidAt: null, amountInCents: 7500 }),
    receipt('failed', { paymentStatus: 'failed', paidAt: null }),
    receipt('oldpending', { paymentStatus: 'pending', paidAt: null, createdAt: start - 1 })] });
  assert.equal(value(data, 'unpaid_value'), 12000);
  assert.equal(value(data, 'pending_value'), 7500);
  assert.equal(value(data, 'pending_receipts'), 1);
  assert.equal(value(data, 'failed_receipts'), 1);
  assert.equal(value(data, 'revenue'), 0);
});

test('conversion uses the same product or service visit and creation period, independent of payment time', () => {
  const data = report({ ledger: [receipt('later-payment', { paidAt: end + day })], reportTraffic: { options: {
    complete: true,
    events: [event('pv1', 'product_view', { itemKind: 'product' }), event('pv1-repeat', 'product_view', { itemKind: 'product', at: at + 100 }),
      event('pv2', 'product_view', { itemKind: 'product', sessionId: 's2' }),
      event('sv1', 'product_view', { itemKind: 'service', sessionId: 's3' }),
      event('click', 'product_view', { interaction: 'click', itemKind: 'product', sessionId: 's4' }),
      event('start1', 'begin_checkout'), event('start2', 'begin_checkout', { sessionId: 's2' })],
    orders: [{ id: 'new-order', analyticsSessionId: 's1', timestamp: at + 1000 }, { id: 'new-order', analyticsSessionId: 's1', timestamp: at + 1000 },
      { id: 'before-view', analyticsSessionId: 's2', timestamp: at - 1 }, { id: 'outside', analyticsSessionId: 's2', timestamp: end + 1 }],
    bookings: [{ id: 'new-booking', analyticsSessionId: 's3', timestamp: at + 1000 }]
  } } });
  assert.equal(value(data, 'revenue'), 0);
  assert.equal(value(data, 'order_conversion'), 50);
  assert.equal(value(data, 'booking_conversion'), 100);
  assert.equal(value(data, 'checkout_completion'), 50);
  assert.equal(data.stats.order_conversion.denominator, 2);
  assert.equal(data.stats.order_conversion.numerator, 1);
});

test('bots, impressions and manual receipts are excluded from visit conversion', () => {
  const data = report({ reportTraffic: { options: {
    sessions: [{ sessionId: 'bot', isBot: true }],
    events: [event('one', 'product_view', { itemKind: 'product' }), event('bot-view', 'product_view', { sessionId: 'bot', itemKind: 'product' }),
      event('listing', 'discovery_visit', { discoveryAction: 'impression', sessionId: 'impression-person' })],
    orders: [{ id: 'manual', timestamp: at + 1000 }, { id: 'bot-order', analyticsSessionId: 'bot', timestamp: at + 1000 }]
  } } });
  assert.equal(value(data, 'order_conversion'), 0);
  assert.equal(data.stats.order_conversion.denominator, 1);
});

test('conversion and averages have no invented zero when their denominator is missing', () => {
  const data = report({ ledger: [] });
  assert.equal(value(data, 'revenue'), 0);
  for (const id of ['order_aov', 'booking_aov', 'receipt_aov', 'gross_margin', 'order_conversion', 'booking_conversion', 'checkout_completion', 'cart_abandonment']) assert.equal(value(data, id), null, id);
  const limited = report({ reportTraffic: { options: { complete: false, events: [event('view', 'product_view', { itemKind: 'product' })] } } });
  assert.equal(value(limited, 'order_conversion'), null);
  assert.match(limited.notes.join(' '), /complete tracking/);
});

test('cart abandonment uses the latest cart state and avoids counting completed carts twice', () => {
  const data = report({ reportTraffic: { options: { cartTracking: true, complete: true, carts: [
    { id: 'a', updatedAt: at, status: 'active', items: [{ quantity: 1 }] },
    { id: 'b', updatedAt: at, status: 'abandoned', items: [{ quantity: 1 }] },
    { id: 'b', updatedAt: at + 100, status: 'converted', items: [] },
    { id: 'c', updatedAt: at, status: 'active', items: [] }
  ] } } });
  assert.ok(Math.abs(value(data, 'cart_abandonment') - 100 / 3) < 1e-10);
  assert.equal(data.stats.cart_abandonment.denominator, 3);
  assert.equal(data.stats.cart_abandonment.numerator, 1);
});

test('discovery revenue uses authoritative receipts and keeps Places, Buy and Book separate', () => {
  const data = report({ ledger: [receipt('places', { analyticsSource: 'places', discoverySurface: 'places' }),
    receipt('buy', { analyticsSource: 'places', discoverySurface: 'buy' }),
    booking('book', { analyticsSource: 'places', discoverySurface: 'book' }),
    receipt('legacy', { analyticsSource: 'places' }), receipt('direct')], reportTraffic: { options: {
    events: [event('inflated-purchase', 'purchase', { valueCents: 99999999, discoverySurface: 'buy', discoveryVersion: 1 })]
  } } });
  assert.equal(value(data, 'revenue'), 58000);
  assert.equal(value(data, 'discovery_revenue'), 46000);
  assert.equal(value(data, 'places_revenue'), 12000);
  assert.equal(value(data, 'buy_revenue'), 12000);
  assert.equal(value(data, 'book_revenue'), 10000);
  assert.equal(value(data, 'discovery_profit'), 27000);
  assert.equal(value(data, 'buy_profit'), 7000);
  assert.equal(value(data, 'book_profit'), 6000);
  assert.equal(value(data, 'discovery_paid_receipts'), 4);
  assert.equal(value(data, 'buy_revenue_share'), 12000 / 58000 * 100);
  assert.match(data.stats.places_revenue.coverageNote, /Discovery totals only/);
});

test('legacy generic discovery is never guessed to mean Places', () => {
  const data = report({ ledger: [receipt('legacy', { analyticsSource: 'places' })] });
  assert.equal(value(data, 'discovery_revenue'), 12000);
  assert.equal(value(data, 'places_revenue'), null);
  assert.equal(value(data, 'buy_revenue'), null);
  const unknown = report({ ledger: [receipt('unknown', { analyticsSource: null })] });
  assert.equal(value(unknown, 'discovery_revenue'), null);
});

test('receipt discovery fallback uses matching record links or prior visit entry and honors explicit direct', () => {
  const data = report({ ledger: [receipt('linked', { analyticsSource: 'places' }),
    receipt('session', { analyticsSource: 'places', analyticsSessionId: 'entry', createdAt: at + 1000 }),
    receipt('direct', { analyticsSource: 'direct', discoverySurface: 'buy', analyticsSessionId: 'entry' }),
    receipt('future-entry', { analyticsSource: 'places', analyticsSessionId: 'future', createdAt: at })], reportTraffic: { options: {
      events: [event('linked-event', 'purchase', { orderId: 'linked', discoverySurface: 'buy', discoveryVersion: 1 }),
        event('entry', 'page_view', { sessionId: 'entry', at: at - 1, discoverySurface: 'book' }),
        event('future', 'page_view', { sessionId: 'future', at: at + 1, discoverySurface: 'places' })]
    } } });
  assert.equal(value(data, 'buy_revenue'), 12000);
  assert.equal(value(data, 'book_revenue'), 12000);
  assert.equal(value(data, 'places_revenue'), 0, 'A future entry does not retroactively attribute a sale');
  assert.equal(value(data, 'discovery_revenue'), 36000, 'Legacy generic discovery remains in the network total');
});

test('financial interval history totals match period amounts, including actual refund dates', () => {
  const data = report({ ledger: [receipt('a'), booking('b', { paidAt: at + day }), receipt('r', {
    paymentStatus: 'refunded', paidAt: at - day, refundedAt: at + 2 * day, refundedAmountInCents: 5000
  })] });
  for (const id of ['revenue', 'refunds', 'net_revenue', 'paid_receipts', 'gross_profit', 'direct_costs', 'product_revenue', 'booking_revenue']) {
    const history = buildFinancialHistory({ report: data, metricId: id });
    assert.equal(history.series.length, 3);
    assert.equal(history.series.reduce((total, row) => total + row.raw, 0), value(data, id), id);
    assert.equal(history.series[0].amountInCents, getFinancialStatistic(id).format === 'money' ? history.series[0].raw : history.series[0].raw * 100, id);
  }
});

test('history ratios and average values are recomputed per interval without unweighted averages', () => {
  const views = Array.from({ length: 10 }, (_, i) => event(`first-day-${i}`, 'product_view', { sessionId: `day1-${i}`, itemKind: 'product' }));
  views.push(event('next-day', 'product_view', { at: at + day, sessionId: 'day2', itemKind: 'product' }));
  const data = report({ ledger: [receipt('one', { amountInCents: 10000 }), receipt('two', { amountInCents: 50000, paidAt: at + day }), receipt('three', { amountInCents: 10000, paidAt: at + day })], reportTraffic: { options: {
    events: views, orders: [{ id: 'one', analyticsSessionId: 'day1-0', timestamp: at + 1 }, { id: 'two', analyticsSessionId: 'day2', timestamp: at + day + 1 }]
  } } });
  assert.equal(value(data, 'order_conversion'), 2 / 11 * 100);
  assert.deepEqual(buildFinancialHistory({ report: data, metricId: 'order_conversion' }).series.map(row => row.raw), [10, 100, null]);
  assert.equal(value(data, 'order_aov'), Math.round(70000 / 3));
  assert.deepEqual(buildFinancialHistory({ report: data, metricId: 'order_aov' }).series.map(row => row.raw), [10000, 30000, null]);
});

test('all-time history is bounded without dropping the latest years', () => {
  const data = buildFinancialReport({ ledger: [receipt('ancient', { createdAt: new Date(1850, 0, 1).getTime(), paidAt: new Date(1850, 0, 1).getTime() }), receipt('recent')], now: end });
  const history = buildFinancialHistory({ report: data, metricId: 'revenue', periodId: 'all' });
  assert.ok(history.series.length <= 150);
  assert.equal(history.unit, 'year');
  assert.equal(history.series.reduce((total, row) => total + row.raw, 0), value(data, 'revenue'));
});

test('missing booking payment dates do not hide correctly dated product financials', () => {
  const data = report({ ledger: [receipt('product'), booking('undated-booking', { actualPaidAt: null, paidAtAuthoritative: false })] });
  assert.equal(value(data, 'revenue'), null);
  assert.equal(value(data, 'gross_profit'), null);
  assert.equal(value(data, 'booking_revenue'), null);
  assert.equal(value(data, 'product_revenue'), 12000);
  assert.equal(value(data, 'paid_orders'), 1);
  assert.equal(value(data, 'product_profit'), 7000);
  assert.equal(value(data, 'order_aov'), 12000);
  assert.equal(buildFinancialHistory({ report: data, metricId: 'product_revenue' }).series.reduce((total, row) => total + row.raw, 0), 12000);
});

test('missing product payment dates do not hide correctly dated booking financials', () => {
  const data = report({ ledger: [booking('service'), receipt('undated-product', { paidAtAuthoritative: false })] });
  assert.equal(value(data, 'product_revenue'), null);
  assert.equal(value(data, 'booking_revenue'), 10000);
  assert.equal(value(data, 'paid_bookings'), 1);
  assert.equal(value(data, 'booking_profit'), 6000);
  assert.equal(value(data, 'booking_aov'), 10000);
});

test('undated direct receipts cannot invalidate a verified discovery source, but affect revenue share', () => {
  const data = report({ ledger: [receipt('buy', { analyticsSource: 'places', discoverySurface: 'buy' }), receipt('direct-undated', { paidAtAuthoritative: false })] });
  assert.equal(value(data, 'revenue'), null);
  assert.equal(value(data, 'buy_revenue'), 12000);
  assert.equal(value(data, 'buy_profit'), 7000);
  assert.equal(value(data, 'buy_paid_receipts'), 1);
  assert.equal(value(data, 'buy_revenue_share'), null, 'The unknown overall revenue prevents a reliable share');
  assert.equal(value(data, 'places_revenue'), 0);
});

test('undated receipts with a known discovery surface only block that surface and overall discovery', () => {
  const data = report({ ledger: [receipt('buy', { analyticsSource: 'places', discoverySurface: 'buy' }), booking('book-undated', { analyticsSource: 'places', discoverySurface: 'book', paidAtAuthoritative: false })] });
  assert.equal(value(data, 'discovery_revenue'), null);
  assert.equal(value(data, 'book_revenue'), null);
  assert.equal(value(data, 'book_profit'), null);
  assert.equal(value(data, 'buy_revenue'), 12000);
  assert.equal(value(data, 'buy_profit'), 7000);
  assert.equal(value(data, 'places_revenue'), 0);
});

for (const analyticsSource of ['places', null]) {
  test(`undated receipts with unclassified ${analyticsSource || 'unknown'} attribution cannot be ruled out of any discovery source`, () => {
    const data = report({ ledger: [receipt('buy', { analyticsSource: 'places', discoverySurface: 'buy' }), receipt('unclassified-undated', { analyticsSource, paidAtAuthoritative: false })] });
    for (const id of ['discovery', 'places', 'buy', 'book']) {
      assert.equal(value(data, `${id}_revenue`), null, id);
      assert.equal(value(data, `${id}_profit`), null, id);
      assert.equal(value(data, `${id}_paid_receipts`), null, id);
    }
  });
}

test('missing receipt creation dates invalidate only their own current payment-status category', () => {
  const data = report({ ledger: [receipt('unpaid', { paymentStatus: 'unpaid', paidAt: null }), receipt('undated-pending', {
    paymentStatus: 'pending', paidAt: null, createdAtAuthoritative: false, createdAt: at
  })] });
  assert.equal(value(data, 'unpaid_value'), 12000);
  assert.equal(value(data, 'pending_value'), null);
  assert.equal(value(data, 'pending_receipts'), null);
  assert.equal(value(data, 'failed_receipts'), 0);
  assert.match(data.stats.pending_value.unavailableReason, /creation date/);
});

test('undated payments created after a past selected period cannot make its revenue unknown', () => {
  const data = report({ ledger: [receipt('past-paid'), receipt('later-undated', {
    createdAt: end + day, actualCreatedAt: end + day, createdAtAuthoritative: true,
    paidAtAuthoritative: false, analyticsSource: null
  })] });
  assert.equal(value(data, 'revenue'), 12000);
  assert.equal(value(data, 'gross_profit'), 7000);
  assert.equal(value(data, 'paid_orders'), 1);
  assert.equal(value(data, 'order_aov'), 12000);
  assert.equal(value(data, 'discovery_revenue'), 0, 'An unclassified later receipt cannot belong to earlier discovery income');
  const history = buildFinancialHistory({ report: data, metricId: 'revenue' });
  assert.deepEqual(history.series.map(row => row.raw), [12000, 0, 0], 'Later creation cannot blank earlier history buckets');
});

test('undated refunds created or originally paid after the selected period do not block past refunds', () => {
  const data = report({ ledger: [receipt('past-paid'),
    receipt('created-later-refund', { paymentStatus: 'refunded', createdAt: end + day, paidAtAuthoritative: false, refundedAt: null, refundedAmountInCents: 12000 }),
    receipt('paid-later-refund', { paymentStatus: 'refunded', createdAt: start - day, paidAt: end + day, refundedAt: null, refundedAmountInCents: 12000 })
  ] });
  assert.equal(value(data, 'refunds'), 0);
  assert.equal(value(data, 'net_revenue'), 12000);
  assert.deepEqual(buildFinancialHistory({ report: data, metricId: 'net_revenue' }).series.map(row => row.raw), [12000, 0, 0]);
});

test('earlier receipts with missing payment or refund dates remain uncertain for the selected period', () => {
  assert.equal(value(report({ ledger: [receipt('past-paid'), receipt('earlier-undated', { createdAt: start - day, paidAtAuthoritative: false })] }), 'revenue'), null);
  assert.equal(value(report({ ledger: [receipt('past-paid'), receipt('earlier-refund', {
    paymentStatus: 'refunded', createdAt: start - day, paidAt: start - 1, refundedAt: null, refundedAmountInCents: 12000
  })] }), 'refunds'), null);
});

test('a later scheduled booking date cannot substitute for its unknown creation or payment date', () => {
  const data = report({ ledger: [receipt('past-paid'), booking('scheduled-later', {
    createdAt: end + day, actualCreatedAt: null, createdAtAuthoritative: false, paidAtAuthoritative: false
  })] });
  assert.equal(value(data, 'revenue'), null);
  assert.equal(value(data, 'booking_revenue'), null);
  assert.equal(value(data, 'product_revenue'), 12000);
});
