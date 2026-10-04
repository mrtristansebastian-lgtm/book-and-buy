import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../../shared/ui/Button';
import { EditableText, EditableImage, EditSection } from '../editable';

/** Retain every existing story page; a profile makes it readable without page flips. */
export function AboutSection({ website, editMode, hidden, patchWebsite }) {
  const stored = Array.isArray(website.aboutPages) ? website.aboutPages : [];
  const pages = stored.length ? stored : [
    { id: 'about', title: website.aboutTitle || 'About us', body: website.aboutBody || '', imageUrl: website.aboutImageUrl || '' },
    { id: 'mission', title: website.missionTitle || 'Our mission', body: website.missionBody || '', imageUrl: website.missionImageUrl || '' },
    { id: 'vision', title: website.visionTitle || 'Our vision', body: website.visionBody || '', imageUrl: website.visionImageUrl || '' }
  ];
  const update = (id, field, value) => patchWebsite({ aboutPages: pages.map((page) => page.id === id ? { ...page, [field]: value } : page) });
  const visiblePages = editMode ? pages : pages.filter((page) => page.body || page.imageUrl);
  if (!editMode && !visiblePages.length) return null;
  return (
    <EditSection editMode={editMode} hidden={hidden} title="About your business" sectionId="about"
      className="bb-business-profile-section bb-business-profile-about">
      <div className="bb-business-profile-stories">
        {visiblePages.map((page, index) => (
          <article key={page.id || index} className={`bb-business-profile-story${page.imageUrl || editMode ? ' has-photo' : ''}`}>
            <div className="bb-business-profile-story-copy">
              <EditableText as={index === 0 ? 'h2' : 'h3'} className={index === 0 ? 'bb-business-profile-heading' : 'bb-business-profile-subheading'}
                editMode={editMode} value={page.title || ''} placeholder="Section title" website={website} patchWebsite={patchWebsite}
                colorTokenId={`about.page.${page.id}.title`} onChange={(value) => update(page.id, 'title', value)} />
              <EditableText as="p" className="bb-business-profile-body" editMode={editMode} multiline
                value={page.body || ''} placeholder="Tell customers about your business" website={website} patchWebsite={patchWebsite}
                colorTokenId={`about.page.${page.id}.body`} onChange={(value) => update(page.id, 'body', value)} />
              {editMode && pages.length > 1 ? <button type="button" className="bb-public-inline-delete" aria-label={`Delete ${page.title || 'section'}`}
                onClick={() => patchWebsite({ aboutPages: pages.filter((row) => row.id !== page.id) })}><Trash2 size={16} aria-hidden="true" /></button> : null}
            </div>
            {page.imageUrl || editMode ? <EditableImage editMode={editMode} src={page.imageUrl || ''} alt={page.title || 'Our business'}
              className="bb-business-profile-story-photo" preset="about" placeholderLabel="Add photo"
              onChange={(url) => update(page.id, 'imageUrl', url)} /> : null}
          </article>
        ))}
      </div>
      {editMode && pages.length < 8 ? <Button action="add" variant="primary" onClick={() => patchWebsite({ aboutPages: [...pages, { id: `p-${Date.now()}`, title: '', body: '', imageUrl: '' }] })}>
        <Plus size={16} aria-hidden="true" />Add section
      </Button> : null}
    </EditSection>
  );
}
