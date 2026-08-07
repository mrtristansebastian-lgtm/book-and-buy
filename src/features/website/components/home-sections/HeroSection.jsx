import { navigate, publicPagePath } from '../../../../app/routing';
import { EditableText, EditableImage, EditSection } from '../editable';
import { sectionLayoutClass } from './sectionLayout';

const DEFAULT_HERO = '/example/flour-and-flame/hero.webp';

function go(preview, editMode, path) {
  if (preview || editMode) return;
  navigate(path);
}

export function HeroSection({
  workspace,
  website,
  editMode,
  preview,
  layout,
  onCycleLayout,
  onUpdateProfile,
  patchWebsite
}) {
  const brand = workspace.brandName || 'Business';
  const support =
    website.homeHeadline ||
    website.homeSubtext ||
    website.headline ||
    website.subcopy ||
    workspace.tagline ||
    '';
  const heroSrc = website.heroImageUrl || website.heroImage || DEFAULT_HERO;

  const copy = (
    <div className="bb-public-home-copy-inner">
      <EditableText
        as="h1"
        className="bb-public-home-brand"
        editMode={editMode}
        value={brand}
        placeholder="Business name"
        onChange={(value) => onUpdateProfile?.({ brandName: value })}
      />
      <EditableText
        as="p"
        className="bb-public-home-support"
        editMode={editMode}
        multiline
        value={support}
        placeholder="Short supporting line"
        onChange={(value) =>
          patchWebsite({ homeHeadline: value, headline: value, homeSubtext: value })
        }
      />
      <div className="bb-public-home-ctas">
        <button
          type="button"
          className="bb-primary-btn"
          onClick={() => go(preview, editMode, publicPagePath(workspace.slug, 'book'))}
        >
          <EditableText
            as="span"
            editMode={editMode}
            value={website.ctaLabel || 'Book now'}
            placeholder="Book CTA"
            onChange={(value) => patchWebsite({ ctaLabel: value })}
          />
        </button>
        <button
          type="button"
          className="bb-ghost-btn bb-public-home-ghost"
          onClick={() => go(preview, editMode, publicPagePath(workspace.slug, 'buy'))}
        >
          <EditableText
            as="span"
            editMode={editMode}
            value={website.buyCtaLabel || 'Buy'}
            placeholder="Buy CTA"
            onChange={(value) => patchWebsite({ buyCtaLabel: value })}
          />
        </button>
      </div>
    </div>
  );

  return (
    <EditSection
      editMode={editMode}
      title="Hero"
      sectionId="hero"
      layout={layout}
      onCycleLayout={onCycleLayout}
      className={`bb-public-home relative ${sectionLayoutClass(layout)}`}
    >
      <div key={layout} className="bb-sec-layout-stage">
        {layout === 1 ? (
          <div className="bb-hero-split">
            <div className="bb-hero-split-panel bb-public-gutter">{copy}</div>
            <div className="bb-hero-split-media">
              <EditableImage
                editMode={editMode}
                src={heroSrc}
                className="bb-hero-split-image"
                imgClassName="w-full h-full object-cover"
                storageFolder="brand"
                onChange={(url) => patchWebsite({ heroImageUrl: url })}
                placeholderLabel="Add hero image URL"
              />
            </div>
          </div>
        ) : (
          <>
            <div className="absolute inset-0 bb-public-home-atmosphere" aria-hidden="true" />
            <EditableImage
              editMode={editMode}
              src={heroSrc}
              className="absolute inset-0"
              imgClassName="absolute inset-0 w-full h-full object-cover"
              storageFolder="brand"
              onChange={(url) => patchWebsite({ heroImageUrl: url })}
              placeholderLabel="Add hero image URL"
            />
            <div className="absolute inset-0 bb-public-home-scrim" aria-hidden="true" />
            <div className="bb-public-home-copy bb-public-gutter">{copy}</div>
          </>
        )}
      </div>
    </EditSection>
  );
}
