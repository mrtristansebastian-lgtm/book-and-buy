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
      className="bb-public-home-block bb-public-reasons-block"
    >
      <div className="bb-public-reasons-band bb-public-native-fill" aria-hidden="true" />
      <div className="bb-public-gutter">
        <div className="bb-public-measure-wide bb-public-reasons-shell">
          <header className="bb-public-reasons-head">
            <p className="bb-public-section-eyebrow">
              <span className="bb-public-section-eyebrow-mark bb-public-native-fill" aria-hidden="true" />
              The craft
            </p>
            <div className="bb-public-section-heading">
              <EditableText
                as="h2"
                className="bb-public-reasons-title"
                editMode={editMode}
                value={website.reasonsTitle || 'Why choose us'}
                placeholder="Section title"
                onChange={(value) => patchWebsite({ reasonsTitle: value })}
              />
              <span className="bb-public-section-accent bb-public-native-fill" aria-hidden="true" />
            </div>
          </header>
          <div className="bb-public-reasons">
            {reasons.map((reason, index) => (
              <article
                key={reason.id}
                className="bb-public-reason"
                style={{ '--bb-reason-i': index }}
              >
                <span className="bb-public-reason-index" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="bb-public-reason-copy">
                  <EditableText
                    as="h3"
                    className="bb-public-reason-title"
                    editMode={editMode}
                    value={reason.title || ''}
                    placeholder="Reason title"
                    onChange={(value) => patchReason(reason.id, 'title', value)}
                  />
                  <EditableText
                    as="p"
                    className="bb-public-reason-body"
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
      </div>
    </EditSection>
  );
}
