import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { EditableText, EditableImage, EditSection } from '../editable';

const MAX_ABOUT_PAGES = 8;
const SWIPE_THRESHOLD_PX = 48;
/** Fixed whitespace between About copy and the front image on mobile. */
const MOBILE_COPY_IMAGE_GAP_PX = 14;

function legacyAboutPages(website = {}) {
  return [
    {
      id: 'about',
      title: website.aboutTitle || 'About us',
      body: website.aboutBody || '',
      imageUrl: website.aboutImageUrl || ''
    },
    {
      id: 'mission',
      title: website.missionTitle || 'Our mission',
      body: website.missionBody || '',
      imageUrl: website.missionImageUrl || ''
    },
    {
      id: 'vision',
      title: website.visionTitle || 'Our vision',
      body: website.visionBody || '',
      imageUrl: website.visionImageUrl || ''
    }
  ];
}

function resolveAboutPages(website = {}) {
  const stored = Array.isArray(website.aboutPages) ? website.aboutPages : [];
  if (stored.length > 0) {
    return stored.map((page, index) => ({
      id: page.id || `page-${index + 1}`,
      title: page.title || '',
      body: page.body || '',
      imageUrl: page.imageUrl || ''
    }));
  }
  return legacyAboutPages(website);
}

export function AboutSection({ website, editMode, hidden, patchWebsite }) {
  const journeyRef = useRef(null);
  const bookRef = useRef(null);
  const stageRef = useRef(null);
  const [activePage, setActivePage] = useState(0);
  const [direction, setDirection] = useState(1);
  const [revealed, setRevealed] = useState(() => Boolean(editMode));
  const [mobileMediaTopPx, setMobileMediaTopPx] = useState(null);
  const swipeRef = useRef({
    pointerId: null,
    startX: 0,
    startY: 0,
    dx: 0,
    locked: false,
    active: false
  });
  const aboutPages = resolveAboutPages(website);
  const pageCount = aboutPages.length;

  useEffect(() => {
    setActivePage((current) => Math.min(current, Math.max(pageCount - 1, 0)));
  }, [pageCount]);

  const goToPage = (nextIndex) => {
    const clamped = Math.max(0, Math.min(pageCount - 1, nextIndex));
    if (clamped === activePage) return;
    setDirection(clamped > activePage ? 1 : -1);
    setActivePage(clamped);
  };

  const patchAboutPages = (nextPages) => {
    patchWebsite({ aboutPages: nextPages });
  };

  const patchAboutPage = (id, field, value) => {
    patchAboutPages(
      aboutPages.map((page) => (page.id === id ? { ...page, [field]: value } : page))
    );
  };

  useEffect(() => {
    if (editMode) {
      setRevealed(true);
      return undefined;
    }

    const journey = journeyRef.current;
    if (!journey || typeof IntersectionObserver === 'undefined') return undefined;

    const block = journey.querySelector('[data-journey-reveal="story"]');
    if (!block) return undefined;

    journey.classList.add('has-reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setRevealed(true);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' }
    );

    observer.observe(block);
    return () => {
      observer.disconnect();
    };
  }, [editMode]);

  useEffect(() => {
    const journey = journeyRef.current;
    if (!journey || editMode) return undefined;
    journey.classList.add('has-reveal');
    return () => {
      journey.classList.remove('has-reveal');
    };
  }, [editMode]);

  useEffect(() => {
    const book = bookRef.current;
    if (!book || pageCount < 2) return undefined;

    const onKey = (event) => {
      if (event.target instanceof HTMLElement) {
        const tag = event.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target.isContentEditable) {
          return;
        }
      }
      if (
        !book.matches(':hover') &&
        document.activeElement !== book &&
        !book.contains(document.activeElement)
      ) {
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToPage(activePage + 1);
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPage(activePage - 1);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activePage, pageCount]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || pageCount < 2) return undefined;

    const onStart = (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (
        event.target instanceof Element &&
        event.target.closest(
          'input, textarea, button, a, [contenteditable="true"], .bb-editable-text, .bb-editable-image'
        )
      ) {
        return;
      }
      swipeRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        dx: 0,
        locked: false,
        active: true
      };
      stage.setPointerCapture?.(event.pointerId);
    };

    const onMove = (event) => {
      const swipe = swipeRef.current;
      if (!swipe.active || swipe.pointerId !== event.pointerId) return;
      const dx = event.clientX - swipe.startX;
      const dy = event.clientY - swipe.startY;
      if (!swipe.locked) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        swipe.locked = Math.abs(dx) > Math.abs(dy) * 1.15;
        if (!swipe.locked) {
          swipe.active = false;
          return;
        }
      }
      swipe.dx = dx;
      event.preventDefault();
    };

    const onEnd = (event) => {
      const swipe = swipeRef.current;
      if (!swipe.active || swipe.pointerId !== event.pointerId) return;
      const dx = swipe.locked ? swipe.dx : 0;
      swipeRef.current = {
        pointerId: null,
        startX: 0,
        startY: 0,
        dx: 0,
        locked: false,
        active: false
      };
      if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
      goToPage(dx < 0 ? activePage + 1 : activePage - 1);
    };

    stage.addEventListener('pointerdown', onStart);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onEnd);
    stage.addEventListener('pointercancel', onEnd);
    return () => {
      stage.removeEventListener('pointerdown', onStart);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerup', onEnd);
      stage.removeEventListener('pointercancel', onEnd);
    };
  }, [activePage, pageCount]);

  if (hidden && !editMode) return null;

  return (
    <div className="bb-public-about-journey-shell" ref={journeyRef}>
      <EditSection
        editMode={editMode}
        title="About us"
        sectionId="about"
        hidden={hidden}
        coach="Tell your story across pages — big photo, title, and body. Use the arrows under the photo, swipe, or press arrow keys to flip."
        className={`bb-public-home-block bb-public-about-block bb-public-about-journey bb-public-about-story-block${
          editMode ? ' is-editing' : ''
        }`}
      >
        <section
          ref={bookRef}
          className={`bb-public-about-book is-dir-${direction > 0 ? 'next' : 'prev'}${
            revealed ? ' is-visible' : ''
          }`}
          data-journey-reveal="story"
          aria-label="About our business"
          tabIndex={0}
        >
          <div
            ref={stageRef}
            className="bb-public-about-book-stage"
            role="group"
            aria-roledescription="carousel"
            aria-label="About story pages"
            style={
              mobileMediaTopPx != null
                ? { '--bb-about-mobile-media-top': `${mobileMediaTopPx}px` }
                : undefined
            }
          >
            {aboutPages.map((page, index) => (
              <EditorialPage
                key={page.id}
                page={page}
                index={index}
                activePage={activePage}
                pageCount={pageCount}
                direction={direction}
                editMode={editMode}
                website={website}
                patchWebsite={patchWebsite}
                onTitle={(value) => patchAboutPage(page.id, 'title', value)}
                onBody={(value) => patchAboutPage(page.id, 'body', value)}
                onImage={(url) => patchAboutPage(page.id, 'imageUrl', url)}
                onGoToPage={goToPage}
                onMobileMediaTop={setMobileMediaTopPx}
              />
            ))}
          </div>

          {editMode ? (
            <div className="bb-public-section-actions bb-public-about-page-actions">
              {aboutPages.length < MAX_ABOUT_PAGES ? (
                <button
                  type="button"
                  className="bb-public-about-add-page bb-public-section-action"
                  onClick={() => {
                    const next = [
                      ...aboutPages,
                      {
                        id: `p-${Date.now()}`,
                        title: '',
                        body: '',
                        imageUrl: ''
                      }
                    ];
                    patchAboutPages(next);
                    setDirection(1);
                    setActivePage(next.length - 1);
                  }}
                >
                  <Plus size={17} aria-hidden="true" />
                  Add page
                </button>
              ) : null}
              {aboutPages.length > 1 ? (
                <button
                  type="button"
                  className="bb-public-about-page-remove bb-public-section-action"
                  aria-label={`Delete ${aboutPages[activePage]?.title || 'page'}`}
                  onClick={() => {
                    const currentId = aboutPages[activePage]?.id;
                    if (!currentId) return;
                    const next = aboutPages.filter((item) => item.id !== currentId);
                    patchAboutPages(next);
                    setActivePage((current) => Math.min(current, next.length - 1));
                  }}
                >
                  <Trash2 size={15} aria-hidden="true" />
                  Remove page
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
      </EditSection>
    </div>
  );
}

function EditorialPage({
  page,
  index,
  activePage,
  pageCount,
  direction,
  editMode,
  website,
  patchWebsite,
  onTitle,
  onBody,
  onImage,
  onGoToPage,
  onMobileMediaTop
}) {
  const current = index === activePage;
  const behind = index < activePage;
  const ahead = index > activePage;
  const stackDepth = Math.abs(index - activePage);
  const copyRef = useRef(null);

  useLayoutEffect(() => {
    if (!current || typeof onMobileMediaTop !== 'function') return undefined;
    const copy = copyRef.current;
    if (!copy) return undefined;
    const stage = copy.closest('.bb-public-about-book-stage');
    if (!stage) return undefined;

    const measure = () => {
      const stageBox = stage.getBoundingClientRect();
      const copyBox = copy.getBoundingClientRect();
      const nextTop = Math.max(
        0,
        Math.round(copyBox.bottom - stageBox.top + MOBILE_COPY_IMAGE_GAP_PX)
      );
      onMobileMediaTop((prev) => (prev === nextTop ? prev : nextTop));
    };

    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(copy);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [current, onMobileMediaTop, page.title, page.body]);

  return (
    <article
      className={`bb-public-about-page${current ? ' is-current' : ''}${
        behind ? ' is-behind' : ''
      }${ahead ? ' is-ahead' : ''} is-dir-${direction > 0 ? 'next' : 'prev'}`}
      style={{
        '--bb-about-page-z': current ? pageCount + 2 : Math.max(pageCount - stackDepth, 1),
        '--bb-about-stack': stackDepth
      }}
      aria-hidden={!current}
    >
      <div className="bb-public-about-page-media-stage">
        <div className="bb-public-about-page-media">
          <EditableImage
            editMode={editMode}
            src={page.imageUrl}
            className="bb-public-about-page-image"
            imgClassName="bb-public-about-page-img"
            storageFolder="brand"
            preset="aboutPage"
            onChange={onImage}
          />
        </div>
      </div>
      <div className="bb-public-about-page-copy" ref={copyRef}>
        <EditableText
          as="h2"
          className="bb-public-profile-heading bb-public-about-page-title"
          editMode={editMode}
          value={page.title}
          placeholder="Page title"
          onChange={onTitle}
          website={website}
          patchWebsite={patchWebsite}
          colorTokenId={`about.page.${page.id}.title`}
          accentTokenId={`about.page.${page.id}.underline`}
        />
        <EditableText
          as="p"
          className="bb-public-profile-section-body bb-public-about-page-body"
          editMode={editMode}
          multiline
          value={page.body}
          placeholder="Tell this part of your story"
          onChange={onBody}
          website={website}
          patchWebsite={patchWebsite}
          colorTokenId={`about.page.${page.id}.body`}
        />
      </div>
      {current && pageCount > 1 ? (
        <nav className="bb-public-about-page-nav" aria-label="About pages">
          <button
            type="button"
            className="bb-public-about-page-nav-btn"
            aria-label="Previous page"
            disabled={activePage <= 0}
            onClick={() => onGoToPage(activePage - 1)}
          >
            <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="bb-public-about-page-nav-btn"
            aria-label="Next page"
            disabled={activePage >= pageCount - 1}
            onClick={() => onGoToPage(activePage + 1)}
          >
            <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </nav>
      ) : null}
    </article>
  );
}
