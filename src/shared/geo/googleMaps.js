let mapsPromise = null;

const mapsKey = () => String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();

export function hasGoogleMapsKey() {
  return Boolean(mapsKey());
}

export function loadGoogleMapsPlaces() {
  if (globalThis.google?.maps?.places) return Promise.resolve(globalThis.google.maps);
  if (mapsPromise) return mapsPromise;
  const key = mapsKey();
  if (!key) return Promise.reject(new Error('missing-key'));
  mapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-bb-google-maps]');
    const finish = () => globalThis.google?.maps?.places ? resolve(globalThis.google.maps) : reject(new Error('maps-unavailable'));
    if (existing) {
      existing.addEventListener('load', finish, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.dataset.bbGoogleMaps = 'true';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`;
    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', () => reject(new Error('maps-unavailable')), { once: true });
    document.head.appendChild(script);
  });
  return mapsPromise;
}
