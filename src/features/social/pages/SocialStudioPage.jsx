import { useState } from 'react';
import { ExternalLink, Radio } from 'lucide-react';
import { E_BUSINESS_PLATFORM_NAME } from '../../../config/eBusinessPlatform';
import { navigate, publicPagePath } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { SocialProfileTabs } from '../components/SocialProfileTabs';
import { SocialStudioCompose } from '../components/SocialStudioCompose';
import { SocialStudioLibrary } from '../components/SocialStudioLibrary';

export function SocialStudioPage() {
  const { workspace, addSocialPost, updateSocialPost, removeSocialPost } = useWorkspace();
  const [tab, setTab] = useState('posts');

  const posts = workspace.socialPosts || [];

  return (
    <div className="bb-social-studio">
      <header className="bb-social-studio-header">
        <div className="bb-social-studio-header-row">
          <div className="bb-social-studio-header-copy">
            <p className="bb-social-studio-eyebrow">
              {E_BUSINESS_PLATFORM_NAME} · Studio
            </p>
            <h1 className="bb-social-studio-title">Business Blog</h1>
            <p className="bb-social-studio-lede">
              Publish above. What you see below is exactly what customers see live.
            </p>
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

        <div className="bb-social-studio-tabs">
          <SocialProfileTabs value={tab} onChange={setTab} />
        </div>
      </header>

      <div className="bb-social-studio-body">
        <SocialStudioCompose tab={tab} onAddSocialPost={addSocialPost} />
        <SocialStudioLibrary
          tab={tab}
          posts={posts}
          onUpdateSocialPost={updateSocialPost}
          onRemoveSocialPost={removeSocialPost}
        />
      </div>
    </div>
  );
}
