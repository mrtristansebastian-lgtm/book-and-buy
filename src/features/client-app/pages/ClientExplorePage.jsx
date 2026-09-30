import { startTransition, useEffect, useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { APP_ID } from '../../../config/appConfig';
import { getFirebase, isFirebaseConfigured } from '../../../shared/firebase/client';
import { artifactRoot } from '../../../shared/firebase/paths';
import { AppSheet } from '../../../shared/ui/AppSheet';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { PlaceLocationField } from '../../../shared/ui/PlaceLocationField';
import { formatProductPrice, isProductPubliclyVisible } from '../../../utils/products';
import { formatServicePrice } from '../../../utils/services';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { ClientAppShell } from '../ClientAppShell';
import { ClientDeskLayout } from '../ClientDeskLayout';
import { useClientProfile } from '../ClientProfileContext';
import { startClientMessage } from '../startClientMessage';
import { ExploreDiscoveryBar } from '../ExploreDiscoveryBar';
import { ExploreBusinessOffers } from '../ExploreBusinessOffers';
import { PlacesCards } from '../PlacesCards';
import { filterDiscoverBusinesses, normalizeBiz } from '../exploreDiscovery';

const TABS = [
  { id: 'places', label: 'Places', kind: 'places', Icon: MapPin },
  { id: 'book', label: 'Book', kind: 'book' },
  { id: 'buy', label: 'Buy', kind: 'buy' }
];

function withCatalog(raw = {}) {
  const normalized = normalizeBiz(raw);
  if (!normalized) return null;
  return { ...normalized, services: Array.isArray(raw.services) ? raw.services : [], products: Array.isArray(raw.products) ? raw.products : [] };
}

function offerItem(item, kind) {
  return { id: item.id, name: item.name || (kind === 'book' ? 'Service' : 'Product'), image: item.image, imageUrl: item.imageUrl, imageUrls: item.imageUrls, priceLabel: kind === 'book' ? formatServicePrice(item) : formatProductPrice(item) };
}

export function ClientExplorePage() {
  const { workspace, startThreadFromClient } = useWorkspace();
  const { profile, updateExplorePrefs, togglePlaceSave } = useClientProfile();
  const [filter, setFilter] = useState('places');
  const [queryText, setQueryText] = useState('');
  const [remote, setRemote] = useState([]);
  const [messagingSlug, setMessagingSlug] = useState('');
  const [geoStatus, setGeoStatus] = useState('idle');
  const [placeSheetOpen, setPlaceSheetOpen] = useState(false);
  const isDemo = Boolean(workspace?.isDemo || profile?.isDemo);
  const savedPlaces = useMemo(() => new Set(profile?.savedPlaceSlugs || []), [profile?.savedPlaceSlugs]);
  const exploreMode = profile?.exploreMode === 'international' ? 'international' : 'local';
  const exploreMaxKm = Number(profile?.exploreMaxKm) || 30;
  const exploreCategoryIds = Array.isArray(profile?.exploreCategoryIds) ? profile.exploreCategoryIds : [];
  const clientLat = Number.isFinite(Number(profile?.clientLat)) ? Number(profile.clientLat) : null;
  const clientLng = Number.isFinite(Number(profile?.clientLng)) ? Number(profile.clientLng) : null;
  const clientCountryCode = String(profile?.clientCountryCode || '').trim().toUpperCase();
  const clientCity = String(profile?.clientCity || '').trim();

  useEffect(() => {
    if (clientLat != null && clientLng != null) { setGeoStatus('ready'); return; }
    if (isDemo) {
      updateExplorePrefs({ clientLat: -33.9249, clientLng: 18.4241, clientCountryCode: clientCountryCode || 'ZA', clientCity: clientCity || 'Cape Town' });
      setGeoStatus('ready');
    }
  }, [clientLat, clientLng, isDemo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    if (!isFirebaseConfigured()) return undefined;
    (async () => {
      try {
        const firebase = getFirebase();
        if (!firebase) return;
        const col = collection(firebase.db, ...artifactRoot(APP_ID), 'public', 'data', 'workspaces');
        const snap = await getDocs(query(col, limit(80)));
        if (!cancelled) setRemote(snap.docs.map((item) => withCatalog({ id: item.id, slug: item.id, ...(item.data() || {}) })).filter(Boolean));
      } catch { if (!cancelled) setRemote([]); }
    })();
    return () => { cancelled = true; };
  }, []);

  const local = useMemo(() => withCatalog({ ...workspace, website: workspace?.website || {} }), [workspace]);
  const directory = useMemo(() => {
    const bySlug = new Map();
    if (local) bySlug.set(local.slug, local);
    remote.forEach((biz) => bySlug.set(biz.slug, biz));
    return [...bySlug.values()];
  }, [local, remote]);
  const discovered = useMemo(() => filterDiscoverBusinesses(directory, { mode: exploreMode, maxKm: exploreMaxKm, categoryIds: exploreCategoryIds, clientLat, clientLng, clientCountryCode }), [directory, exploreMode, exploreMaxKm, exploreCategoryIds, clientLat, clientLng, clientCountryCode]);
  const needle = queryText.trim().toLowerCase();
  const visible = useMemo(() => discovered.filter((biz) => !needle || `${biz.brandName} ${biz.blurb} ${biz.categoryLabel} ${biz.city}`.toLowerCase().includes(needle)), [discovered, needle]);
  const offers = useMemo(() => visible.map((biz) => {
    const source = filter === 'book' ? biz.services : biz.products.filter(isProductPubliclyVisible);
    const items = source.slice(0, 4).map((item) => offerItem(item, filter));
    return { ...biz, items, locationLabel: biz.city || (biz.venueMode === 'online' ? 'Online' : ''), distanceLabel: Number.isFinite(biz.distanceKm) ? `${biz.distanceKm.toFixed(1)} km` : '' };
  }).filter((biz) => biz.items.length), [visible, filter]);

  const requestGeo = () => {
    if (!navigator?.geolocation) { setGeoStatus('error'); setPlaceSheetOpen(true); return; }
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => { updateExplorePrefs({ clientLat: pos.coords.latitude, clientLng: pos.coords.longitude }); setGeoStatus('ready'); },
      () => { setGeoStatus('denied'); setPlaceSheetOpen(true); },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 120000 }
    );
  };

  const messageBiz = async (biz) => {
    setMessagingSlug(biz.slug);
    try {
      await startClientMessage({ profile, workspace, startThreadFromClient, ownerId: biz.ownerId || workspace?.ownerId || workspace?.id || '', slug: biz.slug, brandName: biz.brandName, logoUrl: biz.logoUrl || '' });
    } finally { setMessagingSlug(''); }
  };

  return (
    <ClientAppShell section="find" title="Find">
      <ClientDeskLayout className="bb-client-ig-explore is-find" showContentTabs contentTab={filter} contentTabs={TABS} onContentTabChange={setFilter}>
        <div className="bb-client-ig-top">
          <ExploreDiscoveryBar mode={exploreMode} maxKm={exploreMaxKm} categoryIds={exploreCategoryIds} queryText={queryText}
            searchHistory={Array.isArray(profile?.exploreSearchHistory) ? profile.exploreSearchHistory : []}
            clientCity={clientCity} clientCountryCode={clientCountryCode} geoStatus={geoStatus}
            onModeChange={(mode) => startTransition(() => updateExplorePrefs({ exploreMode: mode }))}
            onMaxKmChange={(km) => startTransition(() => updateExplorePrefs({ exploreMaxKm: km }))}
            onCategoryIdsChange={(ids) => updateExplorePrefs({ exploreCategoryIds: ids })}
            onQueryChange={(value) => startTransition(() => setQueryText(value))}
            onSearchHistoryChange={(history) => updateExplorePrefs({ exploreSearchHistory: history })}
            onRequestGeo={requestGeo} onPickManualLocation={() => setPlaceSheetOpen(true)} />
        </div>
        {filter === 'places' ? (
          visible.length ? <PlacesCards businesses={visible} messageBiz={messageBiz} messagingSlug={messagingSlug} savedPlaces={savedPlaces} togglePlaceSave={togglePlaceSave} /> :
            <EmptyState compact title={clientLat == null && exploreMode === 'local' ? 'Share your location' : 'No places found'} description="Adjust your location, distance, category, or search." />
        ) : <ExploreBusinessOffers kind={filter} businesses={offers} emptyTitle={filter === 'book' ? 'No bookable services found' : 'No products found'} emptyDescription="Adjust your location, distance, category, or search." />}
        {placeSheetOpen ? <AppSheet onClose={() => setPlaceSheetOpen(false)} title="Set your location" lede="Used only to find relevant businesses near you.">
          <PlaceLocationField label="City or address" placeholder="Search a place near you" onChange={(place) => {
            if (!place) return;
            updateExplorePrefs({ clientLat: place.lat || null, clientLng: place.lng || null, clientCountryCode: place.countryCode || '', clientCity: place.city || place.label || '' });
            setGeoStatus(place.lat ? 'ready' : 'error');
            if (place.lat) setPlaceSheetOpen(false);
          }} />
        </AppSheet> : null}
      </ClientDeskLayout>
    </ClientAppShell>
  );
}
