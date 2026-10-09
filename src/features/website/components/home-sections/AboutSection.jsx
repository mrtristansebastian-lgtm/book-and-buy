import { EditableImage, EditableText, EditSection } from '../editable';

/** Existing copy becomes paragraphs in one story. Original fields and images stay stored. */
export function resolveStory(website = {}) {
  if (typeof website.storyBody === 'string') return website.storyBody;
  const pages = Array.isArray(website.aboutPages) ? website.aboutPages : [];
  const bodies = pages.length ? pages.map((page) => page.body) :
    [website.aboutBody, website.missionBody, website.visionBody];
  return [...new Set(bodies.map((body) => String(body || '').trim()).filter(Boolean))].join('\n\n');
}

export function resolveStoryPages(website = {}) {
  if (Array.isArray(website.storyPages) && website.storyPages.length) return website.storyPages;
  const legacy = website.aboutPages?.length ? website.aboutPages : [
    { id: 'story', title: 'Our story', body: website.aboutBody, imageUrl: website.aboutImageUrl },
    { id: 'mission', title: website.missionTitle || 'Our mission', body: website.missionBody, imageUrl: website.missionImageUrl },
    { id: 'vision', title: website.visionTitle || 'Our vision', body: website.visionBody, imageUrl: website.visionImageUrl }
  ];
  const pages = legacy.filter(page => String(page.body || '').trim()).map((page, index) => ({ ...page, id: page.id || `story-${index}` }));
  if (!pages.length) pages.push({ id: 'story', title: 'Our story', body: '', imageUrl: '' });
  pages[0] = { ...pages[0], title: website.storyTitle || 'Our story', body: website.storyBody ?? pages[0].body,
    imageUrl: website.storyImageUrl ?? pages[0].imageUrl ?? '' };
  return pages;
}

export function AboutSection({ website, editMode, hidden, patchWebsite }) {
  const storedPages = resolveStoryPages(website);
  const pages = editMode ? storedPages : storedPages.filter(item => String(item.body || '').trim());
  if (!editMode && !pages.some(item => String(item.body || '').trim())) return null;
  return <EditSection editMode={editMode} hidden={hidden} title="Our story" sectionId="about"
    className="bb-business-profile-section bb-profile-about-overview">
    <div className={`bb-profile-about-overview-grid${pages.length > 1 ? ' has-multiple' : ''}${pages.length > 2 ? ' has-three-or-more' : ''}`}>
      {pages.map((chapter, index) => <article key={chapter.id} aria-label={chapter.title || `Chapter ${index + 1}`}
        className={`bb-profile-about-tile${chapter.imageUrl ? ' has-image' : ''}`}>
        {chapter.imageUrl || editMode ? <div className="bb-profile-about-tile-image">
          <EditableImage editMode={editMode} src={chapter.imageUrl || ''} alt={chapter.title || `Chapter ${index + 1}`} preset="about" storageFolder="website" onChange={imageUrl => patchWebsite({ storyPages: pages.map((item, i) => i === index ? { ...item, imageUrl } : item) })} />
        </div> : null}
        <div className="bb-profile-about-tile-copy">
          <EditableText as="h2" editMode={editMode} className="bb-profile-about-tile-title" value={chapter.title || `Chapter ${index + 1}`} onChange={title => patchWebsite({ storyPages: pages.map((item, i) => i === index ? { ...item, title } : item) })} />
          <div className="bb-profile-about-tile-body">
            {editMode ? <EditableText as="p" editMode multiline value={chapter.body || ''} onChange={body => patchWebsite({ storyPages: pages.map((item, i) => i === index ? { ...item, body } : item) })} /> : String(chapter.body || '').split(/\n\s*\n/).filter(Boolean).map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
          </div>
        </div>
      </article>)}
    </div>
  </EditSection>;
}
