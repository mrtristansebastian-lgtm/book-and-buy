import { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import {
  E_BUSINESS_PAGES,
  E_BUSINESS_PLATFORM_NAME,
  isPublicPageEnabled
} from '../../../config/eBusinessPlatform';
import { navigate, publicPagePath } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { PeriodSegmentedControl } from '../../../shared/ui/PeriodSegmentedControl';

const SURFACE_COPY_KEYS = {
  home: { headline: 'homeHeadline', subtext: 'homeSubtext', fallbackHeadline: 'headline', fallbackSubtext: 'subcopy' },
  book: { headline: 'bookHeadline', subtext: 'bookSubtext' },
  buy: { headline: 'buyHeadline', subtext: 'buySubtext' },
  social: { headline: 'socialHeadline', subtext: 'socialSubtext' }
};

export function WebsiteStudioPage() {
  const { workspace, updateWebsite } = useWorkspace();
  const website = workspace.website || {};
  const [surface, setSurface] = useState('home');
  const [savedFlash, setSavedFlash] = useState(false);

  const copyKeys = SURFACE_COPY_KEYS[surface];
  const headline =
    website[copyKeys.headline] ||
    (copyKeys.fallbackHeadline ? website[copyKeys.fallbackHeadline] : '') ||
    '';
  const subtext =
    website[copyKeys.subtext] ||
    (copyKeys.fallbackSubtext ? website[copyKeys.fallbackSubtext] : '') ||
    '';

  const pageOptions = useMemo(
    () =>
      E_BUSINESS_PAGES.map((page) => ({
        id: page.id,
        label: page.label
      })),
    []
  );

  const publishFlash = () => {
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1600);
  };

  const setCopy = (field, value) => {
    const patch = { [field]: value };
    if (surface === 'home') {
      if (field === 'homeHeadline') patch.headline = value;
      if (field === 'homeSubtext') patch.subcopy = value;
    }
    updateWebsite(patch);
  };

  const togglePage = (pageId) => {
    const enabled = isPublicPageEnabled(website.pages, pageId);
    updateWebsite({
      pages: {
        ...website.pages,
        [pageId]: !enabled,
        ...(pageId === 'buy' ? { shop: !enabled } : {})
      }
    });
  };

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-black/35">
            {E_BUSINESS_PLATFORM_NAME}
          </p>
          <h1 className="bb-page-title text-3xl m-0">Pages</h1>
          <p className="bb-muted m-0 max-w-2xl">
            Guided copy and visibility for Home, Book, Buy, and Social — preview live, no cinema free-form editor.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="bb-ghost-btn"
            onClick={() => navigate(publicPagePath(workspace.slug, surface))}
          >
            <ExternalLink size={15} /> Preview {surface}
          </button>
          <button type="button" className="bb-primary-btn" onClick={publishFlash}>
            {savedFlash ? 'Published' : 'Publish pages'}
          </button>
        </div>
      </header>

      <PeriodSegmentedControl
        ariaLabel="E-Business page surface"
        value={surface}
        onChange={setSurface}
        options={pageOptions}
      />

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="bb-panel p-5 grid gap-4 content-start">
          <div className="flex items-center justify-between gap-3">
            <h2 className="bb-page-title text-xl m-0">{surface} page</h2>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={isPublicPageEnabled(website.pages, surface)}
                onChange={() => togglePage(surface)}
              />
              Visible on site
            </label>
          </div>

          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Headline</span>
            <input
              className="native-control-input px-4"
              value={headline}
              onChange={(event) => setCopy(copyKeys.headline, event.target.value)}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Supporting line</span>
            <textarea
              className="native-control-input px-4 py-3"
              rows={3}
              value={subtext}
              onChange={(event) => setCopy(copyKeys.subtext, event.target.value)}
            />
          </label>

          {surface === 'home' ? (
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Primary CTA label</span>
              <input
                className="native-control-input px-4"
                value={website.ctaLabel || ''}
                onChange={(event) => updateWebsite({ ctaLabel: event.target.value })}
              />
            </label>
          ) : null}
        </div>

        <div className="bb-panel p-5 grid gap-3 content-start">
          <h2 className="bb-page-title text-xl m-0">Live links</h2>
          <p className="bb-muted m-0 text-sm">
            Share your {E_BUSINESS_PLATFORM_NAME} pages with clients.
          </p>
          <div className="grid gap-2">
            {E_BUSINESS_PAGES.map((page) => (
              <button
                key={page.id}
                type="button"
                className="bb-ghost-btn justify-between"
                onClick={() => navigate(publicPagePath(workspace.slug, page.id))}
              >
                <span>{page.label}</span>
                <span className="bb-muted text-xs">
                  {isPublicPageEnabled(website.pages, page.id) ? 'On' : 'Hidden'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
