export const DISCOVERY_SURFACES = Object.freeze(['places', 'book', 'buy']);

/** Entry attribution follows only the business's current anonymous visit. */
export function discoveryEventMetadata({ surface, stored, sessionId } = {}) {
  const explicit = DISCOVERY_SURFACES.includes(surface) ? surface : '';
  const inherited = stored?.sessionId === sessionId && DISCOVERY_SURFACES.includes(stored?.surface)
    ? stored.surface : '';
  const discoverySurface = explicit || inherited;
  return discoverySurface ? { discoveryVersion: 1, discoverySurface } : {};
}

/** One visible listing per business visit and discovery surface, including reloads. */
export function discoveryImpressionId({ sessionId, surface, itemKind = 'business', itemId = '' }) {
  return ['discovery_impression', sessionId, surface, itemKind, itemId].map(value => encodeURIComponent(String(value))).join('_');
}
