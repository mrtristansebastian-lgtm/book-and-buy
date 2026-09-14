import { EditableText, EditSection } from '../editable';

export function FaqSection({ website, editMode, hidden, patchWebsite }) {
  const faq = website.bookFaq || [];

  return (
    <EditSection
      editMode={editMode}
      title="FAQ"
      sectionId="faq"
      hidden={hidden}
      coach="Answer common client questions."
      className="bb-public-home-block bb-public-profile-faq-block"
    >
      <div className="bb-public-gutter">
        <div className="bb-public-measure bb-public-profile-faq-shell">
          <header className="bb-public-profile-section-head">
            <EditableText
              as="h2"
              className="bb-public-profile-heading bb-public-faq-title"
              editMode={editMode}
              value={website.bookFaqTitle || 'FAQ'}
              placeholder="FAQ"
              onChange={(value) => patchWebsite({ bookFaqTitle: value })}
            />
          </header>

          <div className="bb-public-faq-list">
            {faq.map((item) =>
              editMode ? (
                <div key={item.id} className="bb-public-faq-item is-edit">
                  <div className="bb-public-faq-q">
                    <EditableText
                      as="span"
                      editMode
                      value={item.q || ''}
                      placeholder="Question"
                      onChange={(value) =>
                        patchWebsite({
                          bookFaq: faq.map((row) =>
                            row.id === item.id ? { ...row, q: value } : row
                          )
                        })
                      }
                    />
                  </div>
                  <div className="bb-public-faq-a">
                    <EditableText
                      as="p"
                      editMode
                      multiline
                      value={item.a || ''}
                      placeholder="Answer"
                      onChange={(value) =>
                        patchWebsite({
                          bookFaq: faq.map((row) =>
                            row.id === item.id ? { ...row, a: value } : row
                          )
                        })
                      }
                    />
                  </div>
                </div>
              ) : (
                <details key={item.id} className="bb-public-faq-item">
                  <summary className="bb-public-faq-q">
                    <span>{item.q || 'Question'}</span>
                  </summary>
                  <div className="bb-public-faq-a">
                    <p>{item.a || ''}</p>
                  </div>
                </details>
              )
            )}
            {editMode && faq.length < 8 ? (
              <button
                type="button"
                className="bb-ghost-btn justify-self-start"
                onClick={() =>
                  patchWebsite({
                    bookFaq: [
                      ...faq,
                      { id: `f-${Date.now()}`, q: '', a: '' }
                    ]
                  })
                }
              >
                Add FAQ item
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </EditSection>
  );
}
