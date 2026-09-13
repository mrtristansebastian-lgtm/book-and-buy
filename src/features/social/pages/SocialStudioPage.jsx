import { ExternalLink, Radio } from 'lucide-react';
import { useState } from 'react';
import { navigate, publicPagePath } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { BlogComposerSheet } from '../components/BlogComposerSheet';
import { SocialStudioCompose } from '../components/SocialStudioCompose';
import { SocialStudioLibrary } from '../components/SocialStudioLibrary';
import { postTypeToTab } from '../utils/socialPostType';

export function SocialStudioPage() {
  const { workspace, addSocialPost, updateSocialPost, removeSocialPost } = useWorkspace();
  const [tab, setTab] = useState('posts');
  const [composer, setComposer] = useState(null);

  const posts = workspace.socialPosts || [];
  const businessName = workspace.brandName || workspace.name || '';

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

  return (
    <div className="bb-social-studio">
      <header className="bb-social-studio-header">
        <div className="bb-social-studio-header-row">
          <div className="bb-social-studio-header-copy">
            <div className="bb-page-title-wrap">
              <div className="bb-page-header-glow" aria-hidden="true" />
              <h1 className="bb-page-title bb-social-studio-title">Content</h1>
            </div>
          </div>
          <button
            type="button"
            className="bb-ghost-btn bb-social-studio-live-btn shrink-0"
            onClick={() => navigate(publicPagePath(workspace.slug, 'social'))}
          >
            <Radio size={14} strokeWidth={2.2} />
            Open live
            <ExternalLink size={13} strokeWidth={2.2} />
          </button>
        </div>
      </header>

      <div className="bb-social-studio-body">
        <SocialStudioCompose onOpenCreate={openCreate} />
        <SocialStudioLibrary
          tab={tab}
          onTabChange={setTab}
          posts={posts}
          onEditPost={openEdit}
          onCreate={openCreate}
        />
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
