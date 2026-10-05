import { Globe2 } from 'lucide-react';

const COUNTRY_FLAGS = import.meta.glob(
  '../../../../node_modules/flag-icons/flags/4x3/*.svg',
  { eager: true, query: '?url', import: 'default' }
);

export function CountryFlag({ country = '', label = 'Country unavailable' }) {
  const code = String(country || '').trim().toLowerCase();
  const flagUrl = /^[a-z]{2}$/.test(code)
    ? COUNTRY_FLAGS[`../../../../node_modules/flag-icons/flags/4x3/${code}.svg`] : '';
  return <span className={`bb-live-country-flag${flagUrl ? ` fi fi-${code}` : ' is-empty'}`}
    role={flagUrl ? 'img' : undefined} aria-label={flagUrl ? `${label} flag` : undefined}
    aria-hidden={flagUrl ? undefined : 'true'}>
    {flagUrl ? <img src={flagUrl} alt="" aria-hidden="true" /> : <Globe2 size={16} strokeWidth={1.5} aria-hidden="true" />}
  </span>;
}
