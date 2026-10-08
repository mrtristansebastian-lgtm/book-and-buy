import { Button } from '../../../shared/ui/Button';
import { useMemo } from 'react';
import { PlaceLocationField } from '../../../shared/ui/PlaceLocationField';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { workspacePagePath } from '../../../app/routing';
import { Building2 } from 'lucide-react';
import './branches-settings.css';

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
    website.locationLat != null && website.locationLng != null &&
    Number.isFinite(Number(website.locationLat)) &&
    Number.isFinite(Number(website.locationLng)) &&
    Math.abs(Number(website.locationLat)) <= 90 && Math.abs(Number(website.locationLng)) <= 180 &&
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
          Nearby discovery is distance-based. Online and hybrid businesses can also appear in
          International for countries you serve.
        </p>
        <div className="bb-venue-mode" role="radiogroup" aria-label="Venue mode">
          {VENUE_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              role="radio"
              aria-checked={venueMode === mode.id}
              onKeyDown={(event) => {
                if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const index = VENUE_MODES.findIndex((item) => item.id === mode.id);
                const next = event.key === 'Home' ? 0 : event.key === 'End' ? VENUE_MODES.length - 1
                  : (index + (['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1) + VENUE_MODES.length) % VENUE_MODES.length;
                updateWebsite({ venueMode: VENUE_MODES[next].id });
                event.currentTarget.parentElement.querySelectorAll('[role="radio"]')[next]?.focus();
              }}
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
          <p className="bb-muted m-0 text-sm">Your main business address, shown on your public page and used for nearby discovery. Add other locations in Branches.</p>
          <PlaceLocationField
            label="Venue address"
            placeholder="Search your store or studio"
            value={placeValue}
            onChange={onPlace}
          />
          {!hasCoords ? (
            <p className="bb-locations-hint">
              Choose a suggested place to add a verified map pin. A manually typed address alone does not supply coordinates.
            </p>
          ) : (
            <p className="bb-locations-hint is-ok">
              Pin ready
              {website.city || website.countryCode
                ? ` · ${[website.city, website.countryCode].filter(Boolean).join(', ')}`
                : ''}
            </p>
          )}
          <details className="bb-location-advanced"><summary>Custom map links <span>Optional</span></summary><p className="bb-muted text-sm">Use an HTTPS map link for directions. An embed URL must be a provider’s embeddable map address, not pasted HTML.</p><label className="grid gap-1 text-sm">
            <span className="font-semibold">Map link URL</span>
            <input
              className="native-control-input px-4"
              type="url" placeholder="https://maps.google.com/…"
              value={website.mapLinkUrl || ''}
              onChange={(event) => updateWebsite({ mapLinkUrl: event.target.value })}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Map embed URL</span>
            <input
              className="native-control-input px-4"
              type="url" placeholder="https://www.google.com/maps/embed?…"
              value={website.mapEmbedUrl || ''}
              onChange={(event) => updateWebsite({ mapEmbedUrl: event.target.value })}
            />
          </label></details>
        </section>
      ) : null}

      <section className="bb-panel p-5 bb-locations-branches-summary">
        <div><Building2 size={21} aria-hidden="true" /><h2 className="bb-page-title text-xl m-0">Branches</h2><p>Keep your studios, shops and offices together. Choose which addresses customers can see.</p><p>{(website.branches || []).length} {(website.branches || []).length === 1 ? 'branch' : 'branches'} added</p></div>
        <Button as="a" action="settings" href={`#${workspacePagePath('settings/locations/branches')}`}>Manage branches</Button>
      </section>

      <section className="bb-panel p-5 grid gap-3">
        <h2 className="bb-page-title text-xl m-0">Selling internationally</h2>
        <p className="bb-muted m-0 text-sm">Countries you serve, catalog availability and delivery connections now live in Markets.</p>
        <Button as="a" action="settings" href={`#${workspacePagePath('settings/markets')}`} className="bb-btn">Manage markets</Button>
      </section>
    </div>
  );
}
