import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Play, Search, UserPlus, UserCheck } from 'lucide-react';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { APP_ID } from '../../../config/appConfig';
import { navigate, publicPagePath } from '../../../app/routing';
import { getFirebase, isFirebaseConfigured } from '../../../shared/firebase/client';
import { artifactRoot } from '../../../shared/firebase/paths';
import { loadPublicWorkspaceFromFirestore } from '../../../shared/firebase/publicWorkspace';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { BlankMedia } from '../../../shared/ui/BlankMedia';
import { getPostMediaItems, getSocialPostKind } from '../../social/utils/socialPostType';
import { SocialVideosPanel } from '../../social/components/SocialVideosPanel';
import { SocialTextTimeline } from '../../social/components/SocialTextTimeline';
import { SocialPostFeed } from '../../social/components/SocialPostFeed';
import { VerticalWatchPage } from '../../social/components/VerticalWatchPage';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { ClientAppShell } from '../ClientAppShell';
import { ClientDeskLayout } from '../ClientDeskLayout';
import { useClientProfile } from '../ClientProfileContext';
import { annotateSocialPosts } from '../ClientSocialShelf';
import { ClientEngagementBar, wrapClientMediaReaction } from '../ClientEngagementBar';
import { startClientMessage } from '../startClientMessage';

const FILTER_KIND = {
  posts: 'image',
  films: 'video',
  verticals: 'vertical',
  text: 'text'
};

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
  const { workspace, startThreadFromClient } = useWorkspace();
  const { profile, followSlug, unfollowSlug } = useClientProfile();
  const [queryText, setQueryText] = useState('');
  const [filter, setFilter] = useState('posts');
  const [remote, setRemote] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [activeVerticalId, setActiveVerticalId] = useState('');
  const [messagingSlug, setMessagingSlug] = useState('');
  const isDemo = Boolean(workspace?.isDemo || profile?.isDemo);

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
        blurb: workspace?.website?.hero?.subhead || workspace?.tagline || '',
        logoUrl: workspace?.logoUrl || workspace?.website?.logoUrl
      });
      if (local) map.set(local.slug, local);
    }
    remote.forEach((biz) => {
      if (!isDemo && (biz.slug === 'flameandflour' || biz.slug === 'flour-and-flame')) return;
      map.set(biz.slug, biz);
    });
    if (isDemo && !map.has('flameandflour')) {
      map.set('flameandflour', {
        slug: 'flameandflour',
        brandName: 'Flame & Flour',
        blurb: 'Artisan bakery · book tastings, buy boxes.',
        logoUrl: ''
      });
    }
    return [...map.values()];
  }, [workspace, remote, isDemo]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const localSlug = String(workspace?.slug || '').trim();
      const localPosts =
        localSlug && (isDemo || (workspace?.socialPosts || []).length)
          ? annotateSocialPosts(workspace?.socialPosts || [], {
              slug: localSlug,
              brandName: workspace?.brandName || localSlug,
              logoUrl: workspace?.logoUrl || workspace?.website?.logoUrl || ''
            })
          : [];

      const extras = [];
      if (isFirebaseConfigured()) {
        for (const biz of directory) {
          if (biz.slug === localSlug) continue;
          if (!isDemo && (biz.slug === 'flameandflour' || biz.slug === 'flour-and-flame')) continue;
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
  }, [workspace, directory, isDemo]);

  const filterKind = FILTER_KIND[filter] || FILTER_KIND.posts;
  const filteredPosts = useMemo(() => {
    const needle = queryText.trim().toLowerCase();
    return catalog
      .filter((post) => getSocialPostKind(post) === filterKind)
      .filter((post) => {
        if (!needle) return true;
        const hay = `${post._brandName || ''} ${post.caption || ''} ${post.title || ''} ${
          post._slug || ''
        }`.toLowerCase();
        return hay.includes(needle);
      });
  }, [catalog, filterKind, queryText]);

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
            renderWatchActions={(post) => (
              <ClientEngagementBar
                post={post}
                slug={post._slug || ''}
                brandName={post._brandName || ''}
                variant="youtube"
              />
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

          <div className="bb-client-ig-chips bb-client-desk-mobile-tabs" role="tablist" aria-label="Content type">
            {['posts', 'films', 'verticals', 'text'].map((id) => {
              const labels = { posts: 'Posts', films: 'Films', verticals: 'Verticals', text: 'Notes' };
              const active = filter === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`bb-client-ig-chip${active ? ' is-on' : ''}`}
                  onClick={() => setContentTab(id)}
                >
                  {labels[id]}
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
                      {biz.logoUrl ? (
                        <img src={biz.logoUrl} alt="" />
                      ) : (
                        <BlankMedia variant="avatar" />
                      )}
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
          <EmptyState
            compact
            title="Nothing to explore yet"
            description="When businesses publish posts, films, and verticals, they show up here."
          />
        ) : filter === 'films' ? (
          <div className="bb-client-home-yt bb-client-explore-yt">
            <SocialVideosPanel
              posts={filteredPosts}
              variant="films"
              editMode={false}
              showOwnerStats={false}
              brandName={filteredPosts[0]?._brandName || 'Business'}
              logoUrl={filteredPosts[0]?._logoUrl || ''}
              wrapMedia={wrapClientMediaReaction}
              renderWatchActions={(post) => (
                <ClientEngagementBar
                  post={post}
                  slug={post._slug || ''}
                  brandName={post._brandName || ''}
                  variant="youtube"
                />
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
          <div className="bb-client-ig-grid" role="list">
            {filteredPosts.map((post, index) => {
              const { kind, thumb, caption } = tileMedia(post);
              const featured = kind === 'video' && (index % 7 === 0 || index % 7 === 4);
              return (
                <button
                  key={post.id}
                  type="button"
                  role="listitem"
                  className={`bb-client-ig-cell${featured ? ' is-tall' : ''}`}
                  onClick={() => openTile(post)}
                  aria-label={caption || post.title || 'Open'}
                >
                  {thumb ? <img src={thumb} alt="" /> : <BlankMedia variant="square" />}
                  {kind === 'video' ? (
                    <span className="bb-client-ig-play" aria-hidden="true">
                      <Play size={14} fill="currentColor" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </>
    );
  })();

  return (
    <ClientAppShell section="explore" title="Explore">
      <ClientDeskLayout
        className={`bb-client-ig-explore${
          verticalOpen ? ' is-vertical-open is-immersive' : ''
        }${activePost && !verticalOpen ? ' is-immersive' : ''}`}
        showContentTabs
        contentTab={filter}
        onContentTabChange={setContentTab}
      >
        {stageBody}
      </ClientDeskLayout>
    </ClientAppShell>
  );
}
