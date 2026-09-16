import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Search, UserPlus, UserCheck } from 'lucide-react';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { APP_ID } from '../../../config/appConfig';
import { navigate, publicPagePath } from '../../../app/routing';
import { getFirebase, isFirebaseConfigured } from '../../../shared/firebase/client';
import { artifactRoot } from '../../../shared/firebase/paths';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { ClientAppShell } from '../ClientAppShell';
import { useClientProfile } from '../ClientProfileContext';
import { ensureClientThread } from '../clientThreadsApi';

function normalizeBiz(raw = {}) {
  const slug = String(raw.slug || raw.id || '').trim();
  if (!slug) return null;
  return {
    slug,
    ownerId: String(raw.ownerId || '').trim(),
    brandName: String(raw.brandName || raw.name || slug).trim() || slug,
    blurb: String(raw.tagline || raw.blurb || raw.about || '').trim(),
    logoUrl: raw.logoUrl || raw.logo || ''
  };
}

/** Discover public businesses; follow and open guest public site. */
export function ClientExplorePage() {
  const { workspace, startThreadFromClient } = useWorkspace();
  const { profile, followSlug, unfollowSlug } = useClientProfile();
  const [queryText, setQueryText] = useState('');
  const [remote, setRemote] = useState([]);
  const [messagingSlug, setMessagingSlug] = useState('');

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
        const rows = snap.docs
          .map((item) => normalizeBiz({ id: item.id, slug: item.id, ...(item.data() || {}) }))
          .filter(Boolean);
        setRemote(rows);
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
    const local = normalizeBiz({
      slug: workspace?.slug || 'flameandflour',
      ownerId: workspace?.ownerId || workspace?.id || '',
      brandName: workspace?.brandName || 'Flame & Flour',
      blurb: workspace?.website?.hero?.subhead || 'Book services and buy products.',
      logoUrl: workspace?.logoUrl
    });
    if (local) map.set(local.slug, local);
    remote.forEach((biz) => map.set(biz.slug, biz));
    if (!map.has('flameandflour')) {
      map.set('flameandflour', {
        slug: 'flameandflour',
        ownerId: workspace?.ownerId || '',
        brandName: 'Flame & Flour',
        blurb: 'Artisan bakery · book tastings, buy boxes.',
        logoUrl: ''
      });
    }
    return [...map.values()];
  }, [workspace, remote]);

  const filtered = useMemo(() => {
    const needle = queryText.trim().toLowerCase();
    if (!needle) return directory;
    return directory.filter(
      (biz) =>
        biz.brandName.toLowerCase().includes(needle) || biz.slug.toLowerCase().includes(needle)
    );
  }, [directory, queryText]);

  const followed = new Set(profile?.followedSlugs || []);

  const messageBusiness = async (biz) => {
    if (!biz?.slug || !profile?.email) return;
    setMessagingSlug(biz.slug);
    try {
      await followSlug(biz.slug);
      if (isFirebaseConfigured() && biz.ownerId) {
        const thread = await ensureClientThread({
          ownerId: biz.ownerId,
          clientEmail: profile.email,
          clientName: profile.displayName || '',
          clientUid: profile.uid || '',
          subject: `Message · ${biz.brandName}`,
          brandName: biz.brandName,
          workspaceSlug: biz.slug
        });
        if (thread?.id) {
          navigate(`/app/messages/${thread.id}`);
          return;
        }
      }
      if (startThreadFromClient) {
        const thread = startThreadFromClient({
          name: profile.displayName || 'Client',
          email: profile.email
        });
        if (thread?.id) {
          navigate(`/app/messages/${thread.id}`);
          return;
        }
      }
      navigate('/app/messages');
    } finally {
      setMessagingSlug('');
    }
  };

  return (
    <ClientAppShell section="explore" title="Explore">
      <div className="bb-client-explore">
        <label className="bb-client-search">
          <Search size={16} strokeWidth={2} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search businesses"
            value={queryText}
            onChange={(event) => setQueryText(event.target.value)}
          />
        </label>

        <div className="bb-client-stack">
          {filtered.map((biz) => {
            const isFollowed = followed.has(biz.slug);
            return (
              <article key={biz.slug} className="bb-client-biz">
                <button
                  type="button"
                  className="bb-client-biz-main"
                  onClick={() => navigate(publicPagePath(biz.slug, 'home'))}
                >
                  <div className="bb-client-avatar" aria-hidden="true">
                    {biz.brandName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <strong>{biz.brandName}</strong>
                    <p className="bb-muted m-0 text-sm">{biz.blurb || `@${biz.slug}`}</p>
                  </div>
                </button>
                <div className="bb-client-biz-actions">
                  <button
                    type="button"
                    className="bb-client-icon-btn"
                    aria-label={`Message ${biz.brandName}`}
                    disabled={messagingSlug === biz.slug}
                    onClick={() => messageBusiness(biz)}
                  >
                    <MessageCircle size={16} />
                  </button>
                  <button
                    type="button"
                    className={`bb-client-follow${isFollowed ? ' is-on' : ''}`}
                    onClick={() => (isFollowed ? unfollowSlug(biz.slug) : followSlug(biz.slug))}
                  >
                    {isFollowed ? <UserCheck size={16} /> : <UserPlus size={16} />}
                    {isFollowed ? 'Following' : 'Follow'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </ClientAppShell>
  );
}
