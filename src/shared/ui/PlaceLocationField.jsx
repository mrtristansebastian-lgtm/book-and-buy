import { useEffect, useId, useRef, useState } from 'react';
import { Loader2, MapPin, X } from 'lucide-react';
import { parseAddressComponents } from '../geo/parseAddressComponents';
import { hasGoogleMapsKey, loadGoogleMapsPlaces } from '../geo/googleMaps';

function placeValue(place, fallbackLabel = '') {
  const label = place?.name && place?.formatted_address && !place.formatted_address.startsWith(place.name)
    ? `${place.name}, ${place.formatted_address}`
    : place?.formatted_address || place?.name || fallbackLabel || '';
  const loc = place?.geometry?.location;
  const parsed = parseAddressComponents(place?.address_components || []);
  return {
    label,
    placeId: place?.place_id || '',
    lat: typeof loc?.lat === 'function' ? loc.lat() : Number(loc?.lat) || 0,
    lng: typeof loc?.lng === 'function' ? loc.lng() : Number(loc?.lng) || 0,
    ...parsed
  };
}

export function PlaceLocationField({ value = null, onChange, disabled = false, placeholder = 'Add a location', label = 'Location' }) {
  const inputId = useId();
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [query, setQuery] = useState(value?.label || '');
  const [status, setStatus] = useState(hasGoogleMapsKey() ? 'loading' : 'manual');

  useEffect(() => setQuery(value?.label || ''), [value?.label]);
  useEffect(() => {
    if (!hasGoogleMapsKey()) { setStatus('manual'); return undefined; }
    let cancelled = false;
    loadGoogleMapsPlaces().then((maps) => {
      if (cancelled || !inputRef.current || autocompleteRef.current) return;
      const autocomplete = new maps.places.Autocomplete(inputRef.current, {
        fields: ['place_id', 'formatted_address', 'name', 'geometry', 'address_components']
      });
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place?.place_id) return;
        const next = placeValue(place);
        setQuery(next.label);
        onChangeRef.current?.(next);
      });
      autocompleteRef.current = autocomplete;
      setStatus('ready');
    }).catch(() => !cancelled && setStatus('manual'));
    return () => { cancelled = true; };
  }, []);

  const emitManual = (text) => onChange?.({ label: text.trim(), placeId: '', lat: 0, lng: 0, countryCode: '', countryName: '', region: '', city: '' });
  return (
    <div className={`bb-place-field${value ? ' has-value' : ''}`}>
      <div className="bb-social-field">
        <label htmlFor={inputId} className="bb-place-field-label"><MapPin size={14} aria-hidden="true" />{label}{status === 'loading' ? <Loader2 size={13} className="bb-spin" aria-label="Loading address suggestions" /> : null}</label>
        <div className="bb-place-field-control">
          <input ref={inputRef} id={inputId} className="native-control-input bb-place-field-input" value={query} disabled={disabled} placeholder={placeholder} autoComplete="off"
            onChange={(event) => { const next = event.target.value; setQuery(next); if (!next.trim()) onChange?.(null); else if (status === 'manual') emitManual(next); }}
            onBlur={() => { if (status === 'manual' && query.trim()) emitManual(query); }} />
          {query ? <button type="button" disabled={disabled} className="bb-place-field-clear" aria-label="Clear location" onClick={() => { setQuery(''); onChange?.(null); inputRef.current?.focus(); }}><X size={14} /></button> : null}
        </div>
      </div>
    </div>
  );
}
