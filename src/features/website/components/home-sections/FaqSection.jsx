import { Plus, Trash2 } from 'lucide-react';
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
              website={website}
              patchWebsite={patchWebsite}
              colorTokenId="faq.title"
              accentTokenId="faq.titleUnderline"
              onChange={(value) => patchWebsite({ bookFaqTitle: value })}
            />
            {editMode || String(website.bookFaqBody || '').trim() ? (
              <EditableText
                as="p"
                className="bb-public-profile-section-body"
                editMode={editMode}
                multiline
                value={website.bookFaqBody || ''}
                placeholder="Short FAQ intro"
                website={website}
                patchWebsite={patchWebsite}
                colorTokenId="faq.body"
                onChange={(value) => patchWebsite({ bookFaqBody: value })}
              />
            ) : null}
          </header>

          <div className="bb-public-faq-list">
            {faq.map((item) =>
              editMode ? (
                <div key={item.id} className="bb-public-faq-item is-edit">
                  <div className="bb-public-edit-title-row">
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
                    <button
                      type="button"
                      className="bb-public-inline-delete"
                      aria-label="Delete FAQ item"
                      title="Delete"
                      onClick={() =>
                        patchWebsite({
                          bookFaq: faq.filter((row) => row.id !== item.id)
                        })
                      }
                    >
                      <Trash2 size={14} strokeWidth={2.2} aria-hidden="true" />
                    </button>
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
              <div className="bb-public-section-actions">
                <button
                  type="button"
                  className="bb-public-section-action"
                  onClick={() =>
                    patchWebsite({
                      bookFaq: [
                        ...faq,
                        { id: `f-${Date.now()}`, q: '', a: '' }
                      ]
                    })
                  }
                >
                  <Plus size={17} aria-hidden="true" />
                  Add FAQ
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </EditSection>
  );
}
