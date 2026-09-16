import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import {
  isEBusinessPreviewOnlyPage,
  isHomePageAlwaysVisible,
  isPublicPageEnabled
} from '../../../config/eBusinessPlatform';
import { LAUNCHER_TAB } from '../../../config/appLauncher';
import { navigate, publicPagePath } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { PeriodSegmentedControl } from '../../../shared/ui/PeriodSegmentedControl';
import { DevicePreviewFrame } from '../components/DevicePreviewFrame';

function countActiveOffers(items = []) {
  return (items || []).filter((item) => item && item.active !== false).length;
}

function useIsMobileStudio() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 899px)').matches
      : false
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 899px)');
    const onChange = () => setMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return mobile;
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
  const isMobile = useIsMobileStudio();
  const [stepSurface, setStepSurface] = useState(
    stepOptions?.[0]?.id || fixedSurface || 'home'
  );
  const [device, setDevice] = useState('desktop');
  const [mode, setMode] = useState('view');
  const [savedFlash, setSavedFlash] = useState(false);
  const [publishNote, setPublishNote] = useState('');
  const [publishing, setPublishing] = useState(false);

  const surface = stepOptions ? stepSurface : fixedSurface;
  const editMode = mode === 'edit';
  const previewOnlySurface = isEBusinessPreviewOnlyPage(surface);
  const homeLocked = isHomePageAlwaysVisible(surface);
  const livePage = openLivePage || (previewOnlySurface ? 'buy' : surface);
  const pageVisible = isPublicPageEnabled(website.pages, surface);
  const previewDevice = isMobile ? 'phone' : device;
  const serviceCount = countActiveOffers(workspace.services);
  const productCount = countActiveOffers(workspace.products);
  const emptyCatalogHint =
    pageVisible && surface === 'book' && serviceCount === 0
      ? 'No services yet — page will look empty to customers.'
      : pageVisible && surface === 'buy' && productCount === 0
        ? 'No products yet — page will look empty to customers.'
        : '';

  useEffect(() => {
    if (isMobile) setDevice('phone');
  }, [isMobile]);

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

  const canToggleVisibility =
    showPageVisible && !previewOnlySurface && !homeLocked;

  const onPublishAction = async () => {
    if (canToggleVisibility && !pageVisible) {
      togglePage(surface);
      setPublishNote('Page is now live for customers.');
      return;
    }
    await publishFlash();
  };

  const publishLabel = publishing
    ? 'Publishing…'
    : savedFlash
      ? 'Published'
      : canToggleVisibility && !pageVisible
        ? 'Unpublished'
        : 'Publish live';

  return (
    <div className={`bb-studio-canvas${isMobile ? ' is-mobile' : ''}`}>
      <header className="bb-studio-toolbar">
        <div className="bb-studio-toolbar-top">
          <div className="bb-studio-toolbar-copy min-w-0">
            {isMobile ? (
              <button
                type="button"
                className="bb-studio-back"
                aria-label="Back to Home"
                onClick={() => navigate(`/dashboard/${LAUNCHER_TAB}`)}
              >
                <ArrowLeft size={18} strokeWidth={2.4} />
              </button>
            ) : null}
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
              className={`bb-studio-action bb-studio-action--primary${
                canToggleVisibility && !pageVisible ? ' is-unpublished' : ''
              }`}
              disabled={publishing}
              onClick={onPublishAction}
            >
              {publishLabel}
            </button>
          </div>
        </div>

        <div className="bb-studio-controls">
          {stepOptions && !isMobile ? (
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
          {!isMobile ? (
            <PeriodSegmentedControl
              ariaLabel="Preview device"
              value={device}
              onChange={setDevice}
              options={[
                { id: 'phone', label: 'Phone' },
                { id: 'desktop', label: 'Desktop' }
              ]}
            />
          ) : null}
          {isMobile ? null : previewOnlySurface || !showPageVisible ? (
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
          device={previewDevice}
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
