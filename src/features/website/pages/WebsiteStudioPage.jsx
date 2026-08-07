import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, PanelsTopLeft } from 'lucide-react';
import {
  E_BUSINESS_PAGES,
  E_BUSINESS_PLATFORM_NAME,
  isPublicPageEnabled
} from '../../../config/eBusinessPlatform';
import {
  createDefaultHomeSectionOrder,
  createDefaultHomeSections
} from '../../../config/workspaceDefaults';
import { navigate, publicPagePath } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { PeriodSegmentedControl } from '../../../shared/ui/PeriodSegmentedControl';
import { DevicePreviewFrame } from '../components/DevicePreviewFrame';

const HOME_SECTION_META = {
  about: 'About',
  reasons: 'Why us',
  venue: 'Venue',
  map: 'Map',
  reviews: 'Reviews',
  bookStrip: 'Book strip'
};

export function WebsiteStudioPage() {
  const {
    workspace,
    updateWebsite,
    updateProfile,
    publishWebsite,
    updateSocialPost,
    addSocialPost
  } = useWorkspace();
  const website = workspace.website || {};
  const [surface, setSurface] = useState('home');
  const [device, setDevice] = useState('desktop');
  const [mode, setMode] = useState('view');
  const [trayOpen, setTrayOpen] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [publishNote, setPublishNote] = useState('');
  const [publishing, setPublishing] = useState(false);

  const editMode = mode === 'edit';
  const sections = { ...createDefaultHomeSections(), ...(website.sections || {}) };
  const sectionOrder = (() => {
    const defaults = createDefaultHomeSectionOrder();
    const custom = Array.isArray(website.sectionOrder) ? website.sectionOrder : [];
    const seen = new Set();
    const ordered = [];
    for (const id of [...custom, ...defaults]) {
      if (!defaults.includes(id) || seen.has(id)) continue;
      seen.add(id);
      ordered.push(id);
    }
    return ordered;
  })();

  const pageOptions = useMemo(
    () => E_BUSINESS_PAGES.map((page) => ({ id: page.id, label: page.label })),
    []
  );

  const publishFlash = async () => {
    if (publishing) return;
    setPublishing(true);
    try {
      const result = await publishWebsite();
      setSavedFlash(true);
      setPublishNote(
        result?.reason ||
          (result?.localOnly
            ? 'Published locally. Connect Firebase to sync the live slug.'
            : 'Published.')
      );
      window.setTimeout(() => setSavedFlash(false), 1800);
    } finally {
      setPublishing(false);
    }
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

  const toggleSection = (sectionId) => {
    updateWebsite({
      sections: {
        ...sections,
        [sectionId]: !sections[sectionId]
      }
    });
  };

  const moveSection = (sectionId, direction) => {
    const index = sectionOrder.indexOf(sectionId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= sectionOrder.length) return;
    const next = [...sectionOrder];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    updateWebsite({ sectionOrder: next });
  };

  return (
    <div className="bb-studio-canvas grid gap-4">
      <header className="bb-studio-toolbar bb-panel px-4 py-3 grid gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid gap-1">
            <p className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-black/35">
              {E_BUSINESS_PLATFORM_NAME}
            </p>
            <h1 className="bb-page-title text-2xl md:text-3xl m-0">Pages</h1>
            <p className="bb-muted m-0 text-sm">
              View to scroll. Edit to change copy and images on the page.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="bb-ghost-btn"
              onClick={() => setTrayOpen((prev) => !prev)}
            >
              <PanelsTopLeft size={15} /> Sections
            </button>
            <button
              type="button"
              className="bb-ghost-btn"
              onClick={() => navigate(publicPagePath(workspace.slug, surface))}
            >
              <ExternalLink size={15} /> Open live
            </button>
            <button
              type="button"
              className="bb-primary-btn"
              disabled={publishing}
              onClick={publishFlash}
            >
              {publishing ? 'Publishing…' : savedFlash ? 'Published' : 'Publish'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PeriodSegmentedControl
            ariaLabel="E-Business page surface"
            value={surface}
            onChange={setSurface}
            options={pageOptions}
          />
          <PeriodSegmentedControl
            ariaLabel="Studio mode"
            value={mode}
            onChange={setMode}
            options={[
              { id: 'view', label: 'View' },
              { id: 'edit', label: 'Edit' }
            ]}
          />
          <PeriodSegmentedControl
            ariaLabel="Preview device"
            value={device}
            onChange={setDevice}
            options={[
              { id: 'phone', label: 'Phone' },
              { id: 'desktop', label: 'Desktop' }
            ]}
          />
          <label className="flex items-center gap-2 text-sm font-semibold ml-auto">
            <input
              type="checkbox"
              checked={isPublicPageEnabled(website.pages, surface)}
              onChange={() => togglePage(surface)}
            />
            Page visible
          </label>
        </div>
      </header>

      {trayOpen ? (
        <aside className="bb-panel p-4 grid gap-3 content-start">
          <h2 className="bb-page-title text-lg m-0">Sections</h2>
          <p className="bb-muted m-0 text-sm">
            Show, hide, or reorder Home blocks. Edit content on the canvas in Edit mode.
          </p>
          {surface === 'home' ? (
            <div className="grid gap-2">
              {sectionOrder.map((id, index) => (
                <div key={id} className="bb-studio-section-row">
                  <button
                    type="button"
                    className={
                      sections[id]
                        ? 'bb-primary-btn py-1.5 px-3 text-sm'
                        : 'bb-ghost-btn py-1.5 px-3 text-sm'
                    }
                    onClick={() => toggleSection(id)}
                  >
                    {HOME_SECTION_META[id] || id}
                  </button>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="bb-ghost-btn py-1.5 px-2"
                      aria-label={`Move ${HOME_SECTION_META[id]} up`}
                      disabled={index === 0}
                      onClick={() => moveSection(id, -1)}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      className="bb-ghost-btn py-1.5 px-2"
                      aria-label={`Move ${HOME_SECTION_META[id]} down`}
                      disabled={index === sectionOrder.length - 1}
                      onClick={() => moveSection(id, 1)}
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="bb-muted m-0 text-sm">
              Home sections apply on Home. Switch to Home to toggle About, Venue, Map, and Reviews.
            </p>
          )}
          {workspace.publishedAt ? (
            <p className="bb-muted m-0 text-xs">
              Last published {new Date(workspace.publishedAt).toLocaleString()}
            </p>
          ) : null}
          {publishNote ? <p className="bb-muted m-0 text-xs">{publishNote}</p> : null}
        </aside>
      ) : null}
      {!trayOpen && publishNote ? (
        <p className="bb-muted m-0 text-xs px-1">{publishNote}</p>
      ) : null}

      <div className={`bb-studio-stage ${editMode ? 'is-edit' : 'is-view'}`}>
        {editMode ? (
          <p className="bb-studio-edit-hint">
            Edit mode — click text or images on the page to change them.
          </p>
        ) : null}
        <DevicePreviewFrame
          workspace={workspace}
          page={surface}
          device={device}
          editMode={editMode}
          onUpdateWebsite={updateWebsite}
          onUpdateProfile={updateProfile}
          onUpdateSocialPost={updateSocialPost}
          onAddSocialPost={addSocialPost}
          showDrafts={editMode && surface === 'social'}
        />
      </div>
    </div>
  );
}
