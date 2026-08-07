import { EditableText, EditableImage, EditSection } from '../editable';
import { sectionLayoutClass } from './sectionLayout';

export function AboutSection({
  website,
  editMode,
  layout,
  hidden,
  patchWebsite
}) {
  const copy = (
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
  );

  const media = (
    <EditableImage
      editMode={editMode}
      src={website.aboutImageUrl || ''}
      className="bb-public-about-media"
      imgClassName="w-full h-full object-cover"
      storageFolder="venue"
      onChange={(url) => patchWebsite({ aboutImageUrl: url })}
      placeholderLabel="About image URL"
    />
  );

  return (
    <EditSection
      editMode={editMode}
      title="About"
      sectionId="about"
      layout={layout}
      hidden={hidden}
      coach="Tell clients who you are."
      className={`bb-public-home-block bb-public-gutter ${sectionLayoutClass(layout)}`}
    >
      <div key={layout} className={`bb-sec-layout-stage bb-public-measure bb-public-about`}>
        {layout === 2 ? (
          <>
            <div className="bb-public-about-band">{media}</div>
            <div className="bb-public-about-stack-copy">{copy}</div>
          </>
        ) : layout === 1 ? (
          <>
            {media}
            {copy}
          </>
        ) : (
          <>
            {copy}
            {media}
          </>
        )}
      </div>
    </EditSection>
  );
}
