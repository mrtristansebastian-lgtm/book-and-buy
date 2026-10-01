// Natural Earth GeoJSON polygons are split at the antimeridian. Lookup is
// winding-independent and respects lake holes. Grid buckets limit candidates.
export function ringContains(ring, [x, y]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]; const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Douglas–Peucker in projected pixels, retaining coastlines within tolerance.
export function simplifyLine(points, tolerance = .12) {
  if (points.length < 3) return points;
  const [ax, ay] = points[0]; const [bx, by] = points.at(-1);
  const dx = bx - ax; const dy = by - ay; const length2 = dx * dx + dy * dy;
  let farthest = tolerance * tolerance; let split = -1;
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const t = length2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / length2)) : 0;
    const distance2 = (x - ax - t * dx) ** 2 + (y - ay - t * dy) ** 2;
    if (distance2 > farthest) { farthest = distance2; split = i; }
  }
  return split < 0 ? [points[0], points.at(-1)] : [
    ...simplifyLine(points.slice(0, split + 1), tolerance).slice(0, -1),
    ...simplifyLine(points.slice(split), tolerance)
  ];
}
export function createGeoIndex(features) {
  const buckets = new Map();
  const step = 5;
  for (const feature of features) {
    const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    for (const rings of polygons) {
      const bounds = rings[0].reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [Infinity, Infinity, -Infinity, -Infinity]);
      const entry = { feature, rings, bounds };
      for (let x = Math.floor(bounds[0] / step); x <= Math.floor(bounds[2] / step); x++) {
        for (let y = Math.floor(bounds[1] / step); y <= Math.floor(bounds[3] / step); y++) {
          const key = `${x}:${y}`;
          if (!buckets.has(key)) buckets.set(key, []);
          buckets.get(key).push(entry);
        }
      }
    }
  }
  return { find(point, accept = () => true) {
    const [x, y] = point;
    return (buckets.get(`${Math.floor(x / step)}:${Math.floor(y / step)}`) || []).find(({ feature, rings, bounds: b }) =>
      x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3] && accept(feature) &&
      ringContains(rings[0], point) && !rings.slice(1).some((ring) => ringContains(ring, point)))?.feature;
  } };
}
