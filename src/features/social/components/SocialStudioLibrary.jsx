import { useMemo, useState } from 'react';
import { ImagePlus, Clapperboard, RectangleVertical, PenLine } from 'lucide-react';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { getSocialPostKind } from '../utils/socialPostType';
import { SocialPostsGrid } from './SocialPostsGrid';
import { SocialPostFeed } from './SocialPostFeed';
import { SocialProfileTabs } from './SocialProfileTabs';
import { SocialTextTimeline } from './SocialTextTimeline';
import { SocialVideosPanel } from './SocialVideosPanel';
import { ClientEngagementBar } from '../../client-app/ClientEngagementBar';

function tabKind(tab) {
  if (tab === 'videos' || tab === 'films') return 'video';
  if (tab === 'verticals') return 'vertical';
  if (tab === 'text') return 'text';
  return 'image';
}

/**
 * Studio library — live Social layouts with ⋯ manage menus on each item.
 * Photo posts open into an Instagram-style scrollable feed (not a lightbox).
 */
export function SocialStudioLibrary({
  tab,
  onTabChange,
  posts,
  onEditPost,
  onRemoveSocialPost,
  onUpdateSocialPost,
  onCreate
}) {
  const { workspace } = useWorkspace();
  const website = workspace.website || {};
  const [feedId, setFeedId] = useState('');

  const kind = tabKind(tab);

  const items = useMemo(
    () =>
      posts.filter(
        (post) => getSocialPostKind(post) === kind && post.published !== false
      ),
    [posts, kind]
  );

  const emptyCopy =
    kind === 'video'
      ? 'Nothing live yet — publish a Film above.'
      : kind === 'vertical'
        ? 'Nothing live yet — publish a Vertical above.'
        : kind === 'text'
          ? 'Nothing live yet — publish a note above.'
          : 'Nothing live yet — publish a photo above.';

  const createLabel =
    kind === 'video'
      ? 'New Film'
      : kind === 'vertical'
        ? 'New Vertical'
        : kind === 'text'
          ? 'New note'
          : 'New post';

  const feedOpen =
    tab === 'posts' && Boolean(feedId) && items.some((post) => post.id === feedId);

  const closeFeed = () => setFeedId('');

  const changeTab = (next) => {
    setFeedId('');
    onTabChange?.(next);
  };

  const manageProps = {
    onEditPost,
    onRemoveSocialPost,
    onUpdateSocialPost,
    showPublishToggle: Boolean(onUpdateSocialPost)
  };

  const emptyIcon =
    kind === 'video'
      ? Clapperboard
      : kind === 'vertical'
        ? RectangleVertical
        : kind === 'text'
          ? PenLine
          : ImagePlus;

  const emptyTitle =
    kind === 'video'
      ? 'No films yet'
      : kind === 'vertical'
        ? 'No verticals yet'
        : kind === 'text'
          ? 'No notes yet'
          : 'No posts yet';

  return (
    <section className={`bb-social-library bb-social-library--live${items.length ? '' : ' is-empty'}`}>
      {!feedOpen ? (
        <div className="bb-social-library-tabs">
          <SocialProfileTabs value={tab} onChange={changeTab} />
        </div>
      ) : null}

      <div className="bb-social-library-surface bb-social-library-surface--live">
        {feedOpen ? (
          <SocialPostFeed
            posts={items}
            initialPostId={feedId}
            brandName={workspace.brandName || workspace.name || ''}
            logoUrl={website.logoUrl || ''}
            slug={workspace.slug || ''}
            onBack={closeFeed}
            renderPostActions={(post) => (
              <ClientEngagementBar
                post={post}
                slug={workspace.slug || ''}
                brandName={workspace.brandName || workspace.name || ''}
                variant="pulse"
              />
            )}
            {...manageProps}
          />
        ) : !items.length ? (
          <EmptyState
            className="bb-social-library-empty"
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyCopy}
            action={
              onCreate ? (
                <button
                  type="button"
                  className="bb-primary-btn"
                  onClick={() => onCreate(tab === 'videos' ? 'films' : tab)}
                >
                  {createLabel}
                </button>
              ) : null
            }
          />
        ) : kind === 'image' ? (
          <SocialPostsGrid
            posts={items}
            onOpenPost={setFeedId}
            emptyLabel={emptyCopy}
          />
        ) : kind === 'video' ? (
          <SocialVideosPanel
            posts={items}
            variant="films"
            showOwnerStats
            brandName={workspace.brandName || workspace.name || ''}
            logoUrl={website.logoUrl || ''}
            renderWatchActions={(post, description) => (
              <ClientEngagementBar
                post={post}
                slug={workspace.slug || ''}
                brandName={workspace.brandName || workspace.name || ''}
                variant="youtube"
              >
                {description}
              </ClientEngagementBar>
            )}
            {...manageProps}
          />
        ) : kind === 'vertical' ? (
          <SocialVideosPanel
            posts={items}
            variant="verticals"
            showOwnerStats
            brandName={workspace.brandName || workspace.name || ''}
            logoUrl={website.logoUrl || ''}
            renderWatchActions={(post) => (
              <ClientEngagementBar
                post={post}
                slug={workspace.slug || ''}
                brandName={workspace.brandName || workspace.name || ''}
                variant="tiktok"
              />
            )}
            {...manageProps}
          />
        ) : (
          <SocialTextTimeline
            posts={items}
            brandName={workspace.brandName || workspace.name || ''}
            logoUrl={website.logoUrl || ''}
            slug={workspace.slug || ''}
            renderActions={(post) => (
              <ClientEngagementBar
                post={post}
                slug={workspace.slug || ''}
                brandName={workspace.brandName || workspace.name || ''}
                variant="twitter"
              />
            )}
            {...manageProps}
          />
        )}
      </div>
    </section>
  );
}
