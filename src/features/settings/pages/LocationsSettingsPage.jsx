import { useMemo } from 'react';
import { PlaceLocationField } from '../../../shared/ui/PlaceLocationField';
import { useWorkspace } from '../../workspace/WorkspaceContext';

const VENUE_MODES = [
  { id: 'physical', label: 'Physical store', hint: 'Clients find you Nearby by distance' },
  { id: 'online', label: 'Online only', hint: 'No storefront — appear in International' },
  { id: 'hybrid', label: 'Both', hint: 'Nearby for the venue + International for remote clients' }
];

export function LocationsSettingsPage() {
  const { workspace, updateWebsite } = useWorkspace();
  const website = workspace.website || {};
  const venueMode = String(website.venueMode || 'physical');
  const hasCoords =
    Number.isFinite(Number(website.locationLat)) &&
    Number.isFinite(Number(website.locationLng)) &&
    !(Number(website.locationLat) === 0 && Number(website.locationLng) === 0);

  const placeValue = useMemo(() => {
    const label = String(website.address || website.profileLocation || '').trim();
    if (!label && !website.googlePlaceId) return null;
    return {
      label,
      placeId: website.googlePlaceId || '',
      lat: Number(website.locationLat) || 0,
      lng: Number(website.locationLng) || 0,
      countryCode: website.countryCode || '',
      region: website.region || '',
      city: website.city || ''
    };
  }, [website]);

  const onPlace = (next) => {
    if (!next) {
      updateWebsite({
        address: '',
        googlePlaceId: '',
        locationLat: null,
        locationLng: null,
        countryCode: '',
        region: '',
        city: '',
        profileLocation: ''
      });
      return;
    }
    updateWebsite({
      address: next.label || '',
      googlePlaceId: next.placeId || '',
      locationLat: Number.isFinite(next.lat) ? next.lat : null,
      locationLng: Number.isFinite(next.lng) ? next.lng : null,
      countryCode: next.countryCode || '',
      region: next.region || '',
      city: next.city || '',
      profileLocation: next.city || website.profileLocation || ''
    });
  };


  return (
    <div className="bb-settings-content bb-settings-content--locations bb-locations-settings">
      <section className="bb-panel p-5 grid gap-3">
        <h2 className="bb-page-title text-xl m-0">How clients find you</h2>
        <p className="bb-muted m-0 text-sm">
          Local Explore is distance-based. Online and hybrid businesses can also appear in
          International for countries you serve.
        </p>
        <div className="bb-venue-mode" role="radiogroup" aria-label="Venue mode">
          {VENUE_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              role="radio"
              aria-checked={venueMode === mode.id}
              className={`bb-venue-mode-btn${venueMode === mode.id ? ' is-active' : ''}`}
              onClick={() => updateWebsite({ venueMode: mode.id })}
            >
              <strong>{mode.label}</strong>
              <span>{mode.hint}</span>
            </button>
          ))}
        </div>
      </section>

      {venueMode !== 'online' ? (
        <section className="bb-panel p-5 grid gap-3">
          <h2 className="bb-page-title text-xl m-0">Primary venue</h2>
          <p className="bb-muted m-0 text-sm">Single location for V1. Multi-location comes later.</p>
          <PlaceLocationField
            label="Venue address"
            placeholder="Search your store or studio"
            value={placeValue}
            onChange={onPlace}
          />
          {!hasCoords ? (
            <p className="bb-locations-hint">
              Add a place so clients can find you in Nearby Explore.
            </p>
          ) : (
            <p className="bb-locations-hint is-ok">
              Pin ready
              {website.city || website.countryCode
                ? ` · ${[website.city, website.countryCode].filter(Boolean).join(', ')}`
                : ''}
            </p>
          )}
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Map link URL</span>
            <input
              className="native-control-input px-4"
              value={website.mapLinkUrl || ''}
              onChange={(event) => updateWebsite({ mapLinkUrl: event.target.value })}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Map embed URL</span>
            <input
              className="native-control-input px-4"
              value={website.mapEmbedUrl || ''}
              onChange={(event) => updateWebsite({ mapEmbedUrl: event.target.value })}
            />
          </label>
        </section>
      ) : null}

      <section className="bb-panel p-5 grid gap-3">
        <h2 className="bb-page-title text-xl m-0">Selling internationally</h2>
        <p className="bb-muted m-0 text-sm">Countries you serve, catalog availability and delivery connections now live in Markets.</p>
        <a href="#/dashboard/settings/markets" className="bb-btn">Manage markets →</a>
      </section>
    </div>
  );
}
