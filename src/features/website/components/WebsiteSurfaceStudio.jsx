import { useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import {
  isEBusinessPreviewOnlyPage,
  isHomePageAlwaysVisible,
  isPublicPageEnabled
} from '../../../config/eBusinessPlatform';
import { navigate, publicPagePath } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { PeriodSegmentedControl } from '../../../shared/ui/PeriodSegmentedControl';
import { DevicePreviewFrame } from '../components/DevicePreviewFrame';

function countActiveOffers(items = []) {
  return (items || []).filter((item) => item && item.active !== false).length;
}

/**
 * Shared flush studio for a single public surface (or checkout steps).
 */
export function WebsiteSurfaceStudio({
  surface: fixedSurface,
  title,
  lede = 'View to scroll. Edit to change copy and images on the page.',
  stepOptions = null,
  openLivePage = null,
  showPageVisible = true
}) {
  const {
    workspace,
    updateWebsite,
    updateProfile,
    publishWebsite,
    updateSocialPost,
    addSocialPost
  } = useWorkspace();
  const website = workspace.website || {};
  const [stepSurface, setStepSurface] = useState(
    stepOptions?.[0]?.id || fixedSurface || 'home'
  );
  const [device, setDevice] = useState('desktop');
  const [mode, setMode] = useState('view');
  const [savedFlash, setSavedFlash] = useState(false);
  const [publishNote, setPublishNote] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);

  const surface = stepOptions ? stepSurface : fixedSurface;
  const editMode = mode === 'edit';
  const previewOnlySurface = isEBusinessPreviewOnlyPage(surface);
  const homeLocked = isHomePageAlwaysVisible(surface);
  const livePage = openLivePage || (previewOnlySurface ? 'buy' : surface);
  const activeStepLabel =
    stepOptions?.find((step) => step.id === surface)?.label || title;
  const pageVisible = isPublicPageEnabled(website.pages, surface);
  const serviceCount = countActiveOffers(workspace.services);
  const productCount = countActiveOffers(workspace.products);
  const emptyCatalogHint =
    pageVisible && surface === 'book' && serviceCount === 0
      ? 'No services yet — page will look empty to customers.'
      : pageVisible && surface === 'buy' && productCount === 0
        ? 'No products yet — page will look empty to customers.'
        : '';

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
    if (isEBusinessPreviewOnlyPage(pageId) || isHomePageAlwaysVisible(pageId)) return;
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
    <div className="bb-studio-canvas">
      <header className={`bb-studio-toolbar${controlsOpen ? ' is-controls-open' : ''}`}>
        <div className="bb-studio-toolbar-top">
          <div className="bb-studio-toolbar-copy min-w-0">
            <div className="bb-page-title-wrap">
              <div className="bb-page-header-glow" aria-hidden="true" />
              <h1 className="bb-page-title m-0">{title}</h1>
            </div>
            <p className="bb-muted m-0 text-sm bb-studio-toolbar-lede">{lede}</p>
          </div>
          <div className="bb-studio-actions">
            <button
              type="button"
              className="bb-studio-action bb-studio-action--ghost"
              onClick={() => navigate(publicPagePath(workspace.slug, livePage))}
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

        <button
          type="button"
          className="bb-studio-controls-toggle"
          aria-expanded={controlsOpen}
          onClick={() => setControlsOpen((open) => !open)}
        >
          <span>
            {activeStepLabel}
            <span className="bb-studio-controls-toggle-meta">
              · {mode === 'edit' ? 'Edit' : 'View'} · {device === 'phone' ? 'Phone' : 'Desktop'}
            </span>
          </span>
          <ChevronDown size={16} strokeWidth={2.2} aria-hidden="true" />
        </button>

        <div className="bb-studio-controls">
          {stepOptions ? (
            <PeriodSegmentedControl
              ariaLabel="Checkout flow step"
              value={surface}
              onChange={setStepSurface}
              options={stepOptions}
            />
          ) : null}
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
          {previewOnlySurface || !showPageVisible ? (
            previewOnlySurface ? (
              <p className="bb-muted m-0 text-xs bb-studio-visible-toggle">
                Checkout mockup — studio preview only
              </p>
            ) : null
          ) : homeLocked ? (
            <p className="bb-muted m-0 text-xs bb-studio-visible-toggle">Always visible</p>
          ) : (
            <div className="bb-studio-visible-block">
              <label className="bb-studio-visible-toggle">
                <input
                  type="checkbox"
                  checked={pageVisible}
                  onChange={() => togglePage(surface)}
                />
                Page visible
              </label>
              {emptyCatalogHint ? (
                <p className="bb-muted m-0 text-xs bb-studio-visible-hint">{emptyCatalogHint}</p>
              ) : null}
            </div>
          )}
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
          showDrafts={false}
        />
      </div>
    </div>
  );
}
