import { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { E_BUSINESS_PLATFORM_NAME } from '../../../config/eBusinessPlatform';
import { navigate, publicPagePath } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { PeriodSegmentedControl } from '../../../shared/ui/PeriodSegmentedControl';
import { getSocialPostKind } from '../utils/socialPostType';
import { SocialStudioCompose } from '../components/SocialStudioCompose';
import { SocialStudioLibrary } from '../components/SocialStudioLibrary';

const TABS = [
  { id: 'posts', label: 'Posts', kind: 'image' },
  { id: 'videos', label: 'Videos', kind: 'video' },
  { id: 'text', label: 'Text', kind: 'text' }
];

export function SocialStudioPage() {
  const { workspace, addSocialPost, updateSocialPost, removeSocialPost } = useWorkspace();
  const [tab, setTab] = useState('posts');

  const posts = workspace.socialPosts || [];

  const counts = useMemo(() => {
    const next = { image: 0, video: 0, text: 0 };
    for (const post of posts) {
      next[getSocialPostKind(post)] += 1;
    }
    return next;
  }, [posts]);

  const tabOptions = TABS.map((item) => ({
    id: item.id,
    label: item.label,
    count: counts[item.kind]
  }));

  return (
    <div className="bb-social-studio">
      <header className="bb-social-studio-header">
        <div className="bb-social-studio-header-row">
          <div className="grid gap-1 min-w-0">
            <p className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-black/35">
              {E_BUSINESS_PLATFORM_NAME}
            </p>
            <h1 className="bb-page-title text-2xl md:text-3xl m-0">Social</h1>
            <p className="bb-muted m-0 text-sm">
              Create posts, upload videos, and write text updates. Publish when you’re ready for the
              live Social page.
            </p>
          </div>
          <button
            type="button"
            className="bb-ghost-btn shrink-0"
            onClick={() => navigate(publicPagePath(workspace.slug, 'social'))}
          >
            <ExternalLink size={15} /> Open live
          </button>
        </div>

        <div className="bb-social-studio-tabs">
          <PeriodSegmentedControl
            ariaLabel="Social content type"
            value={tab}
            onChange={setTab}
            options={tabOptions}
          />
        </div>
      </header>

      <div className="bb-social-studio-body">
        <SocialStudioCompose
          tab={tab}
          brandName={workspace.brandName}
          onAddSocialPost={addSocialPost}
        />
        <SocialStudioLibrary
          tab={tab}
          posts={posts}
          brandName={workspace.brandName}
          onUpdateSocialPost={updateSocialPost}
          onRemoveSocialPost={removeSocialPost}
        />
      </div>
    </div>
  );
}
