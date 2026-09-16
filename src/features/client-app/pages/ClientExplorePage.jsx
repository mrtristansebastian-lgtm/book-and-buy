import { useEffect, useMemo, useState } from 'react';
import { Clapperboard, Grid3X3, MessageCircle, PenLine, Play, RectangleVertical, Search, UserPlus, UserCheck } from 'lucide-react';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { APP_ID } from '../../../config/appConfig';
import { navigate, publicPagePath } from '../../../app/routing';
import { getFirebase, isFirebaseConfigured } from '../../../shared/firebase/client';
import { artifactRoot } from '../../../shared/firebase/paths';
import { loadPublicWorkspaceFromFirestore } from '../../../shared/firebase/publicWorkspace';
import { getPostMediaItems, getSocialPostKind } from '../../social/utils/socialPostType';
import { SocialVideosPanel } from '../../social/components/SocialVideosPanel';
import { SocialTextTimeline } from '../../social/components/SocialTextTimeline';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { ClientAppShell } from '../ClientAppShell';
import { useClientProfile } from '../ClientProfileContext';
import { annotateSocialPosts } from '../ClientSocialShelf';
import { FeedCard } from '../ClientHomeFeed';
import { ClientEngagementBar } from '../ClientEngagementBar';
import { startClientMessage } from '../startClientMessage';

const FILTERS = [
  { id: 'posts', label: 'Posts', kind: 'image', Icon: Grid3X3 },
  { id: 'films', label: 'Films', kind: 'video', Icon: Clapperboard },
  { id: 'verticals', label: 'Verticals', kind: 'vertical', Icon: RectangleVertical },
  { id: 'text', label: 'Notes', kind: 'text', Icon: PenLine }
];

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

/** Instagram Explore: search, chip filters, dense media grid. */
export function ClientExplorePage() {
  const { workspace, loadDemoWorkspace, startThreadFromClient } = useWorkspace();
  const { profile, followSlug, unfollowSlug } = useClientProfile();
  const [queryText, setQueryText] = useState('');
  const [filter, setFilter] = useState('posts');
  const [remote, setRemote] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [messagingSlug, setMessagingSlug] = useState('');

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

  useEffect(() => {
    if (!(workspace?.socialPosts || []).length && loadDemoWorkspace) {
      loadDemoWorkspace();
    }
  }, [workspace?.socialPosts?.length, loadDemoWorkspace]);

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
    const local = normalizeBiz({
      slug: workspace?.slug || 'flameandflour',
      ownerId: workspace?.ownerId || workspace?.id || '',
      brandName: workspace?.brandName || 'Flame & Flour',
      blurb: workspace?.website?.hero?.subhead || 'Book services and buy products.',
      logoUrl: workspace?.logoUrl || workspace?.website?.logoUrl
    });
    if (local) map.set(local.slug, local);
    remote.forEach((biz) => map.set(biz.slug, biz));
    if (!map.has('flameandflour')) {
      map.set('flameandflour', {
        slug: 'flameandflour',
        brandName: 'Flame & Flour',
        blurb: 'Artisan bakery · book tastings, buy boxes.',
        logoUrl: ''
      });
    }
    return [...map.values()];
  }, [workspace, remote]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const localSlug = workspace?.slug || 'flameandflour';
      const localPosts = annotateSocialPosts(workspace?.socialPosts || [], {
        slug: localSlug,
        brandName: workspace?.brandName || 'Flame & Flour',
        logoUrl: workspace?.logoUrl || workspace?.website?.logoUrl || ''
      });

      const extras = [];
      if (isFirebaseConfigured()) {
        for (const biz of directory) {
          if (biz.slug === localSlug || biz.slug === 'flameandflour') continue;
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
          } catch {
            /* skip */
          }
        }
      }

      if (!cancelled) setCatalog([...localPosts, ...extras]);
    })();
    return () => {
      cancelled = true;
    };
  }, [workspace, directory]);

  const filterMeta = FILTERS.find((item) => item.id === filter) || FILTERS[0];
  const filteredPosts = useMemo(() => {
    const needle = queryText.trim().toLowerCase();
    return catalog
      .filter((post) => getSocialPostKind(post) === filterMeta.kind)
      .filter((post) => {
        if (!needle) return true;
        const hay = `${post._brandName || ''} ${post.caption || ''} ${post.title || ''} ${
          post._slug || ''
        }`.toLowerCase();
        return hay.includes(needle);
      });
  }, [catalog, filterMeta.kind, queryText]);

  const accountHits = useMemo(() => {
    const needle = queryText.trim().toLowerCase();
    if (!needle) return [];
    return directory.filter(
      (biz) =>
        biz.brandName.toLowerCase().includes(needle) || biz.slug.toLowerCase().includes(needle)
    );
  }, [directory, queryText]);

  const followed = new Set(profile?.followedSlugs || []);
  const activePost = filteredPosts.find((post) => post.id === activeId) || null;

  const openTile = (post) => {
    setActiveId(post.id);
  };

  if (activePost) {
    const kind = getSocialPostKind(activePost);
    const kindPosts = filteredPosts.filter((post) => getSocialPostKind(post) === kind);
    if (kind === 'video' || kind === 'vertical') {
      return (
        <ClientAppShell section="explore" hideHeader>
          <div className="bb-client-ig-explore is-immersive">
            <SocialVideosPanel
              posts={kindPosts}
              variant={kind === 'vertical' ? 'verticals' : 'films'}
              editMode={false}
              showOwnerStats={false}
              brandName={activePost._brandName || ''}
              logoUrl={activePost._logoUrl || ''}
              initialActiveId={activeId}
              onCloseVideo={() => setActiveId('')}
              renderWatchActions={(post) => (
                <ClientEngagementBar
                  post={post}
                  slug={post._slug || ''}
                  brandName={post._brandName || ''}
                  variant={kind === 'vertical' ? 'tiktok' : 'youtube'}
                />
              )}
            />
          </div>
        </ClientAppShell>
      );
    }
    if (kind === 'text') {
      return (
        <ClientAppShell section="explore" hideHeader>
          <div className="bb-client-ig-explore is-immersive bb-client-home-notes">
            <button type="button" className="bb-client-ig-back" onClick={() => setActiveId('')}>
              ← Back
            </button>
            <SocialTextTimeline
              posts={kindPosts}
              brandName={activePost._brandName || ''}
              logoUrl={activePost._logoUrl || ''}
              slug={activePost._slug || ''}
              editMode={false}
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
        </ClientAppShell>
      );
    }
    return (
      <ClientAppShell section="explore" hideHeader>
        <div className="bb-client-ig-explore is-immersive">
          <FeedCard post={activePost} onClose={() => setActiveId('')} />
        </div>
      </ClientAppShell>
    );
  }

  return (
    <ClientAppShell section="explore" hideHeader>
      <div className="bb-client-ig-explore">
        <div className="bb-client-ig-top">
          <label className="bb-client-ig-search">
            <Search size={15} strokeWidth={2.2} aria-hidden="true" />
            <input
              type="search"
              placeholder="Search"
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
            />
          </label>

          <div className="bb-client-ig-chips" role="tablist" aria-label="Content type">
            {FILTERS.map(({ id, label, Icon }) => {
              const active = filter === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`bb-client-ig-chip${active ? ' is-on' : ''}`}
                  onClick={() => {
                    setFilter(id);
                    setActiveId('');
                  }}
                >
                  <Icon size={14} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {accountHits.length ? (
          <div className="bb-client-ig-accounts">
            {accountHits.map((biz) => {
              const isFollowed = followed.has(biz.slug);
              return (
                <div key={biz.slug} className="bb-client-ig-account">
                  <button
                    type="button"
                    className="bb-client-ig-account-main"
                    onClick={() => navigate(publicPagePath(biz.slug, 'home'))}
                  >
                    <span className="bb-client-avatar is-sm" aria-hidden="true">
                      {biz.brandName.charAt(0).toUpperCase()}
                    </span>
                    <span>
                      <strong>{biz.brandName}</strong>
                      <span className="bb-muted">{biz.blurb || `@${biz.slug}`}</span>
                    </span>
                  </button>
                  <div className="bb-client-home-head-actions">
                    <button
                      type="button"
                      className="bb-client-home-message"
                      aria-label={`Message ${biz.brandName}`}
                      disabled={messagingSlug === biz.slug}
                      onClick={() => messageBiz(biz)}
                    >
                      <MessageCircle size={16} />
                    </button>
                    <button
                      type="button"
                      className={`bb-client-ig-follow${isFollowed ? ' is-on' : ''}`}
                      onClick={() => (isFollowed ? unfollowSlug(biz.slug) : followSlug(biz.slug))}
                    >
                      {isFollowed ? <UserCheck size={14} /> : <UserPlus size={14} />}
                      {isFollowed ? 'Following' : 'Follow'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {filteredPosts.length === 0 ? (
          <p className="bb-client-empty">Nothing to explore here yet.</p>
        ) : (
          <div className="bb-client-ig-grid" role="list">
            {filteredPosts.map((post, index) => {
              const { kind, thumb, caption } = tileMedia(post);
              const featured =
                (kind === 'video' || kind === 'vertical') && (index % 7 === 0 || index % 7 === 4);
              return (
                <button
                  key={post.id}
                  type="button"
                  role="listitem"
                  className={`bb-client-ig-cell${featured ? ' is-tall' : ''}${
                    kind === 'text' ? ' is-note' : ''
                  }`}
                  onClick={() => openTile(post)}
                  aria-label={caption || post.title || 'Open'}
                >
                  {kind === 'text' ? (
                    <span className="bb-client-ig-note">
                      <span className="bb-client-ig-note-brand">{post._brandName || 'Note'}</span>
                      <span className="bb-client-ig-note-body">{caption || 'Note'}</span>
                    </span>
                  ) : thumb ? (
                    <img src={thumb} alt="" />
                  ) : (
                    <span className="bb-client-ig-empty" />
                  )}
                  {kind === 'video' || kind === 'vertical' ? (
                    <span className="bb-client-ig-play" aria-hidden="true">
                      <Play size={14} fill="currentColor" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </ClientAppShell>
  );
}
