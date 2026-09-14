import { EditableText, EditSection } from '../editable';

export function AboutSection({ website, editMode, hidden, patchWebsite }) {
  return (
    <EditSection
      editMode={editMode}
      title="About"
      sectionId="about"
      hidden={hidden}
      coach="Short About us story for your public Home."
      className="bb-public-home-block bb-public-about-block bb-public-about-text-block"
    >
      <div className="bb-public-gutter">
        <div className="bb-public-measure bb-public-about-text-shell">
          <header className="bb-public-profile-section-head">
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
      </div>
    </EditSection>
  );
}
