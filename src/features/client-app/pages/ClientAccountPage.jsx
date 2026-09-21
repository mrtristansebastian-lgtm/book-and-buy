import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  Bell,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Lock,
  Bookmark,
  MessageCircle,
  Settings2,
  UserRound
} from 'lucide-react';
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
import { SocialNotificationsList } from '../../social/components/SocialNotificationsList';
import { PlacesCards } from '../PlacesCards';
import { normalizeBiz } from '../exploreDiscovery';

const SECTIONS = [
  {
    id: 'saved-places',
    label: 'Saved Places',
    lede: 'Businesses and places you want to visit again.',
    icon: Bookmark
  },
  {
    id: 'notifications',
    label: 'Notifications',
    lede: 'Replies, likes, and updates from businesses you follow.',
    icon: Bell
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
    label: 'Account',
    lede: 'Sign-out and demo controls.',
    icon: Lock
  }
];

const ACCOUNT_GROUPS = [
  {
    id: 'activity',
    label: 'Your activity',
    icon: Bell,
    sections: ['notifications', 'saved-places', 'bookings', 'orders'],
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
  return <span className="bb-client-pill">{children}</span>;
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
            <button
              type="button"
              className="bb-ghost-btn justify-self-start"
              disabled={photoBusy}
              onClick={() => fileRef.current?.click()}
            >
              {photoBusy ? 'Uploading…' : 'Upload photo'}
            </button>
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
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Profile photo URL</span>
          <input
            className="native-control-input px-4"
            value={profile?.photoURL || ''}
            placeholder="https://… or upload above"
            onChange={(event) => updateClientProfile({ photoURL: event.target.value })}
          />
        </label>
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
        <h2 className="bb-page-title text-xl m-0">Signed in</h2>
        <p className="bb-muted m-0 text-sm">Sign out of this device or leave demo mode.</p>
        <button
          type="button"
          className="bb-primary-btn justify-self-start"
          onClick={async () => {
            await clearClientSession();
            navigate('/app/auth', { replace: true });
          }}
        >
          Sign out
        </button>
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
    followSlug,
    updateClientProfile,
    socialNotifications,
    socialNotificationsReady,
    unreadSocialNotifications,
    markSocialNotificationsRead,
    togglePlaceSave,
    unfollowSlug
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
      heroImageUrl: workspace?.website?.heroImageUrl || workspace?.website?.socialBannerUrl,
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
      followSlug,
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
  const followed = useMemo(() => new Set(profile?.followedSlugs || []), [profile?.followedSlugs]);
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
        followSlug,
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
      <div className="bb-client-stack">
        {myBookings.length === 0 ? (
          <p className="bb-client-empty">No bookings yet. Explore businesses to book.</p>
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
              <p className="bb-muted m-0 text-sm">{booking.paymentStatus}</p>
              <button
                type="button"
                className="bb-client-text-btn"
                onClick={() => messageAbout('booking', booking)}
              >
                <MessageCircle size={14} /> Message business
              </button>
            </article>
          ))
        )}
      </div>
    );
  } else if (active?.id === 'orders') {
    body = (
      <div className="bb-client-stack">
        {myOrders.length === 0 ? (
          <p className="bb-client-empty">No orders yet.</p>
        ) : (
          myOrders.map((order) => (
            <article key={order.id} className="bb-client-item">
              <div className="bb-client-item-top">
                <strong>{order.clientName || 'Order'}</strong>
                <StatusPill>{order.status}</StatusPill>
              </div>
              <p className="bb-muted m-0 text-sm">
                {formatCents(order.amountInCents || 0)} · {order.paymentStatus}
              </p>
              <button
                type="button"
                className="bb-client-text-btn"
                onClick={() => messageAbout('order', order)}
              >
                <MessageCircle size={14} /> Message business
              </button>
            </article>
          ))
        )}
      </div>
    );
  } else if (active?.id === 'notifications') {
    body = (
      <SocialNotificationsList
        items={socialNotifications}
        loading={!socialNotificationsReady}
        unreadCount={unreadSocialNotifications}
        onMarkRead={(ids) => markSocialNotificationsRead(ids)}
        onMarkAllRead={() => markSocialNotificationsRead([], true)}
      />
    );
  } else if (active?.id === 'saved-places') {
    body = savedBusinesses.length ? (
      <PlacesCards
        businesses={savedBusinesses}
        followed={followed}
        followSlug={followSlug}
        unfollowSlug={unfollowSlug}
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
        <button type="button" className="bb-primary-btn" onClick={() => navigate('/app/find')}>Find places</button>
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
                        const count = item.id === 'notifications'
                          ? unreadSocialNotifications || null
                          : item.id === 'saved-places'
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
                            {count != null ? <span className="bb-client-account-app-count">{count}</span> : null}
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
              <button type="button" className="bb-settings-back" onClick={goList}>
                <ChevronLeft size={16} strokeWidth={2.4} aria-hidden="true" />
                Account
              </button>
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
