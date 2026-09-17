import { useEffect, useState } from 'react';
import { Home, MessageCircle, Menu, X } from 'lucide-react';
import { LAUNCHER_TAB, appForTab } from '../../../config/appLauncher';
import { navigate } from '../../../app/routing';
import { BrandMark } from '../../../shared/ui/BrandMark';
import { useWorkspaceBadges } from '../hooks/useWorkspaceBadges';
import { MiniAppBar } from './MiniAppBar';
import { OwnerAppsNav } from './OwnerAppsNav';

const DOCK_ICON_STROKE = 2;

/**
 * Business shell: mobile bottom dock; PC left dock + menu panel to the right
 * (dock on Home + Inbox; collapsed inside other mini-apps).
 */
export function OwnerWorkspaceShell({ tab, children }) {
  const { unreadSupport } = useWorkspaceBadges();
  const isLauncher = tab === LAUNCHER_TAB;
  const app = isLauncher ? null : appForTab(tab);
  const supportFlush = tab === 'communications';
  const showDock = isLauncher || supportFlush;
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

  const shellMode = isLauncher
    ? 'is-launcher'
    : supportFlush
      ? 'is-miniapp'
      : 'is-miniapp is-dock-hidden';

  return (
    <div
      className={`bb-shell native-ui ${supportFlush ? 'is-support-flush' : ''} ${shellMode}${
        menuOpen ? ' is-menu-open' : ''
      }`}
    >
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

      {menuOpen && showDock ? (
        <button
          type="button"
          className="bb-owner-menu-backdrop"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      {showDock ? (
        <>
          <div
            className={`bb-owner-menu-sheet${menuOpen ? ' is-open' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Apps menu"
            aria-hidden={!menuOpen}
          >
            <header className="bb-owner-menu-sheet-head">
              <BrandMark
                as="button"
                type="button"
                size="md"
                className="bb-owner-menu-brand bg-transparent border-0 p-0 cursor-pointer"
                onClick={goHome}
              />
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
              <OwnerAppsNav showToggle={false} onSelect={() => setMenuOpen(false)} />
            </div>
          </div>

          <nav className="bb-owner-dock" aria-label="Business navigation">
            <button
              type="button"
              className={`bb-owner-dock-btn${isLauncher && !menuOpen ? ' is-active' : ''}`}
              aria-current={isLauncher && !menuOpen ? 'page' : undefined}
              aria-label="Home"
              title="Home"
              onClick={goHome}
            >
              <span className="bb-owner-dock-icon">
                <Home size={22} strokeWidth={DOCK_ICON_STROKE} absoluteStrokeWidth />
              </span>
            </button>
            <button
              type="button"
              className={`bb-owner-dock-btn${supportFlush && !menuOpen ? ' is-active' : ''}`}
              aria-current={supportFlush && !menuOpen ? 'page' : undefined}
              aria-label="Messages"
              title="Messages"
              onClick={goMessages}
            >
              <span className="bb-owner-dock-icon">
                <MessageCircle size={22} strokeWidth={DOCK_ICON_STROKE} absoluteStrokeWidth />
                {unreadSupport > 0 ? (
                  <span className="bb-owner-dock-badge">
                    {unreadSupport > 99 ? '99+' : unreadSupport}
                  </span>
                ) : null}
              </span>
            </button>
            <button
              type="button"
              className={`bb-owner-dock-btn${menuOpen ? ' is-active' : ''}`}
              aria-label="Menu"
              title="Menu"
              aria-expanded={menuOpen}
              aria-controls="bb-owner-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="bb-owner-dock-icon">
                <Menu size={22} strokeWidth={DOCK_ICON_STROKE} absoluteStrokeWidth />
              </span>
            </button>
          </nav>
        </>
      ) : null}
    </div>
  );
}
