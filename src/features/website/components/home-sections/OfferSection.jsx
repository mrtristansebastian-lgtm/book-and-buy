import { navigate, publicPagePath } from '../../../../app/routing';
import { isPublicPageEnabled } from '../../../../config/eBusinessPlatform';
import { EditableText, EditSection } from '../editable';

function go(preview, editMode, path) {
  if (preview || editMode) return;
  navigate(path);
}

export function OfferSection({
  workspace,
  website,
  editMode,
  preview,
  hidden,
  patchWebsite
}) {
  const pages = website.pages || {};
  const showBook = isPublicPageEnabled(pages, 'book');
  const showBuy = isPublicPageEnabled(pages, 'buy');

  return (
    <EditSection
      editMode={editMode}
      title="Offer"
      sectionId="offer"
      hidden={hidden}
      className="bb-public-home-block bb-public-offer-block"
    >
      <div className="bb-public-gutter">
        <div className="bb-public-measure bb-public-offer-shell">
          <header className="bb-public-offer-head">
            <div className="bb-public-section-heading">
              <EditableText
                as="h2"
                className="bb-public-offer-title"
                editMode={editMode}
                value={website.offerTitle || 'View what we offer'}
                placeholder="Offer heading"
                onChange={(value) => patchWebsite({ offerTitle: value })}
              />
              <span className="bb-public-section-accent bb-public-native-fill" aria-hidden="true" />
            </div>
          </header>

          <div className="bb-public-offer-ctas">
            {showBook || editMode ? (
              <button
                type="button"
                className="bb-primary-btn"
                onClick={() => go(preview, editMode, publicPagePath(workspace.slug, 'book'))}
              >
                <EditableText
                  as="span"
                  editMode={editMode}
                  value={website.offerBookCta || 'Bookings'}
                  placeholder="Bookings CTA"
                  onChange={(value) => patchWebsite({ offerBookCta: value })}
                />
              </button>
            ) : null}
            {showBuy || editMode ? (
              <button
                type="button"
                className="bb-ghost-btn"
                onClick={() => go(preview, editMode, publicPagePath(workspace.slug, 'buy'))}
              >
                <EditableText
                  as="span"
                  editMode={editMode}
                  value={website.offerBuyCta || 'Products'}
                  placeholder="Products CTA"
                  onChange={(value) => patchWebsite({ offerBuyCta: value })}
                />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </EditSection>
  );
}
