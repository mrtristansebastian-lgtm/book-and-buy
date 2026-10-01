export const LIVE_VISITOR_WINDOW_MS = 5 * 60 * 1000;
export const LIVE_COMMERCE_WINDOW_MS = 10 * 60 * 1000;
export const ANALYTICS_SESSION_IDLE_MS = 30 * 60 * 1000;
export const PRESENCE_WRITE_THROTTLE_MS = 60 * 1000;
export const GEO_CACHE_MS = 6 * 60 * 60 * 1000;
export const MAX_LIVE_SESSION_DOCS = 500;

export function analyticsTimestampMs(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  if (value && Number.isFinite(value.seconds)) {
    return Number(value.seconds) * 1000 + Math.floor(Number(value.nanoseconds || 0) / 1e6);
  }
  return 0;
}

export function roundApproxCoordinate(value) {
  if (typeof value !== 'number') return null;
  const coordinate = Number(value);
  if (!Number.isFinite(coordinate)) return null;
  return Math.round(coordinate * 10) / 10;
}

export function validGeoCoordinates(latitude, longitude) {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function liveActivityMs(session) {
  return analyticsTimestampMs(session?.updatedAt) || analyticsTimestampMs(session?.lastSeenAt);
}

export function shouldReuseAnalyticsSession(stored, now = Date.now()) {
  const id = String(stored?.id || '');
  const startedAt = Number(stored?.startedAt || 0);
  const lastActivityAt = Number(stored?.lastActivityAt || 0);
  return (
    id.length >= 8 &&
    startedAt > 0 &&
    lastActivityAt > 0 &&
    now - lastActivityAt <= ANALYTICS_SESSION_IDLE_MS
  );
}

export function presenceWriteDue(lastWriteAt, now = Date.now()) {
  return !lastWriteAt || now < Number(lastWriteAt) || now - Number(lastWriteAt) >= PRESENCE_WRITE_THROTTLE_MS;
}

