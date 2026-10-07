import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';
import { EditableText, EditableImage, EditSection } from '../editable';
import { Button } from '../../../../shared/ui/Button';
import { useDetailDialog } from '../../../../shared/ui/useDetailDialog';

/** Photos stay in the same merchant data, presented as an accessible profile grid. */
export function VenueSection({ website, venueImages = [], editMode, hidden, patchVenue, patchWebsite }) {
  const [viewerIndex, setViewerIndex] = useState(null);
  const stripRef = useRef(null);
  const [photoIndex, setPhotoIndex] = useState(() => !editMode && venueImages.filter(image => image.url).length > 1 ? 1 : 0);
  const visible = editMode ? venueImages : venueImages.filter((image) => image.url);
  const looping = !editMode && visible.length > 1;
  const cards = looping ? [visible[visible.length - 1], ...visible, visible[0]] : visible;
  const centerPhoto = (index, behavior = 'smooth') => {
    const node = stripRef.current;
    const target = node?.children[index];
    if (target) node.scrollTo({ left: target.offsetLeft - (node.clientWidth - target.clientWidth) / 2, behavior });
  };
  const photoKeys = visible.map(image => image.id + image.url).join('|');
  useLayoutEffect(() => {
    if (editMode) return;
    const initial = looping ? 1 : 0;
    setPhotoIndex(initial);
    centerPhoto(initial, 'instant');
    const observer = new ResizeObserver(() => centerPhoto(initial, 'instant'));
    if (stripRef.current) observer.observe(stripRef.current);
    return () => observer.disconnect();
  }, [editMode, looping, photoKeys]);
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
      <div ref={stripRef} className={editMode ? 'bb-business-profile-photo-grid' : 'bb-profile-photo-strip'} onScroll={(event) => {
        if (editMode) return;
        const node = event.currentTarget;
        const center = node.scrollLeft + node.clientWidth / 2;
        const elements = [...node.children];
        const nearest = elements.reduce((best, card, index) => Math.abs(card.offsetLeft + card.clientWidth / 2 - center) < Math.abs(elements[best].offsetLeft + elements[best].clientWidth / 2 - center) ? index : best, 0);
        setPhotoIndex(nearest);
        if (looping && Math.abs(elements[nearest].offsetLeft + elements[nearest].clientWidth / 2 - center) < 1) {
          if (nearest === 0) centerPhoto(visible.length, 'instant');
          else if (nearest === cards.length - 1) centerPhoto(1, 'instant');
        }
      }} onKeyDown={event => {
        if (editMode || !looping || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        centerPhoto(photoIndex + (event.key === 'ArrowRight' ? 1 : -1));
      }}>
        {cards.map((image, index) => (
          <figure key={`${image.id}-${index}`} data-current={index === photoIndex}>
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
              <button type="button" className="bb-business-profile-gallery-hit" onClick={() => index === photoIndex ? setViewerIndex(looping ? (index - 1 + visible.length) % visible.length : index) : centerPhoto(index)} aria-label={`${index === photoIndex ? 'View' : 'Show'} ${image.caption || `photo ${index + 1}`}`} aria-current={index === photoIndex ? 'true' : undefined}>
                <img src={image.url} alt={image.caption || `Business photo ${index + 1}`} loading="lazy" />
              </button>
            </>}
          </figure>
        ))}
      </div>
      {editMode && venueImages.length < 8 ? <Button action="add" variant="primary" onClick={() => patchWebsite({ venueImages: [...venueImages, { id: `v-${Date.now()}`, url: '', caption: '' }] })}>Add photo</Button> : null}
      {active && typeof document !== 'undefined' ? createPortal(
        <div className="bb-business-photo-overlay">
          <div className="bb-business-photo-backdrop" onClick={close} />
          <section ref={dialogRef} className="bb-business-photo-dialog" role="dialog" aria-modal="true" aria-label="Business photo"
            onKeyDown={(event) => {
              if (visible.length < 2 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
              event.preventDefault();
              setViewerIndex((index) => (index + (event.key === 'ArrowRight' ? 1 : -1) + visible.length) % visible.length);
            }}>
            <header><span>Photos</span><Button action="close" variant="secondary" onClick={close}>Close</Button></header>
            <img src={active.url} alt={active.caption || 'Business photo'} />
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
