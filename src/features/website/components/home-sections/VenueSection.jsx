import { useEffect, useState } from 'react';
import { EditableText, EditableImage, EditSection } from '../editable';

export function VenueSection({
  website,
  venueImages,
  editMode,
  hidden,
  patchVenue,
  patchWebsite
}) {
  const [viewerIndex, setViewerIndex] = useState(null);
  const viewable = venueImages.filter((image) => Boolean(image.url));
  const active = viewerIndex == null ? null : viewable[viewerIndex] || null;

  useEffect(() => {
    if (viewerIndex == null) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setViewerIndex(null);
      if (event.key === 'ArrowRight' && viewable.length > 1) {
        setViewerIndex((prev) => ((prev ?? 0) + 1) % viewable.length);
      }
      if (event.key === 'ArrowLeft' && viewable.length > 1) {
        setViewerIndex((prev) => ((prev ?? 0) - 1 + viewable.length) % viewable.length);
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [viewerIndex, viewable.length]);

  const openViewer = (imageId) => {
    if (editMode) return;
    const index = viewable.findIndex((image) => image.id === imageId);
    if (index >= 0) setViewerIndex(index);
  };

  return (
    <EditSection
      editMode={editMode}
      title="Venue"
      sectionId="venue"
      hidden={hidden}
      coach="Add 2–4 venue photos."
      className="bb-public-home-block bb-public-venue-block"
    >
      <div className="bb-public-gutter">
        <div className="bb-public-measure-wide bb-public-venue-shell">
          <header className="bb-public-venue-head">
            <p className="bb-public-section-eyebrow">
              <span className="bb-public-section-eyebrow-mark bb-public-native-fill" aria-hidden="true" />
              The space
            </p>
            <div className="bb-public-section-heading">
              <EditableText
                as="h2"
                className="bb-public-venue-title"
                editMode={editMode}
                value={website.venueTitle || 'Our space'}
                placeholder="Venue title"
                onChange={(value) => patchWebsite({ venueTitle: value })}
              />
              <span className="bb-public-section-accent bb-public-native-fill" aria-hidden="true" />
            </div>
          </header>

          <div className="bb-public-venue-grid">
            {venueImages.length === 0 && editMode ? (
              <p className="bb-edit-section-coach m-0">Add a venue photo to show your space.</p>
            ) : null}
            {venueImages.map((image, index) => {
              const canOpen = !editMode && Boolean(image.url);
              return (
                <figure
                  key={image.id}
                  className={`bb-public-venue-card${canOpen ? ' is-openable' : ''}`}
                  style={{ '--bb-venue-i': index }}
                >
                  {canOpen ? (
                    <button
                      type="button"
                      className="bb-public-venue-open"
                      onClick={() => openViewer(image.id)}
                      aria-label="View photo full size"
                    >
                      <EditableImage
                        editMode={false}
                        src={image.url || ''}
                        className="bb-public-venue-media"
                        imgClassName="bb-public-venue-img"
                        storageFolder="venue"
                        onChange={(url) => patchVenue(image.id, 'url', url)}
                      />
                    </button>
                  ) : (
                    <EditableImage
                      editMode={editMode}
                      src={image.url || ''}
                      className="bb-public-venue-media"
                      imgClassName="bb-public-venue-img"
                      storageFolder="venue"
                      onChange={(url) => patchVenue(image.id, 'url', url)}
                    />
                  )}
                </figure>
              );
            })}
          </div>

          {editMode && venueImages.length < 4 ? (
            <button
              type="button"
              className="bb-ghost-btn justify-self-start"
              onClick={() =>
                patchWebsite({
                  venueImages: [...venueImages, { id: `v-${Date.now()}`, url: '', caption: '' }]
                })
              }
            >
              Add venue photo
            </button>
          ) : null}
        </div>
      </div>

      {active ? (
        <div
          className="bb-public-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Venue photo"
          onClick={() => setViewerIndex(null)}
        >
          <button
            type="button"
            className="bb-public-lightbox-close"
            aria-label="Close"
            onClick={() => setViewerIndex(null)}
          >
            Close
          </button>
          {viewable.length > 1 ? (
            <button
              type="button"
              className="bb-public-lightbox-nav is-prev"
              aria-label="Previous photo"
              onClick={(event) => {
                event.stopPropagation();
                setViewerIndex((prev) => ((prev ?? 0) - 1 + viewable.length) % viewable.length);
              }}
            >
              ‹
            </button>
          ) : null}
          <img
            src={active.url}
            alt=""
            className="bb-public-lightbox-img"
            onClick={(event) => event.stopPropagation()}
          />
          {viewable.length > 1 ? (
            <button
              type="button"
              className="bb-public-lightbox-nav is-next"
              aria-label="Next photo"
              onClick={(event) => {
                event.stopPropagation();
                setViewerIndex((prev) => ((prev ?? 0) + 1) % viewable.length);
              }}
            >
              ›
            </button>
          ) : null}
          {viewable.length > 1 ? (
            <p className="bb-public-lightbox-count">
              {(viewerIndex ?? 0) + 1} / {viewable.length}
            </p>
          ) : null}
        </div>
      ) : null}
    </EditSection>
  );
}
