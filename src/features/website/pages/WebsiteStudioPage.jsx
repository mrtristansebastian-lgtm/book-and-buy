import { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import {
  E_BUSINESS_PAGES,
  E_BUSINESS_PLATFORM_NAME,
  isPublicPageEnabled
} from '../../../config/eBusinessPlatform';
import { navigate, publicPagePath } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { PeriodSegmentedControl } from '../../../shared/ui/PeriodSegmentedControl';
import { DevicePreviewFrame } from '../components/DevicePreviewFrame';

export function WebsiteStudioPage() {
  const {
    workspace,
    updateWebsite,
    updateProfile,
    publishWebsite,
    updateSocialPost,
    addSocialPost
  } = useWorkspace();
  const website = workspace.website || {};
  const [surface, setSurface] = useState('home');
  const [device, setDevice] = useState('desktop');
  const [mode, setMode] = useState('view');
  const [savedFlash, setSavedFlash] = useState(false);
  const [publishNote, setPublishNote] = useState('');
  const [publishing, setPublishing] = useState(false);

  const editMode = mode === 'edit';

  const pageOptions = useMemo(
    () => E_BUSINESS_PAGES.map((page) => ({ id: page.id, label: page.label })),
    []
  );

  const publishFlash = async () => {
    if (publishing) return;
    setPublishing(true);
    try {
      const result = await publishWebsite();
      setSavedFlash(true);
      setPublishNote(
        result?.reason ||
          (result?.localOnly
            ? 'Published locally. Connect Firebase to sync the live slug.'
            : 'Published.')
      );
      window.setTimeout(() => setSavedFlash(false), 1800);
    } finally {
      setPublishing(false);
    }
  };

  const togglePage = (pageId) => {
    const enabled = isPublicPageEnabled(website.pages, pageId);
    updateWebsite({
      pages: {
        ...website.pages,
        [pageId]: !enabled,
        ...(pageId === 'buy' ? { shop: !enabled } : {})
      }
    });
  };

  return (
    <div className="bb-studio-canvas grid gap-4">
      <header className="bb-studio-toolbar bb-panel px-4 py-3 grid gap-3">
        <div className="bb-studio-toolbar-top">
          <div className="grid gap-1 min-w-0">
            <h1 className="bb-page-title text-2xl md:text-3xl m-0">{E_BUSINESS_PLATFORM_NAME}</h1>
            <p className="bb-muted m-0 text-sm">
              View to scroll. Edit to change copy and images on the page.
            </p>
          </div>
          <div className="bb-studio-actions">
            <button
              type="button"
              className="bb-studio-action bb-studio-action--ghost"
              onClick={() => navigate(publicPagePath(workspace.slug, surface))}
            >
              <ExternalLink size={14} strokeWidth={2.2} />
              Open live
            </button>
            <button
              type="button"
              className="bb-studio-action bb-studio-action--primary"
              disabled={publishing}
              onClick={publishFlash}
            >
              {publishing ? 'Publishing…' : savedFlash ? 'Published' : 'Publish'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PeriodSegmentedControl
            ariaLabel="Business Platforms page surface"
            value={surface}
            onChange={setSurface}
            options={pageOptions}
          />
          <PeriodSegmentedControl
            ariaLabel="Studio mode"
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
          <label className="flex items-center gap-2 text-sm font-semibold ml-auto">
            <input
              type="checkbox"
              checked={isPublicPageEnabled(website.pages, surface)}
              onChange={() => togglePage(surface)}
            />
            Page visible
          </label>
        </div>
      </header>

      {publishNote ? <p className="bb-muted m-0 text-xs px-1">{publishNote}</p> : null}

      <div className={`bb-studio-stage ${editMode ? 'is-edit' : 'is-view'}`}>
        {editMode ? (
          <p className="bb-studio-edit-hint">
            Edit mode — click text or images on the page to change them.
          </p>
        ) : null}
        <DevicePreviewFrame
          workspace={workspace}
          page={surface}
          device={device}
          editMode={editMode}
          onUpdateWebsite={updateWebsite}
          onUpdateProfile={updateProfile}
          onUpdateSocialPost={updateSocialPost}
          onAddSocialPost={addSocialPost}
          showDrafts={editMode && surface === 'social'}
        />
      </div>
    </div>
  );
}
