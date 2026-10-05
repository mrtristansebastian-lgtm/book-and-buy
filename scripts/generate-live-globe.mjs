import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { simplifyLine } from './world-map-geography.mjs';

// Same pinned public-domain country source as the existing atlas. No map SDK
// or third-party image requests are needed in the running app.
const revision = 'ca96624a56bd078437bca8184e78163e5039ad19';
const cache = join(tmpdir(), `book-buy-natural-earth-${revision}`);
await mkdir(cache, { recursive: true });
const cached = join(cache, 'ne_10m_admin_0_countries.geojson');
let source;
try { source = JSON.parse(await readFile(cached, 'utf8')); } catch {
  const response = await fetch(`https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${revision}/geojson/ne_10m_admin_0_countries.geojson`);
  if (!response.ok) throw new Error(`Natural Earth: ${response.status}`);
  const text = await response.text();
  source = JSON.parse(text);
  await writeFile(cached, text);
}
const countries = source.features.map(feature => {
  const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  return { code: feature.properties.ADM0_A3, iso2: feature.properties.ISO_A2_EH || feature.properties.ISO_A2,
    name: feature.properties.NAME_LONG || feature.properties.NAME_EN || feature.properties.ADMIN,
    center: [+feature.properties.LABEL_X.toFixed(3), +feature.properties.LABEL_Y.toFixed(3)],
    polygons: polygons.map(rings => rings.map(ring => {
      const simplified = simplifyLine(ring, .15);
      // Tiny territories still need a visible outline and a geographic hit area.
      const retained = simplified.length >= 4 ? simplified : [ring[0], ring[Math.floor(ring.length / 3)], ring[Math.floor(ring.length * 2 / 3)], ring[0]];
      return retained.map(([longitude, latitude]) => [+longitude.toFixed(3), +latitude.toFixed(3)]);
    })) };
});
await writeFile(new URL('../src/features/analytics/assets/worldGlobe.json', import.meta.url), JSON.stringify({
  source: { name: 'Natural Earth 1:10m', revision, license: 'Public domain', url: 'https://www.naturalearthdata.com/about/terms-of-use/' }, countries
}) + '\n');
console.log(`Generated globe geography for ${countries.length} countries.`);
