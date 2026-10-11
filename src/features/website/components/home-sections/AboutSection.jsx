import { EditableImage, EditableText, EditSection } from '../editable';

/** Existing copy becomes paragraphs in one story. Original fields and images stay stored. */
export function resolveStory(website = {}) {
  if (Array.isArray(website.storyPages)) return website.storyPages.map(page => String(page.body || '').trim()).filter(Boolean).join('\n\n');
  if (typeof website.storyBody === 'string') return website.storyBody;
  const pages = Array.isArray(website.aboutPages) ? website.aboutPages : [];
  const bodies = pages.length ? pages.map((page) => page.body) :
    [website.aboutBody, website.missionBody, website.visionBody];
  return [...new Set(bodies.map((body) => String(body || '').trim()).filter(Boolean))].join('\n\n');
}

export function resolveStoryPages(website = {}) {
  // An explicit empty list means the owner removed the sections.
  if (Array.isArray(website.storyPages)) return website.storyPages.map(page => ({ ...page }));
  const legacy = website.aboutPages?.length ? website.aboutPages : [
    { id: 'about', title: website.aboutTitle ?? 'About', body: website.aboutBody, imageUrl: website.aboutImageUrl },
    { id: 'mission', title: website.missionTitle ?? 'Mission', body: website.missionBody, imageUrl: website.missionImageUrl },
    { id: 'vision', title: website.visionTitle ?? 'Vision', body: website.visionBody, imageUrl: website.visionImageUrl }
  ];
  const pages = legacy.map((page, index) => ({ ...page, id: page.id || `story-${index}` }));
  pages[0] = { ...pages[0], title: website.storyTitle ?? pages[0].title, body: website.storyBody ?? pages[0].body,
    imageUrl: website.storyImageUrl ?? pages[0].imageUrl ?? '' };
  return pages;
}

export const updateStoryPage = (website, id, changes) => ({
  storyPages: resolveStoryPages(website).map(page => page.id === id ? { ...page, ...changes } : page)
});
export const removeStoryPage = (website, id) => ({ storyPages: resolveStoryPages(website).filter(page => page.id !== id) });
export function addStoryPage(website, kind = 'section') {
  const pages = resolveStoryPages(website);
  let id = kind;
  for (let suffix = 2; pages.some(page => page.id === id); suffix++) id = `${kind}-${suffix}`;
  return { storyPages: [...pages, { id, title: ({ about: 'About', vision: 'Vision', mission: 'Mission' })[kind] || 'Section', body: '', imageUrl: '' }] };
}

export function AboutSection({ website, editMode, hidden, patchWebsite }) {
  const storedPages = resolveStoryPages(website);
  const pages = editMode ? storedPages : storedPages.filter(item => String(item.body || '').trim() || item.imageUrl);
  if (!editMode && !pages.length) return null;
  return <EditSection editMode={editMode} hidden={hidden} title="About" sectionId="about"
    className="bb-business-profile-section bb-profile-about-composition">
    <div className="bb-profile-about-copy">
      {pages.map((part, index) => <section key={part.id} aria-label={part.title || `About section ${index + 1}`}
        className="bb-profile-about-part">
        {editMode && <div className="bb-profile-about-edit-actions">
          {part.title && <button type="button" onClick={() => patchWebsite(updateStoryPage(website, part.id, { title: '' }))}>Remove heading</button>}
          <button type="button" onClick={() => patchWebsite(removeStoryPage(website, part.id))}>Remove section</button>
        </div>}
        <EditableText as={index === 0 ? 'h2' : 'h3'} editMode={editMode} className="bb-profile-about-heading"
          value={part.title ?? ''} placeholder={index === 0 ? 'About heading' : 'Section heading'} maxLength={120}
          onChange={title => patchWebsite(updateStoryPage(website, part.id, { title }))} />
        <div className={`bb-profile-about-part-content${part.imageUrl || editMode ? ' has-image' : ''}`}>
          {part.imageUrl || editMode ? <div className="bb-profile-about-image">
            <EditableImage editMode={editMode} src={part.imageUrl || ''} alt={part.title || 'About the business'} preset="about" storageFolder="website"
              onChange={imageUrl => patchWebsite(updateStoryPage(website, part.id, { imageUrl }))}
              onRemove={() => patchWebsite(updateStoryPage(website, part.id, { imageUrl: '' }))} />
          </div> : null}
          <div className="bb-profile-about-body">
            {editMode ? <EditableText as="p" editMode multiline value={part.body || ''} placeholder="Write about your business" maxLength={20000}
              onChange={body => patchWebsite(updateStoryPage(website, part.id, { body }))} /> : String(part.body || '').split(/\n\s*\n/).filter(Boolean).map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
          </div>
        </div>
      </section>)}
      {editMode && <div className="bb-profile-about-add-actions">
        {['about', 'vision', 'mission'].filter(kind => !storedPages.some(page => page.id === kind)).map(kind =>
          <button key={kind} type="button" onClick={() => patchWebsite(addStoryPage(website, kind))}>Add {kind}</button>)}
        <button type="button" onClick={() => patchWebsite(addStoryPage(website))}>Add section</button>
      </div>}
    </div>
  </EditSection>;
}
