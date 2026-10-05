import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildGlobeMesh, clusterGlobeSessions, geographicPoint, globeCountryAt, globePointFromScreen, normalizeGlobeRotation, projectGlobePoint, rotateGlobePoint, resolveGlobeCountry } from '../src/features/analytics/utils/liveGlobeGeometry.js';
const geography = JSON.parse(readFileSync(new URL('../src/features/analytics/assets/worldGlobe.json', import.meta.url), 'utf8'));
const near = (actual, expected, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≠ ${expected}`);

test('globe renders geographic points on an actual unit sphere and validates unknown locations', () => {
  for (const point of [[0, 0], [180, 0], [-180, 0], [24, -30], [91, 90]]) {
    const vertex = geographicPoint(...point); near(Math.hypot(vertex.x, vertex.y, vertex.z), 1);
  }
  assert.deepEqual(geographicPoint(0, 0), { x: 0, y: 0, z: 1 });
  for (const point of [[undefined, 0], [null, 0], [0, NaN], [181, 0], [0, -91], ['10', '20']]) assert.equal(geographicPoint(...point), null);
  const mesh = buildGlobeMesh(36, 24);
  assert.equal(mesh.positions.length, 37 * 25 * 3);
  assert.equal(mesh.indices.length, 36 * 24 * 6);
  assert.ok(Math.max(...mesh.indices) < mesh.positions.length / 3);
});

test('rotation, perspective projection and ray selection agree at mobile and desktop sizes', () => {
  const rotation = { longitude: 24, latitude: -30 };
  const centered = rotateGlobePoint(geographicPoint(24, -30), rotation);
  near(centered.x, 0); near(centered.y, 0); near(centered.z, 1);
  for (const [width, height] of [[900, 560], [320, 350], [288, 350]]) for (const zoom of [.75, 1, 1.2]) {
    for (const location of [[24, -30], [30, -20], [4, -40]]) {
      const projected = projectGlobePoint(...location, rotation, width, height, zoom);
      assert.ok(projected);
      const selected = globePointFromScreen(projected.x, projected.y, rotation, width, height, zoom);
      near(selected.longitude, location[0]); near(selected.latitude, location[1]);
    }
    assert.equal(projectGlobePoint(-156, 30, rotation, width, height, zoom), null, 'Far-side visitors cannot shine through the sphere');
    assert.equal(globePointFromScreen(0, 0, rotation, width, height, zoom), null, 'Clicks outside the sphere have no invented location');
  }
  assert.deepEqual(normalizeGlobeRotation({ longitude: 721, latitude: 95 }), { longitude: 1, latitude: 80 });
  assert.deepEqual(normalizeGlobeRotation({ longitude: -721, latitude: -95 }), { longitude: -1, latitude: -80 });
});

test('globe visitor clusters keep exact visitor totals and omit invalid coordinates', () => {
  const sessions = [{ id: 'a', longitude: 24, latitude: -30 }, { id: 'b', longitude: 24.2, latitude: -30.1 },
    { id: 'c', longitude: -74, latitude: 40 }, { id: 'd', longitude: null, latitude: null }];
  const clusters = clusterGlobeSessions(sessions);
  assert.equal(clusters.reduce((count, cluster) => count + cluster.count, 0), 3);
  assert.equal(clusters.length, 2);
  near(clusters.find(cluster => cluster.count === 2).longitude, 24.1);
});

test('local country geography can select real country surfaces without attributing ocean', () => {
  assert.equal(globeCountryAt(geography.countries, 28.04, -26.2)?.iso2, 'ZA');
  assert.equal(globeCountryAt(geography.countries, -97, 39)?.iso2, 'US');
  assert.equal(globeCountryAt(geography.countries, -2, 54)?.iso2, 'GB');
  assert.equal(globeCountryAt(geography.countries, 134, -24)?.iso2, 'AU');
  assert.equal(globeCountryAt(geography.countries, -140, 0), null);
  assert.ok(geography.countries.length > 240);
  assert.equal(geography.source.license, 'Public domain');
});

test('legacy country aliases resolve to known ISO2 targets without allowing invalid navigation', () => {
  for (const value of ['ZA', ' za ', 'ZAF', 'South Africa', 'south africa']) assert.equal(resolveGlobeCountry(value, geography.countries)?.iso2, 'ZA');
  for (const value of ['US', 'USA', 'United States', 'United States of America']) assert.equal(resolveGlobeCountry(value, geography.countries)?.iso2, 'US');
  for (const value of ['GB', 'GBR', 'United Kingdom', 'Great Britain', 'UK']) assert.equal(resolveGlobeCountry(value, geography.countries)?.iso2, 'GB');
  for (const value of ['invalid', '-99', 'ZZ', '../ZA', null, undefined, 1, '']) assert.equal(resolveGlobeCountry(value, geography.countries), null);
  const center = globePointFromScreen(400, 245, { longitude: 28.04, latitude: -26.2 }, 800, 490, 1);
  assert.equal(globeCountryAt(geography.countries, center.longitude, center.latitude)?.iso2, 'ZA', 'Enter selection uses the center of the visible globe');
});
