const GOOGLE_MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();

let googleMapsPlacesPromise = null;

const hasWindow = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const isFiniteCoordinate = (value) => Number.isFinite(Number(value));

const ensureGooglePlacesReady = async () => {
  if (window.google?.maps?.places) return window.google;
  if (window.google?.maps?.importLibrary) {
    await window.google.maps.importLibrary('places');
  }
  if (window.google?.maps?.places) return window.google;
  throw new Error('Google Places did not initialize.');
};

export const hasGoogleMapsApiKey = () => Boolean(GOOGLE_MAPS_API_KEY);

export const getGoogleMapsApiKey = () => GOOGLE_MAPS_API_KEY;

export const loadGoogleMapsPlaces = () => {
  if (!hasWindow()) return Promise.reject(new Error('Google Maps can only load in the browser.'));
  if (!GOOGLE_MAPS_API_KEY) return Promise.reject(new Error('Missing VITE_GOOGLE_MAPS_API_KEY.'));
  if (window.google?.maps) return ensureGooglePlacesReady();
  if (googleMapsPlacesPromise) return googleMapsPlacesPromise;

  googleMapsPlacesPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-bookify-google-maps="places"]');

    const handleReady = () => {
      ensureGooglePlacesReady().then(resolve).catch(reject);
    };

    if (existingScript) {
      existingScript.addEventListener('load', handleReady, { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Google Maps script failed to load.')), { once: true });
      handleReady();
      return;
    }

    const script = document.createElement('script');
    script.dataset.bookifyGoogleMaps = 'places';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&libraries=places&v=weekly`;
    script.onload = handleReady;
    script.onerror = () => reject(new Error('Google Maps script failed to load.'));
    document.head.appendChild(script);
  });

  return googleMapsPlacesPromise;
};

export const normalizeMapPlace = (place) => {
  if (!place) return null;

  const location = place.geometry?.location || place.location || null;
  const lat = typeof location?.lat === 'function' ? location.lat() : location?.lat;
  const lng = typeof location?.lng === 'function' ? location.lng() : location?.lng;
  const formattedAddress = place.formatted_address || place.formattedAddress || '';
  const displayName = place.name || place.displayName || formattedAddress || '';
  const placeId = place.place_id || place.placeId || place.id || '';

  return {
    placeId,
    displayName,
    formattedAddress,
    lat: isFiniteCoordinate(lat) ? Number(lat) : null,
    lng: isFiniteCoordinate(lng) ? Number(lng) : null
  };
};

export const hasMapPlaceCoordinates = (mapPlace) => (
  isFiniteCoordinate(mapPlace?.lat) && isFiniteCoordinate(mapPlace?.lng)
);

export const getMapPlaceLabel = (mapPlace, fallbackAddress = '') => (
  (mapPlace?.formattedAddress || mapPlace?.displayName || fallbackAddress || '').trim()
);

export const buildGoogleMapsDirectionsUrl = ({ address = '', location = '', mapPlace = null } = {}) => {
  const locationValue = String(location || '').trim();
  if (/^https?:\/\//i.test(locationValue)) return locationValue;

  const label = getMapPlaceLabel(mapPlace, address || locationValue);
  const placeId = String(mapPlace?.placeId || '').trim();

  if (placeId) {
    const query = encodeURIComponent(label || placeId);
    return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${encodeURIComponent(placeId)}`;
  }

  if (hasMapPlaceCoordinates(mapPlace)) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${Number(mapPlace.lat)},${Number(mapPlace.lng)}`)}`;
  }

  return label
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`
    : '';
};

export const buildGoogleMapsEmbedUrl = (mapPlace) => {
  if (!GOOGLE_MAPS_API_KEY) return '';

  const placeId = String(mapPlace?.placeId || '').trim();
  if (placeId) {
    return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&q=place_id:${encodeURIComponent(placeId)}`;
  }

  if (hasMapPlaceCoordinates(mapPlace)) {
    return `https://www.google.com/maps/embed/v1/view?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&center=${encodeURIComponent(`${Number(mapPlace.lat)},${Number(mapPlace.lng)}`)}&zoom=16`;
  }

  return '';
};
