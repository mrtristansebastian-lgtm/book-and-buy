const A1 = 1.340264;
const A2 = -0.081106;
const A3 = 0.000893;
const A4 = 0.003796;
const M = Math.sqrt(3) / 2;
const RADIANS = Math.PI / 180;

export function projectEqualEarth(longitude, latitude, map) {
  if (typeof longitude !== 'number' || typeof latitude !== 'number') return null;
  const lng = Number(longitude);
  const lat = Number(latitude);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null;

  const lambda = lng * RADIANS;
  const phi = lat * RADIANS;
  let rawX; let rawY;
  if (map?.projection === 'naturalEarth1') {
    const phi2 = phi * phi;
    const phi4 = phi2 * phi2;
    rawX = lambda * (0.8707 - 0.131979 * phi2 + phi4 * (-0.013791 + phi4 * (0.003971 * phi2 - 0.001529 * phi4)));
    rawY = phi * (1.007226 + phi2 * (0.015085 + phi4 * (-0.044475 + 0.028874 * phi2 - 0.005916 * phi4)));
  } else {
    const theta = Math.asin(M * Math.sin(phi));
    const theta2 = theta * theta;
    const theta6 = theta2 * theta2 * theta2;
    const denominator = M * (A1 + 3 * A2 * theta2 + theta6 * (7 * A3 + 9 * A4 * theta2));
    rawX = (lambda * Math.cos(theta)) / denominator;
    rawY = theta * (A1 + A2 * theta2 + theta6 * (A3 + A4 * theta2));
  }
  const scale = Number(map?.scale || 1);
  const translate = map?.translate || [0, 0];
  return [Number(translate[0]) + scale * rawX, Number(translate[1]) - scale * rawY];
}

export function clusterLiveSessions(sessions = [], map, cellSize = 28) {
  const clusters = new Map();
  for (const session of sessions) {
    const point = projectEqualEarth(session.longitude, session.latitude, map);
    if (!point) continue;
    const [x, y] = point;
    const key = `${Math.round(x / cellSize)}:${Math.round(y / cellSize)}`;
    const existing = clusters.get(key);
    if (existing) {
      existing.sessions.push(session);
      existing.xTotal += x;
      existing.yTotal += y;
      continue;
    }
    clusters.set(key, {
      id: key,
      sessions: [session],
      xTotal: x,
      yTotal: y
    });
  }

  return [...clusters.values()].map((cluster) => {
    const sessionsByRecency = [...cluster.sessions].sort(
      (a, b) => Number(b.lastSeenAt || 0) - Number(a.lastSeenAt || 0)
    );
    return {
      id: cluster.id,
      x: cluster.xTotal / cluster.sessions.length,
      y: cluster.yTotal / cluster.sessions.length,
      count: cluster.sessions.length,
      sessions: sessionsByRecency,
      latest: sessionsByRecency[0]
    };
  });
}

