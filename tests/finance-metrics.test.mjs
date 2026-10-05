import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const modules = new Map();
function load(path) {
  const file = new URL(path, import.meta.url);
  if (modules.has(file.href)) return modules.get(file.href);
  const source = readFileSync(file, 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const module = { exports: {} };
  modules.set(file.href, module.exports);
  const scopedRequire = (id) => {
    if (!id.startsWith('.')) return require(id);
    const base = new URL(id, file);
    const target = [base, new URL(`${base.href}.js`), new URL(`${base.href}.jsx`)].find(existsSync);
    if (!target) throw new Error(`Cannot resolve ${id}`);
    return load(target.href);
  };
  new Function('module', 'exports', 'require', outputText)(module, module.exports, scopedRequire);
  return module.exports;
}

const { buildFinanceLedger, normalizeFinanceCurrency } = load('../src/features/finance/utils/financeLedger.js');
const { FINANCE_METRICS, buildFinanceMetricView, formatFinanceMetricValue } = load('../src/features/finance/utils/financeMetrics.js');
const { buildChartGeometry } = load('../src/features/finance/utils/financeChartScale.js');
const { RevenueMetricCards } = load('../src/features/finance/components/RevenueMetricCards.jsx');
const { TransactionReceiptCard } = load('../src/features/finance/components/TransactionReceiptCard.jsx');
const { parseAppRoute, workspacePagePath } = load('../src/app/routing.js');
const at = (day, month = 9) => new Date(2026, month, day, 12).getTime();
const now = at(4);
const ledger = [
  { id: 'booking:paid', source: 'booking', paymentStatus: 'paid', amountInCents: 10000, paidAt: at(1), createdAt: at(1), analyticsSource: 'places' },
  { id: 'order:paid1', source: 'order', paymentStatus: 'paid', amountInCents: 25000, paidAt: at(2), createdAt: at(2), analyticsSource: 'direct' },
  { id: 'order:paid2', source: 'order', paymentStatus: 'paid', amountInCents: 35000, paidAt: at(3), createdAt: at(3) },
  { id: 'order:pending', source: 'order', paymentStatus: 'pending', amountInCents: 12000, createdAt: at(2) },
  { id: 'booking:unpaid', source: 'booking', paymentStatus: 'unpaid', amountInCents: 50000, createdAt: at(2) },
  { id: 'order:refund', source: 'order', paymentStatus: 'refunded', amountInCents: 18000, refundedAmountInCents: 15000, createdAt: at(4, 8), refundedAt: at(3) }
];
const view = (metricId, extra = {}) => buildFinanceMetricView({ ledger, metricId, now, ...extra });

test('finance uses one authoritative receipt basis, not purchase events or duplicate copies', () => {
  const revenue = view('revenue');
  assert.equal(revenue.value, 70000);
  assert.equal(revenue.series.at(-1).amountInCents, revenue.value);
  assert.equal(view('booking_revenue').value, 10000);
  assert.equal(view('product_sales').value, 60000);
  assert.equal(view('aov').value, 30000, 'AOV excludes bookings and unconfirmed payments');
  assert.equal(view('pending_payments').value, 12000, 'Unpaid checkout attempts are not pending-payment receipts');
  assert.equal(view('paid_transactions').value, 300, 'Count graph values are scaled by 100, never formatted as currency');
  assert.equal(buildFinanceMetricView({ ledger: [...ledger, ledger[0]], metricId: 'revenue', now, events: [{ type: 'purchase', valueCents: 999999 }] }).value, 70000);
});

test('selected money and count metrics format both cards and chart values with their real units', () => {
  assert.equal(formatFinanceMetricValue(12345, 'money', 'R'), 'R 123,45');
  assert.equal(formatFinanceMetricValue(12345, 'money', 'USD'), '$ 123,45');
  assert.equal(formatFinanceMetricValue(12345, 'money', 'ZAR'), 'R 123,45');
  assert.equal(formatFinanceMetricValue(12345, 'money', '£'), '£ 123,45');
  assert.equal(formatFinanceMetricValue(300, 'count', 'R'), '3');
  assert.equal(formatFinanceMetricValue(0, 'count'), '0');
  assert.equal(formatFinanceMetricValue(null, 'money'), 'Unavailable');
  assert.equal(formatFinanceMetricValue(NaN, 'count'), 'Unavailable');
});

test('average monthly revenue is recorded revenue per calendar month, never an extrapolated forecast', () => {
  const month = view('average_monthly_revenue', { periodId: 'month' });
  assert.equal(month.value, 70000);
  assert.match(month.description, /1 calendar month covered\. Not a projection/);
  const day = view('average_monthly_revenue', { periodId: 'day', now: at(1) });
  assert.equal(day.value, 10000, 'One day is not multiplied by 30');
  const custom = view('average_monthly_revenue', { periodId: 'custom', customRange: { from: '2026-09-01', to: '2026-10-04' } });
  assert.equal(custom.value, 35000);
  assert.equal(custom.series.at(-1).amountInCents, custom.value);
  assert.match(custom.description, /2 calendar months/);
});

test('refunds use actual refund amount/date when present and clearly identify legacy date fallback', () => {
  const refunds = view('refunds', { periodId: 'month' });
  assert.equal(refunds.value, 15000, 'A September receipt refunded in October belongs to the October refund view');
  assert.equal(refunds.series.at(-1).amountInCents, 15000);
  const legacy = buildFinanceMetricView({ ledger: [{ ...ledger.at(-1), refundedAt: null, refundedAmountInCents: null }], metricId: 'refunds', now });
  assert.equal(legacy.value, 18000);
  assert.match(legacy.description, /original receipt date/);
});

test('Places revenue only counts verified persisted source attribution and discloses partial coverage', () => {
  const places = view('places_revenue');
  assert.equal(places.value, 10000);
  assert.equal(places.available, true);
  assert.match(places.description, /1 untracked receipt is excluded/);
  const legacy = buildFinanceMetricView({ ledger: [{ ...ledger[0], analyticsSource: null, source: 'places' }], metricId: 'places_revenue', now });
  assert.equal(legacy.available, false);
  assert.equal(legacy.value, null);
  assert.equal(legacy.series.length, 0);
  assert.match(legacy.unavailableReason, /verified discovery-source tracking/);
  const direct = buildFinanceMetricView({ ledger: [ledger[1]], metricId: 'places_revenue', now });
  assert.equal(direct.available, true);
  assert.equal(direct.value, 0, 'Verified direct sales honestly produce no Places revenue');
});

test('profit is unavailable with missing or partial historical cost snapshots rather than pretending costs are zero', () => {
  const missing = view('profit');
  assert.equal(missing.available, false);
  assert.equal(missing.value, null);
  assert.equal(missing.series.length, 0);
  assert.match(missing.unavailableReason, /Current catalog costs are not used/);
  const partial = buildFinanceMetricView({ ledger: [{ ...ledger[1], costBasisInCents: 10000, productRevenueInCents: 24000 }, ledger[2]], metricId: 'profit', now });
  assert.equal(partial.available, false, 'A partially costed subset must not masquerade as whole-period profit');
  const invalid = buildFinanceMetricView({ ledger: [{ ...ledger[1], costBasisInCents: -1, productRevenueInCents: 24000 }], metricId: 'profit', now });
  assert.equal(invalid.available, false);
});

test('profit honours recorded product subtotals, zero costs and real losses without including delivery or clamping', () => {
  const rows = [
    { ...ledger[1], costBasisInCents: 0, productRevenueInCents: 24000 },
    { ...ledger[2], costBasisInCents: 40000, productRevenueInCents: 30000 }
  ];
  const profit = buildFinanceMetricView({ ledger: rows, metricId: 'profit', now });
  assert.equal(profit.available, true);
  assert.equal(profit.value, 14000);
  const loss = buildFinanceMetricView({ ledger: [rows[1]], metricId: 'profit', now });
  assert.equal(loss.value, -10000);
  assert.equal(loss.series.at(-1).amountInCents, -10000);
  const geometry = buildChartGeometry(loss.series, { width: 320, height: 260 });
  assert.ok(geometry.niceMinCents < 0);
  assert.ok(geometry.ticksY.some((tick) => tick.valueCents < 0));
  for (const point of geometry.coords) assert.ok(point.y >= geometry.plot.y && point.y <= geometry.plot.y + geometry.plot.height);
  assert.match(formatFinanceMetricValue(loss.value, 'money'), /-100/);
});

test('ledger carries financial snapshots/attribution without changing receipt line items or payment status', () => {
  const rows = buildFinanceLedger({ orders: [
    { id: 'snapshot', timestamp: at(2), paymentStatus: 'paid', amountInCents: 32000, subtotalCents: 30000, analyticsSource: 'places', items: [{ name: 'Apron', quantity: 2, lineTotalCents: 30000, unitCostInCents: 5000 }] },
    { id: 'legacy', timestamp: at(2), paymentStatus: 'manual_pending', amountInCents: 50000, analyticsSource: 'public_shop', items: [{ name: 'Kit', quantity: 1, lineTotalCents: 50000, cost: 100 }] }
  ] });
  const snapshot = rows.find((row) => row.sourceId === 'snapshot');
  assert.equal(snapshot.costBasisInCents, 10000);
  assert.equal(snapshot.productRevenueInCents, 30000);
  assert.equal(snapshot.analyticsSource, 'places');
  assert.equal(snapshot.amountInCents, 32000);
  assert.deepEqual(snapshot.lineItems, [{ name: 'Apron', quantity: 2, lineTotalCents: 30000 }]);
  const legacy = rows.find((row) => row.sourceId === 'legacy');
  assert.equal(legacy.costBasisInCents, null, 'Mutable/unspecified cost fields are not snapshot cost');
  assert.equal(legacy.analyticsSource, null);
  assert.equal(legacy.paymentStatus, 'pending');
});

test('every metric and period shares one card/chart state with explicit honest empty states', () => {
  assert.equal(FINANCE_METRICS.length, 10);
  for (const metric of FINANCE_METRICS) {
    const metricView = view(metric.id);
    assert.equal(metricView.metric.id, metric.id);
    if (metricView.available && metricView.series.length) assert.equal(metricView.series.at(-1).amountInCents, metricView.value, metric.id);
    assert.ok(metric.emptyLabel && metric.chartDescription);
    const html = renderToStaticMarkup(React.createElement(RevenueMetricCards, { metricView, currency: 'R', onMetricChange: () => {} }));
    assert.equal((html.match(/<article/g) || []).length, 1);
    assert.doesNotMatch(html, /<button|role="listbox"/, 'The stat tile is read-only; its picker lives separately above the panel');
    assert.match(html, /aria-live="polite"/);
    assert.ok(html.includes(metric.label));
    if (!metricView.available) assert.match(html, /Unavailable/);
  }
  const day = view('revenue', { periodId: 'day', now: at(1) });
  assert.equal(day.value, 10000);
  const empty = buildFinanceMetricView({ ledger: [], now });
  assert.equal(empty.value, 0);
  assert.equal(empty.series.length, 0);
  assert.equal(buildFinanceMetricView({ metricId: '__proto__', ledger, now }).metric.id, 'revenue');
});

test('receipts page keeps financial reporting separate while retaining the ledger and period controls', () => {
  const source = readFileSync(new URL('../src/features/finance/pages/FinancePage.jsx', import.meta.url), 'utf8');
  const file = ts.createSourceFile('FinancePage.jsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
  const components = new Set();
  const walk = (node) => {
    if (ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(file);
      components.add(tag);
    }
    ts.forEachChild(node, walk);
  };
  walk(file);
  assert.ok(components.has('RevenuePulseHeader'));
  assert.ok(components.has('FinanceLedgerToolbar'));
  assert.ok(components.has('TransactionReceiptCard'));
  assert.ok(!components.has('MetricPicker'));
  assert.ok(!components.has('RevenueMetricCards'));
  assert.ok(!components.has('RevenueChart'));
  assert.match(source, /filterLedgerByPeriod\(ledger, periodId, customRange\)/);
});

test('receipts have no independent currency override; business settings remains the source of currency', () => {
  const page = readFileSync(new URL('../src/features/finance/pages/FinancePage.jsx', import.meta.url), 'utf8');
  const header = readFileSync(new URL('../src/features/finance/components/RevenuePulseHeader.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(header, /CURRENCY_OPTIONS|onCurrencyChange|aria-label="Currency"|<select/);
  assert.doesNotMatch(page, /updateProfile|onCurrencyChange|setCurrency/);
  assert.match(page, /const currency = workspace\.currency \|\| 'R'/);
  assert.match(page, /buildFinanceLedger\(/);
  assert.match(page, /currency=\{currency\}/);
  assert.match(header, /PeriodSegmentedControl/);
  assert.match(header, /PeriodCustomPicker/);
});

test('paid records are receipts, unpaid records are invoices and refunds cannot be marked paid again', () => {
  const render = (paymentStatus) => renderToStaticMarkup(React.createElement(TransactionReceiptCard, {
    row: { ...ledger[1], paymentStatus, canMarkPaid: true, lineItems: [] }, onMarkPaid() {}
  }));
  assert.match(render('paid'), /Receipt/);
  assert.doesNotMatch(render('paid'), /Mark paid/);
  for (const status of ['pending', 'unpaid', 'failed']) {
    assert.match(render(status), /Invoice/);
    assert.match(render(status), /Mark paid/);
  }
  assert.match(render('refunded'), /Refund record/);
  assert.doesNotMatch(render('refunded'), /Mark paid/);
});

test('online-provider invoices explain confirmation and cannot use the manual Mark paid action', () => {
  for (const paymentMethod of ['stripe', 'paystack', 'paypal', 'card']) {
    const html = renderToStaticMarkup(React.createElement(TransactionReceiptCard, {
      row: { ...ledger[1], paymentStatus: 'pending', paymentMethod, canMarkPaid: false, lineItems: [] }, onMarkPaid() {}
    }));
    assert.doesNotMatch(html, /Mark paid/);
    assert.match(html, /payment provider updates this record when payment is confirmed/);
  }
});

test('manual confirmation shows a disabled busy action and an accessible local failure message', () => {
  const html = renderToStaticMarkup(React.createElement(TransactionReceiptCard, {
    row: { ...ledger[1], paymentStatus: 'unpaid', paymentMethod: 'cash', canMarkPaid: true, lineItems: [] },
    onMarkPaid() {}, markingPaid: true, paymentError: 'Payment could not be confirmed. Please try again.'
  }));
  assert.match(html, /disabled=""/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /Confirming…/);
  assert.match(html, /role="alert"[^>]*>Payment could not be confirmed/);
});

test('financial reports and legacy receipt routes work in owner and guest-demo workspaces', () => {
  for (const prefix of ['/dashboard', '/demo']) {
    const route = parseAppRoute(`${prefix}/finance-reports/revenue?period=month`);
    assert.equal(route.kind, 'owner');
    assert.equal(route.tab, 'finance-reports');
    assert.deepEqual(route.rest, ['revenue']);
    assert.equal(parseAppRoute(`${prefix}/finance`).tab, 'finance', 'Saved finance links still open records');
    assert.equal(parseAppRoute(`${prefix}/analytics`).tab, 'analytics', 'Saved report links still open traffic reports');
  }
  const previousWindow = globalThis.window;
  try {
    globalThis.window = { location: { hash: '#/demo/analytics?period=month' } };
    assert.equal(workspacePagePath('finance-reports/revenue'), '/demo/finance-reports/revenue');
    assert.equal(workspacePagePath('overview'), '/demo/overview');
    globalThis.window.location.hash = '#/dashboard/finance';
    assert.equal(workspacePagePath('analytics'), '/dashboard/analytics');
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('mixed currencies are never added or relabelled; native totals show omissions and legacy assumptions', () => {
  assert.equal(normalizeFinanceCurrency('R'), normalizeFinanceCurrency('ZAR'));
  assert.equal(normalizeFinanceCurrency('$'), normalizeFinanceCurrency('USD'));
  assert.equal(normalizeFinanceCurrency('€'), normalizeFinanceCurrency('EUR'));
  const rows = [
    { ...ledger[0], currency: 'R' },
    { ...ledger[1], currency: 'ZAR' },
    { ...ledger[2], currency: 'USD' },
    { ...ledger[0], id: 'booking:legacy', currency: null }
  ];
  const rand = buildFinanceMetricView({ ledger: rows, metricId: 'revenue', currency: 'R', now });
  assert.equal(rand.value, 45000);
  assert.equal(rand.omittedCurrencyCount, 1);
  assert.equal(rand.assumedCurrencyCount, 1);
  assert.equal(rand.series.at(-1).amountInCents, 45000);
  assert.match(rand.description, /1 receipt in another currency is excluded\. No currency conversion/);
  assert.match(rand.description, /1 legacy receipt uses the business currency/);
  const dollar = buildFinanceMetricView({ ledger: rows, metricId: 'revenue', currency: '$', now });
  assert.equal(dollar.value, 45000, 'Explicit USD + one unrecorded legacy currency assumed native, never converted Rand totals');
  assert.equal(dollar.omittedCurrencyCount, 2);
  const ledgerRow = buildFinanceLedger({ currency: '$', orders: [{ id: 'legacy-dollar', amountInCents: 10000, paymentStatus: 'paid', timestamp: at(2), items: [] }] })[0];
  assert.equal(ledgerRow.currency, '$');
  assert.equal(ledgerRow.currencyAssumed, true);
  const receipt = renderToStaticMarkup(React.createElement(TransactionReceiptCard, { row: { ...ledger[1], currency: 'USD', lineItems: [] }, currency: 'R' }));
  assert.match(receipt, /\$ 250/);
  assert.doesNotMatch(receipt, /R 250/);
});
