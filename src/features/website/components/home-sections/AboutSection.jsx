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
            <p className="bb-public-section-eyebrow">
              <span className="bb-public-section-eyebrow-mark bb-public-native-fill" aria-hidden="true" />
              <EditableText
                as="span"
                className="bb-public-section-eyebrow-text"
                editMode={editMode}
                value={website.aboutEyebrow || 'About'}
                placeholder="Eyebrow"
                onChange={(value) => patchWebsite({ aboutEyebrow: value })}
              />
            </p>
            <div className="bb-public-section-heading">
              <EditableText
                as="h2"
                className="bb-public-about-title"
                editMode={editMode}
                value={website.aboutTitle || 'About us'}
                placeholder="About title"
                onChange={(value) => patchWebsite({ aboutTitle: value })}
              />
              <span className="bb-public-section-accent bb-public-native-fill" aria-hidden="true" />
            </div>
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
            <span className="bb-public-about-media-frame bb-public-native-fill" aria-hidden="true" />
            <EditableImage
              editMode={editMode}
              src={website.aboutImageUrl || ''}
              className="bb-public-about-media"
              imgClassName="w-full h-full object-cover"
              storageFolder="venue"
              onChange={(url) => patchWebsite({ aboutImageUrl: url })}
              placeholderLabel="About image URL"
            />
          </div>
        </div>
      </div>
    </EditSection>
  );
}
