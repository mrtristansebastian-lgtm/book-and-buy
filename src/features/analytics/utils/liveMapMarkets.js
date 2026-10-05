const cleanCode = value => typeof value === 'string' && /^[a-z]{2}$/i.test(value.trim()) ? value.trim().toUpperCase() : null;

/** Map defaults follow enabled selling markets, never the visitor's IP location. */
export function resolveLiveMapMarkets(website = {}) {
  const configured = Array.isArray(website.markets);
  const active = configured
    ? website.markets.filter(market => market?.enabled === true).map(market => market.countryCode)
    : Array.isArray(website.servesCountries) ? website.servesCountries : [];
  const worldwide = active.some(code => String(code || '').trim() === '*');
  const countries = [...new Set(active.map(cleanCode).filter(Boolean))];
  const home = cleanCode(website.countryCode);
  const defaultCountry = countries.includes(home) ? home : countries[0] || home || 'ZA';
  return {
    countries,
    defaultCountry,
    defaultView: worldwide || countries.length > 1 ? 'globe' : 'country',
    worldwide,
    configured
  };
}

/** Explicit country selection is allowed outside the business's selling markets. */
export function getLiveMapCountry(value, countries = []) {
  const wanted = String(value || '').trim().toLowerCase();
  const known = countries.find(country => [country.iso2, country.code, country.name].some(key => String(key || '').toLowerCase() === wanted));
  if (known) return known;
  const iso2 = cleanCode(value);
  if (!iso2) return null;
  let name = iso2;
  try { name = new Intl.DisplayNames(['en'], { type: 'region' }).of(iso2) || iso2; } catch { /* Keep the selected code. */ }
  return { iso2, code: iso2, name, path: '' };
}

/** Fit the committed M/L/Z country silhouette without stretching its proportions. */
export function fitCountrySilhouette(country, { width = 1000, height = 500, padding = 28 } = {}) {
  if (!country?.path || /[^MLZ\s\d.,+\-]/i.test(country.path)) return null;
  const numbers = country.path.match(/[-+]?\d*\.?\d+/g)?.map(Number) || [];
  if (numbers.length < 6 || numbers.length % 2 || numbers.some(value => !Number.isFinite(value))) return null;
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (let index = 0; index < numbers.length; index += 2) {
    x0 = Math.min(x0, numbers[index]); y0 = Math.min(y0, numbers[index + 1]);
    x1 = Math.max(x1, numbers[index]); y1 = Math.max(y1, numbers[index + 1]);
  }
  if (x1 <= x0 || y1 <= y0) return null;
  const scale = Math.min((width - padding * 2) / (x1 - x0), (height - padding * 2) / (y1 - y0));
  const left = (width - (x1 - x0) * scale) / 2;
  const top = (height - (y1 - y0) * scale) / 2;
  let index = 0;
  const path = country.path.replace(/[-+]?\d*\.?\d+/g, value => {
    const horizontal = index++ % 2 === 0;
    return ((Number(value) - (horizontal ? x0 : y0)) * scale + (horizontal ? left : top)).toFixed(2);
  });
  return { path, width, height, bounds: [left, top, width - left, height - top], center: [width / 2, height / 2] };
}

const transformPath = (path, scale, x, y) => {
  let index = 0;
  return path.replace(/[-+]?\d*\.?\d+/g, value => (Number(value) * scale + (index++ % 2 === 0 ? x : y)).toFixed(2));
};
const pathCenter = path => {
  if (typeof path !== 'string' || !/^[MLZ\s\d.,+\-]+$/i.test(path)) return [500, 250];
  const numbers = path.match(/[-+]?\d*\.?\d+/g)?.map(Number) || [];
  if (!numbers.length || numbers.length % 2 || numbers.some(value => !Number.isFinite(value))) return [500, 250];
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (let index = 0; index < numbers.length; index += 2) {
    x0 = Math.min(x0, numbers[index]); y0 = Math.min(y0, numbers[index + 1]);
    x1 = Math.max(x1, numbers[index]); y1 = Math.max(y1, numbers[index + 1]);
  }
  return numbers.length ? [(x0 + x1) / 2, (y0 + y1) / 2] : [500, 250];
};
const validCenter = value => Array.isArray(value) && value.length === 2 && value.every(Number.isFinite);

export function centerCountryRegions(panel) {
  return panel ? { ...panel, regions: panel.regions.map(region => ({ ...region, center: validCenter(region.center) ? region.center : pathCenter(region.path) })) } : null;
}

/** Mainland and remote states/provinces remain visible together as labelled insets. */
export function wholeCountryPanel(data) {
  if (!data?.panels?.length) return null;
  if (data.panels.length === 1) return centerCountryRegions(data.panels[0]);
  const remote = data.panels.slice(1);
  const columns = remote.length > 4 ? 2 : 1;
  const mainWidth = columns === 2 ? 660 : 760;
  const remoteWidth = 1000 - mainWidth;
  const rows = Math.ceil(remote.length / columns);
  const cells = [{ x: 0, y: 0, width: mainWidth, height: 500 }, ...remote.map((_, index) => ({
    x: mainWidth + (index % columns) * remoteWidth / columns,
    y: Math.floor(index / columns) * 500 / rows,
    width: remoteWidth / columns,
    height: 500 / rows
  }))];
  const regions = []; const borders = []; const labels = [];
  data.panels.forEach((panel, index) => {
    const cell = cells[index];
    const labelSpace = index ? 20 : 0;
    const scale = Math.min(cell.width / 1000, (cell.height - labelSpace) / 500);
    const x = cell.x + (cell.width - 1000 * scale) / 2;
    const y = cell.y + (cell.height - labelSpace - 500 * scale) / 2;
    panel.regions.forEach(region => {
      const center = validCenter(region.center) ? region.center : pathCenter(region.path);
      regions.push({ ...region, path: transformPath(region.path, scale, x, y), center: [center[0] * scale + x, center[1] * scale + y] });
    });
    if (panel.borders) borders.push(transformPath(panel.borders, scale, x, y));
    if (index) labels.push({ name: panel.label, x: cell.x + cell.width / 2, y: cell.y + cell.height - 8 });
  });
  return { id: 'all', label: 'Whole country', regions, borders: borders.join(''), labels, bounds: [0, 0, 1000, 500] };
}
