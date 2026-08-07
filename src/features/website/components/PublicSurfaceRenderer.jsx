import { PublicBusinessHeader } from '../../public-surface/PublicBusinessHeader';
import {
  PublicBookView,
  PublicBuyView,
  PublicHomeView,
  PublicSocialView
} from './PublicSurfaceViews';

const VIEWS = {
  home: PublicHomeView,
  book: PublicBookView,
  buy: PublicBuyView,
  social: PublicSocialView
};

/**
 * Shared tree for live public site and Pages studio device mockups.
 */
export function PublicSurfaceRenderer({
  workspace,
  page = 'home',
  preview = false,
  editMode = false,
  showHeader = true,
  onUpdateWebsite,
  onUpdateProfile,
  onUpdateSocialPost,
  onAddSocialPost,
  showDrafts = false
}) {
  const View = VIEWS[page] || PublicHomeView;

  return (
    <div
      className={`bb-public-surface ${preview ? 'bb-public-surface--preview' : ''} ${
        editMode ? 'bb-public-surface--edit' : ''
      }`}
      data-page={page}
    >
      {showHeader ? (
        <PublicBusinessHeader
          slug={workspace.slug}
          page={page}
          brandName={workspace.brandName}
          pages={workspace.website?.pages}
          preview={preview || editMode}
        />
      ) : null}
      <View
        workspace={workspace}
        preview={preview}
        editMode={editMode}
        onUpdateWebsite={onUpdateWebsite}
        onUpdateProfile={onUpdateProfile}
        onUpdateSocialPost={onUpdateSocialPost}
        onAddSocialPost={onAddSocialPost}
        showDrafts={showDrafts}
      />
    </div>
  );
}
