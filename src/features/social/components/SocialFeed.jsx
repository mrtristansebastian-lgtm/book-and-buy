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
  if (kind === 'video') return 'films';
  if (kind === 'vertical') return 'verticals';
  if (kind === 'text') return 'text';
  return 'posts';
}

export function SocialFeed({
  workspace,
  itemId = '',
  preview = false,
  editMode = false,
  showDrafts = false,
  embedded = false,
  publicMode = false,
  onUpdateWebsite,
  onUpdateSocialPost,
  onAddSocialPost
}) {
  const website = workspace.website || {};
  const slug = workspace.slug || '';
  const [tab, setTab] = useState('posts');
  const [feedId, setFeedId] = useState('');

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
    const next = { image: [], video: [], vertical: [], text: [] };
    for (const post of visiblePosts) {
      const kind = getSocialPostKind(post);
      if (next[kind]) next[kind].push(post);
    }
    return next;
  }, [visiblePosts]);

  const useLocalNav = preview || editMode;
  const routePostId = useLocalNav ? '' : String(itemId || '').trim();
  const routePost = visiblePosts.find((post) => post.id === routePostId) || null;
  const routeKind = routePost ? getSocialPostKind(routePost) : null;
  const imagePosts = postsByKind.image || [];

  useEffect(() => {
    if (!routePost) return;
    setTab(tabForKind(routeKind));
    if (routeKind === 'image') setFeedId(routePost.id);
  }, [routePost, routeKind]);

  const activeTab = SOCIAL_PROFILE_TABS.find((item) => item.id === tab) || SOCIAL_PROFILE_TABS[0];
  const tabPosts = postsByKind[activeTab.kind] || [];

  const openPost = (postId) => {
    setFeedId(postId);
    if (!useLocalNav) {
      navigate(publicItemPath(slug, 'social', postId));
    }
  };

  const closeFeed = () => {
    setFeedId('');
    if (!useLocalNav && itemId) {
      navigate(publicPagePath(slug, 'social'));
    }
  };

  const changeTab = (next) => {
    setFeedId('');
    setTab(next === 'videos' ? 'films' : next);
  };

  const openVideo = (postId) => {
    if (!useLocalNav) {
      navigate(publicItemPath(slug, 'social', postId));
    }
  };

  const closeVideo = () => {
    if (!useLocalNav && itemId) {
      navigate(publicPagePath(slug, 'social'));
    }
  };

  const addForTab = () => {
    if (tab === 'films' || tab === 'videos') {
      onAddSocialPost?.({
        type: 'video',
        title: 'New Film',
        caption: 'Describe this Film…',
        mediaUrl: '',
        posterUrl: '',
        duration: '',
        published: false
      });
      return;
    }
    if (tab === 'verticals') {
      onAddSocialPost?.({
        type: 'vertical',
        title: 'New Vertical',
        caption: 'Describe this Vertical…',
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
        title: 'New note',
        caption: 'Write your update…',
        published: false
      });
      return;
    }
    onAddSocialPost?.({
      type: 'image',
      title: 'New post',
      caption: 'Write a caption…',
      mediaUrl: '',
      published: false
    });
  };

  const addLabel =
    tab === 'films' || tab === 'videos'
      ? 'Add Film'
      : tab === 'verticals'
        ? 'Add Vertical'
        : tab === 'text'
          ? 'Add note'
          : 'Add photo';

  const feedOpen =
    tab === 'posts' && Boolean(feedId) && imagePosts.some((post) => post.id === feedId);

  return (
    <section
      className={`bb-public-social${embedded ? ' bb-public-social--embedded' : ''} bb-public-gutter`}
    >
      <div className="bb-public-measure-wide grid gap-5">
        {embedded || feedOpen ? null : (
          <PublicPageIntro
            title={website.socialHeadline || 'Social'}
            body={website.socialSubtext || ''}
            editMode={editMode}
            titlePlaceholder="Blog title"
            bodyPlaceholder="Blog supporting text"
            onTitleChange={(value) => onUpdateWebsite?.({ socialHeadline: value })}
            onBodyChange={(value) => onUpdateWebsite?.({ socialSubtext: value })}
          />
        )}

        {!feedOpen ? (
          <div className="bb-social-blog-head">
            {editMode ? (
              <div className="bb-social-profile-actions">
                <button type="button" className="bb-primary-btn" onClick={addForTab}>
                  {addLabel}
                </button>
              </div>
            ) : null}
            <SocialProfileTabs value={tab} onChange={changeTab} />
          </div>
        ) : null}

        {feedOpen ? (
          <SocialPostFeed
            posts={imagePosts}
            initialPostId={feedId}
            editMode={editMode}
            brandName={workspace.brandName || workspace.name || ''}
            logoUrl={website.logoUrl || ''}
            slug={slug}
            onBack={closeFeed}
            onUpdateSocialPost={onUpdateSocialPost}
          />
        ) : null}

        {!feedOpen && tab === 'posts' ? (
          <SocialPostsGrid
            posts={tabPosts}
            editMode={editMode}
            onUpdateSocialPost={onUpdateSocialPost}
            onOpenPost={openPost}
            emptyLabel={editMode ? 'Add a photo post to fill the gallery.' : 'No posts published yet.'}
          />
        ) : null}
        {!feedOpen && (tab === 'films' || tab === 'videos') ? (
          <SocialVideosPanel
            posts={tabPosts}
            variant="films"
            editMode={editMode}
            showOwnerStats={!publicMode}
            brandName={workspace.brandName || ''}
            logoUrl={website.logoUrl || ''}
            onUpdateSocialPost={onUpdateSocialPost}
            initialActiveId={routeKind === 'video' ? routePostId : ''}
            onOpenVideo={openVideo}
            onCloseVideo={closeVideo}
          />
        ) : null}
        {!feedOpen && tab === 'verticals' ? (
          <SocialVideosPanel
            posts={tabPosts}
            variant="verticals"
            editMode={editMode}
            showOwnerStats={!publicMode}
            brandName={workspace.brandName || ''}
            logoUrl={website.logoUrl || ''}
            onUpdateSocialPost={onUpdateSocialPost}
            initialActiveId={routeKind === 'vertical' ? routePostId : ''}
            onOpenVideo={openVideo}
            onCloseVideo={closeVideo}
          />
        ) : null}
        {!feedOpen && tab === 'text' ? (
          <SocialTextTimeline
            posts={tabPosts}
            editMode={editMode}
            brandName={workspace.brandName || workspace.name || ''}
            logoUrl={website.logoUrl || ''}
            slug={workspace.slug || ''}
            onUpdateSocialPost={onUpdateSocialPost}
          />
        ) : null}
      </div>
    </section>
  );
}
