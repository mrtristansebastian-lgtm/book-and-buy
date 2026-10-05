const radians = Math.PI / 180;
export const GLOBE_CAMERA_DISTANCE = 3.3;
export const GLOBE_FIELD_OF_VIEW = 38;
export const DEFAULT_GLOBE_ROTATION = Object.freeze({ longitude: 20, latitude: 12 });

export function normalizeGlobeRotation({ longitude = 0, latitude = 0 } = {}) {
  return { longitude: ((longitude + 180) % 360 + 360) % 360 - 180, latitude: Math.max(-80, Math.min(80, latitude)) };
}

export function geographicPoint(longitude, latitude) {
  if (![longitude, latitude].every(value => typeof value === 'number' && Number.isFinite(value)) ||
    longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) return null;
  const lng = longitude * radians; const lat = latitude * radians;
  return { x: Math.cos(lat) * Math.sin(lng), y: Math.sin(lat), z: Math.cos(lat) * Math.cos(lng) };
}

export function rotateGlobePoint(point, rotation = DEFAULT_GLOBE_ROTATION) {
  const yaw = -rotation.longitude * radians; const pitch = rotation.latitude * radians;
  const x = Math.cos(yaw) * point.x + Math.sin(yaw) * point.z;
  const z = -Math.sin(yaw) * point.x + Math.cos(yaw) * point.z;
  return { x, y: Math.cos(pitch) * point.y - Math.sin(pitch) * z,
    z: Math.sin(pitch) * point.y + Math.cos(pitch) * z };
}

export function projectGlobePoint(longitude, latitude, rotation, width, height, zoom = 1) {
  const original = geographicPoint(longitude, latitude);
  if (!original || !(width > 0 && height > 0)) return null;
  const point = rotateGlobePoint(original, rotation);
  const camera = GLOBE_CAMERA_DISTANCE / zoom;
  // The visible edge on a perspective sphere is slightly in front of z=0.
  if (point.z <= 1 / camera) return null;
  const focal = 1 / Math.tan(GLOBE_FIELD_OF_VIEW * radians / 2);
  const distance = camera - point.z;
  const extent = Math.min(width, height);
  return { x: width / 2 + point.x * focal * extent / (2 * distance),
    y: height / 2 - point.y * focal * extent / (2 * distance), depth: point.z };
}

/** Ray/sphere intersection lets clicks select the actual surface underneath. */
export function globePointFromScreen(x, y, rotation, width, height, zoom = 1) {
  if (!(width > 0 && height > 0)) return null;
  const focal = 1 / Math.tan(GLOBE_FIELD_OF_VIEW * radians / 2);
  const extent = Math.min(width, height);
  const dx = (2 * x - width) / extent / focal;
  const dy = (height - 2 * y) / extent / focal;
  const camera = GLOBE_CAMERA_DISTANCE / zoom;
  const a = dx * dx + dy * dy + 1; const b = -2 * camera; const c = camera * camera - 1;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const distance = (-b - Math.sqrt(discriminant)) / (2 * a);
  const point = { x: distance * dx, y: distance * dy, z: camera - distance };
  const pitch = rotation.latitude * radians; const yaw = rotation.longitude * radians;
  const y0 = Math.cos(pitch) * point.y + Math.sin(pitch) * point.z;
  const z0 = -Math.sin(pitch) * point.y + Math.cos(pitch) * point.z;
  const x0 = Math.cos(yaw) * point.x + Math.sin(yaw) * z0;
  const z1 = -Math.sin(yaw) * point.x + Math.cos(yaw) * z0;
  return { longitude: Math.atan2(x0, z1) / radians, latitude: Math.asin(Math.max(-1, Math.min(1, y0))) / radians };
}

export function buildGlobeMesh(columns = 96, rows = 64) {
  const positions = []; const coordinates = []; const indices = [];
  for (let row = 0; row <= rows; row += 1) {
    for (let column = 0; column <= columns; column += 1) {
      const point = geographicPoint(column / columns * 360 - 180, 90 - row / rows * 180);
      positions.push(point.x, point.y, point.z); coordinates.push(column / columns, row / rows);
      if (row < rows && column < columns) {
        const a = row * (columns + 1) + column; const c = a + columns + 1;
        indices.push(a, c, a + 1, a + 1, c, c + 1);
      }
    }
  }
  return { positions: new Float32Array(positions), coordinates: new Float32Array(coordinates), indices: new Uint16Array(indices) };
}

export function clusterGlobeSessions(sessions = [], cellDegrees = 5) {
  const clusters = new Map();
  for (const session of sessions) {
    if (!geographicPoint(session.longitude, session.latitude)) continue;
    const key = `${Math.round(session.longitude / cellDegrees)}:${Math.round(session.latitude / cellDegrees)}`;
    const cluster = clusters.get(key) || { id: key, count: 0, longitude: 0, latitude: 0, sessions: [] };
    cluster.count += 1; cluster.longitude += session.longitude; cluster.latitude += session.latitude;
    cluster.sessions.push(session); clusters.set(key, cluster);
  }
  return [...clusters.values()].map(cluster => ({ ...cluster, longitude: cluster.longitude / cluster.count, latitude: cluster.latitude / cluster.count }));
}

export function geographicRingContains(ring, longitude, latitude) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]; const [xj, yj] = ring[j];
    if ((yi > latitude) !== (yj > latitude) && longitude < (xj - xi) * (latitude - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function globeCountryAt(countries, longitude, latitude) {
  return countries.find(country => country.polygons.some(rings =>
    geographicRingContains(rings[0], longitude, latitude) && !rings.slice(1).some(ring => geographicRingContains(ring, longitude, latitude)))) || null;
}

const countryLookups = new WeakMap();
/** Old presence rows may use names or ISO3; map only known geographic aliases. */
export function resolveGlobeCountry(value, countries) {
  if (typeof value !== 'string' || !value.trim()) return null;
  let lookup = countryLookups.get(countries);
  if (!lookup) {
    lookup = new Map();
    let displayNames;
    try { displayNames = new Intl.DisplayNames(['en'], { type: 'region' }); } catch { /* Source names still work. */ }
    for (const country of countries) {
      if (!/^[A-Z]{2}$/.test(country.iso2)) continue;
      for (const alias of [country.iso2, country.code, country.name, displayNames?.of(country.iso2)]) {
        if (typeof alias === 'string' && alias.trim()) lookup.set(alias.trim().toLowerCase(), country);
      }
    }
    for (const [alias, code] of [['uk', 'GB'], ['united states of america', 'US'], ['usa', 'US'], ['great britain', 'GB']]) {
      const country = lookup.get(code.toLowerCase());
      if (country) lookup.set(alias, country);
    }
    countryLookups.set(countries, lookup);
  }
  return lookup.get(value.trim().toLowerCase()) || null;
}
