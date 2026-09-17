import { useEffect, useId, useRef, useState } from 'react';
import { Loader2, MapPin, X } from 'lucide-react';
import { parseAddressComponents } from '../../../shared/geo/parseAddressComponents';
import { hasGoogleMapsKey, loadGoogleMapsPlaces } from '../utils/googleMaps';

function buildPlaceValue(place, fallbackLabel = '') {
  const label =
    place?.name &&
    place?.formatted_address &&
    !place.formatted_address.startsWith(place.name)
      ? `${place.name}, ${place.formatted_address}`
      : place?.formatted_address || place?.name || fallbackLabel || '';
  const loc = place?.geometry?.location;
  const parsed = parseAddressComponents(place?.address_components || []);
  return {
    label,
    placeId: place?.place_id || '',
    lat: typeof loc?.lat === 'function' ? loc.lat() : Number(loc?.lat) || 0,
    lng: typeof loc?.lng === 'function' ? loc.lng() : Number(loc?.lng) || 0,
    countryCode: parsed.countryCode,
    countryName: parsed.countryName,
    region: parsed.region,
    city: parsed.city
  };
}

/**
 * Google Places autocomplete for venue / post location.
 * Falls back to a plain address field when the Maps key is missing.
 */
export function PlaceLocationField({
  value = null,
  onChange,
  disabled = false,
  placeholder = 'Add a location',
  label = 'Location'
}) {
  const inputId = useId();
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [query, setQuery] = useState(value?.label || '');
  const [status, setStatus] = useState(hasGoogleMapsKey() ? 'loading' : 'manual');
  const [hint, setHint] = useState('');

  useEffect(() => {
    setQuery(value?.label || '');
  }, [value?.label]);

  useEffect(() => {
    if (!hasGoogleMapsKey()) {
      setStatus('manual');
      return undefined;
    }

    let cancelled = false;
    setStatus('loading');

    loadGoogleMapsPlaces()
      .then((maps) => {
        if (cancelled || !inputRef.current) return;
        if (autocompleteRef.current) {
          setStatus('ready');
          return;
        }

        const autocomplete = new maps.places.Autocomplete(inputRef.current, {
          fields: [
            'place_id',
            'formatted_address',
            'name',
            'geometry',
            'address_components'
          ]
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (!place?.place_id) return;
          const next = buildPlaceValue(place);
          setQuery(next.label);
          onChangeRef.current?.(next);
        });

        autocompleteRef.current = autocomplete;
        setStatus('ready');
        setHint('');
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus('manual');
        setHint(
          error?.message === 'missing-key'
            ? 'Maps key not configured — type an address manually.'
            : 'Location search unavailable — type an address manually.'
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const clear = () => {
    setQuery('');
    onChange?.(null);
    inputRef.current?.focus();
  };

  return (
    <div className={`bb-place-field${value ? ' has-value' : ''}`}>
      <label className="bb-social-field" htmlFor={inputId}>
        <span className="bb-place-field-label">
          <MapPin size={14} strokeWidth={2.3} aria-hidden="true" />
          {label}
          {status === 'loading' ? (
            <Loader2 size={13} className="bb-spin" aria-hidden="true" />
          ) : null}
        </span>
        <div className="bb-place-field-control">
          <input
            ref={inputRef}
            id={inputId}
            className="native-control-input bb-social-compose-control bb-place-field-input"
            value={query}
            disabled={disabled}
            placeholder={placeholder}
            autoComplete="off"
            onChange={(event) => {
              const next = event.target.value;
              setQuery(next);
              if (!next.trim()) {
                onChange?.(null);
                return;
              }
              if (status === 'manual') {
                onChange?.({
                  label: next.trim(),
                  placeId: '',
                  lat: 0,
                  lng: 0,
                  countryCode: '',
                  countryName: '',
                  region: '',
                  city: ''
                });
              }
            }}
            onBlur={() => {
              if (status === 'manual' && query.trim()) {
                onChange?.({
                  label: query.trim(),
                  placeId: '',
                  lat: 0,
                  lng: 0,
                  countryCode: '',
                  countryName: '',
                  region: '',
                  city: ''
                });
              }
            }}
          />
          {query ? (
            <button
              type="button"
              className="bb-place-field-clear"
              aria-label="Clear location"
              disabled={disabled}
              onClick={clear}
            >
              <X size={14} strokeWidth={2.4} />
            </button>
          ) : null}
        </div>
      </label>
      {hint ? <p className="bb-place-field-hint">{hint}</p> : null}
      {value?.label && status === 'ready' ? (
        <p className="bb-place-field-selected">
          {value.label}
          {value.city || value.countryCode
            ? ` · ${[value.city, value.countryCode].filter(Boolean).join(', ')}`
            : ''}
        </p>
      ) : null}
    </div>
  );
}
