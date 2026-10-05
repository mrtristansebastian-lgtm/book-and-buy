const sessionIdValid = (value) => typeof value === 'string' && /^[a-zA-Z0-9_-]{8,80}$/.test(value);
const sources = ['places', 'direct'];

/** Analytics is optional. The source comes from a verified business session, not checkout text. */
export async function verifiedAnalyticsAttribution(data, ownerId, slug, readSession) {
  if (data.analyticsSessionId == null && data.analyticsSource == null) return {};
  if (!sessionIdValid(data.analyticsSessionId) || !sources.includes(data.analyticsSource)) {
    throw new Error('Invalid analytics attribution.');
  }
  const session = await readSession(data.analyticsSessionId);
  if (!session || session.analyticsVersion !== 2 || session.sessionId !== data.analyticsSessionId ||
      session.ownerId !== ownerId || session.slug !== slug || session.source !== data.analyticsSource) return {};
  return { analyticsSessionId: session.sessionId, analyticsSource: session.source,
    ...(session.source === 'places' && ['places', 'buy', 'book'].includes(session.acquisitionSurface)
      ? { discoverySurface: session.acquisitionSurface } : {}) };
}
