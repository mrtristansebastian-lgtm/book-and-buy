import { shouldReuseAnalyticsSession } from './livePresence.js';

export const ANALYTICS_VERSION = 2;
export const ANALYTICS_SOURCES = ['places', 'direct'];
const validId = (value) => typeof value === 'string' && /^[a-zA-Z0-9_-]{8,80}$/.test(value);

/** Anonymous identifiers are scoped to one business, never an account or email. */
export function nextAnonymousIdentity({ storedSession, storedVisitor, source, now, createId }) {
  const knownVisitor = validId(storedVisitor?.id) && Number.isFinite(storedVisitor?.firstSeenAt) && storedVisitor.firstSeenAt > 0;
  const visitor = knownVisitor ? storedVisitor : { id: createId(), firstSeenAt: now };
  const sameVisit = storedSession?.analyticsVersion === ANALYTICS_VERSION && validId(storedSession.id) &&
    shouldReuseAnalyticsSession(storedSession, now);
  const reusable = sameVisit && (!source || source === storedSession.source);
  const session = reusable ? { ...storedSession, lastActivityAt: now } : {
    id: createId(), startedAt: now, lastActivityAt: now,
    analyticsVersion: ANALYTICS_VERSION,
    visitorId: visitor.id, visitorFirstSeenAt: visitor.firstSeenAt,
    isReturningVisitor: sameVisit ? storedSession.isReturningVisitor : Boolean(knownVisitor),
    source: ANALYTICS_SOURCES.includes(source) ? source : 'direct'
  };
  return { visitor, session };
}

export function doNotTrackEnabled(navigatorValue, windowValue) {
  return [navigatorValue?.doNotTrack, navigatorValue?.msDoNotTrack, windowValue?.doNotTrack]
    .some((value) => value === '1' || value === 'yes');
}

export function anonymousMetadata(session) {
  return {
    analyticsVersion: ANALYTICS_VERSION,
    visitorId: session.visitorId,
    visitorFirstSeenAt: session.visitorFirstSeenAt,
    isReturningVisitor: session.isReturningVisitor,
    source: session.source
  };
}
