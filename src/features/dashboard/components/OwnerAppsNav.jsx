import { useEffect, useRef, useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { launcherApps } from '../../../config/appLauncher';
import { DemoModePanel } from '../../../shared/ui/DemoModePanel';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { useWorkspaceBadges } from '../hooks/useWorkspaceBadges';
import { AppTile } from './AppTile';

const LAUNCHER_VIEW_KEY = 'bb.launcherView';

function readLauncherView() {
  try {
    const stored = window.localStorage.getItem(LAUNCHER_VIEW_KEY);
    if (stored === 'list' || stored === 'icons') return stored;
  } catch {
    /* ignore */
  }
  return 'icons';
}

/**
 * Apps navigator for the Menu sheet (and legacy side rail).
 * Demo controls sit under Back Office when in demo mode.
 */
export function OwnerAppsNav({ className = '', onSelect = null, showToggle = true }) {
  const { workspace } = useWorkspace();
  const { badgeFor } = useWorkspaceBadges();
  const [view, setView] = useState(readLauncherView);
  const rootRef = useRef(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(launcherApps.length);
  useEffect(() => {
    const root = rootRef.current;
    if (!root?.closest('.bb-owner-menu-sheet')) return undefined;
    const body = root.closest('.bb-owner-menu-sheet-body');
    const measure = () => {
      const height = body.clientHeight;
      const font = parseFloat(getComputedStyle(root).fontSize) / 16;
      const footer = workspace?.isDemo ? 105 * font : 0;
      const perGroup = 102 * font;
      const count = Math.max(1, Math.min(launcherApps.length, Math.floor((height - footer - 56) / perGroup)));
      setPageSize(count); setPage((value) => Math.min(value, Math.ceil(launcherApps.length / count) - 1));
    };
    const observer = new ResizeObserver(measure); observer.observe(body); measure();
    return () => observer.disconnect();
  }, [workspace?.isDemo]);
  const pageCount = Math.ceil(launcherApps.length / pageSize);

  const toggleView = () => {
    const next = view === 'icons' ? 'list' : 'icons';
    setView(next);
    try {
      window.localStorage.setItem(LAUNCHER_VIEW_KEY, next);
    } catch {
      /* ignore */
    }
  };

  return (
    <div ref={rootRef} className={`bb-owner-apps-nav ${className}`.trim()}>
      {showToggle ? (
        <div className="bb-owner-apps-nav-toolbar">
          <p className="bb-owner-apps-nav-title m-0">Apps</p>
          <button
            type="button"
            className="bb-launcher-view"
            aria-pressed={view === 'list'}
            aria-label={view === 'icons' ? 'Show list view' : 'Show app icons'}
            title={view === 'icons' ? 'List view' : 'App icons'}
            onClick={toggleView}
          >
            {view === 'icons' ? (
              <List size={16} strokeWidth={2.1} absoluteStrokeWidth />
            ) : (
              <LayoutGrid size={16} strokeWidth={2.1} absoluteStrokeWidth />
            )}
          </button>
        </div>
      ) : null}

      <div className="bb-owner-apps-nav-groups" style={{ '--n': launcherApps.length }}>
        {launcherApps.slice(page * pageSize, (page + 1) * pageSize).map((app, index) => (
          <AppTile
            key={app.id}
            app={app}
            badgeFor={badgeFor}
            index={index + 1}
            view={showToggle ? view : 'icons'}
            onSelect={onSelect}
          />
        ))}
      </div>

      {pageCount > 1 && <nav className="bb-menu-pages" aria-label="Menu categories"><button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</button><span>{page + 1} / {pageCount}</span><button type="button" disabled={page === pageCount - 1} onClick={() => setPage((value) => value + 1)}>More apps</button></nav>}

      {workspace?.isDemo ? (
        <DemoModePanel
          className="bb-demo-panel--nav"
          onAction={() => onSelect?.('demo')}
        />
      ) : null}
    </div>
  );
}
