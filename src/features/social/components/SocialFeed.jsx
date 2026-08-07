import { useEffect, useMemo, useState } from 'react';
import { navigate, publicItemPath, publicPagePath } from '../../../app/routing';
import { PublicPageIntro } from '../../public-surface/PublicPageIntro';
import { getSocialPostKind } from '../utils/socialPostType';
import { SocialPostsGrid } from './SocialPostsGrid';
import { SocialPostFeed } from './SocialPostFeed';
import { SOCIAL_PROFILE_TABS, SocialProfileTabs } from './SocialProfileTabs';
import { SocialTextTimeline } from './SocialTextTimeline';
import { SocialVideosPanel } from './SocialVideosPanel';

function sortPosts(posts) {
  return [...posts].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0) || (b.createdAt || 0) - (a.createdAt || 0)
  );
}

function tabForKind(kind) {
  if (kind === 'video') return 'videos';
  if (kind === 'text') return 'text';
  return 'posts';
}

export function SocialFeed({
  workspace,
  itemId = '',
  preview = false,
  editMode = false,
  showDrafts = false,
  onUpdateWebsite,
  onUpdateSocialPost,
  onAddSocialPost
}) {
  const website = workspace.website || {};
  const slug = workspace.slug || '';
  const [tab, setTab] = useState('posts');
  const [localPostId, setLocalPostId] = useState('');

  const visiblePosts = useMemo(
    () =>
      sortPosts(
        (workspace.socialPosts || []).filter((post) =>
          editMode && showDrafts ? true : post.published !== false
        )
      ),
    [workspace.socialPosts, editMode, showDrafts]
  );

  const postsByKind = useMemo(() => {
    const next = { image: [], video: [], text: [] };
    for (const post of visiblePosts) {
      const kind = getSocialPostKind(post);
      if (next[kind]) next[kind].push(post);
    }
    return next;
  }, [visiblePosts]);

  const useLocalNav = preview || editMode;
  const routePostId = useLocalNav ? localPostId : String(itemId || '').trim();
  const routePost = visiblePosts.find((post) => post.id === routePostId) || null;
  const routeKind = routePost ? getSocialPostKind(routePost) : null;

  useEffect(() => {
    if (!routePost) return;
    setTab(tabForKind(routeKind));
  }, [routePost, routeKind]);

  const activeTab = SOCIAL_PROFILE_TABS.find((item) => item.id === tab) || SOCIAL_PROFILE_TABS[0];
  const tabPosts = postsByKind[activeTab.kind] || [];

  // Only photo posts use the Instagram-style vertical feed.
  const feedMode = Boolean(routePost && routeKind === 'image');
  const feedPosts = postsByKind.image || [];

  const openPost = (postId) => {
    if (useLocalNav) {
      setLocalPostId(postId);
      return;
    }
    navigate(publicItemPath(slug, 'social', postId));
  };

  const closeFeed = () => {
    if (useLocalNav) {
      setLocalPostId('');
      return;
    }
    navigate(publicPagePath(slug, 'social'));
  };

  const addForTab = () => {
    if (tab === 'videos') {
      onAddSocialPost?.({
        type: 'video',
        title: 'New video',
        caption: 'Describe this video…',
        mediaUrl: '',
        posterUrl: '',
        duration: '',
        published: false
      });
      return;
    }
    if (tab === 'text') {
      onAddSocialPost?.({
        type: 'text',
        title: '',
        caption: 'What’s happening?',
        published: false
      });
      return;
    }
    onAddSocialPost?.({
      type: 'image',
      caption: 'Write a caption…',
      mediaUrl: '',
      published: false
    });
  };

  const addLabel =
    tab === 'videos' ? 'Add video' : tab === 'text' ? 'Add text' : 'Add photo';

  if (feedMode) {
    return (
      <section className="bb-public-social bb-public-social--feed bb-public-gutter">
        <div className="bb-public-measure-wide">
          <SocialPostFeed
            posts={feedPosts}
            initialPostId={routePost.id}
            brandName={workspace.brandName}
            slug={slug}
            logoUrl={website.logoUrl || ''}
            editMode={editMode}
            onBack={closeFeed}
            onUpdateSocialPost={onUpdateSocialPost}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="bb-public-social bb-public-gutter">
      <div className="bb-public-measure-wide grid gap-5">
        <PublicPageIntro
          title={website.socialHeadline || 'Business Blog'}
          body={website.socialSubtext || ''}
          editMode={editMode}
          titlePlaceholder="Blog title"
          bodyPlaceholder="Blog supporting text"
          onTitleChange={(value) => onUpdateWebsite?.({ socialHeadline: value })}
          onBodyChange={(value) => onUpdateWebsite?.({ socialSubtext: value })}
        />

        <div className="bb-social-blog-head">
          {editMode ? (
            <div className="bb-social-profile-actions">
              <button type="button" className="bb-primary-btn" onClick={addForTab}>
                {addLabel}
              </button>
            </div>
          ) : null}
          <SocialProfileTabs value={tab} onChange={setTab} />
        </div>

        {tab === 'posts' ? (
          <SocialPostsGrid
            posts={tabPosts}
            editMode={editMode}
            onUpdateSocialPost={onUpdateSocialPost}
            onOpenPost={openPost}
            emptyLabel={editMode ? 'Add a photo to fill the grid.' : 'No photos published yet.'}
          />
        ) : null}
        {tab === 'videos' ? (
          <SocialVideosPanel
            posts={tabPosts}
            editMode={editMode}
            onUpdateSocialPost={onUpdateSocialPost}
            initialActiveId={routeKind === 'video' ? routePostId : ''}
          />
        ) : null}
        {tab === 'text' ? (
          <SocialTextTimeline
            posts={tabPosts}
            brandName={workspace.brandName}
            slug={slug}
            logoUrl={website.logoUrl || ''}
            editMode={editMode}
            onUpdateSocialPost={onUpdateSocialPost}
          />
        ) : null}
      </div>
    </section>
  );
}
