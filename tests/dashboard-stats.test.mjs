import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import postcss from 'postcss';

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
const { DashboardStat } = load('../src/shared/ui/DashboardStat.jsx');
const { buildFinanceLedger } = load('../src/features/finance/utils/financeLedger.js');
const { buildFinanceMetricView } = load('../src/features/finance/utils/financeMetrics.js');
const render = (props) => renderToStaticMarkup(React.createElement(DashboardStat, props));

test('dashboard readouts always show the value above the label and keep explanation accessible', () => {
  const html = render({ label: 'Unique visitors', value: '12,345', note: 'Anonymous visitors, not sessions' });
  assert.match(html, /^<article/);
  assert.ok(html.indexOf('12,345') < html.indexOf('Unique visitors'));
  assert.match(html, /aria-labelledby="[^"]+-label"/);
  assert.match(html, /aria-describedby="[^"]+-note"/);
  assert.match(html, /bb-dashboard-stat-note/);
  assert.doesNotMatch(html, /<button|role="button"/);
});

test('Home navigation totals keep native button semantics, their labels and numeric context', () => {
  const html = render({ as: 'button', titleTag: 'span', label: 'Booking requests', value: 0, title: 'All clear', className: 'bb-stat' });
  assert.match(html, /^<button/);
  assert.match(html, /type="button"/);
  assert.match(html, /aria-labelledby="[^"]+-value [^"]+-label"/);
  assert.match(html, /title="All clear"/);
  assert.doesNotMatch(html, /aria-describedby|<p/);
});

test('shared stat accepts unavailable/long values, semantic headings and live updates without clipping rules', () => {
  const html = render({ titleTag: 'h2', label: 'Average monthly revenue', value: 'Unavailable', note: 'Original totals were not recorded.', valueProps: { 'aria-live': 'polite', 'data-unavailable': true } });
  assert.match(html, /<h2[^>]+>Average monthly revenue<\/h2>/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /data-unavailable="true"/);
  assert.match(html, /Unavailable/);
  const css = postcss.parse(readFileSync(new URL('../src/design/insight-dashboards.css', import.meta.url), 'utf8'));
  const rule = css.nodes.find((node) => node.type === 'rule' && node.selector === '.bb-dashboard-stat');
  const declarations = Object.fromEntries(rule.nodes.map((node) => [node.prop, node.value]));
  assert.equal(declarations.background, '#fff');
  assert.equal(declarations['background-image'], 'none');
  assert.equal(declarations['border-radius'], '14px');
  assert.equal(declarations.border, '1px solid #e9edf1');
  assert.equal(declarations['align-items'], 'flex-start');
  assert.equal(declarations['text-align'], 'left');
  const valueRule = css.nodes.find((node) => node.type === 'rule' && node.selector.endsWith('> .bb-dashboard-stat-value'));
  assert.ok(valueRule.nodes.some((node) => node.prop === 'overflow-wrap' && node.value === 'anywhere'));
  assert.ok(!valueRule.nodes.some((node) => node.prop === 'white-space' && node.value === 'nowrap'));
});

test('Finance, Reports and Home use one stat primitive while period controls and stat links remain separate', () => {
  const revenue = readFileSync(new URL('../src/features/finance/components/RevenueMetricCards.jsx', import.meta.url), 'utf8');
  const reports = readFileSync(new URL('../src/features/analytics/pages/AnalyticsPage.jsx', import.meta.url), 'utf8');
  const home = readFileSync(new URL('../src/features/dashboard/pages/OverviewPage.jsx', import.meta.url), 'utf8');
  for (const source of [revenue, reports, home]) assert.match(source, /import \{ DashboardStat \}/);
  assert.doesNotMatch(revenue, /MetricPicker|<button/);
  assert.match(home, /as="button"/);
  assert.match(home, /onClick=\{\(\) => navigate\(`\/dashboard\/\$\{stat\.to\}`\)\}/);
  assert.match(home, /PeriodSegmentedControl/);
  assert.match(home, /metricId: 'revenue'.*periodId, customRange, currency/);
  assert.doesNotMatch(home, /computeFinanceMetrics|filterLedgerByPeriod/);
});

test('dashboard hierarchy is explicit: operational Home, primary Finance and quieter report insights', () => {
  for (const appearance of ['operational', 'primary', 'insight', 'supporting']) {
    const html = render({ appearance, label: 'Total', value: 42 });
    assert.match(html, new RegExp(`data-appearance="${appearance}"`));
    assert.ok(html.indexOf('>42<') < html.indexOf('>Total<'));
    assert.doesNotMatch(html, /appearance="primary"[^>]+variant=|<button/);
  }
  assert.match(render({ appearance: 'invalid', label: 'Total', value: 42 }), /data-appearance="standard"/);
  const revenue = readFileSync(new URL('../src/features/finance/components/RevenueMetricCards.jsx', import.meta.url), 'utf8');
  const reports = readFileSync(new URL('../src/features/analytics/pages/AnalyticsPage.jsx', import.meta.url), 'utf8');
  const home = readFileSync(new URL('../src/features/dashboard/pages/OverviewPage.jsx', import.meta.url), 'utf8');
  assert.match(revenue, /appearance="primary"/);
  assert.match(reports, /appearance = 'insight'/);
  assert.equal((reports.match(/<ReportStat appearance="supporting"/g) || []).length, 4);
  assert.match(home, /appearance="operational"/);
  assert.match(home, /aria-describedby=\{stat\.id === 'revenue' && revenueNote \? 'bb-home-revenue-note'/);
  assert.ok(home.indexOf('id="bb-home-revenue-note"') > home.indexOf('</section>', home.indexOf('className="bb-launcher-stats')));
  assert.doesNotMatch(home, /note=\{stat\.note\}/, 'Coverage disclosures sit below the operational strip, never stretch an individual tile');
});

test('readout scale differentiates the pages without gradient fills or oversized repeated tiles', () => {
  const css = postcss.parse(readFileSync(new URL('../src/design/insight-dashboards.css', import.meta.url), 'utf8'));
  const rules = (selector) => css.nodes.find((node) => node.type === 'rule' && node.selector === selector);
  const declarations = (selector) => Object.fromEntries(rules(selector).nodes.map((node) => [node.prop, node.value]));
  const home = declarations('.bb-dashboard-stat[data-appearance="operational"]');
  const primary = declarations('.bb-dashboard-stat[data-appearance="primary"]');
  const insight = declarations('.bb-dashboard-stat[data-appearance="insight"]');
  const supporting = declarations('.bb-dashboard-stat[data-appearance="supporting"]');
  assert.notEqual(primary['--bb-stat-size'], home['--bb-stat-size']);
  assert.notEqual(insight['--bb-stat-size'], supporting['--bb-stat-size']);
  assert.equal(primary['min-height'], '176px');
  assert.equal(insight['min-height'], '112px');
  assert.equal(supporting['box-shadow'], 'none');
  assert.equal(supporting['--bb-stat-size'], '26px');
  const mobile = css.nodes.find((node) => node.type === 'atrule' && node.params === '(max-width: 700px)');
  const mobilePrimary = mobile.nodes.find((node) => node.selector === '.bb-dashboard-stat[data-appearance="primary"]');
  assert.ok(mobilePrimary.nodes.some((node) => node.prop === 'min-height' && node.value === '128px'));
  assert.ok(mobile.nodes.some((node) => node.selector === '.bb-reports-details' && node.nodes.some((decl) => decl.prop === 'grid-template-columns' && decl.value === 'repeat(2,minmax(0,1fr))')));
});

test('Home has a focal revenue tile and four compact operational readouts, adapting to two phone columns', () => {
  const css = postcss.parse(readFileSync(new URL('../src/design/insight-dashboards.css', import.meta.url), 'utf8'));
  const rule = (selector, parent = css) => parent.nodes.find((node) => node.type === 'rule' && node.selector === selector);
  const values = (node) => Object.fromEntries(node.nodes.map((declaration) => [declaration.prop, declaration.value]));
  const band = values(rule('.bb-launcher .bb-launcher-stats'));
  assert.equal(band.gap, '10px');
  assert.equal(band['grid-template-columns'], 'minmax(0,1.2fr) repeat(2,minmax(0,1fr))');
  assert.equal(band.background, 'transparent');
  assert.equal(band.border, '0');
  const cells = values(rule('.bb-launcher-stats > .bb-dashboard-stat[data-appearance="operational"]'));
  assert.equal(cells['align-items'], 'flex-start');
  assert.equal(cells['text-align'], 'left');
  assert.equal(values(rule('.bb-launcher-stats > .bb-dashboard-stat.is-featured'))['grid-row'], 'span 2');
  const tablet = css.nodes.find((node) => node.type === 'atrule' && node.params === '(max-width: 1024px)');
  assert.equal(values(rule('.bb-launcher .bb-launcher-stats', tablet))['grid-template-columns'], 'repeat(2,minmax(0,1fr))');
  const lead = values(rule('.bb-launcher-stats > .bb-dashboard-stat.is-featured', tablet));
  assert.equal(lead['grid-column'], '1 / -1');
  assert.equal(lead['grid-row'], 'auto');
  const mobile = css.nodes.find((node) => node.type === 'atrule' && node.params === '(max-width: 700px)');
  assert.equal(values(rule('.bb-dashboard-stat[data-appearance="operational"]', mobile))['min-height'], '88px');
  assert.equal(values(rule('.bb-launcher-stats > .bb-dashboard-stat.is-featured', mobile))['--bb-stat-size'], '36px');
});

test('clean dashboard tiles keep their explanation accessible without adding visible duplicate copy', () => {
  const html = render({ label: 'Sessions', value: 42, note: 'Recorded visits', noteHidden: true });
  assert.match(html, /aria-describedby="[^"]+-note"/);
  assert.match(html, /class="bb-dashboard-stat-note bb-control-sr-only">Recorded visits/);
  const finance = readFileSync(new URL('../src/features/finance/components/RevenueMetricCards.jsx', import.meta.url), 'utf8');
  assert.match(finance, /unavailableReason \|\| metricView.coverageNote/);
  assert.match(finance, /disclosure \? <p className="bb-finance-readout-disclosure"/);
  const home = readFileSync(new URL('../src/features/dashboard/pages/OverviewPage.jsx', import.meta.url), 'utf8');
  assert.match(home, /label: 'Revenue'/);
  assert.match(home, /label: 'Upcoming bookings'/);
});

test('historical totals never silently use current service prices, but legacy receipt display stays intact', () => {
  const timestamp = Date.parse('2026-10-04T10:00:00Z');
  const ledger = buildFinanceLedger({ currency: 'R', services: [{ id: 'service', price: 990 }], bookings: [
    { id: 'old', serviceId: 'service', serviceName: 'Class', paymentStatus: 'paid', timestamp },
    { id: 'real', serviceId: 'service', amountInCents: 10000, paymentStatus: 'paid', timestamp }
  ] });
  const legacy = ledger.find((row) => row.sourceId === 'old');
  assert.equal(legacy.amountInCents, 99000, 'Receipt display fallback is not a financial snapshot');
  assert.equal(legacy.amountAuthoritative, false);
  const paid = buildFinanceMetricView({ ledger, metricId: 'revenue', currency: 'R', now: timestamp });
  assert.equal(paid.value, 10000);
  assert.equal(paid.missingAmountCount, 1);
  assert.match(paid.coverageNote, /original total was not recorded/);
  assert.equal(paid.series.at(-1).amountInCents, 10000);
  const missing = buildFinanceMetricView({ ledger: [legacy], metricId: 'revenue', now: timestamp });
  assert.equal(missing.value, null);
  assert.equal(missing.available, false);
  assert.equal(missing.series.length, 0);
  assert.match(missing.unavailableReason, /Current catalog prices are not used/);
  const count = buildFinanceMetricView({ ledger, metricId: 'paid_transactions', now: timestamp });
  assert.equal(count.value, 200, 'A known paid receipt can still be counted without an amount');
});
