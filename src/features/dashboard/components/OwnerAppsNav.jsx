import { useState } from 'react';
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
    <div className={`bb-owner-apps-nav ${className}`.trim()}>
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
        {launcherApps.map((app, index) => (
          <AppTile
            key={app.id}
            app={app}
            badgeFor={badgeFor}
            index={index + 1}
            view={view}
            onSelect={onSelect}
          />
        ))}
      </div>

      {workspace?.isDemo ? (
        <DemoModePanel
          className="bb-demo-panel--nav"
          onAction={() => onSelect?.('demo')}
        />
      ) : null}
    </div>
  );
}
