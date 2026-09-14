let mapsPromise = null;

/**
 * Lazily load the Google Maps JS API (Places library).
 * Requires VITE_GOOGLE_MAPS_API_KEY.
 */
export function loadGoogleMapsPlaces() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Maps unavailable'));
  }
  if (window.google?.maps?.places) {
    return Promise.resolve(window.google.maps);
  }
  if (mapsPromise) return mapsPromise;

  const key = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  if (!key) {
    return Promise.reject(new Error('missing-key'));
  }

  mapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-bb-google-maps]');
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.google?.maps?.places) resolve(window.google.maps);
        else reject(new Error('Maps Places failed to load'));
      });
      existing.addEventListener('error', () => reject(new Error('Maps script failed')));
      return;
    }

    const script = document.createElement('script');
    script.dataset.bbGoogleMaps = '1';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      key
    )}&libraries=places&loading=async`;
    script.onload = () => {
      if (window.google?.maps?.places) resolve(window.google.maps);
      else reject(new Error('Maps Places failed to load'));
    };
    script.onerror = () => {
      mapsPromise = null;
      reject(new Error('Maps script failed'));
    };
    document.head.appendChild(script);
  });

  return mapsPromise;
}

export function hasGoogleMapsKey() {
  return Boolean(String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim());
}
