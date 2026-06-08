import { useEffect, useRef, useState } from 'react';
import { hasGoogleMapsApiKey, loadGoogleMapsPlaces, normalizeMapPlace } from './googleMaps';

const placesDropdownSelector = '.pac-container';

const showGooglePlacesDropdown = () => {
  if (typeof document === 'undefined') return;
  document.querySelectorAll(placesDropdownSelector).forEach((container) => {
    container.classList.remove('bookify-places-dismissed');
    container.style.removeProperty('display');
  });
};

const dismissGooglePlacesDropdown = ({ remove = false } = {}) => {
  if (typeof document === 'undefined') return;
  document.querySelectorAll(placesDropdownSelector).forEach((container) => {
    container.classList.add('bookify-places-dismissed');
    if (remove) {
      if (typeof window !== 'undefined') window.setTimeout(() => container.remove(), 180);
      else container.remove();
    }
  });
};

export const GooglePlaceAutocompleteInput = ({
  className = '',
  onClear,
  onPlaceSelect,
  onValueChange,
  placeholder,
  value
}) => {
  const inputRef = useRef(null);
  const listenerRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [autocompleteState, setAutocompleteState] = useState(hasGoogleMapsApiKey() ? 'loading' : 'manual');

  useEffect(() => {
    if (!hasGoogleMapsApiKey() || !inputRef.current) return undefined;

    let isActive = true;

    loadGoogleMapsPlaces()
      .then((google) => {
        if (!isActive || !inputRef.current || !google?.maps?.places) return;

        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
          fields: ['place_id', 'name', 'formatted_address', 'geometry'],
          types: ['establishment', 'geocode']
        });

        listenerRef.current = autocompleteRef.current.addListener('place_changed', () => {
          const selectedPlace = autocompleteRef.current?.getPlace?.();
          const mapPlace = normalizeMapPlace(selectedPlace);
          const readableAddress = mapPlace?.formattedAddress || mapPlace?.displayName || inputRef.current?.value || '';

          if (readableAddress) onValueChange(readableAddress);
          if (mapPlace?.placeId || mapPlace?.lat || mapPlace?.lng) onPlaceSelect(mapPlace);
          window.setTimeout(() => dismissGooglePlacesDropdown(), 120);
          inputRef.current?.blur();
        });

        setAutocompleteState('ready');
      })
      .catch(() => {
        if (isActive) setAutocompleteState('manual');
      });

    return () => {
      isActive = false;
      if (listenerRef.current?.remove) listenerRef.current.remove();
      listenerRef.current = null;
      autocompleteRef.current = null;
      dismissGooglePlacesDropdown({ remove: true });
    };
  }, [onPlaceSelect, onValueChange]);

  const handleClear = () => {
    onValueChange('');
    onClear?.();
    dismissGooglePlacesDropdown();
    inputRef.current?.focus();
  };

  return (
    <span className="bookify-place-input-wrap">
      <input
        ref={inputRef}
        type="text"
        value={value || ''}
        onChange={(event) => {
          showGooglePlacesDropdown();
          onValueChange(event.target.value);
        }}
        onFocus={showGooglePlacesDropdown}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            dismissGooglePlacesDropdown();
            inputRef.current?.blur();
          }
        }}
        className={className}
        placeholder={placeholder}
        autoComplete="off"
        data-google-places-state={autocompleteState}
      />
      {value && (
        <button
          type="button"
          className="bookify-place-clear"
          onClick={handleClear}
          aria-label="Clear location"
        >
          x
        </button>
      )}
    </span>
  );
};
