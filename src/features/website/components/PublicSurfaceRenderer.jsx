import { PublicCartProvider } from '../../storefront/PublicCartContext';
import { PublicCatalogDetail } from '../../storefront/components/PublicCatalogDetail';
import {
  PublicCartCheckout,
  buildCheckoutPreviewCartItems,
  buildCheckoutPreviewResult
} from '../../storefront/components/PublicCartCheckout';
import { PublicHomeView } from './PublicSurfaceViews';
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
  return 'home';
}

function CheckoutFlowPreview({ workspace, page, preview = false }) {
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
      </div>
    </PublicCartProvider>
  );
}

/**
 * Shared tree for live public site and Pages studio device mockups.
 * All surfaces use the profile rail (Home / Content / Book / Buy).
 */
export function PublicSurfaceRenderer({
  workspace,
  page = 'home',
  itemId = '',
  preview = false,
  editMode = false,
  showHeader: _showHeader = true,
  publicMode = false,
  onOpenItem,
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

  if (isEBusinessPreviewOnlyPage(pageId)) {
    return (
      <CheckoutFlowPreview workspace={workspace} page={pageId} preview={preview || editMode} />
    );
  }

  if (detailId && (pageId === 'book' || pageId === 'buy')) {
    const kind = pageId === 'book' ? 'service' : 'product';
    const items = pageId === 'book' ? workspace.services || [] : workspace.products || [];
    const item = items.find((row) => row.id === detailId && row.active !== false) || null;

    return (
      <PublicCartProvider>
        <div
          className={`bb-public-surface ${preview ? 'bb-public-surface--preview' : ''} ${
            editMode ? 'bb-public-surface--edit' : ''
          }`}
          data-page={pageId}
        >
          <PublicCatalogDetail
            kind={kind}
            item={item}
            workspace={workspace}
            workspaceName={workspace.brandName}
            slug={workspace.slug}
            preview={preview}
            publicMode={publicMode}
            onBack={onCloseItem}
          />
        </div>
      </PublicCartProvider>
    );
  }

  return (
    <PublicCartProvider>
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
          onOpenItem={onOpenItem}
          onUpdateWebsite={onUpdateWebsite}
          onUpdateProfile={onUpdateProfile}
          onUpdateSocialPost={onUpdateSocialPost}
          onAddSocialPost={onAddSocialPost}
          showDrafts={showDrafts || (editMode && railTab === 'content')}
        />
      </div>
    </PublicCartProvider>
  );
}
