import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { geoNaturalEarth1 } from 'd3-geo';
import { createGeoIndex } from '../scripts/world-map-geography.mjs';
import { projectEqualEarth } from '../src/features/analytics/utils/liveMapGeometry.js';
const map = JSON.parse(await readFile(new URL('../src/features/analytics/assets/worldEqualEarth.json', import.meta.url)));
const projection = geoNaturalEarth1().scale(map.scale).translate(map.translate);

test('visitor coordinates match the generated Natural Earth projection', () => {
  for (const coordinate of [[0, 0], [28.04, -26.2], [-118.24, 34.05], [139.69, 35.68], [174.76, -36.85]]) {
    const expected = projection(coordinate);
    const actual = projectEqualEarth(...coordinate, map);
    assert.ok(Math.hypot(actual[0] - expected[0], actual[1] - expected[1]) < .01);
  }
});

test('solid country silhouettes cover the complete inhabited world layout', () => {
  const countries = new Set(map.countries.map((country) => country.name));
  for (const name of ['China', 'Japan', 'Indonesia', 'Philippines', 'New Zealand', 'Greenland', 'South Africa']) assert.ok(countries.has(name), name);
  assert.equal(countries.has('Antarctica'), false);
  assert.ok(map.countries.every((country) => country.path.startsWith('M')));
});

test('boundary lookup respects holes, multipart islands and reversed ring winding', () => {
  const outer = [[0,0],[10,0],[10,10],[0,10],[0,0]];
  const hole = [[3,3],[7,3],[7,7],[3,7],[3,3]];
  const feature = { properties: { name: 'test' }, geometry: { type: 'MultiPolygon', coordinates: [[outer, hole], [[[20,20],[22,20],[22,22],[20,22],[20,20]]]] } };
  const index = createGeoIndex([feature]);
  assert.equal(index.find([1,1]), feature);
  assert.equal(index.find([5,5]), undefined);
  assert.equal(index.find([21,21]), feature);
  assert.equal(index.find([15,15]), undefined);
  outer.reverse(); hole.reverse();
  assert.equal(index.find([1,1]), feature);
  assert.equal(index.find([5,5]), undefined);
});
