import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveLiveMapMarkets, getLiveMapCountry, fitCountrySilhouette, wholeCountryPanel, centerCountryRegions } from '../src/features/analytics/utils/liveMapMarkets.js';
import { REGIONAL_MAP_COUNTRIES } from '../src/features/analytics/utils/regionalTraffic.js';

test('single enabled market opens its country even when the business is based elsewhere', () => {
  assert.deepEqual(resolveLiveMapMarkets({ countryCode: 'ZA', markets: [
    { countryCode: 'US', enabled: true }, { countryCode: 'ZA', enabled: false }
  ] }), { countries: ['US'], defaultCountry: 'US', defaultView: 'country', worldwide: false, configured: true });
});

test('multiple active markets open the globe and prefer the active business country', () => {
  const actual = resolveLiveMapMarkets({ countryCode: 'ZA', markets: [{ countryCode: 'gb', enabled: true },
    { countryCode: 'za', enabled: true }, { countryCode: 'gb', enabled: true }, { countryCode: 'DE', enabled: false }] });
  assert.deepEqual(actual.countries, ['GB', 'ZA']);
  assert.equal(actual.defaultCountry, 'ZA');
  assert.equal(actual.defaultView, 'globe');
});

test('legacy served countries remain market defaults and enabled modern markets take precedence', () => {
  assert.equal(resolveLiveMapMarkets({ servesCountries: ['ca'] }).defaultCountry, 'CA');
  assert.equal(resolveLiveMapMarkets({ servesCountries: ['CA', 'US'] }).defaultView, 'globe');
  const modern = resolveLiveMapMarkets({ countryCode: 'ZA', servesCountries: ['CA'], markets: [{ countryCode: 'GB', enabled: false }] });
  assert.deepEqual(modern.countries, [], 'Disabled markets are never styled as active selling markets');
  assert.equal(modern.defaultCountry, 'ZA');
  assert.equal(modern.defaultView, 'country');
});

test('rest of world selects globe while unconfigured businesses use their location or South Africa', () => {
  const worldwide = resolveLiveMapMarkets({ countryCode: 'AU', markets: [{ countryCode: '*', enabled: true }] });
  assert.equal(worldwide.worldwide, true);
  assert.equal(worldwide.defaultView, 'globe');
  assert.equal(worldwide.defaultCountry, 'AU');
  assert.deepEqual(worldwide.countries, []);
  assert.equal(resolveLiveMapMarkets({ countryCode: 'NZ' }).defaultCountry, 'NZ');
  assert.deepEqual(resolveLiveMapMarkets({ countryCode: 'NZ' }).countries, [], 'The exploration fallback is not an enabled market');
  assert.equal(resolveLiveMapMarkets({ countryCode: 'invalid' }).defaultCountry, 'ZA');
  assert.equal(resolveLiveMapMarkets({ markets: [{ countryCode: 'not-country', enabled: true }] }).defaultCountry, 'ZA');
});

test('an explicit picker destination can be outside markets and resolves names, ISO2 or ISO3', () => {
  const country = { iso2: 'US', code: 'USA', name: 'United States', path: 'M0,0L10,0L10,10Z' };
  for (const value of ['US', 'usa', 'United States']) assert.equal(getLiveMapCountry(value, [country]), country);
  assert.deepEqual(getLiveMapCountry('KE', [country]), { iso2: 'KE', code: 'KE', name: 'Kenya', path: '' });
  assert.equal(getLiveMapCountry('not-country', [country]), null);
});

test('country outlines are fitted entirely inside the canvas with proportions preserved', async () => {
  const world = JSON.parse(await readFile(new URL('../src/features/analytics/assets/worldEqualEarth.json', import.meta.url)));
  for (const code of ['ZA', 'KE', 'IN', 'US', 'GB', 'FJ']) {
    const country = world.countries.find(row => row.iso2 === code);
    const fitted = fitCountrySilhouette(country);
    assert.ok(fitted, code);
    assert.ok(/^M/.test(fitted.path) && !/NaN|Infinity/.test(fitted.path), code);
    const [x0, y0, x1, y1] = fitted.bounds;
    assert.ok(x0 >= 27.99 && y0 >= 27.99 && x1 <= 972.01 && y1 <= 472.01, code);
    assert.ok(x1 - x0 >= 943.99 || y1 - y0 >= 443.99, code);
    assert.equal(fitted.path.match(/[MLZ]/g).length, country.path.match(/[MLZ]/g).length, `${code} islands and holes preserved`);
  }
  assert.equal(fitCountrySilhouette({ path: '' }), null);
  assert.equal(fitCountrySilhouette({ path: 'M0,0C10,20,30,40,50,60Z' }), null);
});

test('whole country views include every remote state and province rather than hiding them by default', async () => {
  for (const code of Object.values(REGIONAL_MAP_COUNTRIES)) {
    const data = JSON.parse(await readFile(new URL(`../public/maps/regions/${code}.json`, import.meta.url)));
    const panel = wholeCountryPanel(data);
    assert.deepEqual(new Set(panel.regions.map(row => row.id)), new Set(data.regions.map(row => row.id)), code);
    assert.equal(new Set(panel.regions.map(row => row.id)).size, panel.regions.length, `${code} no repeated provinces`);
    assert.ok(panel.borders && !/NaN|Infinity/.test(panel.borders), code);
    for (const region of panel.regions) {
      const values = region.path.match(/[-+]?\d*\.?\d+/g).map(Number);
      assert.ok(values.every((value, index) => value >= 0 && value <= (index % 2 ? 500 : 1000)), `${code} ${region.name} fully visible`);
      assert.ok(region.center.every((value, index) => value >= 0 && value <= (index ? 500 : 1000)), `${code} ${region.name} keyboard callout on map`);
    }
    if (data.panels.length > 1) {
      assert.equal(panel.id, 'all');
      assert.equal(panel.labels.length, data.panels.length - 1);
    }
  }
});

test('whole-country keyboard callout centers follow the same transform as their inset shapes', () => {
  const shape = { id: 'one', name: 'Region', path: 'M0,0L1000,0L1000,500Z', center: [500, 250] };
  const panel = wholeCountryPanel({ panels: [{ id: 'main', label: 'Mainland', regions: [shape], borders: shape.path },
    { id: 'remote', label: 'Remote area', regions: [{ ...shape, id: 'two' }], borders: shape.path }] });
  assert.deepEqual(panel.regions[0].center, [380, 250]);
  assert.deepEqual(panel.regions[1].center, [880, 240]);
});

test('regions without source centers get their own callout anchor on mainland and remote insets', () => {
  const shape = { id: 'one', name: 'Region', path: 'M100,50L300,50L300,150Z' };
  const main = { id: 'main', label: 'Mainland', regions: [shape], borders: shape.path };
  assert.deepEqual(wholeCountryPanel({ panels: [main] }).regions[0].center, [200, 100]);
  const panel = wholeCountryPanel({ panels: [main, { ...main, id: 'remote', label: 'Remote area' }] });
  assert.deepEqual(panel.regions[0].center, [152, 136]);
  assert.deepEqual(panel.regions[1].center, [808, 204]);
  assert.deepEqual(centerCountryRegions({ regions: [{ ...shape, center: [NaN, 100] }] }).regions[0].center, [200, 100]);
  assert.deepEqual(centerCountryRegions({ regions: [{ ...shape, path: 'MNaN,InfinityZ' }] }).regions[0].center, [500, 250]);
});
