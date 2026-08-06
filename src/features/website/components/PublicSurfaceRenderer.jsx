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
 * @param {{ workspace: object, page?: string, preview?: boolean, showHeader?: boolean }} props
 */
export function PublicSurfaceRenderer({
  workspace,
  page = 'home',
  preview = false,
  showHeader = true
}) {
  const View = VIEWS[page] || PublicHomeView;

  return (
    <div
      className={`bb-public-surface ${preview ? 'bb-public-surface--preview' : ''}`}
      data-page={page}
    >
      {showHeader ? (
        <PublicBusinessHeader
          slug={workspace.slug}
          page={page}
          brandName={workspace.brandName}
          pages={workspace.website?.pages}
          preview={preview}
        />
      ) : null}
      <View workspace={workspace} preview={preview} />
    </div>
  );
}
