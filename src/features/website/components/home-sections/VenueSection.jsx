import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [activeIndex, setActiveIndex] = useState(0);
  const viewable = venueImages.filter((image) => Boolean(image.url));
  const active = viewerIndex == null ? null : viewable[viewerIndex] || null;
  const flowImages = editMode ? venueImages : viewable;
  const flowCount = flowImages.length;

  useEffect(() => {
    if (flowCount === 0) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((prev) => Math.min(prev, flowCount - 1));
  }, [flowCount]);

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

  const stepFlow = (delta) => {
    if (flowCount < 2) return;
    setActiveIndex((prev) => (prev + delta + flowCount) % flowCount);
  };

  const selectFlow = (index) => {
    setActiveIndex(index);
  };

  return (
    <EditSection
      editMode={editMode}
      title="Gallery"
      sectionId="gallery"
      hidden={hidden}
      coach="Add photos of your space and work."
      className="bb-public-home-block bb-public-venue-block bb-public-gallery-block"
    >
      <div className="bb-public-gutter">
        <div className="bb-public-measure-wide bb-public-venue-shell">
          <header className="bb-public-profile-section-head">
            <EditableText
              as="h2"
              className="bb-public-profile-heading bb-public-venue-title"
              editMode={editMode}
              value={website.venueTitle || 'Gallery'}
              placeholder="Gallery"
              onChange={(value) => patchWebsite({ venueTitle: value })}
            />
            {editMode || String(website.venueBody || '').trim() ? (
              <EditableText
                as="p"
                className="bb-public-profile-section-body"
                editMode={editMode}
                multiline
                value={website.venueBody || ''}
                placeholder="Short gallery intro"
                onChange={(value) => patchWebsite({ venueBody: value })}
              />
            ) : null}
          </header>

          {flowCount === 0 && editMode ? (
            <p className="bb-edit-section-coach m-0">Add photos to your gallery.</p>
          ) : null}

          {flowCount > 0 ? (
            <div className="bb-public-coverflow">
              <div
                className="bb-public-coverflow-stage"
                role="list"
                aria-label="Gallery photos"
                aria-roledescription="carousel"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowRight') {
                    event.preventDefault();
                    stepFlow(1);
                  }
                  if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    stepFlow(-1);
                  }
                }}
              >
                {flowImages.map((image, index) => {
                  const offset = index - activeIndex;
                  const abs = Math.abs(offset);
                  if (abs > 3) return null;
                  const canOpen = !editMode && Boolean(image.url);
                  const isCenter = offset === 0;

                  return (
                    <figure
                      key={image.id}
                      role="listitem"
                      className={`bb-public-coverflow-slide${isCenter ? ' is-active' : ''}${
                        canOpen ? ' is-openable' : ''
                      }`}
                      style={{
                        '--cf-offset': offset,
                        '--cf-abs': abs,
                        zIndex: 40 - abs
                      }}
                    >
                      {editMode ? (
                        <EditableImage
                          editMode={editMode}
                          src={image.url || ''}
                          className="bb-public-coverflow-media"
                          imgClassName="bb-public-coverflow-img"
                          storageFolder="venue"
                          preset="venue"
                          onChange={(url) => patchVenue(image.id, 'url', url)}
                        />
                      ) : (
                        <button
                          type="button"
                          className="bb-public-coverflow-hit"
                          onClick={() => {
                            if (isCenter) openViewer(image.id);
                            else selectFlow(index);
                          }}
                          aria-label={
                            isCenter ? 'View photo full size' : `Show photo ${index + 1}`
                          }
                          aria-current={isCenter ? 'true' : undefined}
                        >
                          {image.url ? (
                            <img src={image.url} alt="" className="bb-public-coverflow-img" />
                          ) : (
                            <span className="bb-public-coverflow-empty" />
                          )}
                        </button>
                      )}
                    </figure>
                  );
                })}
              </div>

              {flowCount > 1 ? (
                <div className="bb-public-coverflow-nav">
                  <button
                    type="button"
                    className="bb-public-coverflow-btn"
                    aria-label="Previous photo"
                    onClick={() => stepFlow(-1)}
                  >
                    <ChevronLeft size={18} strokeWidth={2.2} />
                  </button>
                  <button
                    type="button"
                    className="bb-public-coverflow-btn"
                    aria-label="Next photo"
                    onClick={() => stepFlow(1)}
                  >
                    <ChevronRight size={18} strokeWidth={2.2} />
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {editMode && venueImages.length < 8 ? (
            <button
              type="button"
              className="bb-ghost-btn justify-self-start"
              onClick={() =>
                patchWebsite({
                  venueImages: [...venueImages, { id: `v-${Date.now()}`, url: '', caption: '' }]
                })
              }
            >
              Add photo
            </button>
          ) : null}
        </div>
      </div>

      {active ? (
        <div
          className="bb-public-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Gallery photo"
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
