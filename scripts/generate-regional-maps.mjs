import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { inflateRawSync } from 'node:zlib';
import { geoConicConformal, geoMercator, geoCentroid, geoBounds, geoArea, geoPath } from 'd3-geo';
import { feature, mesh, merge } from 'topojson-client';
import { topology } from 'topojson-server';
import { simplifyLine } from './world-map-geography.mjs';
import { REGIONAL_MAP_COUNTRIES } from '../src/features/analytics/utils/regionalTraffic.js';

const cache = join(tmpdir(), 'book-buy-geoboundaries-adm1');
await mkdir(cache, { recursive: true });
async function cached(url, file) {
  try { return JSON.parse(await readFile(join(cache, file), 'utf8')); } catch {}
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  const data = await response.json();
  await writeFile(join(cache, file), JSON.stringify(data));
  return data;
}
const only = process.argv.find((value) => value.startsWith('--only='))?.slice(7).split(',');
const codes = Object.values(REGIONAL_MAP_COUNTRIES).filter((code) => !['HKG', 'GIB', 'NOR', 'SVN', 'HUN'].includes(code) && (!only || only.includes(code)));
const failures = [];
let next = 0;
await Promise.all(Array.from({ length: 3 }, async () => {
  while (next < codes.length) {
    const code = codes[next++];
    try {
      const level = ['ITA', 'GRC'].includes(code) ? 'ADM2' : 'ADM1';
      const metadata = await cached(`https://www.geoboundaries.org/api/current/gbOpen/${code}/${level}/`, `${code}-${level}-metadata.json`);
      const lightweight = +metadata.meanVertices * +metadata.admUnitCount > 150000;
      await cached(lightweight ? metadata.simplifiedGeometryGeoJSON : metadata.tjDownloadURL,
        `${metadata.boundaryID}${lightweight ? '-cartographic.geojson' : '.topojson'}`);
      console.log(`${code}: ${metadata.admUnitCount} ${metadata.boundaryCanonical} (${metadata.boundaryYearRepresented})`);
    } catch (error) { failures.push(code); console.error(`${code}: ${error.message}`); }
  }
}));
if (failures.length) throw new Error(`Missing sources: ${failures.join(', ')}`);

// ZIP reader for the official Norwegian GeoJSON archive (store/deflate only).
function unzipJson(bytes) {
  const result = [];
  for (let i = 0; i < bytes.length - 46; i++) {
    if (bytes.readUInt32LE(i) !== 0x02014b50) continue;
    const nameLength = bytes.readUInt16LE(i + 28);
    const name = bytes.subarray(i + 46, i + 46 + nameLength).toString();
    if (!/\.(geojson|json)$/i.test(name)) continue;
    const offset = bytes.readUInt32LE(i + 42);
    const start = offset + 30 + bytes.readUInt16LE(offset + 26) + bytes.readUInt16LE(offset + 28);
    const content = bytes.subarray(start, start + bytes.readUInt32LE(i + 20));
    const decoded = bytes.readUInt16LE(i + 10) === 8 ? inflateRawSync(content) : content;
    result.push({ name, data: JSON.parse(decoded.toString().replace(/^\uFEFF/, '')) });
  }
  return result;
}
const hk = await cached('https://www.had.gov.hk/psi/hong-kong-administrative-boundaries/hksar_18_district_boundary.json', 'HKG-official.json');
console.log('Hong Kong properties:', JSON.stringify(hk.features?.[0]?.properties), 'CRS', JSON.stringify(hk.crs));
const norwayURL = 'https://testnedlasting.geonorge.no/geonorge/Basisdata/Fylker/GeoJSON/Basisdata_0000_Norge_4258_Fylker_GeoJSON.zip';
let norwayBytes;
try { norwayBytes = await readFile(join(cache, 'NOR-2026.zip')); } catch {
  const response = await fetch(norwayURL);
  if (!response.ok) throw new Error(`Norway source: ${response.status}`);
  norwayBytes = Buffer.from(await response.arrayBuffer());
  await writeFile(join(cache, 'NOR-2026.zip'), norwayBytes);
}
const norwayFiles = unzipJson(norwayBytes);
console.log('Norway files:', norwayFiles.map((file) => [file.name, file.data.features?.length, file.data.features?.[0]?.properties]));
await writeFile(join(cache, 'NOR-official.json'), JSON.stringify(norwayFiles));

function compactTopology(src, accept) {
  const object = Object.values(src.objects)[0];
  const geometries = object.geometries.filter(accept);
  const used = new Set();
  const visit = (value) => Array.isArray(value) ? value.forEach(visit) : used.add(value < 0 ? ~value : value);
  geometries.forEach((geometry) => visit(geometry.arcs));
  const indices = [...used]; const remap = new Map(indices.map((index, i) => [index, i]));
  const mapped = (value) => Array.isArray(value) ? value.map(mapped) : value < 0 ? ~remap.get(~value) : remap.get(value);
  return { type: 'Topology', transform: src.transform, arcs: indices.map((index) => src.arcs[index]), objects: { regions: { type: 'GeometryCollection', geometries: geometries.map((geometry) => ({ ...geometry, arcs: mapped(geometry.arcs) })) } } };
}
let slovenia;
try { slovenia = JSON.parse(await readFile(join(cache, 'SVN-LAU-2024.json'))); } catch {
  slovenia = compactTopology(await cached('https://gisco-services.ec.europa.eu/distribution/v2/lau/topojson/LAU_RG_01M_2024_4326.json', 'LAU-2024.topojson'), (geometry) => geometry.properties.CNTR_CODE === 'SI');
  await writeFile(join(cache, 'SVN-LAU-2024.json'), JSON.stringify(slovenia));
}
global.gc?.();
console.log('Slovenia LAU properties:', JSON.stringify(Object.values(slovenia.objects)[0].geometries.find((geometry) => geometry.properties.CNTR_CODE === 'SI')?.properties));

const output = new URL('../public/maps/regions/', import.meta.url);
await mkdir(output, { recursive: true });
const sources = [];
const polygonFeatures = (collection) => collection.features.filter((item) => ['Polygon', 'MultiPolygon'].includes(item.geometry?.type));
function normalizeFeature(item) {
  const polygons = item.geometry.type === 'Polygon' ? [item.geometry.coordinates] : item.geometry.coordinates;
  return { ...item, geometry: { type: 'MultiPolygon', coordinates: polygons.map((rings) =>
    geoArea({ type: 'Polygon', coordinates: rings }) > 2 * Math.PI ? rings.map((ring) => [...ring].reverse()) : rings) } };
}
function makeRecord(item, name, id, aliases = []) {
  const clean = (value) => {
    if (!/Ã|Â/.test(value || '')) return value;
    const decoded = Buffer.from(value, 'latin1').toString('utf8');
    return decoded.includes('\uFFFD') ? value : decoded;
  };
  name = clean(name);
  return { name, id: String(id), aliases: [...new Set(aliases.filter(Boolean).map(clean))], feature: { ...item, properties: { id: String(id), name } } };
}
function fitPanel(records, id, label) {
  const collection = { type: 'FeatureCollection', features: records.map((record) => normalizeFeature(record.feature)) };
  const center = geoCentroid(collection);
  const bounds = geoBounds(collection);
  const lat1 = Math.max(-80, bounds[0][1]); const lat2 = Math.min(80, bounds[1][1]);
  const projection = lat1 * lat2 <= 0 || Math.abs(center[1]) < 5
    ? geoMercator().rotate([-center[0], 0])
    : geoConicConformal().parallels([lat1, lat2]).rotate([-center[0], 0]).center([0, center[1]]);
  projection.fitExtent([[24, 24], [976, 476]], collection);
  // Shared topology is simplified ONCE per arc in final display pixels. Both
  // sides of a boundary reuse identical coordinates, so no cracks can appear.
  const sharedSource = records[0].topology;
  const topo = sharedSource ? { ...sharedSource, objects: { regions: { type: 'GeometryCollection', geometries: records.map((record) => ({ ...record.topoGeometry, properties: { id: record.id, name: record.name } })) } } }
    : topology({ regions: collection }, 1e6);
  const transform = topo.transform;
  const used = new Set();
  const visit = (value) => { if (Array.isArray(value)) value.forEach(visit); else used.add(value < 0 ? ~value : value); };
  topo.objects.regions.geometries.forEach((geometry) => visit(geometry.arcs));
  const indices = [...used]; const remap = new Map(indices.map((index, i) => [index, i]));
  const arcs = indices.map((index) => {
    const arc = topo.arcs[index];
    let x = 0; let y = 0;
    const points = arc.map(([dx, dy]) => {
      x += dx; y += dy;
      return projection([x * transform.scale[0] + transform.translate[0], y * transform.scale[1] + transform.translate[1]]);
    });
    const simplified = simplifyLine(points, .12);
    return (simplified.length < 4 && points[0][0] === points.at(-1)[0] && points[0][1] === points.at(-1)[1] ? points : simplified)
      .map((point) => point.map((value) => +value.toFixed(2)));
  });
  const mapped = (value) => Array.isArray(value) ? value.map(mapped) : value < 0 ? ~remap.get(~value) : remap.get(value);
  const planar = { ...topo, arcs, objects: { regions: { ...topo.objects.regions, geometries: topo.objects.regions.geometries.map((geometry) => ({ ...geometry, arcs: mapped(geometry.arcs) })) } } }; delete planar.transform; delete planar.bbox;
  const path = geoPath(null).digits(2);
  const shapes = feature(planar, planar.objects.regions).features;
  const regions = shapes.map((shape) => ({ id: shape.properties.id, name: shape.properties.name, path: path(shape) }));
  if (regions.some((region) => !region.path || /NaN|Infinity/.test(region.path))) throw new Error(`Invalid projected shape: ${label}`);
  return { id, label, regions, borders: path(mesh(planar, planar.objects.regions)), bounds: path.bounds({ type: 'FeatureCollection', features: shapes }).flat() };
}

for (const [iso2, code] of Object.entries(REGIONAL_MAP_COUNTRIES)) {
  if (only && !only.includes(code)) continue;
  let records; let source;
  if (code === 'HKG') {
    records = polygonFeatures(hk).map((item, index) => makeRecord(item, item.properties.District, `HK-${index}`, [item.properties.District.replace(/ District$/, '')]));
    source = { name: 'Hong Kong Home Affairs Department', year: 'Official district boundary download, 2026-10-01', license: 'Hong Kong Government open-data terms', attribution: 'Source: Home Affairs Department, Hong Kong SAR Government', url: 'https://data.gov.hk/en-data/dataset/hk-had-json1-hong-kong-administrative-boundaries' };
  } else if (code === 'NOR') {
    const items = polygonFeatures(norwayFiles[0].data).filter((item) => item.properties.objtype === 'Fylke');
    records = items.map((item) => makeRecord(item, item.properties.fylkesnavn.split(' - ')[0], `NO-${item.properties.fylkesnummer}`, [item.properties.fylkesnavn]));
    source = { name: 'Kartverket / Geonorge', year: '2026 distribution, 2024 county structure', license: 'Norwegian Licence for Open Government Data (NLOD)', attribution: 'Source: Kartverket, Administrative units of Norway', url: norwayURL };
  } else if (code === 'HUN') {
    let hungary;
    try { hungary = JSON.parse(await readFile(join(cache, 'HUN-NUTS-2024.json'))); } catch {
      hungary = compactTopology(await cached('https://gisco-services.ec.europa.eu/distribution/v2/nuts/topojson/NUTS_RG_01M_2024_4326.json', 'NUTS-2024.topojson'), (geometry) => geometry.properties.CNTR_CODE === 'HU' && +geometry.properties.LEVL_CODE === 3);
      await writeFile(join(cache, 'HUN-NUTS-2024.json'), JSON.stringify(hungary));
    }
    const object = Object.values(hungary.objects)[0];
    records = feature(hungary, object).features.map((item, index) => ({ ...makeRecord(item, item.properties.NUTS_NAME, item.properties.NUTS_ID), topology: hungary, topoGeometry: object.geometries[index] }));
    source = { name: 'European Commission – Eurostat/GISCO', year: '2024', license: 'Eurostat geographic data reuse terms', attribution: '© EuroGeographics for the administrative boundaries. Source: European Commission – Eurostat/GISCO. NUTS 3: 19 counties and Budapest.', url: 'https://ec.europa.eu/eurostat/web/gisco/geodata/statistical-units/territorial-units-statistics' };
  } else if (code === 'SVN') {
    const object = Object.values(slovenia.objects)[0];
    const selected = { ...object, geometries: object.geometries.filter((geometry) => geometry.properties.CNTR_CODE === 'SI') };
    records = feature(slovenia, selected).features.map((item, index) => ({ ...makeRecord(item, item.properties.LAU_NAME, item.properties.GISCO_ID), topology: slovenia, topoGeometry: selected.geometries[index] }));
    source = { name: 'European Commission – Eurostat/GISCO', year: '2024', license: 'Eurostat geographic data reuse terms', attribution: '© EuroGeographics for the administrative boundaries. Source: European Commission – Eurostat/GISCO', url: 'https://ec.europa.eu/eurostat/web/gisco/geodata/statistical-units/local-administrative-units' };
  } else if (code === 'GIB') {
    // Gibraltar has no first-order province/state subdivisions.
    const world = JSON.parse(await readFile(new URL('../src/features/analytics/assets/worldEqualEarth.json', import.meta.url)));
    const natural = JSON.parse(await readFile(join(tmpdir(), 'book-buy-natural-earth-ca96624a56bd078437bca8184e78163e5039ad19', 'ne_10m_admin_0_countries.geojson')));
    const item = natural.features.find((item) => item.properties.ADM0_A3 === 'GIB');
    if (!world.countries.some((country) => country.iso2 === 'GI') || !item) throw new Error('Missing Gibraltar territory');
    records = [makeRecord(item, 'Gibraltar', 'GI')];
    source = { name: 'Natural Earth 1:10m', year: 'Pinned source revision ca96624a', license: 'Public domain', attribution: 'Natural Earth. Gibraltar is shown as a single territory; it has no province/state tier.', url: 'https://www.naturalearthdata.com/' };
  } else {
    const level = ['ITA', 'GRC'].includes(code) ? 'ADM2' : 'ADM1';
    const metadata = JSON.parse(await readFile(join(cache, `${code}-${level}-metadata.json`)));
    let lightweight = +metadata.meanVertices * +metadata.admUnitCount > 150000;
    let topo = lightweight ? topology({ regions: await cached(metadata.simplifiedGeometryGeoJSON, `${metadata.boundaryID}-cartographic.geojson`) }, 1e6)
      : JSON.parse(await readFile(join(cache, `${metadata.boundaryID}.topojson`)));
    // Some provider cartographic files drop small regions (e.g. Budapest).
    // Never accept that: retain the complete original boundary layer instead.
    if (Object.values(topo.objects)[0].geometries.length !== +metadata.admUnitCount) {
      topo = await cached(metadata.tjDownloadURL, `${metadata.boundaryID}.topojson`);
      lightweight = false;
    }
    const object = Object.values(topo.objects)[0];
    records = feature(topo, object).features.map((item, index) => ({ ...makeRecord(item, item.properties.shapeName, `${code}-${index}-${item.properties.shapeISO || ''}`, [
      item.properties.shapeName.replace(/ Region$| Territory$| Province$/i, ''), item.properties.shapeISO
    ]), topology: topo, topoGeometry: object.geometries[index] }));
    source = { name: 'geoBoundaries gbOpen', year: metadata.boundaryYearRepresented, license: metadata.boundaryLicense, attribution: `geoBoundaries / William & Mary; original source: ${metadata.boundarySource}`, url: lightweight ? metadata.simplifiedGeometryGeoJSON : metadata.tjDownloadURL, boundaryID: metadata.boundaryID, level, cartographicSource: lightweight };
    if (code === 'MEX') records = records.map((record) => record.name === 'Distrito Federal' ? { ...record, name: 'Mexico City', aliases: [...record.aliases, 'Ciudad de México', 'Ciudad de Mexico'], feature: { ...record.feature, properties: { ...record.feature.properties, name: 'Mexico City' } } } : record);
    if (code === 'GRC') {
      const names = ['Eastern Macedonia and Thrace', 'Central Macedonia', 'Western Macedonia', 'Epirus', 'Thessaly', 'Central Greece', 'Ionian Islands', 'Western Greece', 'Peloponnese', 'Attica', 'North Aegean', 'South Aegean', 'Crete', 'Mount Athos'];
      records = records.map((record, index) => ({ ...record, name: names[index], aliases: [...record.aliases, record.name, ...(index === 0 ? ['East Macedonia and Thrace'] : [])], feature: { ...record.feature, properties: { ...record.feature.properties, name: names[index] } } }));
    }
    if (code === 'LVA') {
      const madona = records.find((record) => /Madonas/i.test(record.name));
      const varaklani = records.find((record) => /Varakļānu/i.test(record.name));
      if (!madona || !varaklani) throw new Error('Missing Latvia merger inputs');
      const united = merge(topo, [madona.topoGeometry, varaklani.topoGeometry]);
      records = records.filter((record) => record !== varaklani).map((record) => ({ ...record, topology: undefined, topoGeometry: undefined,
        ...(record === madona ? { feature: { ...record.feature, geometry: united }, aliases: [...record.aliases, varaklani.name] } : {}) }));
      source.year += '; Madona/Varakļāni merger effective 2025-07-01';
      source.attribution += '; merger verified against Madona Municipality: https://www.madona.lv/lat/?ct=pagasti';
    }
    if (code === 'FRA') {
      const natural = JSON.parse(await readFile(join(tmpdir(), 'book-buy-natural-earth-ca96624a56bd078437bca8184e78163e5039ad19', 'ne_10m_admin_1_states_provinces.geojson')));
      for (const [iso, name] of [['FR-GF', 'French Guiana'], ['FR-GP', 'Guadeloupe'], ['FR-MQ', 'Martinique'], ['FR-RE', 'Réunion'], ['FR-YT', 'Mayotte']]) {
        const item = natural.features.find((item) => item.properties.iso_3166_2 === iso);
        if (!item) throw new Error(`Missing French overseas region ${iso}`);
        records.push(makeRecord(item, name, iso, [item.properties.name_en, item.properties.name]));
      }
      source.attribution += '; five overseas regions: Natural Earth 1:10m, public domain, pinned ca96624a56bd078437bca8184e78163e5039ad19';
    }
  }
  // Never compress a mainland view to accommodate remote islands. Each remote
  // area gets an independently fitted view using the SAME 1000 × 500 canvas.
  const separate = code === 'USA' ? ['Alaska', 'Hawaii', 'Puerto Rico', 'American Samoa', 'Guam', 'United States Virgin Islands', 'Commonwealth of the Northern Mariana Islands']
    : code === 'PRT' ? records.filter((record) => /Madeira|Açores|Azores/i.test(record.name)).map((record) => record.name)
    : code === 'ESP' ? records.filter((record) => /Canarias|Canary/i.test(record.name)).map((record) => record.name)
    : code === 'NZL' ? records.filter((record) => /Chatham/i.test(record.name)).map((record) => record.name)
    : code === 'AUS' ? ['Other Territories'] : [];
  if (code === 'FRA') separate.push('French Guiana', 'Guadeloupe', 'Martinique', 'Réunion', 'Mayotte');
  const main = records.filter((record) => !separate.includes(record.name));
  const panels = [fitPanel(main, 'main', separate.length ? 'Mainland & nearby islands' : 'Full country')];
  for (const name of separate) {
    const group = records.filter((record) => record.name === name);
    if (group.length) panels.push(fitPanel(group, group[0].id, name));
  }
  const result = { version: 2, iso2, code, width: 1000, height: 500, source, regions: records.map(({ feature, topology, topoGeometry, ...record }) => record), panels };
  await writeFile(new URL(`${code}.json`, output), JSON.stringify(result));
  sources.push({ code, iso2, units: records.length, source });
  console.log(`Built ${code}: ${records.length} regions, ${panels.length} fitted views`);
  global.gc?.();
}
if (only) {
  const existing = JSON.parse(await readFile(new URL('sources.json', output)));
  sources.push(...existing.countries.filter((item) => !only.includes(item.code)));
}
await writeFile(new URL('sources.json', output), JSON.stringify({ checkedAt: '2026-10-01', countries: sources }, null, 2));
