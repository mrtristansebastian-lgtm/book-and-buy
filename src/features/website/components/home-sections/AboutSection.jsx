import { EditableText, EditableImage, EditSection } from '../editable';

export function AboutSection({ website, editMode, hidden, patchWebsite }) {
  return (
    <EditSection
      editMode={editMode}
      title="About"
      sectionId="about"
      hidden={hidden}
      coach="Tell clients who you are."
      className="bb-public-home-block bb-public-gutter"
    >
      <div className="bb-public-measure bb-public-about">
        <div className="bb-public-about-copy grid gap-3">
          <EditableText
            as="h2"
            className="bb-page-title text-3xl md:text-4xl m-0"
            editMode={editMode}
            value={website.aboutTitle || 'About us'}
            placeholder="About title"
            onChange={(value) => patchWebsite({ aboutTitle: value })}
          />
          <EditableText
            as="p"
            className="bb-public-lede m-0"
            editMode={editMode}
            multiline
            value={website.aboutBody || ''}
            placeholder="About your business"
            onChange={(value) => patchWebsite({ aboutBody: value })}
          />
        </div>
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
    </EditSection>
  );
}
