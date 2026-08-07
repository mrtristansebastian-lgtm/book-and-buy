import { navigate, publicPagePath } from '../../../../app/routing';
import { EditableText, EditSection } from '../editable';
import { sectionLayoutClass } from './sectionLayout';

function go(preview, editMode, path) {
  if (preview || editMode) return;
  navigate(path);
}

export function BookStripSection({
  workspace,
  website,
  editMode,
  preview,
  layout,
  onCycleLayout,
  hidden,
  patchWebsite
}) {
  const copy = (
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
  );

  const cta = (
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
  );

  return (
    <EditSection
      editMode={editMode}
      title="Book strip"
      sectionId="bookStrip"
      layout={layout}
      onCycleLayout={onCycleLayout}
      hidden={hidden}
      className={`bb-public-home-block bb-public-gutter ${sectionLayoutClass(layout)}`}
    >
      <div
        key={layout}
        className={`bb-sec-layout-stage bb-public-measure bb-public-book-strip${
          layout === 1
            ? ' bb-public-book-strip--split'
            : layout === 2
              ? ' bb-public-book-strip--minimal'
              : ''
        }`}
      >
        {copy}
        {cta}
      </div>
    </EditSection>
  );
}
