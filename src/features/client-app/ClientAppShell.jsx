import { Compass, Home, MessageCircle, UserRound } from 'lucide-react';
import { clientAppPath, navigate } from '../../app/routing';

const TABS = [
  { id: 'home', label: 'Home', icon: Home, path: '/app/home' },
  { id: 'explore', label: 'Explore', icon: Compass, path: '/app/explore' },
  { id: 'messages', label: 'Messages', icon: MessageCircle, path: '/app/messages' },
  { id: 'account', label: 'Account', icon: UserRound, path: '/app/account' }
];

/** Instagram-style client shell with fixed bottom tabs. */
export function ClientAppShell({
  section = 'home',
  title = '',
  unreadMessages = 0,
  headerRight = null,
  children
}) {
  return (
    <div className="bb-client-shell">
      <header className="bb-client-top">
        <h1 className="bb-client-top-title">{title || 'Book and Buy'}</h1>
        {headerRight ? <div className="bb-client-top-right">{headerRight}</div> : null}
      </header>

      <main className="bb-client-main">{children}</main>

      <nav className="bb-client-tabs" aria-label="Client app">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = section === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`bb-client-tab${active ? ' is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => navigate(tab.path)}
            >
              <span className="bb-client-tab-icon">
                <Icon size={24} strokeWidth={active ? 2.4 : 1.9} absoluteStrokeWidth />
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
