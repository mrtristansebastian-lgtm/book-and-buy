import { EditableImage, EditableText, EditSection } from '../editable';
import { useId, useRef, useState } from 'react';
import { Button } from '../../../../shared/ui/Button';

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
  const selectPage = (index) => { setDirection(index < activeIndex ? 'previous' : 'next'); setSelected(pages[index].id); };
  if (!editMode && !pages.some(item => String(item.body || '').trim())) return null;
  return <EditSection editMode={editMode} hidden={hidden} title="Our story" sectionId="about"
    className="bb-business-profile-section bb-profile-story bb-profile-story--book">
    <div key={page.id} id={`${tabId}-panel`} role="tabpanel" aria-labelledby={pages.length > 1 ? `${tabId}-${activeIndex}` : undefined}
      className={`bb-profile-story-card${image || editMode ? ' has-photo' : ''} bb-profile-story-page--${direction}`}
      onTouchStart={event => {
        if (editMode || pages.length < 2) return;
        const touch = event.touches[0]; swipeStart.current = { x: touch.clientX, y: touch.clientY };
      }} onTouchEnd={event => {
        const start = swipeStart.current; swipeStart.current = null;
        if (!start || editMode) return;
        const touch = event.changedTouches[0]; const dx = touch.clientX - start.x; const dy = touch.clientY - start.y;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) selectPage((activeIndex + (dx < 0 ? 1 : -1) + pages.length) % pages.length);
      }}>
    {image || editMode ? <EditableImage editMode={editMode} src={image}
      className="bb-profile-story-card-image" alt={page.title || 'Our story'} preset="about" storageFolder="website"
      placeholderLabel="Add story photo" editLabel="Edit story photo"
      onChange={(url) => patchPage({ imageUrl: url })} /> : null}
    <div className="bb-profile-story-card-copy">
    <EditableText as="h2" className="bb-business-profile-heading" editMode={editMode}
      value={page.title || 'Our story'} placeholder="Story page title"
      onChange={(value) => patchPage({ title: value })} />
    {editMode ? <>
      <EditableText as="p" className="bb-business-profile-body bb-profile-story-text" editMode multiline
        value={story} placeholder="Tell customers the story behind your business."
        onChange={(value) => patchPage({ body: value })} />
    </> : <div className="bb-profile-story-text">
      {story.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index} className="bb-business-profile-body">{paragraph}</p>)}
    </div>}</div></div>
    {pages.length > 1 ? <nav className="bb-profile-story-timeline" role="tablist" aria-label="Story timeline">
      {pages.map((item, index) => <button key={item.id} id={`${tabId}-${index}`} type="button" role="tab"
        aria-selected={index === activeIndex} aria-controls={`${tabId}-panel`} tabIndex={index === activeIndex ? 0 : -1}
        onClick={() => selectPage(index)} onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? pages.length - 1 : (activeIndex + (event.key === 'ArrowRight' ? 1 : -1) + pages.length) % pages.length;
          selectPage(next); event.currentTarget.parentElement.children[next]?.focus();
        }} aria-label={item.title || `Page ${index + 1}`} title={item.title || `Page ${index + 1}`}><span className="bb-profile-story-step" aria-hidden="true" /></button>)}
    </nav> : null}
    {editMode ? <Button action="add" variant="secondary" onClick={() => {
      const next = { id: `story-${Date.now()}`, title: 'Next chapter', body: '', imageUrl: '' };
      patchWebsite({ storyPages: [...pages, next] }); setDirection('next'); setSelected(next.id);
    }}>Add story page</Button> : null}
  </EditSection>;
}
