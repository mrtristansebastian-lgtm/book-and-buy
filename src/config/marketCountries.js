import countryInventory from 'flag-icons/country.json';
const names = new Intl.DisplayNames(['en'], { type: 'region' });
export const MARKET_COUNTRIES = countryInventory.filter((country) => country.iso)
  .map((country) => ({ code: country.code.toUpperCase(), label: country.name }))
  .sort((a, b) => a.label.localeCompare(b.label));
export const marketCountryName = (code) => code === '*' ? 'Rest of world' : names.of(code) || code;
