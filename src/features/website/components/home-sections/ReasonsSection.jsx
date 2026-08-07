import { EditableText, EditSection } from '../editable';
import { sectionLayoutClass } from './sectionLayout';

export function ReasonsSection({
  website,
  reasons,
  editMode,
  layout,
  onCycleLayout,
  hidden,
  patchReason,
  patchWebsite
}) {
  return (
    <EditSection
      editMode={editMode}
      title="Why choose us"
      sectionId="reasons"
      layout={layout}
      onCycleLayout={onCycleLayout}
      hidden={hidden}
      className={`bb-public-home-block bb-public-gutter bb-public-home-block--soft ${sectionLayoutClass(layout)}`}
    >
      <div key={layout} className="bb-sec-layout-stage bb-public-measure grid gap-6">
        <EditableText
          as="h2"
          className="bb-page-title text-3xl md:text-4xl m-0"
          editMode={editMode}
          value={website.reasonsTitle || 'Why choose us'}
          placeholder="Section title"
          onChange={(value) => patchWebsite({ reasonsTitle: value })}
        />
        <div
          className={
            layout === 1
              ? 'bb-public-reasons bb-public-reasons--numbered'
              : layout === 2
                ? 'bb-public-reasons bb-public-reasons--stack'
                : 'bb-public-reasons'
          }
        >
          {reasons.map((reason, index) => (
            <article key={reason.id} className="bb-public-reason">
              {layout === 1 ? (
                <span className="bb-public-reason-index" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
              ) : null}
              <div className="bb-public-reason-copy">
                <EditableText
                  as="h3"
                  className="bb-page-title text-xl m-0"
                  editMode={editMode}
                  value={reason.title || ''}
                  placeholder="Reason title"
                  onChange={(value) => patchReason(reason.id, 'title', value)}
                />
                <EditableText
                  as="p"
                  className="bb-public-reason-body m-0"
                  editMode={editMode}
                  multiline
                  value={reason.body || ''}
                  placeholder="Short reason"
                  onChange={(value) => patchReason(reason.id, 'body', value)}
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </EditSection>
  );
}
