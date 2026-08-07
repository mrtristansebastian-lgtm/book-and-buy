import { EditableText, EditSection } from '../editable';

export function ReasonsSection({
  website,
  reasons,
  editMode,
  hidden,
  patchReason,
  patchWebsite
}) {
  return (
    <EditSection
      editMode={editMode}
      title="Why choose us"
      sectionId="reasons"
      hidden={hidden}
      className="bb-public-home-block bb-public-gutter bb-public-home-block--soft"
    >
      <div className="bb-public-measure grid gap-6">
        <EditableText
          as="h2"
          className="bb-page-title text-3xl md:text-4xl m-0"
          editMode={editMode}
          value={website.reasonsTitle || 'Why choose us'}
          placeholder="Section title"
          onChange={(value) => patchWebsite({ reasonsTitle: value })}
        />
        <div className="bb-public-reasons">
          {reasons.map((reason) => (
            <article key={reason.id} className="bb-public-reason">
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
            </article>
          ))}
        </div>
      </div>
    </EditSection>
  );
}
