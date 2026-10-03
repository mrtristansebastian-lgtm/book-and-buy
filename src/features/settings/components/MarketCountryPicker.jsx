import { useEffect, useId, useRef, useState } from 'react';
import { Globe2, Search, Check } from 'lucide-react';
import { MARKET_COUNTRIES } from '../../../config/marketCountries';
import { CountryFlag } from '../../analytics/components/AnalyticsLiveVisitors';

export function MarketFlag({ code, name }) {
  return code === '*' ? <Globe2 size={21} aria-hidden="true" /> : <CountryFlag country={code} label={name} />;
}

export function MarketCountryPicker({ value, onChange, markets = [], label = 'Add a market', allowRestOfWorld = true, resetOnSearch = true }) {
  const id = useId();
  const listId = `${id}-countries`;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const list = useRef(null);
  const countries = allowRestOfWorld ? [...MARKET_COUNTRIES, { code: '*', label: 'Rest of world' }] : MARKET_COUNTRIES;
  const used = new Set(markets.map((market) => market.countryCode));
  const results = countries.filter((country) => `${country.label} ${country.code}`.toLowerCase().includes(query.trim().toLowerCase()));
  const selection = countries.find((country) => country.code === value);
  useEffect(() => { list.current?.children[active]?.scrollIntoView({ block: 'nearest' }); }, [active]);
  const choose = (country) => { if (!country || used.has(country.code)) return; onChange(country.code); setOpen(false); setQuery(''); };
  const keydown = (event) => {
    if (event.key === 'Escape') { setOpen(false); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); setOpen(true);
      setActive((index) => results.length ? (index + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length : 0);
    }
    if (event.key === 'Enter') { event.preventDefault(); if (open) choose(results[active]); else setOpen(true); }
  };
  return <div className="bb-market-country-picker" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <label htmlFor={`${id}-search`} className="bb-market-field">{label}</label>
    <div className="bb-search-field bb-market-country-search">
      <Search size={16} className="bb-search-field-icon" aria-hidden="true" />
      <input id={`${id}-search`} className="native-search-input" role="combobox" type="text" autoComplete="off" aria-label={label === 'Add a market' ? 'Search countries' : label} aria-autocomplete="list" aria-expanded={open} aria-controls={listId} aria-activedescendant={open && results[active] ? `${id}-${results[active].code}` : undefined}
        placeholder="Search countries…" value={open ? query : selection?.label || ''}
        onFocus={() => { setOpen(true); setQuery(''); setActive(0); }} onClick={() => setOpen(true)}
        onChange={(event) => { setQuery(event.target.value); setActive(0); setOpen(true); if (resetOnSearch) onChange(''); }} onKeyDown={keydown} />
      {selection && !open && <span className="bb-market-picker-selected-flag"><MarketFlag code={selection.code} name={selection.label} /></span>}
    </div>
    {open && <div className="bb-market-country-popover">
      <div className="bb-market-picker-caption">{results.length} {allowRestOfWorld ? results.length === 1 ? 'country or market' : 'countries & markets' : results.length === 1 ? 'country' : 'countries'}</div>
      <div role="listbox" id={listId} aria-label="Countries" ref={list} className="bb-market-country-options">
        {results.map((country, index) => <button type="button" role="option" id={`${id}-${country.code}`} aria-selected={value === country.code} aria-disabled={used.has(country.code)} tabIndex={-1}
          key={country.code} className={`bb-market-country-option${active === index ? ' is-highlighted' : ''}`} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => choose(country)}>
          <MarketFlag code={country.code} name={country.label} /><span>{country.label}</span>{used.has(country.code) ? <small>Added</small> : value === country.code ? <Check size={16} /> : <small>{country.code === '*' ? '' : country.code}</small>}
        </button>)}
      </div>
      {!results.length && <p className="bb-market-picker-caption" role="status">No countries match “{query}”.</p>}
    </div>}
  </div>;
}
