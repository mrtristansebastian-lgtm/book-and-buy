import { navigate, publicPagePath } from '../../../../app/routing';
import { EditableText, EditSection } from '../editable';

function go(preview, editMode, path) {
  if (preview || editMode) return;
  navigate(path);
}

export function BookStripSection({
  workspace,
  website,
  editMode,
  preview,
  hidden,
  patchWebsite
}) {
  return (
    <EditSection
      editMode={editMode}
      title="Book strip"
      sectionId="bookStrip"
      hidden={hidden}
      className="bb-public-home-block bb-public-gutter"
    >
      <div className="bb-public-measure bb-public-book-strip">
        <div className="bb-public-book-strip-copy grid gap-2">
          <EditableText
            as="h2"
            className="bb-page-title text-3xl m-0"
            editMode={editMode}
            value={website.bookStripTitle || 'Ready to book?'}
            placeholder="Strip title"
            onChange={(value) => patchWebsite({ bookStripTitle: value })}
          />
          <EditableText
            as="p"
            className="bb-public-lede m-0"
            editMode={editMode}
            multiline
            value={website.bookStripBody || ''}
            placeholder="Strip supporting line"
            onChange={(value) => patchWebsite({ bookStripBody: value })}
          />
        </div>
        <button
          type="button"
          className="bb-primary-btn"
          onClick={() => go(preview, editMode, publicPagePath(workspace.slug, 'book'))}
        >
          <EditableText
            as="span"
            editMode={editMode}
            value={website.bookStripCta || 'See availability'}
            placeholder="CTA"
            onChange={(value) => patchWebsite({ bookStripCta: value })}
          />
        </button>
      </div>
    </EditSection>
  );
}
