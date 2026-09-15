import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Award,
  CalendarCheck,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Heart,
  Info,
  Leaf,
  PackageCheck,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trash2,
  Users,
  Zap
} from 'lucide-react';
import { EditableText, EditableImage, EditSection, StylePopover } from '../editable';
import {
  readStyleToken,
  styleTokenColor,
  STYLE_TOKEN_GRADIENT
} from '../editable/styleTokens';
import { EditableColor } from '../editable/EditableColor';

const OFFER_NUMBER_OPTIONS = Array.from({ length: 9 }, (_, index) => {
  const value = String(index + 1);
  return {
    id: `n${value}`,
    label: value,
    kind: 'number',
    value
  };
});

const OFFER_ICON_OPTIONS = [
  ...OFFER_NUMBER_OPTIONS,
  { id: 'info', label: 'Information', kind: 'icon', Icon: Info },
  { id: 'target', label: 'Target', kind: 'icon', Icon: Target },
  { id: 'eye', label: 'Vision', kind: 'icon', Icon: Eye },
  { id: 'sparkles', label: 'Sparkles', kind: 'icon', Icon: Sparkles },
  { id: 'calendar', label: 'Calendar', kind: 'icon', Icon: CalendarCheck },
  { id: 'award', label: 'Award', kind: 'icon', Icon: Award },
  { id: 'heart', label: 'Heart', kind: 'icon', Icon: Heart },
  { id: 'shield', label: 'Shield', kind: 'icon', Icon: ShieldCheck },
  { id: 'energy', label: 'Energy', kind: 'icon', Icon: Zap },
  { id: 'people', label: 'People', kind: 'icon', Icon: Users },
  { id: 'clock', label: 'Clock', kind: 'icon', Icon: Clock3 },
  { id: 'package', label: 'Package', kind: 'icon', Icon: PackageCheck },
  { id: 'leaf', label: 'Leaf', kind: 'icon', Icon: Leaf },
  { id: 'craft', label: 'Craft', kind: 'icon', Icon: ChefHat },
  { id: 'star', label: 'Star', kind: 'icon', Icon: Star }
];

const OFFER_ICON_MAP = Object.fromEntries(
  OFFER_ICON_OPTIONS.map((option) => [option.id, option])
);

function resolveOfferMarker(reason, index) {
  const fallback = OFFER_NUMBER_OPTIONS[index % OFFER_NUMBER_OPTIONS.length];
  const option = OFFER_ICON_MAP[reason?.icon] || fallback;
  return option;
}

function OfferMarkerGlyph({ option, size = 23 }) {
  if (option.kind === 'number') {
    return (
      <span className="bb-public-about-marker-digit" aria-hidden="true">
        {option.value}
      </span>
    );
  }
  const Icon = option.Icon;
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />;
}

const MAX_ABOUT_PAGES = 8;

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

export function AboutSection({
  website,
  reasons = [],
  editMode,
  hidden,
  patchWebsite,
  patchReason
}) {
  const journeyRef = useRef(null);
  const [activePage, setActivePage] = useState(0);
  const [openIconPicker, setOpenIconPicker] = useState(null);
  const touchStartRef = useRef(null);
  const aboutPages = resolveAboutPages(website);

  useEffect(() => {
    setActivePage((current) => Math.min(current, Math.max(aboutPages.length - 1, 0)));
  }, [aboutPages.length]);

  const patchAboutPages = (nextPages) => {
    patchWebsite({ aboutPages: nextPages });
  };

  const patchAboutPage = (id, field, value) => {
    patchAboutPages(
      aboutPages.map((page) => (page.id === id ? { ...page, [field]: value } : page))
    );
  };

  useEffect(() => {
    const journey = journeyRef.current;
    if (!journey || editMode || typeof IntersectionObserver === 'undefined') return undefined;

    const blocks = [...journey.querySelectorAll('[data-journey-reveal]')];
    journey.classList.add('has-reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' }
    );

    blocks.forEach((block) => observer.observe(block));
    return () => {
      observer.disconnect();
      journey.classList.remove('has-reveal');
    };
  }, [editMode]);

  if (hidden && !editMode) return null;

  return (
    <div className="bb-public-about-journey-shell" ref={journeyRef}>
      <EditSection
        editMode={editMode}
        title="What we offer"
        sectionId="offer"
        hidden={hidden}
        coach="List what you offer — short points with numbers or icons."
        className={`bb-public-home-block bb-public-about-block bb-public-about-journey bb-public-about-offer-block${
          editMode ? ' is-editing' : ''
        }`}
      >
        <section className="bb-public-about-offer-intro" data-journey-reveal>
          <header className="bb-public-about-journey-head">
            <EditableText
              as="h2"
              className="bb-public-profile-heading bb-public-about-journey-title"
              editMode={editMode}
              value={website.reasonsTitle || 'What we offer'}
              placeholder="What we offer"
              onChange={(value) => patchWebsite({ reasonsTitle: value })}
              website={website}
              patchWebsite={patchWebsite}
              colorTokenId="offer.title"
              accentTokenId="offer.titleUnderline"
            />
            <EditableText
              as="p"
              className="bb-public-about-journey-body"
              editMode={editMode}
              multiline
              value={
                website.reasonsBody ||
                'Thoughtful services, practical expertise, and details designed around the people we serve.'
              }
              placeholder="A short introduction to what makes your business different."
              onChange={(value) => patchWebsite({ reasonsBody: value })}
              website={website}
              patchWebsite={patchWebsite}
              colorTokenId="offer.body"
            />
          </header>

          <div className="bb-public-about-pillars">
            {reasons.map((reason, index) => (
              <article
                key={reason.id}
                className={`bb-public-about-pillar${
                  openIconPicker === reason.id ? ' has-open-picker' : ''
                }`}
              >
                <OfferMarker
                  reason={reason}
                  index={index}
                  editMode={editMode}
                  pickerOpen={openIconPicker === reason.id}
                  website={website}
                  patchWebsite={patchWebsite}
                  onTogglePicker={() =>
                    setOpenIconPicker((current) =>
                      current === reason.id ? null : reason.id
                    )
                  }
                  onSelectIcon={(icon) => {
                    patchReason(reason.id, 'icon', icon);
                    setOpenIconPicker(null);
                  }}
                  onClosePicker={() => setOpenIconPicker(null)}
                />
                <div className="bb-public-about-pillar-copy">
                  <EditableText
                    as="h3"
                    className="bb-public-about-pillar-title"
                    editMode={editMode}
                    value={reason.title || ''}
                    placeholder="Offer title"
                    onChange={(value) => patchReason(reason.id, 'title', value)}
                    website={website}
                    patchWebsite={patchWebsite}
                    colorTokenId={`offer.point.${reason.id}.title`}
                  />
                  <EditableText
                    as="p"
                    className="bb-public-about-pillar-body"
                    editMode={editMode}
                    multiline
                    value={reason.body || ''}
                    placeholder="Short description"
                    onChange={(value) => patchReason(reason.id, 'body', value)}
                    website={website}
                    patchWebsite={patchWebsite}
                    colorTokenId={`offer.point.${reason.id}.body`}
                  />
                </div>
                {editMode ? (
                  <div className="bb-public-about-pillar-actions" aria-label="Point actions">
                    <button
                      type="button"
                      aria-label={`Move ${reason.title || 'point'} up`}
                      disabled={index === 0}
                      onClick={() =>
                        patchWebsite({
                          reasons: moveItem(reasons, index, index - 1)
                        })
                      }
                    >
                      <ArrowUp size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${reason.title || 'point'} down`}
                      disabled={index === reasons.length - 1}
                      onClick={() =>
                        patchWebsite({
                          reasons: moveItem(reasons, index, index + 1)
                        })
                      }
                    >
                      <ArrowDown size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="is-danger"
                      aria-label={`Delete ${reason.title || 'point'}`}
                      disabled={reasons.length <= 1}
                      onClick={() => {
                        setOpenIconPicker(null);
                        patchWebsite({
                          reasons: reasons.filter((item) => item.id !== reason.id)
                        });
                      }}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
            {editMode && reasons.length < 8 ? (
              <button
                type="button"
                className="bb-public-about-add-point"
                onClick={() =>
                  patchWebsite({
                    reasons: [
                      ...reasons,
                      {
                        id: `r-${Date.now()}`,
                        title: '',
                        body: '',
                        icon: OFFER_NUMBER_OPTIONS[reasons.length % OFFER_NUMBER_OPTIONS.length].id
                      }
                    ]
                  })
                }
              >
                <Plus size={17} aria-hidden="true" />
                Add point
              </button>
            ) : null}
          </div>
        </section>
      </EditSection>

      <EditSection
        editMode={editMode}
        title="About us"
        sectionId="about"
        hidden={hidden}
        coach="Tell your story across pages — photo, title, and body. Use Back/Next to flip pages."
        className={`bb-public-home-block bb-public-about-block bb-public-about-journey bb-public-about-story-block${
          editMode ? ' is-editing' : ''
        }`}
      >
        <section
          className="bb-public-about-book"
          data-journey-reveal
          aria-label="About our business"
          onTouchStart={(event) => {
            touchStartRef.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            if (touchStartRef.current == null) return;
            const endX = event.changedTouches[0]?.clientX ?? touchStartRef.current;
            const delta = endX - touchStartRef.current;
            touchStartRef.current = null;
            if (Math.abs(delta) < 45) return;
            setActivePage((current) =>
              delta < 0
                ? Math.min(current + 1, aboutPages.length - 1)
                : Math.max(current - 1, 0)
            );
          }}
        >
          <div className="bb-public-about-book-stage">
            {aboutPages.map((page, index) => (
              <EditorialPage
                key={page.id}
                page={page}
                index={index}
                activePage={activePage}
                pageCount={aboutPages.length}
                editMode={editMode}
                website={website}
                patchWebsite={patchWebsite}
                onBack={() => setActivePage((current) => Math.max(current - 1, 0))}
                onNext={() =>
                  setActivePage((current) => Math.min(current + 1, aboutPages.length - 1))
                }
                onTitle={(value) => patchAboutPage(page.id, 'title', value)}
                onBody={(value) => patchAboutPage(page.id, 'body', value)}
                onImage={(url) => patchAboutPage(page.id, 'imageUrl', url)}
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

function moveItem(items, from, to) {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function OfferMarker({
  reason,
  index,
  editMode,
  pickerOpen,
  website,
  patchWebsite,
  onTogglePicker,
  onSelectIcon,
  onClosePicker
}) {
  const markerRef = useRef(null);
  const [colorOpen, setColorOpen] = useState(false);
  const option = resolveOfferMarker(reason, index);
  const ringToken = readStyleToken(website, `offer.point.${reason.id}.marker`);
  const ringSolid = styleTokenColor(ringToken);
  const ringStyle =
    ringSolid && ringToken !== STYLE_TOKEN_GRADIENT
      ? {
          borderColor: ringSolid,
          background: '#fff',
          backgroundImage: 'none',
          color: '#101828'
        }
      : undefined;

  return (
    <div className="bb-public-about-pillar-marker-wrap">
      {editMode ? (
        <button
          ref={markerRef}
          type="button"
          className={`bb-public-about-pillar-marker is-icon is-editable${
            option.kind === 'number' ? ' is-digit' : ''
          }`}
          style={ringStyle}
          aria-label={`Choose icon for ${reason.title || 'point'}`}
          aria-expanded={pickerOpen || colorOpen}
          onClick={() => {
            setColorOpen(false);
            onTogglePicker();
          }}
        >
          <OfferMarkerGlyph option={option} />
        </button>
      ) : (
        <span
          className={`bb-public-about-pillar-marker is-icon${
            option.kind === 'number' ? ' is-digit' : ''
          }`}
          style={ringStyle}
          aria-hidden="true"
        >
          <OfferMarkerGlyph option={option} />
        </span>
      )}
      <StylePopover
        open={editMode && pickerOpen}
        anchorRef={markerRef}
        placement="left-of-bezel"
        title="Choose icon"
        onClose={onClosePicker}
      >
        <div className="bb-style-icon-grid" aria-label="Choose a number">
          {OFFER_NUMBER_OPTIONS.map((num) => (
            <button
              key={num.id}
              type="button"
              className={`bb-style-icon-digit${num.id === option.id ? ' is-active' : ''}`}
              aria-label={num.label}
              aria-pressed={num.id === option.id}
              title={num.label}
              onClick={() => onSelectIcon(num.id)}
            >
              <span className="bb-public-about-marker-digit">{num.value}</span>
            </button>
          ))}
        </div>
        <div className="bb-style-icon-grid" aria-label="Choose an icon">
          {OFFER_ICON_OPTIONS.filter((item) => item.kind === 'icon').map(
            ({ id, label, Icon: OptionIcon }) => (
              <button
                key={id}
                type="button"
                className={id === option.id ? 'is-active' : ''}
                aria-label={label}
                aria-pressed={id === option.id}
                title={label}
                onClick={() => onSelectIcon(id)}
              >
                <OptionIcon size={18} aria-hidden="true" />
              </button>
            )
          )}
        </div>
        <button
          type="button"
          className="bb-style-reset"
          onClick={() => {
            onClosePicker();
            setColorOpen(true);
          }}
        >
          Marker color
        </button>
      </StylePopover>
      <EditableColor
        open={colorOpen}
        anchorRef={markerRef}
        website={website}
        patchWebsite={patchWebsite}
        tokenId={`offer.point.${reason.id}.marker`}
        title="Marker style"
        allowGradient
        placement="left-of-bezel"
        onClose={() => setColorOpen(false)}
      />
    </div>
  );
}

function EditorialPage({
  page,
  index,
  activePage,
  pageCount,
  editMode,
  website,
  patchWebsite,
  onBack,
  onNext,
  onTitle,
  onBody,
  onImage
}) {
  const turned = index < activePage;
  const current = index === activePage;
  const canGoBack = activePage > 0;
  const canGoNext = activePage < pageCount - 1;

  return (
    <article
      className={`bb-public-about-page${turned ? ' is-turned' : ''}${
        current ? ' is-current' : ''
      }`}
      style={{ '--bb-about-page-z': 10 - index }}
      aria-hidden={!current}
    >
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
      <div className="bb-public-about-page-copy">
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
          className="bb-public-about-page-body"
          editMode={editMode}
          multiline
          value={page.body}
          placeholder="Tell this part of your story"
          onChange={onBody}
          website={website}
          patchWebsite={patchWebsite}
          colorTokenId={`about.page.${page.id}.body`}
        />
        <div className="bb-public-about-page-nav-shell">
          <nav className="bb-public-about-page-turn" aria-label="About pages">
            <button
              type="button"
              className="bb-public-about-page-turn-btn"
              aria-label="Previous page"
              disabled={!canGoBack}
              onClick={onBack}
            >
              <ChevronLeft size={16} strokeWidth={2.2} aria-hidden="true" />
              <span>Back</span>
            </button>
            <button
              type="button"
              className="bb-public-about-page-turn-btn"
              aria-label="Next page"
              disabled={!canGoNext}
              onClick={onNext}
            >
              <span>Next</span>
              <ChevronRight size={16} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </article>
  );
}
