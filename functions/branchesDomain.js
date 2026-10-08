const BRANCH_FIELDS = new Set(['id', 'name', 'address', 'googlePlaceId', 'locationLat', 'locationLng', 'countryCode', 'region', 'city', 'phone', 'email', 'mapLinkUrl', 'enabled', 'showOnWebsite', 'internalNote']);
function invalid(message) { const error = new Error(message); error.code = 'invalid-argument'; throw error; }
function text(value, label, max, required = false) {
  if (value === undefined) value = '';
  if (typeof value !== 'string') invalid(`${label} must be text.`);
  const result = value.trim();
  if (result.length > max || required && !result) invalid(`${label}${required ? ' is required and' : ''} must be ${max} characters or fewer.`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(result)) invalid(`${label} contains unsupported characters.`);
  return result;
}
export function validateBranches(value) {
  if (!Array.isArray(value) || value.length > 100) invalid('Branches must be a list of up to 100 locations.');
  const ids = new Set();
  return value.map(row => {
    if (!row || Object.getPrototypeOf(row) !== Object.prototype || Object.keys(row).some(key => !BRANCH_FIELDS.has(key))) invalid('Branch contains unsupported fields.');
    if (typeof row.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(row.id) || row.id === 'new' || ids.has(row.id)) invalid('Branch identifiers must be valid and unique.');
    ids.add(row.id);
    for (const field of ['enabled', 'showOnWebsite']) if (row[field] !== undefined && typeof row[field] !== 'boolean') invalid('Branch availability and visibility must be enabled or disabled.');
    const latitude = row.locationLat ?? null, longitude = row.locationLng ?? null;
    if ((latitude === null) !== (longitude === null) || latitude !== null && (typeof latitude !== 'number' || typeof longitude !== 'number' || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || latitude === 0 && longitude === 0)) invalid('Choose a valid map pin or leave both coordinates empty.');
    const countryCode = text(row.countryCode, 'Country code', 2).toUpperCase();
    if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) invalid('Country code must use two letters.');
    const email = text(row.email, 'Branch email', 254);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) invalid('Use a valid branch email address.');
    const phone = text(row.phone, 'Branch phone', 40);
    if (phone && !/^[+\d\s().x-]+$/i.test(phone)) invalid('Use a valid branch phone number.');
    const mapLinkUrl = text(row.mapLinkUrl, 'Directions link', 2048);
    if (mapLinkUrl) { let url; try { url = new URL(mapLinkUrl); } catch { invalid('Use an HTTPS directions link.'); } if (url.protocol !== 'https:' || url.username || url.password) invalid('Use an HTTPS directions link.'); }
    return { id: row.id, name: text(row.name, 'Branch name', 80, true), address: text(row.address, 'Branch address', 300, true),
      googlePlaceId: text(row.googlePlaceId, 'Place identifier', 200), locationLat: latitude, locationLng: longitude,
      countryCode, region: text(row.region, 'Region', 100), city: text(row.city, 'City', 100), phone, email, mapLinkUrl,
      enabled: row.enabled !== false, showOnWebsite: row.showOnWebsite === true, internalNote: text(row.internalNote, 'Internal note', 500) };
  });
}
const PUBLIC_FIELDS = ['id', 'name', 'address', 'googlePlaceId', 'locationLat', 'locationLng', 'countryCode', 'region', 'city', 'phone', 'email', 'mapLinkUrl'];
export function publicBranches(value) {
  if (!Array.isArray(value)) return [];
  // Public visibility is explicit. Internal fields never enter the public DTO.
  return value.filter(row => row && row.enabled === true && row.showOnWebsite === true)
    .map(row => ({ ...Object.fromEntries(PUBLIC_FIELDS.filter(key => row[key] !== undefined).map(key => [key, row[key]])), enabled: true, showOnWebsite: true }));
}
