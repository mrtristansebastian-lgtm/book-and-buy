import { PublicCartProvider } from '../../storefront/PublicCartContext';
import { PublicCatalogDetail } from '../../storefront/components/PublicCatalogDetail';
import { PublicHomeView } from './PublicSurfaceViews';

/** Map studio / URL page ids onto the profile rail tabs. */
export function pageToRailTab(page = 'home') {
  const id = String(page || 'home').trim().toLowerCase();
  if (id === 'social' || id === 'content') return 'content';
  if (id === 'book') return 'book';
  if (id === 'buy') return 'buy';
  return 'home';
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
  onUpdateWebsite,
  onUpdateProfile,
  onUpdateSocialPost,
  onAddSocialPost,
  showDrafts = false
}) {
  const railTab = pageToRailTab(page);
  const detailId = String(itemId || '').trim();

  if (detailId && (page === 'book' || page === 'buy')) {
    const kind = page === 'book' ? 'service' : 'product';
    const items = page === 'book' ? workspace.services || [] : workspace.products || [];
    const item = items.find((row) => row.id === detailId && row.active !== false) || null;

    return (
      <PublicCartProvider>
        <div
          className={`bb-public-surface ${preview ? 'bb-public-surface--preview' : ''} ${
            editMode ? 'bb-public-surface--edit' : ''
          }`}
          data-page={page}
        >
          <PublicCatalogDetail
            kind={kind}
            item={item}
            workspace={workspace}
            workspaceName={workspace.brandName}
            slug={workspace.slug}
            preview={preview || editMode}
            publicMode={publicMode}
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
        data-page={page}
        data-rail={railTab}
      >
        <PublicHomeView
          workspace={workspace}
          railTab={railTab}
          preview={preview}
          editMode={editMode}
          publicMode={publicMode}
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
