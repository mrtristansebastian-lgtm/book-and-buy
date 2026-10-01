import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { REGIONAL_MAP_COUNTRIES, countrySessions, regionStats } from '../src/features/analytics/utils/regionalTraffic.js';
const directory = new URL('../public/maps/regions/', import.meta.url);
test('map coverage is standard Stripe markets plus South Africa', () => {
  assert.equal(Object.keys(REGIONAL_MAP_COUNTRIES).length, 45);
  assert.equal(REGIONAL_MAP_COUNTRIES.ZA, 'ZAF');
  for (const iso of ['CN', 'IN', 'ID', 'NG', 'GH', 'KE', 'CI']) assert.equal(REGIONAL_MAP_COUNTRIES[iso], undefined);
});
test('regional stats preserve unmapped visitors and normalize names without guessing', () => {
  const selected = countrySessions({ iso2: 'ZA', code: 'ZAF', name: 'South Africa' }, [
    { country: 'ZA', region: 'KwaZulu Natal' }, { country: 'South Africa', region: 'Western Cape' },
    { country: 'ZAF', region: 'Unknown label' }, { country: 'ZA' }, { country: 'CN', region: 'Beijing' }
  ]);
  const stats = regionStats(selected, [{ name: 'KwaZulu-Natal' }, { name: 'Western Cape' }]);
  assert.equal(stats.reduce((sum, row) => sum + row.count, 0), 4);
  assert.equal(stats.filter((row) => row.mapped).length, 2);
  assert.ok(stats.some((row) => row.name === 'Region unavailable'));
  assert.deepEqual(regionStats([{ region: 'Beijing' }, { region: 'Beijing' }]), [{ name: 'Beijing', count: 2, mapped: false }]);
});
test('every supported country has complete, finite, consistently fitted regional vectors', async () => {
  for (const code of Object.values(REGIONAL_MAP_COUNTRIES)) {
    const data = JSON.parse(await readFile(new URL(`${code}.json`, directory)));
    assert.equal(data.version, 2, code);
    assert.equal(data.width, 1000); assert.equal(data.height, 500);
    assert.ok(data.source.url && data.source.license && data.source.year, code);
    assert.equal(new Set(data.regions.map((region) => region.id)).size, data.regions.length, `${code} unique IDs`);
    assert.deepEqual(new Set(data.panels.flatMap((panel) => panel.regions.map((region) => region.id))), new Set(data.regions.map((region) => region.id)), `${code} all regions represented`);
    for (const panel of data.panels) {
      assert.ok(panel.regions.length && panel.borders, `${code} border mesh`);
      assert.ok(panel.regions.every((region) => /^M/.test(region.path) && !/NaN|Infinity/.test(region.path)), code);
      const [x0, y0, x1, y1] = panel.bounds;
      assert.ok(x0 >= 20 && y0 >= 20 && x1 <= 980 && y1 <= 480, `${code} ${panel.label} fits: ${panel.bounds}`);
      assert.ok(x1 - x0 >= 890 || y1 - y0 >= 445, `${code} fills canvas`);
    }
  }
});
test('key country layers use the proper administrative counts', async () => {
  for (const [code, expected] of Object.entries({ ZAF: 9, USA: 56, CAN: 13, ITA: 20, DEU: 16, NOR: 15, HKG: 18, SVN: 212, ARE: 7, JPN: 47, FRA: 18, LVA: 42, HUN: 20 })) {
    const data = JSON.parse(await readFile(new URL(`${code}.json`, directory)));
    assert.equal(data.regions.length, expected, code);
  }
});
