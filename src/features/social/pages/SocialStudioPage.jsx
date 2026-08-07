import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { E_BUSINESS_PLATFORM_NAME } from '../../../config/eBusinessPlatform';
import { navigate, publicPagePath } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { PeriodSegmentedControl } from '../../../shared/ui/PeriodSegmentedControl';
import { DevicePreviewFrame } from '../../website/components/DevicePreviewFrame';

export function SocialStudioPage() {
  const { workspace, updateWebsite, updateSocialPost, addSocialPost } = useWorkspace();
  const [mode, setMode] = useState('edit');
  const [device, setDevice] = useState('phone');

  return (
    <div className="bb-studio-canvas grid gap-4">
      <header className="bb-studio-toolbar bb-panel px-4 py-3 grid gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid gap-1">
            <p className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-black/35">
              {E_BUSINESS_PLATFORM_NAME}
            </p>
            <h1 className="bb-page-title text-2xl md:text-3xl m-0">Social</h1>
            <p className="bb-muted m-0 text-sm">
              Edit posts on the public Social page. Drafts stay off the live feed until published.
            </p>
          </div>
          <button
            type="button"
            className="bb-ghost-btn"
            onClick={() => navigate(publicPagePath(workspace.slug, 'social'))}
          >
            <ExternalLink size={15} /> Open live
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          <PeriodSegmentedControl
            ariaLabel="Social studio mode"
            value={mode}
            onChange={setMode}
            options={[
              { id: 'view', label: 'View' },
              { id: 'edit', label: 'Edit' }
            ]}
          />
          <PeriodSegmentedControl
            ariaLabel="Preview device"
            value={device}
            onChange={setDevice}
            options={[
              { id: 'phone', label: 'Phone' },
              { id: 'desktop', label: 'Desktop' }
            ]}
          />
        </div>
      </header>

      <div className={`bb-studio-stage ${mode === 'edit' ? 'is-edit' : 'is-view'}`}>
        <DevicePreviewFrame
          workspace={workspace}
          page="social"
          device={device}
          editMode={mode === 'edit'}
          onUpdateWebsite={updateWebsite}
          onUpdateSocialPost={updateSocialPost}
          onAddSocialPost={addSocialPost}
          showDrafts={mode === 'edit'}
        />
      </div>
    </div>
  );
}
