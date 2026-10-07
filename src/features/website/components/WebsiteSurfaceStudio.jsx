import { Button } from '../../../shared/ui/Button';
import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import {
  isEBusinessPreviewOnlyPage,
  isHomePageAlwaysVisible,
  isPublicPageEnabled
} from '../../../config/eBusinessPlatform';
import { navigate, publicPagePath } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { PageBackButton } from '../../../shared/ui/PageBackButton';
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
  compact = false,
  lede = 'View to scroll. Edit to change copy and images on the page.',
  stepOptions = null,
  openLivePage = null,
  showPageVisible = true
}) {
  const {
    workspace,
    saveStatus, saveError, retrySave,
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
  const [savedLocally, setSavedLocally] = useState(false);
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
      ? 'Add a service to make Book available to customers.'
      : pageVisible && surface === 'buy' && productCount === 0
        ? 'Add a product to make Buy available to customers.'
        : '';

  useEffect(() => {
    if (isMobile) setDevice('phone');
  }, [isMobile]);

  const publishFlash = async () => {
    if (publishing) return;
    setPublishing(true);
    try {
      const result = await publishWebsite();
      if (result?.ok !== true) {
        setPublishNote(result?.reason || 'Could not publish. Your draft is unchanged. Please try again.');
        setSavedFlash(false);
        return;
      }
      setSavedLocally(Boolean(result?.localOnly));
      setSavedFlash(true);
      setPublishNote(
          (result?.localOnly
            ? 'Saved locally for preview. Your public site has not been updated.'
            : result?.reason || 'Published.')
      );
      window.setTimeout(() => setSavedFlash(false), 1800);
    } catch (error) {
      setPublishNote(error?.message || 'Could not publish. Your changes remain saved locally; please try again.');
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
      setPublishNote('Page enabled in your draft. Publish to update your public site.');
      return;
    }
    await publishFlash();
  };

  const publishLabel = publishing
    ? 'Publishing…'
    : savedFlash
      ? savedLocally ? 'Saved locally' : 'Published'
      : canToggleVisibility && !pageVisible
        ? 'Enable page'
        : 'Publish live';

  return (
    <div className={`bb-studio-canvas${compact ? ' bb-studio-canvas--profile' : ''}${isMobile ? ' is-mobile' : ''}`}>
      <header className="bb-studio-toolbar">
        <div className="bb-studio-toolbar-top">
          {<div className="bb-studio-toolbar-copy min-w-0">
            <div className="bb-page-title-wrap">
              <PageBackButton />
              <span className="bb-page-title-main">
                <div className="bb-page-header-glow" aria-hidden="true" />
                <h1 className="bb-page-title m-0">{compact ? 'Business profile' : title}</h1>
              </span>
            </div>
            {!compact ? <p className="bb-muted m-0 text-sm bb-studio-toolbar-lede">{lede}</p> : null}
          </div>}
          <div className="bb-studio-actions">
            <Button action="open" variant="secondary"
              type="button"
              className="bb-studio-action bb-studio-action--ghost"
              onClick={() => navigate(publicPagePath(workspace.slug, livePage))}
            >
              <ExternalLink size={14} strokeWidth={2.2} />
              Open live
            </Button>
            <Button action="publish" variant="secondary"
              type="button"
              className={`bb-studio-action bb-studio-action--primary${
                canToggleVisibility && !pageVisible ? ' is-unpublished' : ''
              }`}
              disabled={publishing}
              onClick={onPublishAction}
            >
              {publishLabel}
            </Button>
          </div>
        </div>

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
              { id: 'view', label: 'Preview' },
              { id: 'edit', label: 'Edit profile' }
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

      <div className="bb-profile-draft-status" role="status">
        {saveStatus === 'error' ? <><span>{saveError}</span><Button action="refresh" variant="secondary" onClick={retrySave}>Retry save</Button></> :
          <span>{saveStatus === 'saving' ? 'Saving draft…' : workspace.isDemo ? 'Demo draft · saved on this device' : saveStatus === 'saved' ? 'Draft saved' : 'Draft kept on this device'} · Publish makes these changes public.</span>}
        {website.published && workspace.publishedAt ? <span>Last published {new Date(workspace.publishedAt).toLocaleString()}</span> : <span>Not published yet</span>}
      </div>
      {publishNote ? <p role="status" className="bb-profile-publish-note">{publishNote}</p> : null}
      {compact && editMode ? <p className="bb-profile-inline-hint">Click any text or image below to edit. Changes save to your draft automatically.</p> : null}

      <div className={`bb-studio-stage ${editMode ? 'is-edit' : 'is-view'}`}>
        <DevicePreviewFrame
          bezel={compact && !isMobile}
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
