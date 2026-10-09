import { EditableImage, EditableText, EditSection } from '../editable';
import { useId, useRef, useState } from 'react';
import { Button } from '../../../../shared/ui/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [selected, setSelected] = useState(null);
  const [direction, setDirection] = useState('next');
  const tabId = useId();
  const swipeStart = useRef(null);
  const activeIndex = Math.max(0, pages.findIndex(page => page.id === selected));
  const page = pages[activeIndex] || {};
  const story = page.body || '';
  const image = page.imageUrl || '';
  const patchPage = (patch) => patchWebsite({ storyPages: pages.map((item, index) => index === activeIndex ? { ...item, ...patch } : item) });
  const selectPage = (index, movement) => { setDirection(movement || (index < activeIndex ? 'previous' : 'next')); setSelected(pages[index].id); };
  if (!editMode && !pages.some(item => String(item.body || '').trim())) return null;
  if (!editMode) return <EditSection hidden={hidden} title="Our story" sectionId="about"
    className="bb-business-profile-section bb-profile-about-overview">
    <div className={`bb-profile-about-overview-grid${pages.length > 1 ? ' has-multiple' : ''}${pages.length > 2 ? ' has-three-or-more' : ''}`}>
      {pages.map((chapter, index) => <article key={chapter.id} aria-labelledby={`${tabId}-chapter-${index}`}
        className={`bb-profile-about-tile${chapter.imageUrl ? ' has-image' : ''}`}>
        {chapter.imageUrl ? <div className="bb-profile-about-tile-image">
          <img src={chapter.imageUrl} alt={chapter.title || `Chapter ${index + 1}`} />
        </div> : null}
        <div className="bb-profile-about-tile-copy">
          <h2 id={`${tabId}-chapter-${index}`} className="bb-profile-about-tile-title">{chapter.title || `Chapter ${index + 1}`}</h2>
          <div className="bb-profile-about-tile-body">
            {String(chapter.body || '').split(/\n\s*\n/).filter(Boolean).map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
          </div>
        </div>
      </article>)}
    </div>
  </EditSection>;
  return <EditSection editMode={editMode} hidden={hidden} title="Our story" sectionId="about"
    className="bb-business-profile-section bb-profile-about-section">
    <header className="bb-business-profile-section-head bb-profile-about-head">
      <div id={`${tabId}-title`} className="bb-profile-about-title-wrap">
        <EditableText as="h2" className="bb-business-profile-heading bb-profile-about-title" editMode={editMode}
          value={page.title || 'Our story'} placeholder="Story page title"
          onChange={(value) => patchPage({ title: value })} />
      </div>
      {pages.length > 1 ? <div className="bb-profile-about-controls">
        <span className="bb-profile-about-count" aria-live="polite">{activeIndex + 1} / {pages.length}</span>
        <button type="button" aria-label="Previous story chapter" onClick={() => selectPage((activeIndex - 1 + pages.length) % pages.length, 'previous')}>
          <ChevronLeft size={18} strokeWidth={1.7} aria-hidden="true" />
        </button>
        <button type="button" aria-label="Next story chapter" onClick={() => selectPage((activeIndex + 1) % pages.length, 'next')}>
          <ChevronRight size={18} strokeWidth={1.7} aria-hidden="true" />
        </button>
      </div> : null}
    </header>
    {pages.length > 1 ? <nav className="bb-profile-about-chapters" role="tablist" aria-label="Story timeline">
      {pages.map((item, index) => <button key={item.id} id={`${tabId}-${index}`} type="button" role="tab"
        aria-selected={index === activeIndex} aria-controls={`${tabId}-panel`} tabIndex={index === activeIndex ? 0 : -1}
        onClick={() => selectPage(index)} onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? pages.length - 1 : (activeIndex + (event.key === 'ArrowRight' ? 1 : -1) + pages.length) % pages.length;
          selectPage(next, event.key === 'ArrowRight' ? 'next' : event.key === 'ArrowLeft' ? 'previous' : undefined); event.currentTarget.parentElement.children[next]?.focus();
        }}>{item.title || `Chapter ${index + 1}`}</button>)}
    </nav> : null}
    <div key={page.id} id={`${tabId}-panel`} role={pages.length > 1 ? 'tabpanel' : undefined}
      aria-labelledby={pages.length > 1 ? `${tabId}-${activeIndex}` : `${tabId}-title`}
      tabIndex={pages.length > 1 ? 0 : undefined}
      className={`bb-profile-about-chapter${image || editMode ? ' has-photo' : ''} bb-profile-about-chapter--${direction}`}
      onTouchStart={event => {
        if (editMode || pages.length < 2) return;
        const touch = event.touches[0]; swipeStart.current = { x: touch.clientX, y: touch.clientY };
      }} onTouchEnd={event => {
        const start = swipeStart.current; swipeStart.current = null;
        if (!start || editMode) return;
        const touch = event.changedTouches[0]; const dx = touch.clientX - start.x; const dy = touch.clientY - start.y;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) selectPage((activeIndex + (dx < 0 ? 1 : -1) + pages.length) % pages.length, dx < 0 ? 'next' : 'previous');
      }}>
    {image || editMode ? <EditableImage editMode={editMode} src={image}
      className="bb-profile-about-photo" alt={page.title || 'Our story'} preset="about" storageFolder="website"
      placeholderLabel="Add story photo" editLabel="Edit story photo"
      onChange={(url) => patchPage({ imageUrl: url })} /> : null}
    <div className="bb-profile-about-copy">
    {editMode ? <>
      <EditableText as="p" className="bb-business-profile-body bb-profile-about-text" editMode multiline
        value={story} placeholder="Tell customers the story behind your business."
        onChange={(value) => patchPage({ body: value })} />
    </> : <div className="bb-profile-about-text">
      {story.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index} className="bb-business-profile-body">{paragraph}</p>)}
    </div>}</div></div>
    {editMode ? <Button className="bb-profile-about-add" action="add" variant="secondary" onClick={() => {
      const next = { id: `story-${Date.now()}`, title: 'Next chapter', body: '', imageUrl: '' };
      patchWebsite({ storyPages: [...pages, next] }); setDirection('next'); setSelected(next.id);
    }}>Add story page</Button> : null}
  </EditSection>;
}
