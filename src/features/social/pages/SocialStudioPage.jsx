import { useState } from 'react';
import { navigate, publicPagePath } from '../../../app/routing';
import { isPublicPageEnabled } from '../../../config/eBusinessPlatform';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { BlogComposerSheet } from '../components/BlogComposerSheet';
import { SocialStudioCompose } from '../components/SocialStudioCompose';
import { SocialStudioLibrary } from '../components/SocialStudioLibrary';

export function SocialStudioPage() {
  const {
    workspace,
    addSocialPost,
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
            categoryId={website.categoryId || ''}
            location={website.profileLocation || ''}
            pageVisible={socialVisible}
            onTogglePageVisible={toggleSocialVisible}
            onUpdateWebsite={updateWebsite}
            onUpdateProfile={updateProfile}
            onOpenCreate={openCreate}
            onOpenLive={openLive}
          />
          <SocialStudioLibrary
            tab={tab}
            onTabChange={setTab}
            posts={posts}
            onRemoveSocialPost={removeSocialPost}
            onCreate={openCreate}
          />
        </div>
      </div>

      {composer ? (
        <BlogComposerSheet
          kind={composer.kind}
          post={null}
          businessName={businessName}
          onClose={closeComposer}
          onAddSocialPost={addSocialPost}
          onRemoveSocialPost={removeSocialPost}
        />
      ) : null}
    </div>
  );
}
