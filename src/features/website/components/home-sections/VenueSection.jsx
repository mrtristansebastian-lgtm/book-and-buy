import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BlankMedia } from '../../../../shared/ui/BlankMedia';
import { EditableText, EditableImage, EditSection } from '../editable';

const SWIPE_THRESHOLD_PX = 42;
const EMPTY_GALLERY_SLOTS = 3;

function circularOffsets(index, activeIndex, count) {
  if (count < 2) return [index - activeIndex];
  let offset = ((index - activeIndex) % count + count) % count;
  if (offset > Math.floor(count / 2)) offset -= count;
  if (count === 2 && offset === 1) return [1, -1];
  return [offset];
}

function makePlaceholderSlides(count = EMPTY_GALLERY_SLOTS) {
  return Array.from({ length: count }, (_, index) => ({
    id: `gallery-empty-${index}`,
    url: '',
    caption: '',
    placeholder: true
  }));
}

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
  const stageRef = useRef(null);
  const swipeRef = useRef({ x: 0, y: 0, active: false, locked: false });
  const stepFlowRef = useRef(() => {});
  const viewable = venueImages.filter((image) => Boolean(image.url));
  const active = viewerIndex == null ? null : viewable[viewerIndex] || null;
  const realFlow = editMode ? venueImages : viewable;
  const isEmptyGallery = realFlow.length === 0;
  const flowImages = isEmptyGallery ? makePlaceholderSlides() : realFlow;
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
  stepFlowRef.current = stepFlow;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || flowCount < 2) return undefined;

    const onStart = (event) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      swipeRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        active: true,
        locked: false
      };
    };

    const onMove = (event) => {
      const swipe = swipeRef.current;
      if (!swipe.active || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const dx = touch.clientX - swipe.x;
      const dy = touch.clientY - swipe.y;
      if (!swipe.locked) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        swipe.locked = Math.abs(dx) > Math.abs(dy);
        if (!swipe.locked) {
          swipe.active = false;
          return;
        }
      }
      if (swipe.locked) event.preventDefault();
    };

    const onEnd = (event) => {
      const swipe = swipeRef.current;
      if (!swipe.active) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - swipe.x;
      swipeRef.current = { x: 0, y: 0, active: false, locked: false };
      if (!swipe.locked || Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
      stepFlowRef.current(dx < 0 ? 1 : -1);
    };

    const onCancel = () => {
      swipeRef.current = { x: 0, y: 0, active: false, locked: false };
    };

    stage.addEventListener('touchstart', onStart, { passive: true });
    stage.addEventListener('touchmove', onMove, { passive: false });
    stage.addEventListener('touchend', onEnd, { passive: true });
    stage.addEventListener('touchcancel', onCancel, { passive: true });
    return () => {
      stage.removeEventListener('touchstart', onStart);
      stage.removeEventListener('touchmove', onMove);
      stage.removeEventListener('touchend', onEnd);
      stage.removeEventListener('touchcancel', onCancel);
    };
  }, [flowCount]);

  const selectFlow = (index) => {
    setActiveIndex(index);
  };

  const onPlaceholderUpload = (slotIndex, url) => {
    const next = makePlaceholderSlides().map((slot, index) => ({
      id: `v-${Date.now()}-${index}`,
      url: index === slotIndex ? url : '',
      caption: ''
    }));
    patchWebsite({ venueImages: next });
  };

  return (
    <EditSection
      editMode={editMode}
      title="Photos"
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
              value={website.venueTitle || 'Photos'}
              placeholder="Photos"
              website={website}
              patchWebsite={patchWebsite}
              colorTokenId="gallery.title"
              accentTokenId="gallery.titleUnderline"
              onChange={(value) => patchWebsite({ venueTitle: value })}
            />
            {editMode || String(website.venueBody || '').trim() ? (
              <EditableText
                as="p"
                className="bb-public-profile-section-body"
                editMode={editMode}
                multiline
                value={website.venueBody || ''}
                placeholder="Short photos intro"
                website={website}
                patchWebsite={patchWebsite}
                colorTokenId="gallery.body"
                onChange={(value) => patchWebsite({ venueBody: value })}
              />
            ) : null}
          </header>

          <div className={`bb-public-coverflow${isEmptyGallery ? ' is-empty' : ''}`}>
            <div
              ref={stageRef}
              className="bb-public-coverflow-stage"
              role="list"
              aria-label="Photos"
              aria-roledescription="carousel"
              tabIndex={0}
              onKeyDown={(event) => {
                if (isEmptyGallery && !editMode) return;
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
              {flowImages.flatMap((image, index) => {
                const canOpen = !editMode && Boolean(image.url);
                const offsets = circularOffsets(index, activeIndex, flowCount);
                return offsets.map((offset) => {
                  const abs = Math.abs(offset);
                  if (abs > 3) return null;
                  const isCenter = offset === 0;

                  return (
                    <figure
                      key={`${image.id}:${offset}`}
                      role="listitem"
                      className={`bb-public-coverflow-slide${isCenter ? ' is-active' : ''}${
                        canOpen ? ' is-openable' : ''
                      }${image.placeholder || !image.url ? ' is-blank' : ''}`}
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
                          placeholderLabel="Upload photo"
                          onChange={(url) => {
                            if (image.placeholder) onPlaceholderUpload(index, url);
                            else patchVenue(image.id, 'url', url);
                          }}
                        />
                      ) : image.url ? (
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
                          <img src={image.url} alt="" className="bb-public-coverflow-img" />
                        </button>
                      ) : (
                        <div className="bb-public-coverflow-hit bb-public-coverflow-hit--blank">
                          <BlankMedia
                            variant="image"
                            className="bb-public-coverflow-blank"
                            label="Photo coming soon"
                          />
                        </div>
                      )}
                    </figure>
                  );
                });
              })}
            </div>

            {flowCount > 1 ? (
              <div className="bb-public-coverflow-controls">
                <div className="bb-public-coverflow-nav bb-public-coverflow-nav--arrows">
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
                <div
                  className="bb-public-coverflow-dots"
                  role="tablist"
                  aria-label="Photos"
                >
                  {flowImages.map((image, index) => (
                    <button
                      key={image.id}
                      type="button"
                      role="tab"
                      className={`bb-public-coverflow-dot${
                        index === activeIndex ? ' is-active' : ''
                      }`}
                      aria-label={`Show photo ${index + 1}`}
                      aria-selected={index === activeIndex}
                      onClick={() => selectFlow(index)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {editMode && venueImages.length < 8 ? (
            <button
              type="button"
              className="bb-ghost-btn justify-self-start"
              onClick={() =>
                patchWebsite({
                  venueImages: [
                    ...(venueImages.length
                      ? venueImages
                      : makePlaceholderSlides().map((slot, index) => ({
                          id: `v-${Date.now()}-${index}`,
                          url: '',
                          caption: ''
                        }))),
                    { id: `v-${Date.now()}-extra`, url: '', caption: '' }
                  ].slice(0, 8)
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
          aria-label="Photo"
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
