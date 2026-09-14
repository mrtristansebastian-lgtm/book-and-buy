import { EditableText, EditableImage, EditSection } from '../editable';

export function AboutSection({ website, editMode, hidden, patchWebsite }) {
  return (
    <EditSection
      editMode={editMode}
      title="About"
      sectionId="about"
      hidden={hidden}
      coach="Short About us story for your public Home."
      className="bb-public-home-block bb-public-about-block bb-public-about-editorial"
    >
      <div className="bb-public-gutter">
        <div className="bb-public-about bb-public-about--editorial">
          <div className="bb-public-about-copy">
            <header className="bb-public-profile-section-head bb-public-about-head">
              <EditableText
                as="h2"
                className="bb-public-profile-heading bb-public-about-title"
                editMode={editMode}
                value={website.aboutTitle || 'About us'}
                placeholder="About us"
                onChange={(value) => patchWebsite({ aboutTitle: value })}
              />
            </header>
            <EditableText
              as="p"
              className="bb-public-about-body"
              editMode={editMode}
              multiline
              value={website.aboutBody || ''}
              placeholder="About your business"
              onChange={(value) => patchWebsite({ aboutBody: value })}
            />
          </div>

          <div className="bb-public-about-media-wrap">
            <EditableImage
              editMode={editMode}
              src={website.aboutImageUrl || ''}
              className="bb-public-about-media"
              imgClassName="bb-public-about-media-img"
              storageFolder="brand"
              preset="about"
              onChange={(url) => patchWebsite({ aboutImageUrl: url })}
            />
          </div>
        </div>
      </div>
    </EditSection>
  );
}
