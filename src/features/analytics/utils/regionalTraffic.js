// Stripe standard availability, checked 2026-10-01. Preview/extended-network
// markets are excluded; South Africa is Book & Buy's explicit addition.
// This is a map-coverage list, never a payment-eligibility gate.
export const REGIONAL_MAP_COUNTRIES = Object.freeze({
  AU: 'AUS', AT: 'AUT', BE: 'BEL', BR: 'BRA', BG: 'BGR', CA: 'CAN',
  HR: 'HRV', CY: 'CYP', CZ: 'CZE', DK: 'DNK', EE: 'EST', FI: 'FIN',
  FR: 'FRA', DE: 'DEU', GI: 'GIB', GR: 'GRC', HK: 'HKG', HU: 'HUN',
  IE: 'IRL', IT: 'ITA', JP: 'JPN', LV: 'LVA', LI: 'LIE', LT: 'LTU',
  LU: 'LUX', MY: 'MYS', MT: 'MLT', MX: 'MEX', NL: 'NLD', NZ: 'NZL',
  NO: 'NOR', PL: 'POL', PT: 'PRT', RO: 'ROU', SG: 'SGP', SK: 'SVK',
  SI: 'SVN', ZA: 'ZAF', ES: 'ESP', SE: 'SWE', CH: 'CHE', TH: 'THA',
  AE: 'ARE', GB: 'GBR', US: 'USA'
});

export const normalizeRegion = (value) => String(value || '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

export function countrySessions(country, sessions) {
  const names = [country.iso2, country.code, country.name].filter(Boolean).map(normalizeRegion);
  return sessions.filter((session) => names.includes(normalizeRegion(session.country)));
}

export function regionStats(sessions, regions = []) {
  const counts = new Map();
  for (const session of sessions) {
    const value = normalizeRegion(session.region);
    const matches = value ? regions.filter((region) => [region.name, ...(region.aliases || [])]
      .some((name) => normalizeRegion(name) === value)) : [];
    const area = matches.length === 1 ? matches[0] : undefined;
    const name = area?.name || String(session.region || '').trim() || 'Region unavailable';
    const previous = counts.get(name) || { name, count: 0, mapped: false };
    counts.set(name, { ...previous, count: previous.count + 1, mapped: !!area });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
