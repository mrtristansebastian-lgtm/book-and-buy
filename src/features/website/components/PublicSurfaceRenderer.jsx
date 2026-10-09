import { profileCatalog } from '../profileModel';
import { PublicCartProvider } from '../../storefront/PublicCartContext';
import { PublicCatalogDetail } from '../../storefront/components/PublicCatalogDetail';
import {
  PublicCartCheckout,
  buildCheckoutPreviewCartItems,
  buildCheckoutPreviewResult
} from '../../storefront/components/PublicCartCheckout';
import { PublicAnalyticsLayer } from '../../../shared/analytics/PublicAnalyticsLayer';
import { PublicHomeView } from './PublicSurfaceViews';
import { ProfilePageFrame } from './ProfilePageFrame';
import {
  isEBusinessPreviewOnlyPage,
  resolveVisiblePublicPage
} from '../../../config/eBusinessPlatform';

/** Map studio / URL page ids onto the profile rail tabs. */
export function pageToRailTab(page = 'home') {
  const id = String(page || 'home').trim().toLowerCase();
  if (id === 'social' || id === 'content') return 'content';
  if (id === 'book') return 'book';
  if (id === 'buy') return 'buy';
  if (['about', 'offers', 'gallery', 'reviews', 'map', 'faq', 'contact', 'cancellation', 'terms', 'privacy'].includes(id)) return id;
  return 'home';
}

function CheckoutFlowPreview({ workspace, page, preview = false, editMode = false, onOpenPage, onUpdateWebsite, onUpdateProfile }) {
  const forceStep =
    page === 'checkout' ? 'details' : page === 'success' ? 'success' : 'review';
  const seedItems = buildCheckoutPreviewCartItems(workspace);
  const previewResult =
    forceStep === 'success' ? buildCheckoutPreviewResult(seedItems) : null;

  return (
    <PublicCartProvider initialItems={seedItems}>
      <div
        className={`bb-public-surface ${preview ? 'bb-public-surface--preview' : ''}`}
        data-page={page}
      >
        <ProfilePageFrame workspace={workspace} page={page} preview={preview} editMode={editMode}
          onOpenPage={onOpenPage} onUpdateWebsite={onUpdateWebsite} onUpdateProfile={onUpdateProfile}>
          <div className="bb-public-gutter bb-public-buy-section" style={{ paddingTop: '1.5rem' }}>
            <PublicCartCheckout
              catalogWorkspace={workspace}
              workspaceName={workspace.brandName}
              forceStep={forceStep}
              previewResult={previewResult}
              lockedPreview
              onBack={() => {}}
            />
          </div>
        </ProfilePageFrame>
      </div>
    </PublicCartProvider>
  );
}

/**
 * Shared tree for live public site and Pages studio device mockups.
 * All surfaces use the profile rail (Home / Content / Book / Buy).
 */
function PublicSurfaceContent({
  workspace,
  page = 'home',
  itemId = '',
  preview = false,
  editMode = false,
  showHeader: _showHeader = true,
  publicMode = false,
  trackAnalytics = false,
  marketPicker = null,
  onOpenItem,
  onOpenPage,
  onCloseItem,
  onUpdateWebsite,
  onUpdateProfile,
  onUpdateSocialPost,
  onAddSocialPost,
  showDrafts = false
}) {
  const requestedPage = String(page || 'home').trim().toLowerCase();
  // Studio keeps the requested surface so owners can edit hidden pages.
  // Live public URLs fall back to Home when a page is turned off.
  const pageId =
    preview || editMode
      ? requestedPage
      : resolveVisiblePublicPage(workspace?.website?.pages, requestedPage);
  const railTab = pageToRailTab(pageId);
  const detailId = String(itemId || '').trim();
  const analyticsOn = Boolean(trackAnalytics) && !preview && !editMode;

  if (isEBusinessPreviewOnlyPage(pageId)) {
    return (
      <CheckoutFlowPreview workspace={workspace} page={pageId} preview={preview || editMode} editMode={editMode}
        onOpenPage={onOpenPage} onUpdateWebsite={onUpdateWebsite} onUpdateProfile={onUpdateProfile} />
    );
  }

  if (detailId && (pageId === 'book' || pageId === 'buy')) {
    const kind = pageId === 'book' ? 'service' : 'product';
    const catalog = profileCatalog(workspace);
    const items = pageId === 'book' ? catalog.services : catalog.products;
    const item = items.find((row) => row.id === detailId && row.active !== false) || null;

    return (
      <>
        <PublicAnalyticsLayer
          workspace={workspace}
          page={pageId}
          itemId={detailId}
          enabled={analyticsOn}
        />
        <div
          className={`bb-public-surface ${preview ? 'bb-public-surface--preview' : ''} ${
            editMode ? 'bb-public-surface--edit' : ''
          }`}
          data-page={pageId}
        >
          <ProfilePageFrame workspace={workspace} page={pageId} preview={preview} editMode={editMode}
            onOpenPage={onOpenPage} onUpdateWebsite={onUpdateWebsite} onUpdateProfile={onUpdateProfile} scrollKey={detailId}>
            {marketPicker}
            <PublicCatalogDetail
              key={`${kind}:${detailId}`}
              kind={kind}
              item={item}
              workspace={workspace}
              workspaceName={workspace.brandName}
              slug={workspace.slug}
              preview={preview}
              publicMode={publicMode}
              onBack={onCloseItem}
            />
          </ProfilePageFrame>
        </div>
      </>
    );
  }

  return (
    <>
      <PublicAnalyticsLayer
        workspace={workspace}
        page={pageId}
        itemId={detailId}
        enabled={analyticsOn}
      />
      <div
        className={`bb-public-surface ${preview ? 'bb-public-surface--preview' : ''} ${
          editMode ? 'bb-public-surface--edit' : ''
        }`}
        data-page={pageId}
        data-rail={railTab}
      >
        <PublicHomeView
          workspace={workspace}
          railTab={railTab}
          preview={preview}
          editMode={editMode}
          publicMode={publicMode}
          marketPicker={marketPicker}
          onOpenItem={onOpenItem}
          onOpenPage={onOpenPage}
          onUpdateWebsite={onUpdateWebsite}
          onUpdateProfile={onUpdateProfile}
          onUpdateSocialPost={onUpdateSocialPost}
          onAddSocialPost={onAddSocialPost}
          showDrafts={showDrafts || (editMode && railTab === 'content')}
        />
      </div>
    </>
  );
}

/** A stable provider survives all catalog/detail route changes; previews have isolated carts. */
export function PublicSurfaceRenderer(props) {
  return <PublicCartProvider key={props.workspace.slug + (props.preview || props.editMode ? ':preview' : ':public')}>
    <PublicSurfaceContent {...props} />
  </PublicCartProvider>;
}
