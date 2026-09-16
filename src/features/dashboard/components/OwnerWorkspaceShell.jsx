import { useEffect, useState } from 'react';
import { Home, MessageCircle, Menu, X } from 'lucide-react';
import { LAUNCHER_TAB, appForTab } from '../../../config/appLauncher';
import { navigate } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { useWorkspaceBadges } from '../hooks/useWorkspaceBadges';
import { MiniAppBar } from './MiniAppBar';
import { OwnerAppsNav } from './OwnerAppsNav';

/**
 * Business shell: PC left apps panel; mobile Home / Messages / Menu dock
 * with upward menu sheet. Home keeps stats; apps live in panel/sheet.
 */
export function OwnerWorkspaceShell({ tab, children }) {
  const { workspace, exitDemoMode, resetDemoWorkspace, startOwnerOnboarding } = useWorkspace();
  const { unreadSupport } = useWorkspaceBadges();
  const isLauncher = tab === LAUNCHER_TAB;
  const app = isLauncher ? null : appForTab(tab);
  const supportFlush = tab === 'communications';
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [tab]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const goHome = () => {
    setMenuOpen(false);
    navigate('/dashboard/overview');
  };

  const goMessages = () => {
    setMenuOpen(false);
    navigate('/dashboard/communications');
  };

  return (
    <div
      className={`bb-shell native-ui ${supportFlush ? 'is-support-flush' : ''} ${
        isLauncher ? 'is-launcher' : 'is-miniapp'
      }${menuOpen ? ' is-menu-open' : ''}`}
    >
      {workspace.isDemo ? (
        <div className="bb-demo-banner border-b border-black/8 bg-white px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="bb-primary-btn py-1 px-3 text-xs pointer-events-none">Demo mode</span>
            <span className="bb-muted">
              Exploring <strong className="text-ink">{workspace.brandName}</strong> as a guest.
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="bb-ghost-btn py-1.5 px-3 text-sm" onClick={() => resetDemoWorkspace()}>
              Reset demo
            </button>
            <button
              type="button"
              className="bb-ghost-btn py-1.5 px-3 text-sm"
              onClick={() => {
                exitDemoMode();
                navigate('/');
              }}
            >
              Exit demo
            </button>
            <button
              type="button"
              className="bb-ink-btn py-1.5 px-3 text-sm"
              onClick={() => {
                startOwnerOnboarding();
                navigate('/onboarding');
              }}
            >
              Create account
            </button>
          </div>
        </div>
      ) : null}

      <div className="bb-owner-layout">
        <aside className="bb-owner-side" aria-label="Apps">
          <OwnerAppsNav />
        </aside>

        <div className="bb-owner-content">
          {!isLauncher ? <MiniAppBar app={app} tab={tab} /> : null}
          <main
            key={tab}
            className={`bb-owner-main ${supportFlush ? 'is-flush' : ''} ${
              isLauncher ? '' : 'bb-miniapp-enter'
            }`}
          >
            {children}
          </main>
        </div>
      </div>

      {menuOpen ? (
        <button
          type="button"
          className="bb-owner-menu-backdrop"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <div
        className={`bb-owner-menu-sheet${menuOpen ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Apps menu"
        aria-hidden={!menuOpen}
      >
        <header className="bb-owner-menu-sheet-head">
          <strong>Menu</strong>
          <button
            type="button"
            className="bb-owner-menu-close"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        </header>
        <div className="bb-owner-menu-sheet-body">
          <OwnerAppsNav onSelect={() => setMenuOpen(false)} />
        </div>
      </div>

      <nav className="bb-owner-dock" aria-label="Business navigation">
        <button
          type="button"
          className={`bb-owner-dock-btn${isLauncher ? ' is-active' : ''}`}
          aria-current={isLauncher ? 'page' : undefined}
          onClick={goHome}
        >
          <Home size={22} strokeWidth={isLauncher ? 2.4 : 1.9} absoluteStrokeWidth />
          <span>Home</span>
        </button>
        <button
          type="button"
          className={`bb-owner-dock-btn${tab === 'communications' ? ' is-active' : ''}`}
          aria-current={tab === 'communications' ? 'page' : undefined}
          onClick={goMessages}
        >
          <span className="bb-owner-dock-icon">
            <MessageCircle
              size={22}
              strokeWidth={tab === 'communications' ? 2.4 : 1.9}
              absoluteStrokeWidth
            />
            {unreadSupport > 0 ? (
              <span className="bb-owner-dock-badge">{unreadSupport > 99 ? '99+' : unreadSupport}</span>
            ) : null}
          </span>
          <span>Messages</span>
        </button>
        <button
          type="button"
          className={`bb-owner-dock-btn${menuOpen ? ' is-active' : ''}`}
          aria-expanded={menuOpen}
          aria-controls="bb-owner-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Menu size={22} strokeWidth={menuOpen ? 2.4 : 1.9} absoluteStrokeWidth />
          <span>Menu</span>
        </button>
      </nav>
    </div>
  );
}
