/**
 * Observed traffic, not estimates. Missing historical measurements stay null;
 * commerce values are read only from paid ledger rows, never browser events.
 */
const DAY_MS = 86400000;
const has = (row, key) => Object.prototype.hasOwnProperty.call(row || {}, key);
const text = value => String(value ?? '').trim();
const finite = value => value !== null && value !== '' && value !== undefined && Number.isFinite(Number(value));
const nonNegative = value => finite(value) && Number(value) >= 0 ? Number(value) : null;
const percentage = (numerator, denominator) => denominator ? Math.round(numerator / denominator * 1000) / 10 : 0;

export const REPORT_METRICS = Object.freeze([
  { id: 'visitors', label: 'Visitors', format: 'count', lede: 'Unique tracked visitors per day' },
  { id: 'sessions', label: 'Sessions', format: 'count', lede: 'Tracked sessions started per day' },
  { id: 'page_views', label: 'Page views', format: 'count', lede: 'Recorded page views per day' },
  { id: 'new_visitors', label: 'New visitors', format: 'count', lede: 'Visitors first seen on each day' },
  { id: 'returning_visitors', label: 'Returning visitors', format: 'count', lede: 'Visitors seen before each day' },
  { id: 'message_leads', label: 'Message leads', format: 'count', lede: 'First messages successfully sent per day' },
  { id: 'booking_started', label: 'Booking starts', format: 'count', lede: 'Recorded booking starts per day' }
]);

export function reportTimestampMs(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (value && typeof value.toMillis === 'function') return reportTimestampMs(value.toMillis());
  if (value && finite(value.seconds)) return Number(value.seconds) * 1000 + (Number(value.nanoseconds) || 0) / 1000000;
  if (finite(value)) return Number(value);
  return null;
}

function timeInBounds(value, start, end) {
  const at = reportTimestampMs(value);
  if (at === null) return start == null && end == null;
  return (start == null || at >= start) && (end == null || at <= end);
}

function sessionTime(row) { return row.startedAt ?? row.createdAt; }
function eventTime(row) { return row.at ?? row.createdAt; }
function sessionId(row) { return text(row.sessionId || row.id); }
function attributionSessionId(row) { return text(row.analyticsSessionId || row.attribution?.sessionId); }
function isPlaces(row) { return text(row.analyticsSource || row.attribution?.source || row.source).toLowerCase() === 'places'; }
function canonicalCurrency(value) {
  const currency = text(value).toUpperCase();
  return ({ R: 'ZAR', '$': 'USD', '€': 'EUR' })[currency] || currency || 'Unknown';
}

/** Merge duplicate snapshots by session identity without relabelling them as visitors. */
export function dedupeReportSessions(rows = []) {
  const result = new Map();
  rows.filter(row => row && !row.isBot).forEach((row, index) => {
    const id = sessionId(row) || `unidentified-session:${index}`;
    const previous = result.get(id);
    if (!previous) { result.set(id, { ...row }); return; }
    const nextIsLatest = (reportTimestampMs(row.lastSeenAt) ?? 0) >= (reportTimestampMs(previous.lastSeenAt) ?? 0);
    const merged = nextIsLatest ? { ...previous, ...row } : { ...row, ...previous };
    const starts = [reportTimestampMs(previous.startedAt), reportTimestampMs(row.startedAt)].filter(value => value !== null);
    if (starts.length) merged.startedAt = Math.min(...starts);
    result.set(id, merged);
  });
  return [...result.values()];
}

function eventIdentity(row, index) {
  const id = text(row.eventId || row.id);
  if (id) return `id:${id}`;
  // Older fixtures have no document id. Collapse only exact retry signatures.
  const at = reportTimestampMs(eventTime(row));
  if (at === null) return `unidentified-event:${index}`;
  return JSON.stringify([row.type, row.sessionId, at, row.path, row.productId, row.orderId, row.bookingId, row.threadId]);
}

export function dedupeReportEvents(rows = []) {
  const result = new Map();
  rows.filter(row => row && !row.isBot).forEach((row, index) => {
    const key = eventIdentity(row, index);
    if (!result.has(key)) result.set(key, row);
  });
  return [...result.values()];
}

function prepare({ sessions = [], events = [], start = null, end = null } = {}) {
  const allSessions = dedupeReportSessions(sessions);
  const botIds = new Set(sessions.filter(row => row?.isBot).map(sessionId).filter(Boolean));
  return {
    sessions: allSessions.filter(row => timeInBounds(sessionTime(row), start, end)),
    events: dedupeReportEvents(events).filter(row => !botIds.has(text(row.sessionId)) && timeInBounds(eventTime(row), start, end))
  };
}

function version2(row) { return Number(row.analyticsVersion) >= 2; }
function capability(rows, events, tracking, key) {
  return tracking[key] === true || [...rows, ...events].some(version2);
}

function rank(values, limit = 8) {
  const counts = new Map();
  for (const value of values) { const label = text(value) || 'Unknown'; counts.set(label, (counts.get(label) || 0) + 1); }
  const total = values.length;
  return [...counts].map(([label, count]) => ({ label, count, pct: percentage(count, total) }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, limit);
}

export function reportPageLabel(raw) {
  let path = text(raw);
  if (!path) return 'Unknown page';
  try { if (/^https?:\/\//i.test(path)) { const url = new URL(path); path = url.hash.startsWith('#/') ? url.hash.slice(1) : url.pathname; } } catch { /* Keep the recorded path. */ }
  if (path.includes('#/')) path = path.slice(path.indexOf('#/') + 1);
  return path.split('?')[0].split('#')[0] || '/';
}

function referrerLabel(row) {
  if (isPlaces(row)) return 'Book & Buy Places';
  if (!has(row, 'referrer')) return 'Unknown';
  const referrer = text(row.referrer);
  if (!referrer) return 'Direct';
  try { return new URL(referrer).hostname.replace(/^www\./i, '') || 'Unknown'; }
  catch { return 'Unknown'; }
}

function locationLabel(row) { return [text(row.city), text(row.country)].filter(Boolean).join(', ') || text(row.region) || 'Unknown'; }
function visitorObservations(sessions, events) {
  const rows = sessions.filter(row => text(row.visitorId));
  const knownSessions = new Map(sessions.map(row => [sessionId(row), row]));
  const unresolved = new Set();
  events.forEach((row, index) => {
    const known = knownSessions.get(text(row.sessionId));
    if (text(row.visitorId)) rows.push({ ...row, startedAt: eventTime(row) });
    else if (!known) unresolved.add(text(row.sessionId) || eventIdentity(row, index));
  });
  return { rows, unresolvedSessions: unresolved.size };
}
function measuredTime(row) { return nonNegative(row.engagedTimeMs ?? row.durationMs); }
function explicitEngaged(row, pageViews = 0) {
  if (typeof row.engaged === 'boolean') return row.engaged;
  if (typeof row.isEngaged === 'boolean') return row.isEngaged;
  const duration = measuredTime(row);
  if (duration === null) return null;
  return duration >= 10000 || Math.max(nonNegative(row.pageViewCount) ?? 0, pageViews) >= 2;
}

/** Shared public-traffic summary. `complete` describes query coverage, not data invention. */
export function buildTrafficReport(options = {}) {
  const { start = null, end = null, tracking = {}, complete = true, limit = 8 } = options;
  const { sessions, events } = prepare(options);
  const identified = sessions.filter(row => text(row.visitorId));
  const visitorActivity = visitorObservations(sessions, events);
  const visitorGroups = new Map();
  for (const row of visitorActivity.rows) {
    const id = text(row.visitorId);
    const group = visitorGroups.get(id) || [];
    group.push(row); visitorGroups.set(id, group);
  }
  const identityAvailable = identified.length === sessions.length && visitorActivity.unresolvedSessions === 0 && (visitorActivity.rows.length > 0 || tracking.visitorIdentity === true);
  let newVisitors = 0; let returningVisitors = 0; let unclassifiedVisitors = 0;
  for (const group of visitorGroups.values()) {
    const firstSeen = group.map(row => reportTimestampMs(row.visitorFirstSeenAt)).filter(value => value !== null);
    const flags = group.map(row => row.isReturningVisitor).filter(value => typeof value === 'boolean');
    if (start != null && firstSeen.length) {
      const first = Math.min(...firstSeen);
      if (end != null && first > end) unclassifiedVisitors += 1;
      else if (first < start) returningVisitors += 1; else newVisitors += 1;
    } else if (flags.includes(false)) newVisitors += 1;
    else if (flags.length) returningVisitors += 1;
    else unclassifiedVisitors += 1;
  }
  const classificationAvailable = identityAvailable && unclassifiedVisitors === 0;
  const pageViews = events.filter(row => row.type === 'page_view');
  const viewsBySession = new Map();
  pageViews.forEach(row => viewsBySession.set(text(row.sessionId), (viewsBySession.get(text(row.sessionId)) || 0) + 1));
  const engagement = sessions.map(row => ({ row, value: explicitEngaged(row, viewsBySession.get(sessionId(row)) || 0) }));
  const measuredEngagement = engagement.filter(item => item.value !== null);
  const engagedSessions = measuredEngagement.filter(item => item.value).length;
  const engagementAvailable = sessions.length > 0 && measuredEngagement.length === sessions.length;
  const endedSessions = sessions.filter(row => reportTimestampMs(row.endedAt ?? row.closedAt) !== null || row.ended === true);
  const ended = measuredEngagement.filter(({ row }) => endedSessions.includes(row));
  const bounceAvailable = ended.length > 0 && ended.length === endedSessions.length;
  const durations = sessions.map(measuredTime).filter(value => value !== null);
  const durationAvailable = sessions.length > 0 && durations.length === sessions.length;
  const pagesAvailable = pageViews.length > 0 || capability(sessions, events, tracking, 'pageViews');
  const availability = {
    sessions: true, uniqueVisitors: identityAvailable, pageViews: pagesAvailable,
    newVisitors: classificationAvailable, returningVisitors: classificationAvailable,
    engagedSessions: engagementAvailable, engagementRate: engagementAvailable,
    bounceRate: bounceAvailable, averageDurationMs: durationAvailable,
    devices: sessions.some(row => ['mobile', 'tablet', 'desktop'].includes(text(row.device).toLowerCase())),
    referrers: sessions.some(row => has(row, 'referrer') || isPlaces(row)),
    locations: sessions.some(row => text(row.country) || text(row.city) || text(row.region)),
    popularPages: pagesAvailable
  };
  return {
    metrics: {
      sessions: sessions.length,
      uniqueVisitors: identityAvailable ? visitorGroups.size : null,
      pageViews: pagesAvailable ? pageViews.length : null,
      newVisitors: classificationAvailable ? newVisitors : null,
      returningVisitors: classificationAvailable ? returningVisitors : null,
      engagedSessions: engagementAvailable ? engagedSessions : null,
      engagementRate: engagementAvailable ? percentage(engagedSessions, sessions.length) : null,
      bounceRate: bounceAvailable ? percentage(ended.filter(item => !item.value).length, ended.length) : null,
      averageDurationMs: durationAvailable ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : null
    }, availability,
    coverage: {
      complete, legacySessions: sessions.filter(row => !version2(row)).length,
      identifiedSessions: identified.length, knownUniqueVisitors: visitorGroups.size,
      unidentifiedSessions: sessions.length - identified.length, unclassifiedVisitors,
      unidentifiedActivitySessions: visitorActivity.unresolvedSessions,
      measuredEngagementSessions: measuredEngagement.length, completedSessions: endedSessions.length,
      measuredCompletedSessions: ended.length,
      measuredDurationSessions: durations.length, durationMethod: 'recorded-active-time',
      note: 'Visitors are browser identities, not a count of people. Missing legacy measurements are unavailable.'
    },
    devices: rank(sessions.map(row => ['mobile', 'tablet', 'desktop'].includes(text(row.device).toLowerCase()) ? text(row.device).toLowerCase() : 'Unknown'), limit),
    referrers: rank(sessions.map(referrerLabel), limit),
    locations: rank(sessions.map(locationLabel), limit),
    popularPages: pagesAvailable ? rank(pageViews.map(row => reportPageLabel(row.path)), limit) : []
  };
}

function uniqueEventsBy(rows, field) {
  const keys = new Set();
  rows.forEach((row, index) => keys.add(text(row[field]) || text(row.sessionId) || eventIdentity(row, index)));
  return keys.size;
}

function authoritativeRecords(orders, bookings, ledger) {
  const result = new Map();
  for (const [source, rows] of [['order', orders], ['booking', bookings]]) {
    for (const row of rows || []) {
      const id = text(row.id || row.sourceId);
      if (id) result.set(`${source}:${id}`, { ...row, recordSource: source, recordId: id });
    }
  }
  // A ledger row is an authoritative receipt as well; never invent a record from an event.
  for (const row of ledger || []) {
    if (!['order', 'booking'].includes(row.source)) continue;
    const id = text(row.sourceId);
    const key = `${row.source}:${id}`;
    if (id && !result.has(key)) result.set(key, { ...row, recordSource: row.source, recordId: id });
  }
  return [...result.values()];
}

function commerceCreatedAt(row) { return row.timestamp ?? row.createdAt ?? row.at; }

/** Discovery outcomes count actual records; paid attributed ledger is the only revenue source. */
export function buildPlacesReport(options = {}) {
  const { orders = [], bookings = [], ledger = [], start = null, end = null, tracking = {}, complete = true, limit = 8 } = options;
  const prepared = prepare(options);
  const placesSessions = prepared.sessions.filter(isPlaces);
  const placesSessionIds = new Set(placesSessions.map(sessionId).filter(Boolean));
  const placesEvents = prepared.events.filter(row => isPlaces(row) || placesSessionIds.has(text(row.sessionId)) || row.type === 'discovery_visit');
  const visits = placesEvents.filter(row => ['discovery_visit', 'profile_view'].includes(row.type));
  const leads = placesEvents.filter(row => row.type === 'message_lead');
  const eventLinks = new Map();
  for (const row of placesEvents) {
    for (const [source, field] of [['order', 'orderId'], ['booking', 'bookingId']]) {
      const id = text(row[field]);
      if (id) eventLinks.set(`${source}:${id}`, text(row.sessionId));
    }
    if (Array.isArray(row.bookingIds)) row.bookingIds.forEach(id => { if (text(id)) eventLinks.set(`booking:${text(id)}`, text(row.sessionId)); });
  }
  const records = authoritativeRecords(orders, bookings, ledger);
  const attributed = records.filter(row => {
    const authoritativeSource = text(row.analyticsSource || row.attribution?.source).toLowerCase();
    // Server-verified direct/other attribution must not be overwritten by browser event claims.
    if (authoritativeSource) return authoritativeSource === 'places';
    return placesSessionIds.has(attributionSessionId(row)) || eventLinks.has(`${row.recordSource}:${row.recordId}`);
  });
  const periodRecords = attributed.filter(row => timeInBounds(commerceCreatedAt(row), start, end));
  const unknownCreatedDates = attributed.filter(row => reportTimestampMs(commerceCreatedAt(row)) === null && (start != null || end != null));
  const orderDatesAvailable = !unknownCreatedDates.some(row => row.recordSource === 'order');
  const bookingDatesAvailable = !unknownCreatedDates.some(row => row.recordSource === 'booking');
  const orderIds = [...new Set(periodRecords.filter(row => row.recordSource === 'order').map(row => row.recordId))];
  const bookingIds = [...new Set(periodRecords.filter(row => row.recordSource === 'booking').map(row => row.recordId))];
  const conversionSessions = new Set(); let unlinkedConversions = 0;
  for (const row of periodRecords) {
    const sid = attributionSessionId(row) || eventLinks.get(`${row.recordSource}:${row.recordId}`);
    if (sid && placesSessionIds.has(sid)) conversionSessions.add(sid); else unlinkedConversions += 1;
  }
  const attributedKeys = new Set(attributed.map(row => `${row.recordSource}:${row.recordId}`));
  const paidRows = new Map();
  let unknownPaidDates = 0;
  for (const row of ledger) {
    const key = `${row.source}:${text(row.sourceId)}`;
    if (text(row.paymentStatus).toLowerCase() !== 'paid' || !attributedKeys.has(key)) continue;
    if (reportTimestampMs(row.paidAt ?? row.createdAt) === null && (start != null || end != null)) { unknownPaidDates += 1; continue; }
    if (!timeInBounds(row.paidAt ?? row.createdAt, start, end)) continue;
    // Multiple ledger snapshots of one receipt must never double-count its money.
    if (!paidRows.has(key)) paidRows.set(key, row);
  }
  const revenueByCurrency = new Map(); let unknownAmounts = 0;
  for (const row of paidRows.values()) {
    const amount = nonNegative(row.amountInCents);
    if (amount === null) { unknownAmounts += 1; continue; }
    const currency = canonicalCurrency(row.currency);
    revenueByCurrency.set(currency, (revenueByCurrency.get(currency) || 0) + Math.round(amount));
  }
  const attributionAvailable = tracking.attribution === true || attributed.length > 0 || placesSessions.some(version2) || placesEvents.some(version2);
  const discoveryAvailable = capability(placesSessions, placesEvents, tracking, 'places') || visits.length > 0;
  const messagesAvailable = tracking.messageLeads === true || leads.length > 0 || placesEvents.some(version2) || placesSessions.some(version2);
  const revenueAvailable = has(options, 'ledger') && attributionAvailable && unknownAmounts === 0 && unknownPaidDates === 0 && revenueByCurrency.size <= 1 && !revenueByCurrency.has('Unknown');
  return {
    metrics: {
      profileVisits: discoveryAvailable ? uniqueEventsBy(visits, 'sessionId') : null,
      messageLeads: messagesAvailable ? uniqueEventsBy(leads, 'threadId') : null,
      orders: attributionAvailable && orderDatesAvailable ? orderIds.length : null,
      bookings: attributionAvailable && bookingDatesAvailable ? bookingIds.length : null,
      paidRevenueCents: revenueAvailable ? [...revenueByCurrency.values()].reduce((sum, value) => sum + value, 0) : null,
      conversionRate: attributionAvailable && placesSessionIds.size > 0 && unlinkedConversions === 0 ? percentage(conversionSessions.size, placesSessionIds.size) : null
    },
    availability: {
      profileVisits: discoveryAvailable, messageLeads: messagesAvailable,
      orders: attributionAvailable && orderDatesAvailable, bookings: attributionAvailable && bookingDatesAvailable,
      paidRevenueCents: revenueAvailable,
      conversionRate: attributionAvailable && placesSessionIds.size > 0 && unlinkedConversions === 0
    },
    coverage: {
      complete, placesSessions: placesSessions.length, convertingSessions: conversionSessions.size,
      unlinkedConversions, paidAttributedRecords: paidRows.size, unknownAmounts,
      unknownCreatedDates: unknownCreatedDates.length, unknownPaidDates,
      mixedCurrencies: revenueByCurrency.size > 1,
      unattributedRecords: records.length - attributed.length,
      unmeasuredAttributionRecords: records.filter(row => !text(row.analyticsSource || row.attribution?.source) && !attributionSessionId(row) && !eventLinks.has(`${row.recordSource}:${row.recordId}`)).length,
      note: 'Only explicitly attributed Places activity is included. Legacy activity without attribution is unavailable.'
    },
    revenueByCurrency: [...revenueByCurrency].map(([currency, amountInCents]) => ({ currency, amountInCents })),
    attributedOrderIds: orderIds, attributedBookingIds: bookingIds,
    topPages: rank(placesEvents.filter(row => row.type === 'page_view').map(row => reportPageLabel(row.path)), limit)
  };
}

function reportDay(at, timeZone) {
  const date = new Date(at);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const read = type => parts.find(part => part.type === type)?.value;
  return `${read('year')}-${read('month')}-${read('day')}`;
}

/** Count-only series. Never reads commercial event values or ledger amounts. */
export function buildTrafficSeries(options = {}) {
  const { metricId = 'visitors', start = null, end = null, tracking = {}, timeZone = 'UTC' } = options;
  const { sessions, events } = prepare(options);
  const traffic = buildTrafficReport(options);
  const available = metricId === 'sessions' ||
    (metricId === 'visitors' && traffic.availability.uniqueVisitors) ||
    (metricId === 'page_views' && traffic.availability.pageViews) ||
    (metricId === 'new_visitors' && traffic.availability.newVisitors) ||
    (metricId === 'returning_visitors' && traffic.availability.returningVisitors) ||
    (metricId === 'message_leads' && (events.some(row => row.type === 'message_lead') || capability(sessions, events, tracking, 'messageLeads'))) ||
    (metricId === 'booking_started' && (events.some(row => row.type === 'booking_started') || tracking.bookingStarts === true));
  if (!available) return [];
  const buckets = new Map();
  const add = (at, identity) => {
    if (at === null) return;
    const key = reportDay(at, timeZone);
    const identities = buckets.get(key) || new Set();
    identities.add(identity); buckets.set(key, identities);
  };
  if (metricId === 'new_visitors' || metricId === 'returning_visitors') {
    const dailyVisitors = new Map();
    visitorObservations(sessions, events).rows.forEach(row => {
      const at = reportTimestampMs(sessionTime(row));
      if (at === null) return;
      const key = `${reportDay(at, timeZone)}|${text(row.visitorId)}`;
      const group = dailyVisitors.get(key) || [];
      group.push(row); dailyVisitors.set(key, group);
    });
    for (const [key, group] of dailyVisitors) {
      const day = key.split('|')[0];
      const firstSeen = group.map(row => reportTimestampMs(row.visitorFirstSeenAt)).filter(value => value !== null);
      const isNew = firstSeen.length ? reportDay(Math.min(...firstSeen), timeZone) === day : group.some(row => row.isReturningVisitor === false);
      if ((metricId === 'new_visitors') === isNew) add(reportTimestampMs(sessionTime(group[0])), text(group[0].visitorId));
    }
  } else if (metricId === 'visitors' || metricId === 'sessions') {
    const rows = metricId === 'visitors' ? visitorObservations(sessions, events).rows : sessions;
    rows.forEach((row, index) => add(reportTimestampMs(sessionTime(row)), metricId === 'visitors' ? text(row.visitorId) : sessionId(row) || `session:${index}`));
  } else {
    const type = metricId === 'page_views' ? 'page_view' : metricId === 'message_leads' ? 'message_lead' : 'booking_started';
    events.filter(row => row.type === type).forEach((row, index) => add(reportTimestampMs(eventTime(row)), type === 'message_lead' ? text(row.threadId) || eventIdentity(row, index) : eventIdentity(row, index)));
  }
  if (start != null && end != null && end >= start) {
    const first = Date.parse(`${reportDay(start, timeZone)}T00:00:00Z`);
    const last = Date.parse(`${reportDay(end, timeZone)}T00:00:00Z`);
    for (let at = first; at <= last; at += DAY_MS) { const key = new Date(at).toISOString().slice(0, 10); if (!buckets.has(key)) buckets.set(key, new Set()); }
  }
  return [...buckets].sort(([a], [b]) => a.localeCompare(b)).map(([key, identities]) => {
    const at = Date.parse(`${key}T00:00:00Z`);
    const raw = identities.size;
    return { at, label: new Date(at).toLocaleDateString(undefined, { timeZone: 'UTC', month: 'short', day: 'numeric' }), raw, valueCents: raw, amountInCents: raw * 100 };
  });
}
