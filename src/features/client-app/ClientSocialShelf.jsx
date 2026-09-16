import { useMemo, useState } from 'react';
import { Clapperboard, Grid3X3, PenLine, RectangleVertical } from 'lucide-react';
import { navigate, publicPagePath } from '../../app/routing';
import { getSocialPostKind } from '../social/utils/socialPostType';
import { SOCIAL_PROFILE_TABS } from '../social/components/SocialProfileTabs';
import { SocialPostsGrid } from '../social/components/SocialPostsGrid';
import { SocialPostFeed } from '../social/components/SocialPostFeed';
import { SocialVideosPanel } from '../social/components/SocialVideosPanel';
import { SocialTextTimeline } from '../social/components/SocialTextTimeline';

function isPublished(post) {
  if (post?.published === false) return false;
  if (post?.visibility && post.visibility !== 'published') return false;
  return true;
}

export function annotateSocialPosts(socialPosts = [], brandMeta = {}) {
  return (socialPosts || [])
    .filter(isPublished)
    .map((post) => ({
      ...post,
      _brandName: brandMeta.brandName,
      _slug: brandMeta.slug,
      _logoUrl: brandMeta.logoUrl || ''
    }));
}

function sortPosts(posts) {
  return [...posts].sort(
    (a, b) =>
      (a.order ?? 0) - (b.order ?? 0) ||
      (b.createdAt || b.at || 0) - (a.createdAt || a.at || 0)
  );
}

const CHIP_FILTERS = [
  { id: 'posts', label: 'Posts', kind: 'image', Icon: Grid3X3 },
  { id: 'films', label: 'Films', kind: 'video', Icon: Clapperboard },
  { id: 'verticals', label: 'Verticals', kind: 'vertical', Icon: RectangleVertical },
  { id: 'text', label: 'Notes', kind: 'text', Icon: PenLine }
];

function ContentTypeChips({ value, onChange }) {
  const activeId = value === 'videos' ? 'films' : value;
  return (
    <div className="bb-client-ig-chips" role="tablist" aria-label="Content type">
      {CHIP_FILTERS.map(({ id, label, Icon }) => {
        const active = activeId === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`bb-client-ig-chip${active ? ' is-on' : ''}`}
            onClick={() => onChange?.(id)}
          >
            <Icon size={14} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** Client social shelf with Posts / Films / Verticals / Notes chip filters. */
export function ClientSocialShelf({
  posts = [],
  brandName = '',
  logoUrl = '',
  slug = '',
  emptyCta = null
}) {
  const [tab, setTab] = useState('posts');
  const [feedId, setFeedId] = useState('');
  const [videoWatchOpen, setVideoWatchOpen] = useState(false);

  const postsByKind = useMemo(() => {
    const next = { image: [], video: [], vertical: [], text: [] };
    for (const post of sortPosts(posts)) {
      const kind = getSocialPostKind(post);
      if (next[kind]) next[kind].push(post);
    }
    return next;
  }, [posts]);

  const activeTab = SOCIAL_PROFILE_TABS.find((item) => item.id === tab) || SOCIAL_PROFILE_TABS[0];
  const tabPosts = postsByKind[activeTab.kind] || [];
  const imagePosts = postsByKind.image || [];
  const displayBrand = brandName || posts[0]?._brandName || 'Business';
  const displayLogo = logoUrl || posts[0]?._logoUrl || '';
  const displaySlug = slug || posts[0]?._slug || '';

  const feedOpen =
    tab === 'posts' && Boolean(feedId) && imagePosts.some((post) => post.id === feedId);
  const hideTabs = feedOpen || (tab === 'verticals' && videoWatchOpen);

  const changeTab = (next) => {
    setFeedId('');
    setVideoWatchOpen(false);
    setTab(next === 'videos' ? 'films' : next);
  };

  if (!posts.length) {
    return (
      <div className="bb-client-social-shelf">
        <div className="bb-client-social-chips">
          <ContentTypeChips value={tab} onChange={changeTab} />
        </div>
        <div className="bb-client-empty-hero">
          <h2>Nothing here yet</h2>
          <p className="bb-muted">
            Follow a business or switch filters to find posts, films, verticals, and notes.
          </p>
          {emptyCta}
        </div>
      </div>
    );
  }

  return (
    <div className={`bb-client-social-shelf${hideTabs ? ' is-immersive' : ''}`}>
      {hideTabs ? null : (
        <div className="bb-client-social-chips">
          <ContentTypeChips value={tab} onChange={changeTab} />
        </div>
      )}

      <div className="bb-client-social-body">
        {feedOpen ? (
          <SocialPostFeed
            posts={imagePosts}
            initialPostId={feedId}
            editMode={false}
            brandName={displayBrand}
            logoUrl={displayLogo}
            slug={displaySlug}
            showPublishToggle={false}
            onBack={() => setFeedId('')}
          />
        ) : null}

        {!feedOpen && tab === 'posts' ? (
          <SocialPostsGrid
            posts={tabPosts}
            editMode={false}
            onOpenPost={(id) => setFeedId(id)}
            emptyLabel="No posts yet."
          />
        ) : null}

        {!feedOpen && (tab === 'films' || tab === 'videos') ? (
          <SocialVideosPanel
            posts={tabPosts}
            variant="films"
            editMode={false}
            showOwnerStats={false}
            brandName={displayBrand}
            logoUrl={displayLogo}
            onOpenVideo={() => setVideoWatchOpen(true)}
            onCloseVideo={() => setVideoWatchOpen(false)}
          />
        ) : null}

        {!feedOpen && tab === 'verticals' ? (
          <SocialVideosPanel
            posts={tabPosts}
            variant="verticals"
            editMode={false}
            showOwnerStats={false}
            brandName={displayBrand}
            logoUrl={displayLogo}
            onOpenVideo={() => setVideoWatchOpen(true)}
            onCloseVideo={() => setVideoWatchOpen(false)}
          />
        ) : null}

        {!feedOpen && tab === 'text' ? (
          <SocialTextTimeline
            posts={tabPosts}
            editMode={false}
            brandName={displayBrand}
            logoUrl={displayLogo}
            slug={displaySlug}
          />
        ) : null}
      </div>

      {!hideTabs && displaySlug ? (
        <div className="bb-client-social-foot">
          <button
            type="button"
            className="bb-client-text-btn"
            onClick={() => navigate(publicPagePath(displaySlug, 'social'))}
          >
            Open full social page
          </button>
        </div>
      ) : null}
    </div>
  );
}
