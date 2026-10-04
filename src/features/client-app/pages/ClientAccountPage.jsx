import { Button } from '../../../shared/ui/Button';
import { StatusBadge } from '../../../shared/ui/StatusBadge';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronRight, ClipboardList, Lock, Bookmark, Settings2, UserRound } from 'lucide-react';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { APP_ID } from '../../../config/appConfig';
import { navigate, publicPagePath } from '../../../app/routing';
import { formatDisplayDate } from '../../../utils/dates';
import { formatCents } from '../../../utils/products';
import { uploadPublicImage } from '../../../shared/firebase/integrations';
import { getFirebase, isFirebaseConfigured } from '../../../shared/firebase/client';
import { artifactRoot } from '../../../shared/firebase/paths';
import { distanceKm } from '../../../shared/geo/haversine';
import { DemoModePanel } from '../../../shared/ui/DemoModePanel';
import { useAuth } from '../../auth/AuthContext';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { ClientAppShell } from '../ClientAppShell';
import { useClientProfile } from '../ClientProfileContext';
import { startClientMessage } from '../startClientMessage';
import { PlacesCards } from '../PlacesCards';
import { normalizeBiz } from '../exploreDiscovery';
import { activityStatusLabel, customerOrderSummary, customerOrderTitle } from '../customerActivity';

const SECTIONS = [
  {
    id: 'saved-places',
    label: 'Saved Places',
    lede: 'Businesses and places you want to visit again.',
    icon: Bookmark
  },
  {
    id: 'general',
    label: 'General',
    lede: 'Your name, email, and profile photo.',
    icon: Settings2
  },
  {
    id: 'bookings',
    label: 'Bookings',
    lede: 'Classes and appointments you have booked.',
    icon: CalendarDays
  },
  {
    id: 'orders',
    label: 'Orders',
    lede: 'Product orders and fulfilment status.',
    icon: ClipboardList
  },
  {
    id: 'account',
    label: 'Sign-in & session',
    lede: 'Sign-out and demo controls.',
    icon: Lock
  }
];

const ACCOUNT_GROUPS = [
  {
    id: 'activity',
    label: 'Your activity',
    icon: ClipboardList,
    sections: ['saved-places', 'bookings', 'orders'],
    hue: 'sky'
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: UserRound,
    sections: ['general', 'account'],
    hue: 'violet'
  }
];

function StatusPill({ children }) {
  return <StatusBadge className="bb-client-pill" status={children} label={activityStatusLabel(children) || 'Unknown'} />;
}

function initials(name = '', email = '') {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length) {
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('');
  }
  const letter = String(email || 'C').trim().charAt(0);
  return letter ? letter.toUpperCase() : 'C';
}

function GeneralSettings({ profile, updateClientProfile, setClientPresence }) {
  const { configured } = useAuth();
  const fileRef = useRef(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');

  const onPickPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError('');
    try {
      const result = await uploadPublicImage(file, 'account-avatars');
      if (result.localOnly && configured) {
        throw new Error('Sign in with a verified account to upload a profile photo.');
      }
      await updateClientProfile({ photoURL: result.url });
    } catch (err) {
      setPhotoError(err?.message || 'Could not upload photo.');
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <div className="grid gap-4 max-w-xl">
      <section className="bb-panel p-5 grid gap-3">
        <div className="bb-client-settings-edit-hero">
          <span className="bb-settings-avatar bb-client-settings-avatar is-lg" aria-hidden>
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt="" />
            ) : (
              initials(profile?.displayName, profile?.email)
            )}
          </span>
          <div className="grid gap-2">
            <p className="bb-muted m-0 text-sm">Shown on messages and bookings.</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              onChange={onPickPhoto}
            />
            <Button action="upload" busy={photoBusy} busyLabel="Uploading…" variant="primary"
              type="button"
              className="bb-ghost-btn justify-self-start"
              disabled={photoBusy}
              onClick={() => fileRef.current?.click()}
            >
              Upload photo
            </Button>
            {photoError ? <p className="m-0 text-sm text-[#b42318]">{photoError}</p> : null}
          </div>
        </div>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Display name</span>
          <input
            className="native-control-input px-4"
            value={profile?.displayName || ''}
            onChange={(event) => updateClientProfile({ displayName: event.target.value })}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Email</span>
          <input
            className="native-control-input px-4"
            type="email"
            value={profile?.email || ''}
            onChange={(event) => updateClientProfile({ email: event.target.value })}
          />
        </label>
        {profile?.photoURL ? <Button action="delete" busy={photoBusy} variant="destructive" type="button" className="bb-ghost-btn justify-self-start" disabled={photoBusy} onClick={async () => {
          setPhotoBusy(true); setPhotoError('');
          try { await updateClientProfile({ photoURL: '' }); }
          catch (error) { setPhotoError(error?.message || 'Could not remove photo. Please try again.'); }
          finally { setPhotoBusy(false); }
        }}>Remove profile photo</Button> : null}
        <label className="flex items-start gap-3 text-sm font-semibold pt-1">
          <input
            type="checkbox"
            className="mt-1"
            checked={profile?.showActivityStatus !== false}
            onChange={(event) => {
              const next = event.target.checked;
              updateClientProfile({ showActivityStatus: next });
              setClientPresence?.(profile?.email, {
                status: next && !document.hidden ? 'online' : 'offline',
                lastSeenAt: Date.now(),
                visible: next
              });
            }}
          />
          <span>
            Show activity status
            <span className="block font-normal text-[#667085] mt-0.5">
              Green when you are online, grey with last seen when you are not. Turn off to hide
              status from businesses entirely.
            </span>
          </span>
        </label>
      </section>
    </div>
  );
}

function AccountSettings({ clearClientSession, showDemo }) {
  return (
    <div className="grid gap-4 max-w-xl">
      <section className="bb-panel p-5 grid gap-3">
        <h2 className="bb-page-title text-xl m-0">{showDemo ? 'Demo profile' : 'Your session'}</h2>
        <p className="bb-muted m-0 text-sm">{showDemo ? 'You are exploring with a sample customer profile. No customer account has been created.' : 'Sign out of your customer account on this device.'}</p>
        {!showDemo ? <Button action="signOut" variant="secondary"
          type="button"
          className="bb-primary-btn justify-self-start"
          onClick={async () => {
            await clearClientSession();
            navigate('/app/auth', { replace: true });
          }}
        >
          Sign out
        </Button> : null}
      </section>
      {showDemo ? <DemoModePanel className="bb-demo-panel--account" variant="client" /> : null}
    </div>
  );
}

/** Account = settings-style index with profile preview + section pages. */
export function ClientAccountPage({ section = '' }) {
  const {
    profile,
    clearClientSession,
    updateClientProfile,
    togglePlaceSave
  } = useClientProfile();
  const { bookings, orders, workspace, startThreadFromBooking, startThreadFromOrder, startThreadFromClient, setClientPresence } =
    useWorkspace();
  const [directory, setDirectory] = useState([]);
  const [messagingSlug, setMessagingSlug] = useState('');
  const email = String(profile?.email || '').toLowerCase();
  const active = SECTIONS.find((item) => item.id === section) || null;
  const isIndex = !active;

  useEffect(() => {
    let cancelled = false;
    const local = normalizeBiz({
      slug: workspace?.slug,
      ownerId: workspace?.ownerId || workspace?.id || '',
      brandName: workspace?.brandName,
      tagline: workspace?.tagline,
      logoUrl: workspace?.logoUrl || workspace?.website?.logoUrl,
      heroImageUrl: workspace?.website?.heroImageUrl,
      website: workspace?.website || {}
    });
    const commit = (remote = []) => {
      const bySlug = new Map();
      if (local) bySlug.set(local.slug, local);
      remote.forEach((biz) => biz && bySlug.set(biz.slug, biz));
      const clientLat = Number(profile?.clientLat);
      const clientLng = Number(profile?.clientLng);
      setDirectory([...bySlug.values()].map((biz) => ({
        ...biz,
        distanceKm: Number.isFinite(clientLat) && Number.isFinite(clientLng) && Number.isFinite(biz.locationLat) && Number.isFinite(biz.locationLng)
          ? distanceKm(clientLat, clientLng, biz.locationLat, biz.locationLng)
          : Infinity
      })));
    };
    commit();
    if (!isFirebaseConfigured()) return () => { cancelled = true; };
    (async () => {
      try {
        const firebase = getFirebase();
        if (!firebase) return;
        const col = collection(firebase.db, ...artifactRoot(APP_ID), 'public', 'data', 'workspaces');
        const snap = await getDocs(query(col, limit(80)));
        if (!cancelled) commit(snap.docs.map((item) => normalizeBiz({ id: item.id, slug: item.id, ...(item.data() || {}) })).filter(Boolean));
      } catch {
        /* local place remains available */
      }
    })();
    return () => { cancelled = true; };
  }, [workspace, profile?.clientLat, profile?.clientLng]);

  const myBookings = useMemo(
    () =>
      (bookings || []).filter(
        (booking) =>
          String(booking.clientEmail || '').toLowerCase() === email ||
          (profile?.uid && booking.clientUid === profile.uid)
      ),
    [bookings, email, profile?.uid]
  );

  const myOrders = useMemo(
    () =>
      (orders || []).filter(
        (order) =>
          String(order.clientEmail || '').toLowerCase() === email ||
          (profile?.uid && order.clientUid === profile.uid)
      ),
    [orders, email, profile?.uid]
  );

  const messageAbout = async (kind, item) => {
    if (!item) return;
    await startClientMessage({
      profile,
      workspace,
      startThreadFromBooking,
      startThreadFromOrder,
      ownerId: workspace?.ownerId || workspace?.id || '',
      slug: workspace?.slug || '',
      brandName: workspace?.brandName || '',
      logoUrl: workspace?.logoUrl || workspace?.website?.logoUrl || '',
      booking: kind === 'booking' ? item : null,
      order: kind === 'order' ? item : null
    });
  };

  const go = (id) => navigate(`/app/account/${id}`);
  const goList = () => navigate('/app/account');
  const showDemo = Boolean(workspace?.isDemo || profile?.isDemo);
  const savedPlaces = useMemo(() => new Set(profile?.savedPlaceSlugs || []), [profile?.savedPlaceSlugs]);
  const savedBusinesses = useMemo(
    () => directory.filter((biz) => savedPlaces.has(biz.slug)),
    [directory, savedPlaces]
  );

  const messagePlace = async (biz) => {
    setMessagingSlug(biz.slug);
    try {
      await startClientMessage({
        profile,
        workspace,
        startThreadFromClient,
        ownerId: biz.ownerId || '',
        slug: biz.slug,
        brandName: biz.brandName,
        logoUrl: biz.logoUrl || ''
      });
    } finally {
      setMessagingSlug('');
    }
  };

  let body = null;
  if (active?.id === 'general') {
    body = (
      <GeneralSettings
        profile={profile}
        updateClientProfile={updateClientProfile}
        setClientPresence={setClientPresence}
      />
    );
  } else if (active?.id === 'bookings') {
    body = (
      <div className="bb-client-stack bb-client-activity">
        {myBookings.length === 0 ? (
          <div className="bb-client-empty"><p>No bookings yet. Find a business and book your first service.</p><Button action="search" variant="secondary" type="button" className="bb-ghost-btn" onClick={() => navigate('/app/find')}>Find services</Button></div>
        ) : (
          myBookings.map((booking) => (
            <article key={booking.id} className="bb-client-item">
              <div className="bb-client-item-top">
                <strong>{booking.serviceName || 'Service'}</strong>
                <StatusPill>{booking.status}</StatusPill>
              </div>
              <p className="bb-muted m-0 text-sm">
                {formatDisplayDate(booking.dateKey || booking.date)} · {booking.time}
              </p>
              {booking.paymentStatus && <div className="bb-client-activity-payment"><span>Payment</span><StatusBadge status={booking.paymentStatus} label={activityStatusLabel(booking.paymentStatus)} /></div>}
              <Button action="chat" variant="secondary"
                type="button"
                className="bb-client-text-btn"
                onClick={() => messageAbout('booking', booking)}
              >
                 Message business
              </Button>
            </article>
          ))
        )}
      </div>
    );
  } else if (active?.id === 'orders') {
    body = (
      <div className="bb-client-stack bb-client-activity">
        {myOrders.length === 0 ? (
          <div className="bb-client-empty"><p>No orders yet. Discover products from businesses on Book and Buy.</p><Button action="search" variant="secondary" type="button" className="bb-ghost-btn" onClick={() => navigate('/app/find')}>Find products</Button></div>
        ) : (
          myOrders.map((order) => (
            <article key={order.id} className="bb-client-item">
              <div className="bb-client-item-top">
                <strong>{customerOrderTitle(order)}</strong>
                <StatusPill>{order.status}</StatusPill>
              </div>
              {customerOrderSummary(order) && <p className="bb-muted m-0 text-sm">{customerOrderSummary(order)}</p>}
              <div className="bb-client-activity-payment"><strong>{formatCents(order.amountInCents || 0, order.currency || 'R')}</strong>{order.paymentStatus && <StatusBadge status={order.paymentStatus} label={activityStatusLabel(order.paymentStatus)} />}</div>
              <Button action="chat" variant="secondary"
                type="button"
                className="bb-client-text-btn"
                onClick={() => messageAbout('order', order)}
              >
                 Message business
              </Button>
            </article>
          ))
        )}
      </div>
    );
  } else if (active?.id === 'saved-places') {
    body = savedBusinesses.length ? (
      <PlacesCards
        businesses={savedBusinesses}
        messageBiz={messagePlace}
        messagingSlug={messagingSlug}
        savedPlaces={savedPlaces}
        togglePlaceSave={togglePlaceSave}
      />
    ) : (
      <div className="bb-client-empty bb-client-saved-empty">
        <Bookmark size={24} />
        <strong>No saved places yet</strong>
        <span>Save a business from Find and it will appear here.</span>
        <Button action="search" variant="primary" type="button" className="bb-primary-btn" onClick={() => navigate('/app/find')}>Find places</Button>
      </div>
    );
  } else if (active?.id === 'account') {
    body = <AccountSettings clearClientSession={clearClientSession} showDemo={showDemo} />;
  }

  return (
    <ClientAppShell
      section="account"
      title={isIndex ? 'Account' : active.label}
      hideHeader
    >
      <div
        className={`bb-settings bb-client-settings is-mobile-${isIndex ? 'index' : 'detail'}`}
      >
        {isIndex ? (
          <aside className="bb-settings-rail" aria-label="Account settings">
            <header className="bb-settings-mobile-index-head">
              <div className="bb-page-title-wrap">
                <div className="bb-page-header-glow" aria-hidden="true" />
                <h1 className="bb-page-title">Account</h1>
              </div>
              <p className="bb-muted">Profile, bookings, and sign-in.</p>
            </header>

            <nav className="bb-client-account-launcher" aria-label="Account apps">
              {ACCOUNT_GROUPS.map((group) => {
                const GroupIcon = group.icon;
                return (
                  <section key={group.id} className={`bb-client-account-group is-${group.hue}`}>
                    <h2><GroupIcon size={18} strokeWidth={2} />{group.label}</h2>
                    <div className="bb-client-account-apps">
                      {group.sections.map((id) => {
                        const item = SECTIONS.find((sectionItem) => sectionItem.id === id);
                        if (!item) return null;
                        const Icon = item.icon || UserRound;
                        const count = item.id === 'saved-places'
                            ? savedPlaces.size
                            : item.id === 'bookings'
                              ? myBookings.length
                              : item.id === 'orders'
                                ? myOrders.length
                                : null;
                        return (
                          <button key={item.id} type="button" className="bb-client-account-app" onClick={() => go(item.id)}>
                            <span className="bb-client-account-app-icon"><Icon size={21} strokeWidth={1.9} /></span>
                            <strong>{item.label}</strong>
                            {count > 0 ? <span className="bb-client-account-app-count">{count}</span> : null}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </nav>

            {workspace?.slug ? (
              <button
                type="button"
                className="bb-client-settings-visit"
                onClick={() => navigate(publicPagePath(workspace.slug, 'home'))}
              >
                <span>
                  <strong>Visit {workspace.brandName || workspace.slug}</strong>
                  <span className="bb-muted">Public site</span>
                </span>
                <ChevronRight size={18} />
              </button>
            ) : null}

            {showDemo ? <DemoModePanel className="bb-demo-panel--account" variant="client" /> : null}
          </aside>
        ) : (
          <div className="bb-settings-main">
            <header className="bb-settings-main-head">
              <Button action="back" variant="secondary" type="button" className="bb-settings-back" onClick={goList}>

                Account
              </Button>
              <div className="bb-page-title-wrap">
                <div className="bb-page-header-glow" aria-hidden="true" />
                <h1 className="bb-page-title">{active.label}</h1>
              </div>
              <p className="bb-muted">{active.lede}</p>
            </header>
            {body}
          </div>
        )}
      </div>
    </ClientAppShell>
  );
}
