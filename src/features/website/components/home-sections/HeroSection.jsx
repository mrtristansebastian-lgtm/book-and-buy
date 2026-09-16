import {
  EditableText,
  EditableImage,
  EditSection,
  readStyleToken,
  styleTokenColor,
  isSolidColorToken
} from '../editable';
import { isPublicPageEnabled } from '../../../../config/eBusinessPlatform';

const DEFAULT_HERO = '/example/flour-and-flame/hero.webp';

export function HeroSection({
  workspace,
  website,
  editMode,
  preview,
  patchWebsite,
  onUpdateProfile,
  onOpenRailTab
}) {
  const brandName = String(workspace.brandName || 'Business').trim() || 'Business';
  const body =
    website.homeSubtext ||
    website.subcopy ||
    workspace.tagline ||
    '';
  const heroSrc = website.heroImageUrl || website.heroImage || DEFAULT_HERO;
  const ctaToken = readStyleToken(website, 'hero.bookCta');
  const ctaSolid = styleTokenColor(ctaToken);
  const ctaIsSolid = isSolidColorToken(ctaToken);
  const pages = website.pages || {};
  const showBook = isPublicPageEnabled(pages, 'book') || editMode;
  const showBuy = isPublicPageEnabled(pages, 'buy') || editMode;

  const openRail = (tabId) => {
    if (preview || editMode) return;
    onOpenRailTab?.(tabId);
  };

  return (
    <EditSection
      editMode={editMode}
      title="Hero"
      sectionId="hero"
      className="bb-public-home relative bb-public-profile-hero"
    >
      <div className="absolute inset-0 bb-public-home-atmosphere" aria-hidden="true" />
      <EditableImage
        editMode={editMode}
        src={heroSrc}
        className="absolute inset-0"
        imgClassName="absolute inset-0 w-full h-full object-cover"
        storageFolder="brand"
        preset="hero"
        onChange={(url) => patchWebsite({ heroImageUrl: url })}
        placeholderLabel="Upload hero image"
      />
      <div className="absolute inset-0 bb-public-home-scrim" aria-hidden="true" />
      <div className="bb-public-home-copy bb-public-gutter">
        <div className="bb-public-home-copy-inner">
          <EditableText
            as="h1"
            className="bb-public-home-brand"
            editMode={editMode}
            value={brandName}
            placeholder="Business name"
            website={website}
            patchWebsite={patchWebsite}
            colorTokenId="hero.brand"
            onChange={(value) => {
              const next = String(value || '').trim() || 'Business';
              onUpdateProfile?.({ brandName: next });
              patchWebsite({ homeHeadline: next, headline: next });
            }}
          />
          <EditableText
            as="p"
            className="bb-public-home-support"
            editMode={editMode}
            multiline
            value={body}
            placeholder="Short supporting line"
            website={website}
            patchWebsite={patchWebsite}
            colorTokenId="hero.support"
            onChange={(value) =>
              patchWebsite({ homeSubtext: value, subcopy: value })
            }
          />
          {showBook || showBuy ? (
            <div className="bb-public-home-ctas">
              {showBook ? (
                <button
                  type="button"
                  className={`bb-primary-btn${ctaIsSolid ? ' bb-style-token-solid' : ''}`}
                  style={
                    ctaIsSolid
                      ? { '--bb-cta-fill': ctaSolid, backgroundColor: ctaSolid }
                      : undefined
                  }
                  onClick={() => openRail('book')}
                >
                  <EditableText
                    as="span"
                    editMode={editMode}
                    value={website.ctaLabel || 'Book'}
                    placeholder="Book CTA"
                    website={website}
                    patchWebsite={patchWebsite}
                    colorTokenId="hero.bookCtaLabel"
                    fillTokenId="hero.bookCta"
                    fillAllowGradient
                    fillTitle="Button fill"
                    onChange={(value) => patchWebsite({ ctaLabel: value })}
                  />
                </button>
              ) : null}
              {showBuy ? (
                <button
                  type="button"
                  className="bb-ghost-btn bb-public-home-ghost"
                  onClick={() => openRail('buy')}
                >
                  <EditableText
                    as="span"
                    editMode={editMode}
                    value={website.buyCtaLabel || 'Buy'}
                    placeholder="Buy CTA"
                    website={website}
                    patchWebsite={patchWebsite}
                    colorTokenId="hero.buyCtaLabel"
                    onChange={(value) => patchWebsite({ buyCtaLabel: value })}
                  />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </EditSection>
  );
}
