import { useState } from 'react';
import { navigate, publicPagePath } from '../../../app/routing';
import { isPublicPageEnabled } from '../../../config/eBusinessPlatform';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { BlogComposerSheet } from '../components/BlogComposerSheet';
import { SocialStudioCompose } from '../components/SocialStudioCompose';
import { SocialStudioLibrary } from '../components/SocialStudioLibrary';
import { postTypeToTab } from '../utils/socialPostType';

export function SocialStudioPage() {
  const {
    workspace,
    addSocialPost,
    updateSocialPost,
    removeSocialPost,
    updateWebsite,
    updateProfile
  } = useWorkspace();
  const [tab, setTab] = useState('posts');
  const [composer, setComposer] = useState(null);

  const posts = workspace.socialPosts || [];
  const website = workspace.website || {};
  const businessName = workspace.brandName || workspace.name || '';
  const socialVisible = isPublicPageEnabled(website.pages, 'social');

  const openCreate = (kind) => {
    setTab(kind);
    setComposer({ mode: 'create', kind });
  };

  const openEdit = (post) => {
    const kind = postTypeToTab(post?.type);
    setTab(kind);
    setComposer({ mode: 'edit', kind, post });
  };

  const closeComposer = () => setComposer(null);

  const openLive = () => navigate(publicPagePath(workspace.slug, 'social'));

  const toggleSocialVisible = () => {
    updateWebsite({
      pages: {
        ...website.pages,
        social: !socialVisible
      }
    });
  };

  return (
    <div className="bb-social-studio">
      <header className="bb-social-studio-header">
        <div className="bb-social-studio-header-row">
          <div className="bb-social-studio-header-copy">
            <div className="bb-page-title-wrap">
              <div className="bb-page-header-glow" aria-hidden="true" />
              <h1 className="bb-page-title bb-social-studio-title">Social Studio</h1>
            </div>
            <p className="bb-muted m-0 text-sm">
              Compose posts and control whether Social appears on your public site.
            </p>
          </div>
          <label className="bb-studio-visible-toggle bb-social-studio-visible">
            <input
              type="checkbox"
              checked={socialVisible}
              onChange={toggleSocialVisible}
            />
            Page visible
          </label>
        </div>
      </header>

      <div className="bb-social-studio-body">
        <div className="bb-social-studio-live">
          <SocialStudioCompose
            brandName={businessName}
            slug={workspace.slug || ''}
            logoUrl={website.logoUrl || ''}
            bannerUrl={website.socialBannerUrl || ''}
            bio={
              website.homeSubtext ||
              website.subcopy ||
              website.socialSubtext ||
              ''
            }
            category={website.profileCategory || ''}
            location={website.profileLocation || ''}
            onUpdateWebsite={updateWebsite}
            onUpdateProfile={updateProfile}
            onOpenCreate={openCreate}
            onOpenLive={openLive}
          />
          <SocialStudioLibrary
            tab={tab}
            onTabChange={setTab}
            posts={posts}
            onEditPost={openEdit}
            onRemoveSocialPost={removeSocialPost}
            onUpdateSocialPost={updateSocialPost}
            onCreate={openCreate}
          />
        </div>
      </div>

      {composer ? (
        <BlogComposerSheet
          kind={composer.kind}
          post={composer.mode === 'edit' ? composer.post : null}
          businessName={businessName}
          onClose={closeComposer}
          onAddSocialPost={addSocialPost}
          onUpdateSocialPost={updateSocialPost}
          onRemoveSocialPost={removeSocialPost}
        />
      ) : null}
    </div>
  );
}
