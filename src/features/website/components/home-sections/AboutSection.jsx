import { EditableImage, EditableText, EditSection } from '../editable';

/** Existing copy becomes paragraphs in one story. Original fields and images stay stored. */
export function resolveStory(website = {}) {
  if (typeof website.storyBody === 'string') return website.storyBody;
  const pages = Array.isArray(website.aboutPages) ? website.aboutPages : [];
  const bodies = pages.length ? pages.map((page) => page.body) :
    [website.aboutBody, website.missionBody, website.visionBody];
  return [...new Set(bodies.map((body) => String(body || '').trim()).filter(Boolean))].join('\n\n');
}

export function AboutSection({ website, editMode, hidden, patchWebsite }) {
  const story = resolveStory(website);
  const image = website.storyImageUrl ?? (website.aboutImageUrl || website.aboutPages?.find((page) => page.imageUrl)?.imageUrl || '');
  if (!editMode && !story.trim()) return null;
  return <EditSection editMode={editMode} hidden={hidden} title="Our story" sectionId="about"
    className={`bb-business-profile-section bb-profile-story${image || editMode ? ' bb-profile-story--with-photo' : ''}`}>
    <div className="bb-profile-story-content">
    <h2 className="bb-business-profile-heading">Our story</h2>
    {editMode ? <>
      <p className="bb-profile-story-help">One story in your own words. Existing about, mission and vision copy is combined below; the original content stays saved.</p>
      <EditableText as="p" className="bb-business-profile-body bb-profile-story-text" editMode multiline
        value={story} placeholder="Tell customers the story behind your business."
        onChange={(value) => patchWebsite({ storyBody: value })} />
    </> : <div className="bb-profile-story-text">
      {story.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index} className="bb-business-profile-body">{paragraph}</p>)}
    </div>}</div>
    {image || editMode ? <EditableImage editMode={editMode} src={image}
      className="bb-profile-story-photo" alt="Our story" preset="logo" storageFolder="website"
      placeholderLabel="Add story photo" editLabel="Edit story photo"
      onChange={(url) => patchWebsite({ storyImageUrl: url })} /> : null}
  </EditSection>;
}
