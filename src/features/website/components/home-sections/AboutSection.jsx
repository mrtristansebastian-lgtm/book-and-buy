import { EditableText, EditableImage, EditSection } from '../editable';

export function AboutSection({ website, editMode, hidden, patchWebsite }) {
  return (
    <EditSection
      editMode={editMode}
      title="About"
      sectionId="about"
      hidden={hidden}
      coach="Tell clients who you are."
      className="bb-public-home-block bb-public-about-block"
    >
      <div className="bb-public-gutter">
        <div className="bb-public-measure-wide bb-public-about">
          <div className="bb-public-about-copy">
            <header className="bb-public-profile-section-head">
              <EditableText
                as="h2"
                className="bb-public-profile-section-title bb-public-about-title"
                editMode={editMode}
                value={website.aboutTitle || 'About'}
                placeholder="About title"
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
              imgClassName="w-full h-full object-cover"
              storageFolder="venue"
              preset="about"
              onChange={(url) => patchWebsite({ aboutImageUrl: url })}
              placeholderLabel="About image"
            />
          </div>
        </div>
      </div>
    </EditSection>
  );
}
