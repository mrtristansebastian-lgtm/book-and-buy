const EARTH_KM = 6371;

function toRad(deg) {
  return (Number(deg) * Math.PI) / 180;
}

/** Great-circle distance in kilometres. Returns Infinity if coords invalid. */
export function distanceKm(lat1, lng1, lat2, lng2) {
  const aLat = Number(lat1);
  const aLng = Number(lng1);
  const bLat = Number(lat2);
  const bLng = Number(lng2);
  if (![aLat, aLng, bLat, bLng].every((n) => Number.isFinite(n))) return Infinity;
  if (aLat === 0 && aLng === 0 && bLat === 0 && bLng === 0) return Infinity;

  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1r = toRad(aLat);
  const lat2r = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1r) * Math.cos(lat2r) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistanceKm(km) {
  if (!Number.isFinite(km) || km === Infinity) return '';
  if (km < 1) return `${Math.max(100, Math.round(km * 1000))} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
