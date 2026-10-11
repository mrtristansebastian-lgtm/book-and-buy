import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { buildLiveTrafficRows, liveCountryDetails } from '../src/features/analytics/utils/liveTrafficRows.js';

const at = 10_000_000;
const visitor = (id, country, extra = {}) => ({ id, visitorId: id, country, lastSeenAt: at, device: 'desktop', ...extra });
const country = { iso2: 'ZA', code: 'ZAF', name: 'South Africa' };

test('active visitor rows count unique people once and calculate truthful shares and device totals', () => {
  const report = buildLiveTrafficRows([
    visitor('one', 'ZA', { region: 'Western Cape', city: 'Cape Town', device: 'mobile', lastSeenAt: at - 1000 }),
    visitor('one', 'South Africa', { region: 'Gauteng', city: 'Johannesburg', device: 'tablet' }),
    visitor('two', 'za', { region: 'Gauteng', city: 'Johannesburg' }),
    visitor('three', 'US', { city: 'New York', device: 'phone' }),
    visitor('four', '', { device: '' }),
    visitor('bot', 'ZA', { isBot: true })
  ]);
  assert.equal(report.total, 4);
  assert.deepEqual(report.devices, { desktop: 1, mobile: 1, tablet: 1, unknown: 1 });
  const za = report.rows.find(row => row.countryCode === 'ZA');
  assert.equal(za.count, 2);
  assert.equal(za.share, 50);
  assert.deepEqual(za.cities, [{ name: 'Johannesburg', count: 2 }]);
  assert.equal(report.rows.find(row => row.name === 'Country unavailable').count, 1);
  assert.equal(report.rows.reduce((sum, row) => sum + row.count, 0), report.total);
  assert.equal(report.rows.reduce((sum, row) => sum + row.share, 0), 100);
  assert.doesNotMatch(JSON.stringify(report), /visitorId|latitude|longitude|sessionId/);
});

test('regional totals dedupe before country filtering and retain unmatched or unavailable locations', () => {
  const report = buildLiveTrafficRows([
    visitor('moved', 'ZA', { region: 'Gauteng', lastSeenAt: at - 10 }),
    visitor('moved', 'GB', { region: 'England' }),
    visitor('known', 'South Africa', { region: 'western-cape', city: 'Cape Town' }),
    visitor('unknown', 'ZA', { region: '', city: '' }),
    visitor('unmatched', 'ZA', { region: 'Northern suburbs' })
  ], { level: 'region', country, regions: [{ name: 'Western Cape', aliases: ['western cape'] }, { name: 'Gauteng' }] });
  assert.equal(report.total, 3, 'An old country snapshot does not resurrect a visitor now browsing elsewhere');
  assert.equal(report.rows.find(row => row.name === 'Western Cape').mapped, true);
  assert.equal(report.rows.find(row => row.name === 'Northern suburbs').mapped, false);
  assert.equal(report.rows.find(row => row.name === 'Region unavailable').count, 1);
  assert.equal(report.rows.some(row => row.name === 'Gauteng'), false);
  assert.deepEqual(liveCountryDetails('United States of America'), { code: 'US', name: 'United States' });
  assert.deepEqual(liveCountryDetails('USA'), { code: 'US', name: 'United States' });
  assert.deepEqual(liveCountryDetails('ZAF'), { code: 'ZA', name: 'South Africa' });
  const aliases = buildLiveTrafficRows([visitor('alias', 'ZAF')], { level: 'region', country });
  assert.equal(aliases.total, 1);
  assert.equal(aliases.rows[0].countryCode, 'ZA');
});

const require = createRequire(import.meta.url);
const modules = new Map();
function load(path) {
  const file = new URL(path, import.meta.url);
  if (modules.has(file.href)) return modules.get(file.href);
  const source = readFileSync(file, 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022
  } });
  const module = { exports: {} };
  modules.set(file.href, module.exports);
  new Function('module', 'exports', 'require', outputText)(module, module.exports, (id) => {
    if (id.endsWith('.css')) return {};
    if (id === './CountryFlag') return { CountryFlag: ({ country, label }) => React.createElement('span', {
      role: country ? 'img' : undefined, 'aria-label': country ? `${label} flag` : undefined
    }) };
    if (!id.startsWith('.')) return require(id);
    const base = new URL(id, file);
    const target = [base, ...['.js', '.jsx', '.ts'].map(extension => new URL(`${base.href}${extension}`))].find(existsSync);
    return load(target.href);
  });
  return module.exports;
}

const { LiveTrafficTable } = load('../src/features/analytics/components/LiveTrafficTable.jsx');
const { buildDemoAnalytics, liveSessionRows, computeLiveStrip, activeCartRows } = load('../src/features/analytics/utils/analyticsMetrics.js');

test('fresh demo has no synthetic live visitors, locations, or active carts', () => {
  const demo = buildDemoAnalytics({ now: at });
  assert.deepEqual(liveSessionRows(demo.sessions, at), []);
  assert.deepEqual(activeCartRows(demo.carts, at), []);
  const live = computeLiveStrip({ ...demo, now: at });
  assert.equal(live.liveVisitors, 0);
  assert.equal(live.activeCarts, 0);
  assert.equal(live.activeCheckouts, 0);
  assert.equal(buildLiveTrafficRows(demo.sessions).total, 0);
});

test('live adapter keeps the latest visitor observation, distinct legacy sessions and excludes stale bots', () => {
  const sessions = [
    { sessionId: 'old', visitorId: 'same', country: 'ZA', updatedAt: at - 1000 },
    { sessionId: 'new', visitorId: 'same', country: 'GB', updatedAt: at },
    { sessionId: 'legacy1', updatedAt: at - 100 }, { id: 'legacy2', updatedAt: at - 200 },
    { sessionId: 'legacy1', updatedAt: at - 500 },
    { sessionId: 'bot', isBot: true, updatedAt: at },
    { sessionId: 'stale', updatedAt: at - 300001 }
  ];
  const rows = liveSessionRows(sessions, at);
  assert.equal(rows.length, 3);
  assert.equal(rows.find(row => row.visitorId === 'same').country, 'GB');
  assert.equal(rows.find(row => row.visitorId === 'same').id, 'new');
  assert.equal(rows.filter(row => !row.visitorId).length, 2);
  assert.equal(computeLiveStrip({ sessions, now: at }).liveVisitors, 3);
});

test('live adapter never turns missing or string coordinates into a fabricated zero location', () => {
  const rows = liveSessionRows([
    ...[null, '', undefined, '0'].map((latitude, index) => ({ sessionId: `bad-${index}`, updatedAt: at, latitude, longitude: latitude })),
    { sessionId: 'real-zero', updatedAt: at, latitude: 0, longitude: 0 }
  ], at);
  for (const row of rows.filter(row => row.id !== 'real-zero')) {
    assert.equal(row.latitude, null);
    assert.equal(row.longitude, null);
  }
  assert.equal(rows.find(row => row.id === 'real-zero').latitude, 0);
  assert.equal(rows.find(row => row.id === 'real-zero').longitude, 0);
});

test('traffic table names columns and scopes headings without exposing visitor identifiers or exact locations', () => {
  const report = buildLiveTrafficRows([visitor('private-visitor', 'ZA', { city: 'Cape Town', device: 'mobile', latitude: -33.923456 })]);
  const html = renderToStaticMarkup(React.createElement(LiveTrafficTable, { report, title: 'Active visitors' }));
  assert.match(html, /<table[^>]*class="bb-live-traffic-table"/);
  for (const heading of ['Country', 'Visitors', 'Share', 'Devices']) assert.match(html, new RegExp(`<th scope="col">${heading}</th>`));
  assert.match(html, /<th scope="row">Total<\/th><td>1<\/td><td>100%<\/td>/);
  assert.match(html, /aria-label="Mobile: 1"/);
  assert.match(html, /aria-label="Device icon key"/);
  assert.match(html, /role="region" aria-label="Active visitors table" tabindex="0"/);
  assert.match(html, /Locations are approximate/);
  assert.doesNotMatch(html, /private-visitor|-33\.923456/);
  const regionHtml = renderToStaticMarkup(React.createElement(LiveTrafficTable, { report: buildLiveTrafficRows([visitor('a', 'ZA')], { level: 'region', country }), level: 'region' }));
  assert.match(regionHtml, /<th scope="col">Region<\/th>/);
  assert.match(regionHtml, /Region unavailable/);
});

test('empty live traffic gives an honest helpful state without a fabricated table', () => {
  const html = renderToStaticMarkup(React.createElement(LiveTrafficTable, { report: buildLiveTrafficRows([]) }));
  assert.match(html, /No visitors right now/);
  assert.doesNotMatch(html, /<table/);
});
