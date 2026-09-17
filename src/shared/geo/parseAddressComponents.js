/**
 * Parse Google Places address_components into country / region / city.
 * @param {Array<{ long_name?: string, short_name?: string, types?: string[] }>} components
 */
export function parseAddressComponents(components = []) {
  const list = Array.isArray(components) ? components : [];
  const find = (type) => list.find((c) => (c.types || []).includes(type));

  const country = find('country');
  const region = find('administrative_area_level_1');
  const city =
    find('locality') ||
    find('postal_town') ||
    find('sublocality') ||
    find('administrative_area_level_2');

  return {
    countryCode: String(country?.short_name || '')
      .trim()
      .toUpperCase(),
    countryName: String(country?.long_name || '').trim(),
    region: String(region?.long_name || region?.short_name || '').trim(),
    city: String(city?.long_name || city?.short_name || '').trim()
  };
}
