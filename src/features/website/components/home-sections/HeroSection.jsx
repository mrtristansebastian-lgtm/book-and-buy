import { navigate, publicPagePath } from '../../../../app/routing';
import { EditableText, EditableImage, EditSection } from '../editable';

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
  patchWebsite
}) {
  const headline =
    website.homeHeadline ||
    website.headline ||
    workspace.brandName ||
    'Business';
  const body =
    website.homeSubtext ||
    website.subcopy ||
    workspace.tagline ||
    '';
  const heroSrc = website.heroImageUrl || website.heroImage || DEFAULT_HERO;

  return (
    <EditSection editMode={editMode} title="Hero" sectionId="hero" className="bb-public-home relative">
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
      <div className="bb-public-home-copy bb-public-gutter">
        <div className="bb-public-home-copy-inner">
          <EditableText
            as="h1"
            className="bb-public-home-brand"
            editMode={editMode}
            value={headline}
            placeholder="Hero headline"
            onChange={(value) =>
              patchWebsite({ homeHeadline: value, headline: value })
            }
          />
          <EditableText
            as="p"
            className="bb-public-home-support"
            editMode={editMode}
            multiline
            value={body}
            placeholder="Short supporting line"
            onChange={(value) =>
              patchWebsite({ homeSubtext: value, subcopy: value })
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
      </div>
    </EditSection>
  );
}
