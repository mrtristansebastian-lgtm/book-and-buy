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
import { EditableText, EditSection, StylePopover } from '../editable';
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
  return OFFER_ICON_MAP[reason?.icon] || fallback;
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

function moveItem(items, from, to) {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function WhatWeOfferSection({
  website,
  reasons = [],
  editMode,
  hidden,
  patchWebsite,
  patchReason
}) {
  const shellRef = useRef(null);
  const [openIconPicker, setOpenIconPicker] = useState(null);
  const [revealed, setRevealed] = useState(() => Boolean(editMode));

  useEffect(() => {
    if (editMode) {
      setRevealed(true);
      return undefined;
    }

    const shell = shellRef.current;
    if (!shell || typeof IntersectionObserver === 'undefined') return undefined;

    const block = shell.querySelector('[data-journey-reveal="offer"]');
    if (!block) return undefined;

    shell.classList.add('has-reveal');
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
    const shell = shellRef.current;
    if (!shell || editMode) return undefined;
    shell.classList.add('has-reveal');
    return () => {
      shell.classList.remove('has-reveal');
    };
  }, [editMode]);

  if (hidden && !editMode) return null;

  return (
    <div className="bb-public-about-journey-shell" ref={shellRef}>
      <EditSection
        editMode={editMode}
        title="What we offer"
        sectionId="offerIntro"
        hidden={hidden}
        coach="List what you offer — short points with numbers or icons."
        className={`bb-public-home-block bb-public-about-block bb-public-about-journey bb-public-about-offer-block${
          editMode ? ' is-editing' : ''
        }`}
      >
        <section
          className={`bb-public-about-offer-intro${revealed ? ' is-visible' : ''}`}
          data-journey-reveal="offer"
        >
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
              className="bb-public-profile-section-body bb-public-about-journey-body"
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
                        icon: OFFER_NUMBER_OPTIONS[reasons.length % OFFER_NUMBER_OPTIONS.length]
                          .id
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
    </div>
  );
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
