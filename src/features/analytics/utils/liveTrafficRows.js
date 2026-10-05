import { analyticsTimestampMs } from '../../../shared/analytics/livePresence.js';
import { normalizeRegion } from './regionalTraffic.js';
import { LIVE_COUNTRY_ALIASES } from './liveCountryAliases.js';

const text = value => String(value ?? '').trim();
let countryNames;
function countryIndex() {
  if (countryNames) return countryNames;
  countryNames = new Map();
  const display = new Intl.DisplayNames(['en'], { type: 'region' });
  for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) {
    const code = String.fromCharCode(a, b);
    const name = display.of(code);
    if (name && name !== code && code !== 'ZZ') {
      const country = { code, name };
      countryNames.set(code.toLowerCase(), country);
      countryNames.set(normalizeRegion(name), country);
    }
  }
  for (const [alias, code] of [['United States of America', 'US'], ['UK', 'GB'], ['Great Britain', 'GB']]) {
    countryNames.set(normalizeRegion(alias), countryNames.get(code.toLowerCase()));
  }
  for (const [alias, code] of Object.entries(LIVE_COUNTRY_ALIASES)) {
    const country = countryNames.get(code.toLowerCase());
    if (country) countryNames.set(alias.toLowerCase(), country);
  }
  return countryNames;
}

export function liveCountryDetails(value) {
  const raw = text(value);
  return countryIndex().get(normalizeRegion(raw)) || { code: '', name: raw || 'Country unavailable' };
}

const activity = row => analyticsTimestampMs(row.lastSeenAt) || analyticsTimestampMs(row.updatedAt) || analyticsTimestampMs(row.at);

/** Keep one current observation per anonymous visitor; legacy rows use session identity. */
export function uniqueActiveVisitors(sessions = []) {
  const visitors = new Map();
  sessions.forEach((session, index) => {
    if (!session || session.isBot) return;
    const visitor = text(session.visitorId);
    const sessionId = text(session.sessionId || session.id);
    const key = visitor ? `visitor:${visitor}` : sessionId ? `session:${sessionId}` : `anonymous:${index}`;
    const previous = visitors.get(key);
    if (!previous || activity(session) > activity(previous)) visitors.set(key, session);
  });
  return [...visitors.values()];
}

export function liveDeviceType(value) {
  const device = text(value).toLowerCase();
  if (['mobile', 'phone', 'smartphone'].includes(device)) return 'mobile';
  if (device === 'tablet') return 'tablet';
  if (['desktop', 'computer', 'laptop'].includes(device)) return 'desktop';
  return 'unknown';
}

const emptyDevices = () => ({ desktop: 0, mobile: 0, tablet: 0, unknown: 0 });
const rankedPlaces = counts => [...counts].map(([name, count]) => ({ name, count }))
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

/** Aggregate only approximate country/region/city labels, never IDs or coordinates. */
export function buildLiveTrafficRows(sessions = [], { level = 'country', country, regions = [] } = {}) {
  const observations = uniqueActiveVisitors(sessions);
  const countryNames = country ? [country.iso2, country.code, country.name].filter(Boolean)
    .map(value => normalizeRegion(liveCountryDetails(value).name)) : [];
  const active = country ? observations.filter(row => countryNames.includes(normalizeRegion(liveCountryDetails(row.country).name))) : observations;
  const groups = new Map();
  const devices = emptyDevices();
  for (const session of active) {
    const location = liveCountryDetails(session.country || country?.iso2 || country?.name);
    const region = text(session.region);
    const normalized = normalizeRegion(region);
    const matching = level === 'region' && normalized ? regions.filter(area =>
      [area.name, ...(area.aliases || [])].some(name => normalizeRegion(name) === normalized)) : [];
    const area = matching.length === 1 ? matching[0] : null;
    const name = level === 'region' ? area?.name || region || 'Region unavailable' : location.name;
    const key = level === 'region' ? normalizeRegion(name) : location.code || normalizeRegion(name);
    const row = groups.get(key) || { key, name, country: location.name, countryCode: location.code,
      count: 0, devices: emptyDevices(), cities: new Map(), regions: new Map(), mapped: Boolean(area) };
    const device = liveDeviceType(session.device);
    row.count++;
    row.devices[device]++;
    devices[device]++;
    const city = text(session.city);
    if (city) row.cities.set(city, (row.cities.get(city) || 0) + 1);
    if (region) row.regions.set(region, (row.regions.get(region) || 0) + 1);
    groups.set(key, row);
  }
  const total = active.length;
  const rows = [...groups.values()].map(row => ({ ...row, share: total ? row.count / total * 100 : 0,
    cities: rankedPlaces(row.cities), regions: rankedPlaces(row.regions) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return { rows, total, devices, level };
}
