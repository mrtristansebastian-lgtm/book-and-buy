import { useEffect, useRef, useState } from 'react';
import { Home, MessageCircle, Menu, X } from 'lucide-react';
import { LAUNCHER_TAB, appForTab } from '../../../config/appLauncher';
import { navigate } from '../../../app/routing';
import { useWorkspaceBadges } from '../hooks/useWorkspaceBadges';
import { MiniAppBar } from './MiniAppBar';
import { OwnerAppsNav } from './OwnerAppsNav';

const MOBILE_DOCK_MQ = '(max-width: 899px)';
const WINDOW_SCROLL_KEY = Object.freeze({});

/**
 * Business shell: PC left apps panel; mobile Home / Messages / Menu dock
 * with upward menu sheet. Home keeps stats; apps live in panel/sheet.
 */
export function OwnerWorkspaceShell({ tab, children }) {
  const { unreadSupport } = useWorkspaceBadges();
  const isLauncher = tab === LAUNCHER_TAB;
  const app = isLauncher ? null : appForTab(tab);
  const supportFlush = tab === 'communications';
  const [menuOpen, setMenuOpen] = useState(false);
  const [dockHidden, setDockHidden] = useState(false);
  const scrollTicking = useRef(false);

  useEffect(() => {
    setMenuOpen(false);
    setDockHidden(false);
  }, [tab]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    setDockHidden(false);
    const onKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia(MOBILE_DOCK_MQ);
    const scrollTops = new WeakMap();
    let touchStartY = 0;

    const resolveScrollY = (target) => {
      if (
        target instanceof Element &&
        target !== document.documentElement &&
        target !== document.body
      ) {
        const style = window.getComputedStyle(target);
        const canScroll =
          /(auto|scroll|overlay)/.test(style.overflowY) ||
          /(auto|scroll|overlay)/.test(style.overflow);
        if (canScroll && target.scrollHeight > target.clientHeight + 1) {
          return { key: target, y: target.scrollTop };
        }
      }
      return {
        key: WINDOW_SCROLL_KEY,
        y: window.scrollY || document.documentElement.scrollTop || 0
      };
    };

    const applyDockFromDelta = (y, delta, scrollEl) => {
      if (!mq.matches || menuOpen) {
        setDockHidden(false);
        return;
      }
      const el = scrollEl instanceof Element ? scrollEl : document.documentElement;
      const viewH =
        scrollEl instanceof Element ? scrollEl.clientHeight : window.innerHeight;
      const maxY = Math.max(0, (el.scrollHeight || 0) - viewH);
      const nearBottom = maxY > 0 && y >= maxY - 72;
      if (y <= 56 || nearBottom) {
        setDockHidden(false);
        return;
      }
      if (delta > 12) setDockHidden(true);
      else if (delta < -8) setDockHidden(false);
    };

    const onScroll = (event) => {
      if (scrollTicking.current) return;
      scrollTicking.current = true;
      window.requestAnimationFrame(() => {
        scrollTicking.current = false;
        const { key, y } = resolveScrollY(event.target);
        const prev = scrollTops.has(key) ? scrollTops.get(key) : y;
        const delta = y - prev;
        scrollTops.set(key, y);
        if (Math.abs(delta) < 6) return;
        applyDockFromDelta(
          y,
          delta,
          key === WINDOW_SCROLL_KEY ? document.documentElement : key
        );
      });
    };

    const onTouchStart = (event) => {
      touchStartY = event.touches?.[0]?.clientY ?? 0;
    };

    const onTouchMove = (event) => {
      if (!mq.matches || menuOpen) return;
      const y = event.touches?.[0]?.clientY ?? touchStartY;
      const delta = touchStartY - y; // finger up => content scrolls down
      if (Math.abs(delta) < 14) return;
      const pageY = window.scrollY || document.documentElement.scrollTop || 0;
      applyDockFromDelta(pageY, delta, document.documentElement);
      touchStartY = y;
    };

    const onMq = () => {
      if (!mq.matches) setDockHidden(false);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    mq.addEventListener('change', onMq);
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      mq.removeEventListener('change', onMq);
    };
  }, [menuOpen, tab]);

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
      }${menuOpen ? ' is-menu-open' : ''}${dockHidden ? ' is-dock-hidden' : ''}`}
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
