import { startTransition, useEffect, useMemo, useState } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { APP_ID } from '../../../config/appConfig';
import { navigate, publicPagePath } from '../../../app/routing';
import { getFirebase, isFirebaseConfigured } from '../../../shared/firebase/client';
import { artifactRoot } from '../../../shared/firebase/paths';
import { loadPublicWorkspaceFromFirestore } from '../../../shared/firebase/publicWorkspace';
import { formatDistanceKm } from '../../../shared/geo/haversine';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { BlankMedia } from '../../../shared/ui/BlankMedia';
import { AppSheet } from '../../../shared/ui/AppSheet';
import { formatProductPrice, isProductPubliclyVisible } from '../../../utils/products';
import { formatServicePrice } from '../../../utils/services';
import { getPostMediaItems, getSocialPostKind } from '../../social/utils/socialPostType';
import { SocialVideosPanel } from '../../social/components/SocialVideosPanel';
import { SocialTextTimeline } from '../../social/components/SocialTextTimeline';
import { SocialPostFeed } from '../../social/components/SocialPostFeed';
import { SocialPostsGrid } from '../../social/components/SocialPostsGrid';
import { VerticalWatchPage } from '../../social/components/VerticalWatchPage';
import { PlaceLocationField } from '../../social/components/PlaceLocationField';
import { EXPLORE_CONTENT_TABS, SOCIAL_PROFILE_TABS } from '../../social/components/SocialProfileTabs';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { ClientAppShell } from '../ClientAppShell';
import { ClientDeskLayout } from '../ClientDeskLayout';
import { useClientProfile } from '../ClientProfileContext';
import { annotateSocialPosts } from '../ClientSocialShelf';
import { ClientEngagementBar, wrapClientMediaReaction } from '../ClientEngagementBar';
import { startClientMessage } from '../startClientMessage';
import { ExploreDiscoveryBar } from '../ExploreDiscoveryBar';
import { ExploreBusinessOffers } from '../ExploreBusinessOffers';
import { PlacesCards } from '../PlacesCards';
import {
  filterDiscoverBusinesses,
  getBusinessProfileMeta,
  itemMatchesExploreCategories,
  normalizeBiz
} from '../exploreDiscovery';
import { categoryLabel, expandExploreCategoryFilter } from '../../../config/businessCategories';

const FILTER_KIND = {
  posts: 'image',
  films: 'video',
  verticals: 'vertical',
  text: 'text'
};

const PREVIEW_LIMIT = 3;
const FIND_CONTENT_TABS = [
  { id: 'places', label: 'Places', kind: 'places', Icon: MapPin },
  ...EXPLORE_CONTENT_TABS.filter((tab) => tab.id === 'book' || tab.id === 'buy')
];

function tileMedia(post) {
  const kind = getSocialPostKind(post);
  if (kind === 'text') {
    return { kind, thumb: '', caption: String(post.caption || post.title || '').trim() };
  }
  const media = getPostMediaItems(post);
  const first = media[0];
  const thumb =
    first?.kind === 'video'
      ? first.posterUrl || post.posterUrl || first.url || ''
      : first?.url || post.posterUrl || post.mediaUrl || '';
  return { kind, thumb, caption: String(post.caption || post.title || '').trim() };
}

function itemMatchesNeedle(item, needle) {
  if (!needle) return true;
  const hay = `${item?.name || ''} ${item?.description || ''} ${item?.category || ''}`.toLowerCase();
  return hay.includes(needle);
}

function mapProductPreview(product) {
  return {
    id: product.id,
    name: product.name || 'Product',
    description: product.description || '',
    image: product.image,
    imageUrls: product.imageUrls,
    priceLabel: formatProductPrice(product) || '—'
  };
}

function mapServicePreview(service) {
  return {
    id: service.id,
    name: service.name || 'Service',
    description: service.description || '',
    image: service.image,
    imageUrls: service.imageUrls,
    priceLabel: formatServicePrice(service) || '—'
  };
}

/** Instagram Explore: discovery filters + dense media grid. */
export function ClientExplorePage({ mediaOnly = false }) {
  const { workspace, startThreadFromClient } = useWorkspace();
  const { profile, followSlug, unfollowSlug, updateExplorePrefs } = useClientProfile();
  const [queryText, setQueryText] = useState('');
  const [filter, setFilter] = useState(mediaOnly ? 'posts' : 'places');
  const [remote, setRemote] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [offerCatalogBySlug, setOfferCatalogBySlug] = useState({});
  const [activeId, setActiveId] = useState('');
  const [activeVerticalId, setActiveVerticalId] = useState('');
  const [messagingSlug, setMessagingSlug] = useState('');
  const [geoStatus, setGeoStatus] = useState('idle');
  const [placeSheetOpen, setPlaceSheetOpen] = useState(false);
  const isDemo = Boolean(workspace?.isDemo || profile?.isDemo);

  useEffect(() => {
    setFilter(mediaOnly ? 'posts' : 'places');
    setActiveId('');
    setActiveVerticalId('');
  }, [mediaOnly]);

  const exploreMode = profile?.exploreMode === 'international' ? 'international' : 'local';
  const exploreMaxKm = Number(profile?.exploreMaxKm) || 30;
  const exploreCategoryIds = Array.isArray(profile?.exploreCategoryIds)
    ? profile.exploreCategoryIds
    : [];
  const clientLat = Number.isFinite(Number(profile?.clientLat)) ? Number(profile.clientLat) : null;
  const clientLng = Number.isFinite(Number(profile?.clientLng)) ? Number(profile.clientLng) : null;
  const clientCountryCode = String(profile?.clientCountryCode || '').trim().toUpperCase();
  const clientCity = String(profile?.clientCity || '').trim();

  const messageBiz = async (biz) => {
    if (!biz?.slug) return;
    setMessagingSlug(biz.slug);
    try {
      await startClientMessage({
        profile,
        followSlug,
        workspace,
        startThreadFromClient,
        ownerId: biz.ownerId || workspace?.ownerId || workspace?.id || '',
        slug: biz.slug,
        brandName: biz.brandName,
        logoUrl: biz.logoUrl || ''
      });
    } finally {
      setMessagingSlug('');
    }
  };

  const requestGeo = () => {
    if (!navigator?.geolocation) {
      setGeoStatus('error');
      setPlaceSheetOpen(true);
      return;
    }
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateExplorePrefs({
          clientLat: pos.coords.latitude,
          clientLng: pos.coords.longitude
        });
        setGeoStatus('ready');
      },
      () => {
        setGeoStatus('denied');
        setPlaceSheetOpen(true);
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 120000 }
    );
  };

  useEffect(() => {
    if (clientLat != null && clientLng != null) {
      setGeoStatus('ready');
      return;
    }
    if (isDemo) {
      updateExplorePrefs({
        clientLat: -33.9249,
        clientLng: 18.4241,
        clientCountryCode: clientCountryCode || 'ZA',
        clientCity: clientCity || 'Cape Town'
      });
      setGeoStatus('ready');
    }
  }, [clientLat, clientLng, isDemo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isFirebaseConfigured()) return;
      try {
        const firebase = getFirebase();
        if (!firebase) return;
        const col = collection(firebase.db, ...artifactRoot(APP_ID), 'public', 'data', 'workspaces');
        const snap = await getDocs(query(col, limit(80)));
        if (cancelled) return;
        setRemote(
          snap.docs
            .map((item) => normalizeBiz({ id: item.id, slug: item.id, ...(item.data() || {}) }))
            .filter(Boolean)
        );
      } catch {
        if (!cancelled) setRemote([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const directory = useMemo(() => {
    const map = new Map();
    const localSlug = String(workspace?.slug || '').trim();
    if (localSlug && (isDemo || workspace?.brandName)) {
      const local = normalizeBiz({
        slug: localSlug,
        ownerId: workspace?.ownerId || workspace?.id || '',
        brandName: workspace?.brandName || localSlug,
        tagline: workspace?.tagline || '',
        logoUrl: workspace?.logoUrl || workspace?.website?.logoUrl,
        heroImageUrl: workspace?.website?.heroImageUrl || workspace?.website?.socialBannerUrl || '',
        website: workspace?.website || {}
      });
      if (local) map.set(local.slug, local);
    }
    remote.forEach((biz) => map.set(biz.slug, biz));
    return [...map.values()];
  }, [workspace, remote, isDemo]);

  const discovered = useMemo(
    () =>
      filterDiscoverBusinesses(directory, {
        mode: exploreMode,
        maxKm: exploreMaxKm,
        // Book/Buy filters classify offers, not the business profile itself.
        categoryIds: filter === 'book' || filter === 'buy' ? [] : exploreCategoryIds,
        clientLat,
        clientLng,
        clientCountryCode
      }),
    [
      directory,
      exploreMode,
      exploreMaxKm,
      exploreCategoryIds,
      filter,
      clientLat,
      clientLng,
      clientCountryCode
    ]
  );

  const discoveredSlugs = useMemo(
    () => new Set(discovered.map((biz) => biz.slug)),
    [discovered]
  );
  const expandedExploreCategories = useMemo(
    () => expandExploreCategoryFilter(exploreCategoryIds),
    [exploreCategoryIds]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const localSlug = String(workspace?.slug || '').trim();
      const localPosts =
        localSlug &&
        (isDemo || (workspace?.socialPosts || []).length)
          ? annotateSocialPosts(workspace?.socialPosts || [], {
              slug: localSlug,
              brandName: workspace?.brandName || localSlug,
              logoUrl: workspace?.logoUrl || workspace?.website?.logoUrl || ''
            })
          : [];

      const nextOffers = {};
      if (localSlug) {
        nextOffers[localSlug] = {
          products: Array.isArray(workspace?.products) ? workspace.products : [],
          services: Array.isArray(workspace?.services) ? workspace.services : [],
          brandName: workspace?.brandName || localSlug,
          logoUrl: workspace?.logoUrl || workspace?.website?.logoUrl || ''
        };
      }

      const extras = [];
      if (isFirebaseConfigured()) {
        for (const biz of directory) {
          if (biz.slug === localSlug) continue;
          try {
            const snap = await loadPublicWorkspaceFromFirestore(biz.slug);
            if (!snap || cancelled) continue;
            extras.push(
              ...annotateSocialPosts(snap.socialPosts || [], {
                slug: biz.slug,
                brandName: snap.brandName || biz.brandName,
                logoUrl: snap.logoUrl || biz.logoUrl || ''
              })
            );
            nextOffers[biz.slug] = {
              products: Array.isArray(snap.products) ? snap.products : [],
              services: Array.isArray(snap.services) ? snap.services : [],
              brandName: snap.brandName || biz.brandName || biz.slug,
              logoUrl: snap.logoUrl || biz.logoUrl || ''
            };
          } catch {
            /* skip */
          }
        }
      }

      if (!cancelled) {
        setCatalog([...localPosts, ...extras]);
        setOfferCatalogBySlug(nextOffers);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspace, directory, isDemo]);

  const filterKind = FILTER_KIND[filter] || FILTER_KIND.posts;
  const filteredPosts = useMemo(() => {
    const needle = queryText.trim().toLowerCase();
    const discoveryActive = mediaOnly
      ? exploreMode === 'international' || (exploreMode === 'local' && clientLat != null)
      : exploreCategoryIds.length > 0 ||
        exploreMode === 'international' ||
        (exploreMode === 'local' && clientLat != null);

    return catalog
      .filter((post) => getSocialPostKind(post) === filterKind)
      .filter((post) => {
        if (!discoveryActive) return true;
        const slug = post._slug || '';
        return !slug || discoveredSlugs.has(slug);
      })
      .filter((post) => {
        if (!mediaOnly && expandedExploreCategories && !itemMatchesExploreCategories(post, expandedExploreCategories)) {
          return false;
        }
        if (!needle) return true;
        const hay = `${post._brandName || ''} ${post.caption || ''} ${post.title || ''} ${
          post._slug || ''
        } ${categoryLabel(post.exploreMainCategoryId)} ${categoryLabel(
          post.exploreSubcategoryId
        )}`.toLowerCase();
        return hay.includes(needle);
      });
  }, [
    catalog,
    filterKind,
    queryText,
    discoveredSlugs,
    exploreCategoryIds,
    exploreMode,
    clientLat,
    expandedExploreCategories,
    mediaOnly
  ]);

  const accountHits = useMemo(() => {
    if (mediaOnly) return [];
    const needle = queryText.trim().toLowerCase();
    const pool = needle ? directory : discovered;
    return pool
      .filter((biz) => {
        if (!needle) return true;
        return (
          biz.brandName.toLowerCase().includes(needle) ||
          biz.slug.toLowerCase().includes(needle) ||
          (biz.categoryLabel || '').toLowerCase().includes(needle)
        );
      })
      .slice(0, needle ? 12 : 8);
  }, [directory, discovered, queryText, mediaOnly]);

  const businessOffers = useMemo(() => {
    if (filter !== 'book' && filter !== 'buy') return [];
    const needle = queryText.trim().toLowerCase();
    const wantServices = filter === 'book';

    return discovered
      .map((biz) => {
        const profileMeta = getBusinessProfileMeta(biz);
        const bag = offerCatalogBySlug[biz.slug] || {};
        const raw = wantServices
          ? (Array.isArray(bag.services) ? bag.services : []).filter(
              (service) => service && service.active !== false
            )
          : (Array.isArray(bag.products) ? bag.products : []).filter((product) =>
              isProductPubliclyVisible(product)
            );

        const categoryMatched = raw.filter((item) =>
          itemMatchesExploreCategories(item, expandedExploreCategories)
        );
        const brandHaystack = `${biz.brandName} ${biz.slug} ${biz.categoryLabel || ''}`.toLowerCase();
        const brandHit = !needle || brandHaystack.includes(needle);
        const matched = needle
          ? categoryMatched.filter((item) => {
              const tagLabels = `${categoryLabel(item.exploreMainCategoryId)} ${categoryLabel(item.exploreSubcategoryId)}`;
              return itemMatchesNeedle(item, needle) || tagLabels.toLowerCase().includes(needle);
            })
          : categoryMatched;

        if (!matched.length && !brandHit) return null;
        const previewSource = matched.length ? matched : categoryMatched;
        if (!previewSource.length) return null;

        const items = previewSource
          .slice(0, PREVIEW_LIMIT)
          .map((item) => (wantServices ? mapServicePreview(item) : mapProductPreview(item)));

        return {
          slug: biz.slug,
          brandName: bag.brandName || biz.brandName,
          logoUrl: bag.logoUrl || biz.logoUrl || '',
          heroImageUrl: biz.heroImageUrl || '',
          categoryLabel: profileMeta.category,
          locationLabel: profileMeta.location,
          distanceLabel: profileMeta.onlineOnly ? '' : formatDistanceKm(biz.distanceKm),
          items
        };
      })
      .filter(Boolean);
  }, [filter, discovered, offerCatalogBySlug, queryText, expandedExploreCategories]);

  const followed = new Set(profile?.followedSlugs || []);
  const activePost = filteredPosts.find((post) => post.id === activeId) || null;

  useEffect(() => {
    if (filter !== 'verticals') {
      setActiveVerticalId('');
      return;
    }
    if (!filteredPosts.length) {
      setActiveVerticalId('');
      return;
    }
    setActiveVerticalId((prev) =>
      filteredPosts.some((post) => post.id === prev) ? prev : filteredPosts[0].id
    );
  }, [filter, filteredPosts]);

  const activeVertical =
    filteredPosts.find((post) => post.id === activeVerticalId) || filteredPosts[0] || null;
  const verticalOpen = filter === 'verticals' && Boolean(activeVertical);

  const exitVerticals = () => {
    setFilter('posts');
    setActiveVerticalId('');
    setActiveId('');
  };

  const openTile = (post) => {
    if (getSocialPostKind(post) === 'vertical') {
      setFilter('verticals');
      setActiveVerticalId(post.id);
      return;
    }
    setActiveId(post.id);
  };

  const setContentTab = (id) => {
    setFilter(id);
    setActiveId('');
  };

  const stageBody = (() => {
    if (verticalOpen && activeVertical) {
      return (
        <div className="bb-client-vertical-page" aria-label="Verticals">
          <VerticalWatchPage
            post={activeVertical}
            posts={filteredPosts}
            brandName={activeVertical._brandName || ''}
            logoUrl={activeVertical._logoUrl || ''}
            editMode={false}
            onClose={exitVerticals}
            onChangeActive={setActiveVerticalId}
            wrapMedia={wrapClientMediaReaction}
            renderRailActions={(post) => (
              <ClientEngagementBar
                post={post}
                slug={post._slug || ''}
                brandName={post._brandName || ''}
                variant="tiktok"
              />
            )}
          />
        </div>
      );
    }

    if (activePost) {
      const kind = getSocialPostKind(activePost);
      const kindPosts = filteredPosts.filter((post) => getSocialPostKind(post) === kind);
      if (kind === 'video') {
        return (
          <SocialVideosPanel
            posts={kindPosts}
            variant="films"
            editMode={false}
            showOwnerStats={false}
            brandName={activePost._brandName || ''}
            logoUrl={activePost._logoUrl || ''}
            initialActiveId={activeId}
            onCloseVideo={() => setActiveId('')}
            wrapMedia={wrapClientMediaReaction}
            renderWatchActions={(post, description) => (
              <ClientEngagementBar
                post={post}
                slug={post._slug || ''}
                brandName={post._brandName || ''}
                variant="youtube"
              >
                {description}
              </ClientEngagementBar>
            )}
          />
        );
      }
      return (
        <SocialPostFeed
          posts={kindPosts}
          initialPostId={activeId}
          brandName={activePost._brandName || ''}
          slug={activePost._slug || ''}
          logoUrl={activePost._logoUrl || ''}
          editMode={false}
          hideToolbar={false}
          onBack={() => setActiveId('')}
          wrapMedia={wrapClientMediaReaction}
          renderPostActions={(post) => (
            <ClientEngagementBar
              post={post}
              slug={post._slug || ''}
              brandName={post._brandName || ''}
              variant="pulse"
            />
          )}
        />
      );
    }

    return (
      <>
        <div className="bb-client-ig-top">
          {mediaOnly ? (
            <>
              <div className="bb-explore-discovery-head bb-media-explore-head">
                <div className="bb-explore-discovery-modes" aria-label="Discovery mode">
                  <button
                    type="button"
                    className={`bb-explore-mode${exploreMode === 'local' ? ' is-active' : ''}`}
                    onClick={() => updateExplorePrefs({ exploreMode: 'local' })}
                  >
                    Local
                  </button>
                  <button
                    type="button"
                    className={`bb-explore-mode${exploreMode === 'international' ? ' is-active' : ''}`}
                    onClick={() => updateExplorePrefs({ exploreMode: 'international' })}
                  >
                    International
                  </button>
                </div>
                {exploreMode === 'local' && clientCity ? (
                  <span className="bb-explore-near">Near {clientCity}</span>
                ) : null}
              </div>
              <label className={`bb-search-field bb-media-explore-search${queryText ? ' has-clear' : ''}`}>
                <Search size={15} className="bb-search-field-icon" aria-hidden="true" />
                <input
                  type="search"
                  className="native-search-input"
                  value={queryText}
                  placeholder="Search posts, films, notes, or businesses"
                  autoCapitalize="none"
                  autoCorrect="off"
                  onChange={(event) => setQueryText(event.target.value)}
                />
                {queryText ? (
                  <button
                    type="button"
                    className="bb-search-field-clear"
                    aria-label="Clear search"
                    onClick={() => setQueryText('')}
                  >
                    <X size={14} strokeWidth={2.4} />
                  </button>
                ) : null}
              </label>
            </>
          ) : (
            <ExploreDiscoveryBar
            mode={exploreMode}
            maxKm={exploreMaxKm}
            categoryIds={exploreCategoryIds}
            queryText={queryText}
            searchHistory={
              Array.isArray(profile?.exploreSearchHistory) ? profile.exploreSearchHistory : []
            }
            clientCity={clientCity}
            clientCountryCode={clientCountryCode}
            geoStatus={geoStatus}
            onModeChange={(mode) =>
              startTransition(() => updateExplorePrefs({ exploreMode: mode }))
            }
            onMaxKmChange={(km) =>
              startTransition(() => updateExplorePrefs({ exploreMaxKm: km }))
            }
            onCategoryIdsChange={(ids) => updateExplorePrefs({ exploreCategoryIds: ids })}
            onQueryChange={(value) => startTransition(() => setQueryText(value))}
            onSearchHistoryChange={(history) =>
              updateExplorePrefs({ exploreSearchHistory: history })
            }
            onRequestGeo={requestGeo}
              onPickManualLocation={() => setPlaceSheetOpen(true)}
            />
          )}
        </div>

        {!mediaOnly && (filter === 'book' || filter === 'buy') ? (
          <ExploreBusinessOffers
            kind={filter}
            businesses={businessOffers}
            emptyTitle={
              filter === 'book' ? 'No bookable services nearby' : 'No products nearby'
            }
            emptyDescription={
              clientLat == null && exploreMode === 'local'
                ? 'Share your location or pick a city, then browse Book or Buy.'
                : 'Widen the distance ring, adjust categories, or try International.'
            }
          />
        ) : !mediaOnly && filter === 'places' && accountHits.length ? (
          <div className="bb-client-ig-accounts" aria-label="Places">
            <p className="bb-explore-places-label">
              {exploreMode === 'local' ? 'Places near you' : 'Ships / books to you'}
            </p>
            <PlacesCards businesses={accountHits} followed={followed} followSlug={followSlug} unfollowSlug={unfollowSlug} messageBiz={messageBiz} messagingSlug={messagingSlug} />
          </div>
        ) : !mediaOnly && exploreMode === 'local' && (clientLat == null || discovered.length === 0) ? (
          <EmptyState
            compact
            title={clientLat == null ? 'Share your location' : 'No places in range'}
            description={
              clientLat == null
                ? 'Turn on location or pick a city to see Nearby businesses.'
                : 'Widen the distance ring or try International for online businesses.'
            }
            action={
              clientLat == null ? (
                <button type="button" className="bb-primary-btn" onClick={requestGeo}>
                  Use my location
                </button>
              ) : (
                <button
                  type="button"
                  className="bb-primary-btn"
                  onClick={() => updateExplorePrefs({ exploreMode: 'international' })}
                >
                  Try International
                </button>
              )
            }
          />
        ) : null}

        {mediaOnly && filteredPosts.length === 0 &&
        accountHits.length === 0 &&
        !(exploreMode === 'local' && (clientLat == null || discovered.length === 0)) ? (
          <EmptyState
            compact
            title="Nothing to explore yet"
            description="When businesses publish posts, films, and verticals, they show up here."
          />
        ) : !mediaOnly || filteredPosts.length === 0 ? null : filter === 'films' ? (
          <div className="bb-client-home-yt bb-client-explore-yt">
            <SocialVideosPanel
              posts={filteredPosts}
              variant="films"
              editMode={false}
              showOwnerStats={false}
              brandName={filteredPosts[0]?._brandName || 'Business'}
              logoUrl={filteredPosts[0]?._logoUrl || ''}
              initialActiveId={activeId}
              onCloseVideo={() => setActiveId('')}
              wrapMedia={wrapClientMediaReaction}
              renderWatchActions={(post, description) => (
                <ClientEngagementBar
                  post={post}
                  slug={post._slug || ''}
                  brandName={post._brandName || ''}
                  variant="youtube"
                >
                  {description}
                </ClientEngagementBar>
              )}
            />
          </div>
        ) : filter === 'text' ? (
          <div className="bb-client-home-notes bb-client-explore-notes">
            <SocialTextTimeline
              posts={filteredPosts}
              brandName={filteredPosts[0]?._brandName || 'Business'}
              logoUrl={filteredPosts[0]?._logoUrl || ''}
              slug={filteredPosts[0]?._slug || ''}
              editMode={false}
              wrapMedia={wrapClientMediaReaction}
              renderActions={(post) => (
                <ClientEngagementBar
                  post={post}
                  slug={post._slug || ''}
                  brandName={post._brandName || ''}
                  variant="twitter"
                />
              )}
            />
          </div>
        ) : (
          <SocialPostsGrid
            posts={filteredPosts}
            editMode={false}
            onOpenPost={setActiveId}
            emptyLabel="No posts match this search."
          />
        )}

        {placeSheetOpen ? (
          <AppSheet
            onClose={() => setPlaceSheetOpen(false)}
            title="Set your location"
            lede="Used for Nearby distance. We only store it on this device profile."
          >
            <PlaceLocationField
              label="City or address"
              placeholder="Search a place near you"
              onChange={(place) => {
                if (!place) return;
                updateExplorePrefs({
                  clientLat: place.lat || null,
                  clientLng: place.lng || null,
                  clientCountryCode: place.countryCode || '',
                  clientCity: place.city || place.label || ''
                });
                setGeoStatus(place.lat ? 'ready' : 'error');
                if (place.lat) setPlaceSheetOpen(false);
              }}
            />
          </AppSheet>
        ) : null}
      </>
    );
  })();

  return (
    <ClientAppShell section={mediaOnly ? 'explore' : 'find'} title={mediaOnly ? 'Explore' : 'Find'}>
      <ClientDeskLayout
        className={`bb-client-ig-explore${
          verticalOpen ? ' is-vertical-open is-immersive' : ''
        }${activePost && !verticalOpen ? ' is-immersive' : ''}${
          mediaOnly ? ' is-media-explore' : ' is-find'
        }`}
        showContentTabs
        contentTab={filter}
        contentTabs={mediaOnly ? SOCIAL_PROFILE_TABS : FIND_CONTENT_TABS}
        onContentTabChange={setContentTab}
      >
        {stageBody}
      </ClientDeskLayout>
    </ClientAppShell>
  );
}
