import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Award,
  CalendarCheck,
  ChefHat,
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
import { EditableText, EditableImage, EditSection } from '../editable';

const OFFER_ICON_OPTIONS = [
  { id: 'info', label: 'Information', Icon: Info },
  { id: 'target', label: 'Target', Icon: Target },
  { id: 'eye', label: 'Vision', Icon: Eye },
  { id: 'sparkles', label: 'Sparkles', Icon: Sparkles },
  { id: 'calendar', label: 'Calendar', Icon: CalendarCheck },
  { id: 'award', label: 'Award', Icon: Award },
  { id: 'heart', label: 'Heart', Icon: Heart },
  { id: 'shield', label: 'Shield', Icon: ShieldCheck },
  { id: 'energy', label: 'Energy', Icon: Zap },
  { id: 'people', label: 'People', Icon: Users },
  { id: 'clock', label: 'Clock', Icon: Clock3 },
  { id: 'package', label: 'Package', Icon: PackageCheck },
  { id: 'leaf', label: 'Leaf', Icon: Leaf },
  { id: 'craft', label: 'Craft', Icon: ChefHat },
  { id: 'star', label: 'Star', Icon: Star }
];

const OFFER_ICON_MAP = Object.fromEntries(
  OFFER_ICON_OPTIONS.map(({ id, Icon }) => [id, Icon])
);

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
  const markerStyle = website.reasonsMarkerStyle === 'icon' ? 'icon' : 'number';
  const pages = [
    {
      id: 'about',
      title: website.aboutTitle || 'About us',
      titlePlaceholder: 'About us',
      body: website.aboutBody || '',
      bodyPlaceholder: 'About your business',
      imageUrl: website.aboutImageUrl || '',
      icon: website.aboutNavIcon || 'info',
      onTitle: (value) => patchWebsite({ aboutTitle: value }),
      onBody: (value) => patchWebsite({ aboutBody: value }),
      onImage: (url) => patchWebsite({ aboutImageUrl: url }),
      onIcon: (icon) => patchWebsite({ aboutNavIcon: icon })
    },
    {
      id: 'mission',
      title: website.missionTitle || 'Our mission',
      titlePlaceholder: 'Our mission',
      body: website.missionBody || '',
      bodyPlaceholder: 'Your mission',
      imageUrl: website.missionImageUrl || '',
      icon: website.missionNavIcon || 'target',
      onTitle: (value) => patchWebsite({ missionTitle: value }),
      onBody: (value) => patchWebsite({ missionBody: value }),
      onImage: (url) => patchWebsite({ missionImageUrl: url }),
      onIcon: (icon) => patchWebsite({ missionNavIcon: icon })
    },
    {
      id: 'vision',
      title: website.visionTitle || 'Our vision',
      titlePlaceholder: 'Our vision',
      body: website.visionBody || '',
      bodyPlaceholder: 'Your vision',
      imageUrl: website.visionImageUrl || '',
      icon: website.visionNavIcon || 'eye',
      onTitle: (value) => patchWebsite({ visionTitle: value }),
      onBody: (value) => patchWebsite({ visionBody: value }),
      onImage: (url) => patchWebsite({ visionImageUrl: url }),
      onIcon: (icon) => patchWebsite({ visionNavIcon: icon })
    }
  ];

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

  return (
    <EditSection
      editMode={editMode}
      title="About"
      sectionId="about"
      hidden={hidden}
      coach="What you offer, your story, mission, and vision."
      className={`bb-public-home-block bb-public-about-block bb-public-about-journey${
        editMode ? ' is-editing' : ''
      }`}
    >
      <div className="bb-public-about-journey-shell" ref={journeyRef}>
        <section className="bb-public-about-offer-intro" data-journey-reveal>
          <header className="bb-public-about-journey-head">
            <EditableText
              as="h2"
              className="bb-public-profile-heading bb-public-about-journey-title"
              editMode={editMode}
              value={website.reasonsTitle || 'What we offer'}
              placeholder="What we offer"
              onChange={(value) => patchWebsite({ reasonsTitle: value })}
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
            />
            {editMode ? (
              <div className="bb-public-about-marker-toggle" aria-label="Point marker style">
                <span className="bb-public-about-edit-label">Show points as</span>
                <div className="bb-public-about-segmented">
                  {[
                    ['number', 'Numbers'],
                    ['icon', 'Icons']
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={markerStyle === value ? 'is-active' : ''}
                      aria-pressed={markerStyle === value}
                      onClick={() => {
                        setOpenIconPicker(null);
                        patchWebsite({ reasonsMarkerStyle: value });
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
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
                  markerStyle={markerStyle}
                  editMode={editMode}
                  pickerOpen={openIconPicker === reason.id}
                  onTogglePicker={() =>
                    setOpenIconPicker((current) =>
                      current === reason.id ? null : reason.id
                    )
                  }
                  onSelectIcon={(icon) => {
                    patchReason(reason.id, 'icon', icon);
                    setOpenIconPicker(null);
                  }}
                />
                <div className="bb-public-about-pillar-copy">
                  <EditableText
                    as="h3"
                    className="bb-public-about-pillar-title"
                    editMode={editMode}
                    value={reason.title || ''}
                    placeholder="Offer title"
                    onChange={(value) => patchReason(reason.id, 'title', value)}
                  />
                  <EditableText
                    as="p"
                    className="bb-public-about-pillar-body"
                    editMode={editMode}
                    multiline
                    value={reason.body || ''}
                    placeholder="Short description"
                    onChange={(value) => patchReason(reason.id, 'body', value)}
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
                        icon: OFFER_ICON_OPTIONS[reasons.length % OFFER_ICON_OPTIONS.length].id
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
                ? Math.min(current + 1, pages.length - 1)
                : Math.max(current - 1, 0)
            );
          }}
        >
          <div className="bb-public-about-book-stage">
            {pages.map((page, index) => (
              <EditorialPage
                key={page.id}
                page={page}
                index={index}
                activePage={activePage}
                editMode={editMode}
                pages={pages}
                onSelectPage={setActivePage}
              />
            ))}
          </div>
        </section>
      </div>
    </EditSection>
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
  markerStyle,
  editMode,
  pickerOpen,
  onTogglePicker,
  onSelectIcon
}) {
  const iconId = OFFER_ICON_MAP[reason.icon]
    ? reason.icon
    : OFFER_ICON_OPTIONS[index % OFFER_ICON_OPTIONS.length].id;
  const Icon = OFFER_ICON_MAP[iconId];

  if (markerStyle === 'number') {
    return (
      <span className="bb-public-about-pillar-marker is-number" aria-hidden="true">
        {String(index + 1).padStart(2, '0')}
      </span>
    );
  }

  return (
    <div className="bb-public-about-pillar-marker-wrap">
      {editMode ? (
        <button
          type="button"
          className="bb-public-about-pillar-marker is-icon is-editable"
          aria-label={`Choose icon for ${reason.title || 'point'}`}
          aria-expanded={pickerOpen}
          onClick={onTogglePicker}
        >
          <Icon size={23} strokeWidth={1.8} aria-hidden="true" />
        </button>
      ) : (
        <span className="bb-public-about-pillar-marker is-icon" aria-hidden="true">
          <Icon size={23} strokeWidth={1.8} />
        </span>
      )}
      {editMode && pickerOpen ? (
        <div className="bb-public-about-icon-picker" aria-label="Choose an icon">
          {OFFER_ICON_OPTIONS.map(({ id, label, Icon: OptionIcon }) => (
            <button
              key={id}
              type="button"
              className={id === iconId ? 'is-active' : ''}
              aria-label={label}
              aria-pressed={id === iconId}
              title={label}
              onClick={() => onSelectIcon(id)}
            >
              <OptionIcon size={18} aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function EditorialPage({
  page,
  index,
  activePage,
  editMode,
  pages,
  onSelectPage
}) {
  const turned = index < activePage;
  const current = index === activePage;
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

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
          preset="about"
          onChange={page.onImage}
        />
      </div>
      <div className="bb-public-about-page-copy">
        <EditableText
          as="h2"
          className="bb-public-profile-heading bb-public-about-page-title"
          editMode={editMode}
          value={page.title}
          placeholder={page.titlePlaceholder}
          onChange={page.onTitle}
        />
        <EditableText
          as="p"
          className="bb-public-about-page-body"
          editMode={editMode}
          multiline
          value={page.body}
          placeholder={page.bodyPlaceholder}
          onChange={page.onBody}
        />
        <div className="bb-public-about-page-nav-shell">
          <nav className="bb-public-about-page-nav" aria-label="About pages">
            {pages.map((navPage, navIndex) => {
              const Icon = OFFER_ICON_MAP[navPage.icon] || Info;
              const active = navIndex === activePage;

              return (
                <button
                  key={navPage.id}
                  type="button"
                  className={`bb-public-about-page-tab${active ? ' is-active' : ''}`}
                  aria-label={
                    editMode && active
                      ? `Choose icon for ${navPage.title}`
                      : `Show ${navPage.title}`
                  }
                  aria-pressed={active}
                  aria-expanded={editMode && active ? iconPickerOpen : undefined}
                  title={editMode && active ? `Change ${navPage.title} icon` : navPage.title}
                  onClick={() => {
                    if (editMode && active) {
                      setIconPickerOpen((open) => !open);
                      return;
                    }
                    setIconPickerOpen(false);
                    onSelectPage(navIndex);
                  }}
                >
                  <Icon size={18} strokeWidth={2} aria-hidden="true" />
                </button>
              );
            })}
          </nav>
          {editMode && iconPickerOpen ? (
            <div className="bb-public-about-page-icon-picker" aria-label="Choose a page icon">
              {OFFER_ICON_OPTIONS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={id === page.icon ? 'is-active' : ''}
                  aria-label={label}
                  aria-pressed={id === page.icon}
                  title={label}
                  onClick={() => {
                    page.onIcon(id);
                    setIconPickerOpen(false);
                  }}
                >
                  <Icon size={18} aria-hidden="true" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
