import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { MARKET_COUNTRIES } from '../../../config/marketCountries';
import { CountryFlag } from './CountryFlag';
import '../styles/live-map-country-picker.css';

/** A searchable map destination picker. Market tags never restrict exploration. */
export function LiveMapCountryPicker({ value = 'ZA', onChange, marketedCountries = [], label = 'Country' }) {
  const id = useId();
  const wrapper = useRef(null);
  const search = useRef(null);
  const optionRefs = useRef(new Map());
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const marketCodes = new Set(marketedCountries);
  const selection = MARKET_COUNTRIES.find(country => country.code === value);
  const countries = MARKET_COUNTRIES.filter(country => `${country.label} ${country.code}`.toLowerCase().includes(query.trim().toLowerCase()));
  useEffect(() => {
    if (!open) return undefined;
    search.current?.focus();
    const outside = event => { if (!wrapper.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  useEffect(() => {
    if (open) optionRefs.current.get(countries[active]?.code)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, query]);
  const choose = country => {
    if (!country) return;
    onChange?.(country.code);
    setOpen(false);
    setQuery('');
    wrapper.current?.querySelector('button')?.focus();
  };
  const keydown = event => {
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); wrapper.current?.querySelector('button')?.focus(); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(index => countries.length ? (index + (event.key === 'ArrowDown' ? 1 : -1) + countries.length) % countries.length : 0);
    }
    if (event.key === 'Enter') { event.preventDefault(); choose(countries[active]); }
  };
  return <div className="bb-live-map-country-picker" ref={wrapper} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button type="button" className="bb-live-map-country-trigger" aria-label={`Choose country: ${selection?.label || value}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-countries`} onClick={() => { setOpen(current => !current); setQuery(''); setActive(0); }}>
      <CountryFlag country={value} label={selection?.label || value} />
      <span><small>{label}</small><strong>{selection?.label || value}</strong></span>
      <ChevronDown size={15} aria-hidden="true" />
    </button>
    {open && <div className="bb-live-map-country-popover">
      <div className="bb-live-map-country-search"><Search size={15} aria-hidden="true" /><input ref={search} type="search" autoComplete="off" role="combobox" aria-label="Search map countries" aria-expanded="true" aria-controls={`${id}-countries`} aria-autocomplete="list" aria-activedescendant={countries[active] ? `${id}-${countries[active].code}` : undefined} placeholder="Search countries…" value={query} onChange={event => { setQuery(event.target.value); setActive(0); }} onKeyDown={keydown} /></div>
      <div role="listbox" id={`${id}-countries`} aria-label="Map countries" className="bb-live-map-country-options">
        {countries.map((country, index) => <button type="button" role="option" id={`${id}-${country.code}`} aria-selected={country.code === value} tabIndex={-1} ref={element => { if (element) optionRefs.current.set(country.code, element); else optionRefs.current.delete(country.code); }} key={country.code} className={index === active ? 'is-highlighted' : ''} onPointerDown={event => event.preventDefault()} onPointerEnter={() => setActive(index)} onClick={() => choose(country)}>
          <CountryFlag country={country.code} label={country.label} /><span>{country.label}</span>{country.code === value ? <Check size={15} aria-hidden="true" /> : marketCodes.has(country.code) ? <small>Your market</small> : null}
        </button>)}
        {!countries.length && <p role="status">No countries found. Try another name.</p>}
      </div>
    </div>}
  </div>;
}
