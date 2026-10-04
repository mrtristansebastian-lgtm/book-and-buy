import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';
import { EditableText, EditableImage, EditSection } from '../editable';
import { Button } from '../../../../shared/ui/Button';
import { useDetailDialog } from '../../../../shared/ui/useDetailDialog';

/** Photos stay in the same merchant data, presented as an accessible profile grid. */
export function VenueSection({ website, venueImages = [], editMode, hidden, patchVenue, patchWebsite }) {
  const [viewerIndex, setViewerIndex] = useState(null);
  const visible = editMode ? venueImages : venueImages.filter((image) => image.url);
  const close = useCallback(() => setViewerIndex(null), []);
  const dialogRef = useDetailDialog(viewerIndex != null, close);
  const active = viewerIndex == null ? null : visible[viewerIndex];
  if (!editMode && !visible.length) return null;
  return (
    <EditSection editMode={editMode} title="Photos" sectionId="gallery" hidden={hidden}
      className="bb-business-profile-section bb-business-profile-gallery">
      <header className="bb-business-profile-section-head">
        <EditableText as="h2" className="bb-business-profile-heading" editMode={editMode}
          value={website.venueTitle || 'Photos'} placeholder="Photos" website={website} patchWebsite={patchWebsite}
          colorTokenId="gallery.title" onChange={(value) => patchWebsite({ venueTitle: value })} />
        <EditableText as="p" className="bb-business-profile-body" editMode={editMode} multiline
          value={website.venueBody || ''} placeholder="A short introduction to your photos" website={website} patchWebsite={patchWebsite}
          colorTokenId="gallery.body" onChange={(value) => patchWebsite({ venueBody: value })} />
      </header>
      <div className="bb-business-profile-photo-grid">
        {visible.map((image, index) => (
          <figure key={image.id}>
            {editMode ? <>
              <EditableImage editMode src={image.url || ''} alt={image.caption || `Business photo ${index + 1}`}
                className="bb-business-profile-gallery-media" preset="venue" storageFolder="venue"
                placeholderLabel="Add photo" onChange={(url) => patchVenue(image.id, 'url', url)} />
              <div className="bb-business-profile-caption-edit">
                <EditableText as="figcaption" className="bb-business-profile-caption" editMode multiline
                  value={image.caption || ''} placeholder="Photo caption" onChange={(value) => patchVenue(image.id, 'caption', value)} />
                <button type="button" className="bb-public-inline-delete" aria-label={`Delete photo ${index + 1}`}
                  onClick={() => patchWebsite({ venueImages: venueImages.filter((row) => row.id !== image.id) })}><Trash2 size={16} aria-hidden="true" /></button>
              </div>
            </> : <>
              <button type="button" className="bb-business-profile-gallery-hit" onClick={() => setViewerIndex(index)} aria-label={`View ${image.caption || `photo ${index + 1}`}`}>
                <img src={image.url} alt={image.caption || `Business photo ${index + 1}`} loading="lazy" />
              </button>
              {image.caption ? <figcaption className="bb-business-profile-caption">{image.caption}</figcaption> : null}
            </>}
          </figure>
        ))}
      </div>
      {editMode && venueImages.length < 8 ? <Button action="add" variant="primary" onClick={() => patchWebsite({ venueImages: [...venueImages, { id: `v-${Date.now()}`, url: '', caption: '' }] })}>Add photo</Button> : null}
      {active && typeof document !== 'undefined' ? createPortal(
        <div className="bb-business-photo-overlay">
          <div className="bb-business-photo-backdrop" onClick={close} />
          <section ref={dialogRef} className="bb-business-photo-dialog" role="dialog" aria-modal="true" aria-label="Business photo">
            <header><span>Photos</span><Button action="close" variant="secondary" onClick={close}>Close</Button></header>
            <img src={active.url} alt={active.caption || 'Business photo'} />
            {active.caption ? <p>{active.caption}</p> : null}
            {visible.length > 1 ? <footer>
              <Button action="back" variant="secondary" onClick={() => setViewerIndex((viewerIndex - 1 + visible.length) % visible.length)}>Previous</Button>
              <span aria-live="polite">{viewerIndex + 1} / {visible.length}</span>
              <Button action="next" variant="secondary" onClick={() => setViewerIndex((viewerIndex + 1) % visible.length)}>Next</Button>
            </footer> : null}
          </section>
        </div>, document.body
      ) : null}
    </EditSection>
  );
}
