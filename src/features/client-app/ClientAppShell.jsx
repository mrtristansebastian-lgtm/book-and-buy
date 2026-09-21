import { useEffect, useRef, useState } from 'react';
import { Compass, Home, MessageCircle, Search, UserRound } from 'lucide-react';
import { clientAppPath, navigate } from '../../app/routing';
import { BrandMark } from '../../shared/ui/BrandMark';

const TABS = [
  { id: 'home', label: 'Home', icon: Home, path: '/app/home' },
  { id: 'find', label: 'Find', icon: Search, path: '/app/find' },
  { id: 'explore', label: 'Explore', icon: Compass, path: '/app/explore' },
  { id: 'messages', label: 'Messages', icon: MessageCircle, path: '/app/messages' },
  { id: 'account', label: 'Account', icon: UserRound, path: '/app/account' }
];

/** Client shell: bottom tab dock on mobile; left icon dock on PC (like business). */
export function ClientAppShell({
  section = 'home',
  title = '',
  unreadMessages = 0,
  headerRight = null,
  hideHeader = false,
  children
}) {
  const [dockHidden, setDockHidden] = useState(false);
  const scrollTicking = useRef(false);

  useEffect(() => {
    setDockHidden(false);
  }, [section]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    /* Keep dock pinned in inbox / messages */
    if (section === 'messages') {
      setDockHidden(false);
      return undefined;
    }
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
        key: window,
        y: window.scrollY || document.documentElement.scrollTop || 0
      };
    };

    const verticalsOpen = () =>
      Boolean(
        document.querySelector(
          '.bb-client-home-feed.is-vertical-open, .bb-client-vertical-page, .bb-client-ig-explore.is-vertical-open .bb-vertical-watch, .bb-client-ig-explore.is-immersive .bb-vertical-watch'
        )
      );

    const applyDockFromDelta = (y, delta) => {
      if (verticalsOpen()) {
        setDockHidden(false);
        return;
      }
      if (y <= 56) {
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
        if (verticalsOpen()) {
          setDockHidden(false);
          return;
        }
        const { key, y } = resolveScrollY(event.target);
        const prev = scrollTops.has(key) ? scrollTops.get(key) : y;
        const delta = y - prev;
        scrollTops.set(key, y);
        if (Math.abs(delta) < 6) return;
        applyDockFromDelta(y, delta);
      });
    };

    const onTouchStart = (event) => {
      touchStartY = event.touches?.[0]?.clientY ?? 0;
    };

    const onTouchMove = (event) => {
      if (verticalsOpen()) {
        setDockHidden(false);
        return;
      }
      const y = event.touches?.[0]?.clientY ?? touchStartY;
      const delta = touchStartY - y;
      if (Math.abs(delta) < 14) return;
      const pageY = window.scrollY || document.documentElement.scrollTop || 0;
      applyDockFromDelta(pageY, delta);
      touchStartY = y;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [section]);

  return (
    <div
      className={`bb-client-shell native-ui${hideHeader ? ' is-headerless' : ''}${
        dockHidden ? ' is-dock-hidden' : ''
      }`}
    >
      {hideHeader ? null : (
        <header className="bb-client-top">
          <BrandMark
            size="sm"
            showWordmark={false}
            className="bb-client-top-mark"
            aria-hidden="true"
          />
          <div className="bb-page-title-wrap bb-client-top-title-wrap">
            <div className="bb-page-header-glow" aria-hidden="true" />
            <h1 className="bb-page-title m-0">{title || 'Book and Buy'}</h1>
          </div>
          <div className="bb-client-top-right">
            {headerRight}
          </div>
        </header>
      )}

      <main className="bb-client-main">{children}</main>

      <nav className="bb-client-tabs" aria-label="Client navigation">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = section === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`bb-client-tab${active ? ' is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
              aria-label={tab.label}
              title={tab.label}
              onClick={() => navigate(tab.path)}
            >
              <span className="bb-client-tab-icon">
                <Icon size={22} strokeWidth={2} absoluteStrokeWidth />
                {tab.id === 'messages' && unreadMessages > 0 ? (
                  <span className="bb-client-tab-badge">
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </span>
                ) : null}
              </span>
              <span className="bb-client-tab-label">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export { clientAppPath };
