import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { geoNaturalEarth1, geoPath, geoArea } from 'd3-geo';
import { simplifyLine } from './world-map-geography.mjs';

// Pinned public-domain sources. Only generated assets ship to the browser.
const REVISION = 'ca96624a56bd078437bca8184e78163e5039ad19';
const cache = join(tmpdir(), `book-buy-natural-earth-${REVISION}`);
await mkdir(cache, { recursive: true });
async function source(name) {
  const file = join(cache, `${name}.geojson`);
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { /* first generation */ }
  const response = await fetch(`https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${REVISION}/geojson/${name}.geojson`);
  if (!response.ok) throw new Error(`Natural Earth ${name}: ${response.status}`);
  const text = await response.text();
  const data = JSON.parse(text);
  await writeFile(file, text);
  return data;
}
const countries = await source('ne_10m_admin_0_countries');
const WIDTH = 1000;
const HEIGHT = 500;
const projection = geoNaturalEarth1().fitExtent([[12, 10], [988, 490]], { type: 'Sphere' }).precision(.15);
// GeoJSON and D3 spherical paths use opposite exterior ring winding.
function normalizedFeature(f) { return { ...f, geometry: {
  type: 'MultiPolygon', coordinates: (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates)
    .map((rings) => geoArea({ type: 'Polygon', coordinates: rings }) > 2 * Math.PI
      ? rings.map((ring) => [...ring].reverse()) : rings)
} }; }
function projectedPath(feature, tolerance = .16) {
  const parts = [];
  let ring = [];
  const context = {
    moveTo(x, y) { ring = [[x, y]]; },
    lineTo(x, y) { ring.push([x, y]); },
    closePath() {
      if (ring.length < 3) return;
      const points = simplifyLine([...ring, ring[0]], tolerance);
      parts.push(points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join('') + 'Z');
    }
  };
  geoPath(projection, context)(normalizedFeature(feature));
  return parts.join('');
}
const visibleCountries = countries.features.filter((feature) => feature.properties.ADM0_A3 !== 'ATA');
const countryShapes = visibleCountries.map((feature) => {
  const center = geoPath(projection).centroid(normalizedFeature(feature));
  return {
    name: feature.properties.NAME_LONG || feature.properties.NAME_EN || feature.properties.ADMIN,
    code: feature.properties.ADM0_A3,
    iso2: feature.properties.ISO_A2_EH || feature.properties.ISO_A2,
    path: projectedPath(feature, .12),
    center: center.every(Number.isFinite) ? center.map((value) => +value.toFixed(2)) : null
  };
}).filter((shape) => shape.path);
const output = {
  width: WIDTH, height: HEIGHT, scale: projection.scale(), translate: projection.translate(),
  projection: 'naturalEarth1',
  source: { name: 'Natural Earth 1:10m', revision: REVISION, license: 'Public domain' },
  countries: countryShapes
};
await writeFile(new URL('../src/features/analytics/assets/worldEqualEarth.json', import.meta.url), JSON.stringify(output) + '\n');
console.log(`Generated ${countryShapes.length} country shapes.`);
