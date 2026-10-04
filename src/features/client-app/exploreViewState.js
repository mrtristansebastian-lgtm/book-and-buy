const CONTENT_TABS = new Set(['places', 'book', 'buy']);

/** Local exploration preferences survive opening a profile and browser Back. */
export function readExploreViewState(profile = {}) {
  return {
    filter: CONTENT_TABS.has(profile?.exploreContentTab) ? profile.exploreContentTab : 'places',
    queryText: typeof profile?.exploreQueryText === 'string' ? profile.exploreQueryText : ''
  };
}

/** Missing location is not the valid coordinate zero (Number(null) is zero). */
export function coordinateOrNull(value, maxAbs = 180) {
  if (value == null || !['number', 'string'].includes(typeof value) || String(value).trim() === '') return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && Math.abs(coordinate) <= maxAbs ? coordinate : null;
}
