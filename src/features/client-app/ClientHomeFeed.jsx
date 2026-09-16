import { useEffect, useMemo, useState } from 'react';
import { Clapperboard, Grid3X3, MessageCircle, PenLine, RectangleVertical } from 'lucide-react';
import { navigate, publicPagePath } from '../../app/routing';
import {
  formatNoteStamp,
  getPostMediaItems,
  getSocialPostKind
} from '../social/utils/socialPostType';
import { SocialVideosPanel } from '../social/components/SocialVideosPanel';
import { SocialTextTimeline } from '../social/components/SocialTextTimeline';
import { SocialPostFeed } from '../social/components/SocialPostFeed';
import { VerticalWatchPage } from '../social/components/VerticalWatchPage';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { useClientProfile } from './ClientProfileContext';
import { ClientEngagementBar } from './ClientEngagementBar';
import { startClientMessage } from './startClientMessage';

const CHIP_FILTERS = [
  { id: 'posts', label: 'Posts', kind: 'image', Icon: Grid3X3 },
  { id: 'films', label: 'Films', kind: 'video', Icon: Clapperboard },
  { id: 'verticals', label: 'Verticals', kind: 'vertical', Icon: RectangleVertical },
  { id: 'text', label: 'Notes', kind: 'text', Icon: PenLine }
];

function FeedMedia({ post }) {
  const media = getPostMediaItems(post);
  const first = media[0];
  const src = first?.url || post.mediaUrl || '';
  return (
    <div className="bb-client-home-photo">
      {src ? <img src={src} alt="" /> : <div className="bb-client-home-media-empty">No photo</div>}
    </div>
  );
}

/** Detail card used from Explore — Home Posts use SocialPostFeed. */
export function FeedCard({ post, onClose = null }) {
  const { profile, followSlug, unfollowSlug } = useClientProfile();
  const { workspace, startThreadFromClient } = useWorkspace();
  const slug = post._slug || '';
  const brand = post._brandName || 'Business';
  const logo = post._logoUrl || '';
  const followed = (profile?.followedSlugs || []).includes(slug);
  const stamp = formatNoteStamp(post.createdAt);
  const initial = brand.charAt(0).toUpperCase() || 'B';
  const [messaging, setMessaging] = useState(false);

  const messageBiz = async () => {
    setMessaging(true);
    try {
      await startClientMessage({
        profile,
        followSlug,
        workspace: slug === workspace?.slug ? workspace : { ...workspace, slug },
        startThreadFromClient,
        ownerId: workspace?.ownerId || workspace?.id || '',
        slug,
        brandName: brand,
        logoUrl: logo
      });
    } finally {
      setMessaging(false);
    }
  };

  return (
    <article className="bb-client-home-card">
      {onClose ? (
        <button type="button" className="bb-client-ig-back bb-client-home-back" onClick={onClose}>
          ← Back
        </button>
      ) : null}
      <header className="bb-client-home-card-head">
        <button
          type="button"
          className="bb-client-home-author"
          onClick={() => navigate(publicPagePath(slug, 'social'))}
        >
          {logo ? (
            <img src={logo} alt="" className="bb-client-home-avatar" />
          ) : (
            <span className="bb-client-home-avatar is-fallback" aria-hidden="true">
              {initial}
            </span>
          )}
          <span>
            <strong>{brand}</strong>
            <span className="bb-muted">@{slug || 'business'}</span>
          </span>
        </button>
        <div className="bb-client-home-head-actions">
          <button
            type="button"
            className="bb-client-home-message"
            aria-label={`Message ${brand}`}
            disabled={messaging}
            onClick={messageBiz}
          >
            <MessageCircle size={16} />
          </button>
          <button
            type="button"
            className={`bb-client-home-follow${followed ? ' is-on' : ''}`}
            onClick={() => (followed ? unfollowSlug(slug) : followSlug(slug))}
          >
            {followed ? 'Following' : 'Follow'}
          </button>
        </div>
      </header>

      <FeedMedia post={post} />

      <ClientEngagementBar post={post} slug={slug} brandName={brand} variant="pulse" />

      {post.title || post.caption ? (
        <div className="bb-client-home-caption">
          {post.title ? <p className="bb-client-home-title">{post.title}</p> : null}
          {post.caption ? (
            <p className="m-0">
              <strong>{brand}</strong> {post.caption}
            </p>
          ) : null}
        </div>
      ) : null}

      {stamp ? <time className="bb-client-home-stamp">{stamp}</time> : null}
    </article>
  );
}

function watchBrand(posts, fallback = 'Business') {
  return posts[0]?._brandName || fallback;
}

function watchLogo(posts) {
  return posts[0]?._logoUrl || '';
}

function filmWatchActions(post) {
  return (
    <ClientEngagementBar
      post={post}
      slug={post._slug || ''}
      brandName={post._brandName || ''}
      variant="youtube"
    />
  );
}

function verticalWatchActions(post) {
  return (
    <ClientEngagementBar
      post={post}
      slug={post._slug || ''}
      brandName={post._brandName || ''}
      variant="tiktok"
    />
  );
}

function noteActions(post) {
  return (
    <ClientEngagementBar
      post={post}
      slug={post._slug || ''}
      brandName={post._brandName || ''}
      variant="twitter"
    />
  );
}

function postFeedActions(post) {
  return (
    <ClientEngagementBar
      post={post}
      slug={post._slug || ''}
      brandName={post._brandName || ''}
      variant="pulse"
    />
  );
}

/** Home: Posts IG single feed · Films YT · Verticals TikTok · Notes Twitter. */
export function ClientHomeFeed({ posts = [], emptyCta = null }) {
  const [filter, setFilter] = useState('posts');
  const [activeVerticalId, setActiveVerticalId] = useState('');
  const active = CHIP_FILTERS.find((item) => item.id === filter) || CHIP_FILTERS[0];

  const visible = useMemo(
    () =>
      [...posts]
        .filter((post) => getSocialPostKind(post) === active.kind)
        .sort((a, b) => (b.createdAt || b.at || 0) - (a.createdAt || a.at || 0)),
    [posts, active.kind]
  );

  useEffect(() => {
    if (filter !== 'verticals') {
      setActiveVerticalId('');
      return;
    }
    if (!visible.length) {
      setActiveVerticalId('');
      return;
    }
    setActiveVerticalId((prev) =>
      visible.some((post) => post.id === prev) ? prev : visible[0].id
    );
  }, [filter, visible]);

  const activeVertical =
    visible.find((post) => post.id === activeVerticalId) || visible[0] || null;
  const verticalOpen = filter === 'verticals' && Boolean(activeVertical);

  useEffect(() => {
    if (!verticalOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [verticalOpen]);

  const exitVerticals = () => {
    setFilter('posts');
    setActiveVerticalId('');
  };

  return (
    <div
      className={`bb-client-home-feed${verticalOpen ? ' is-vertical-open' : ''}${
        filter === 'films' ? ' is-films' : ''
      }${filter === 'text' ? ' is-notes' : ''}${filter === 'posts' ? ' is-posts' : ''}`}
    >
      {verticalOpen ? null : (
        <div className="bb-client-social-chips">
          <div className="bb-client-ig-chips" role="tablist" aria-label="Content type">
            {CHIP_FILTERS.map(({ id, label, Icon }) => {
              const on = filter === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  className={`bb-client-ig-chip${on ? ' is-on' : ''}`}
                  onClick={() => setFilter(id)}
                >
                  <Icon size={14} strokeWidth={on ? 2.4 : 2} aria-hidden="true" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="bb-client-empty-hero">
          <h2>Nothing in this feed</h2>
          <p className="bb-muted">Switch filters or follow more businesses in Explore.</p>
          {emptyCta}
        </div>
      ) : filter === 'films' ? (
        <div className="bb-client-home-yt">
          <SocialVideosPanel
            posts={visible}
            variant="films"
            editMode={false}
            showOwnerStats={false}
            brandName={watchBrand(visible)}
            logoUrl={watchLogo(visible)}
            renderWatchActions={filmWatchActions}
          />
        </div>
      ) : filter === 'verticals' && activeVertical ? (
        <div className="bb-client-vertical-page" role="dialog" aria-modal="true" aria-label="Verticals">
          <VerticalWatchPage
            post={activeVertical}
            posts={visible}
            brandName={activeVertical._brandName || watchBrand(visible)}
            logoUrl={activeVertical._logoUrl || watchLogo(visible)}
            editMode={false}
            onClose={exitVerticals}
            onChangeActive={setActiveVerticalId}
            renderRailActions={verticalWatchActions}
          />
        </div>
      ) : filter === 'text' ? (
        <div className="bb-client-home-notes">
          <SocialTextTimeline
            posts={visible}
            brandName={watchBrand(visible)}
            logoUrl={watchLogo(visible)}
            slug={visible[0]?._slug || ''}
            editMode={false}
            renderActions={noteActions}
          />
        </div>
      ) : (
        <div className="bb-client-home-live-feed">
          <SocialPostFeed
            posts={visible}
            brandName={watchBrand(visible)}
            slug={visible[0]?._slug || ''}
            logoUrl={watchLogo(visible)}
            editMode={false}
            hideToolbar
            renderPostActions={postFeedActions}
          />
        </div>
      )}
    </div>
  );
}
