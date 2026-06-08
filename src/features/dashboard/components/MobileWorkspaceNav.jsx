import { Home, Layers } from 'lucide-react';

export const MobileWorkspaceNav = ({
  activeTab,
  isGuestWorkspace,
  mobileMoreActive,
  mobileMoreHasBadge,
  mobileMoreNavItems,
  mobileNavCollapsed,
  mobileNavOpen,
  mobilePrimaryNavItems,
  onAuth,
  onMobileMoreToggle,
  onNavigateTab,
  onSignOut,
  onToggleMobileNav
}) => (
  <nav className={`mobile-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-[120] transition-all duration-500 ${mobileNavOpen ? 'is-open' : ''} ${activeTab === 'editor' && mobileNavCollapsed ? 'mobile-bottom-nav-collapsed' : ''}`} aria-label="Mobile workspace navigation">
    {mobileNavOpen && (
      <button
        type="button"
        aria-label="Close more navigation"
        className="mobile-nav-dim"
        onClick={() => onToggleMobileNav(false)}
      />
    )}
    <div className="mobile-nav-more-sheet">
      <div className="mobile-nav-more-handle" />
      <div className="mobile-nav-more-grid">
        {mobileMoreNavItems.map(item => {
          const IconCmp = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              data-tour={`mobile-nav-${item.id}`}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => {
                if (onNavigateTab(item.id)) {
                  onToggleMobileNav(false);
                }
              }}
              className={`mobile-nav-more-item ${isActive ? 'is-active' : ''}`}
            >
              <span className="mobile-nav-more-icon">
                <IconCmp size={17} strokeWidth={2.3} />
                {item.badge && <i />}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
      {isGuestWorkspace && (
        <div className="mobile-nav-auth-row mobile-nav-auth-row-guest">
          <button type="button" onClick={onSignOut}>
            <Home size={13} /> Home
          </button>
          <button type="button" onClick={() => onAuth('signin', 'owner')}>Sign In</button>
          <button type="button" onClick={() => onAuth('signup', 'owner')}>Save For Real</button>
        </div>
      )}
    </div>
    <div className="mobile-nav-dock">
      {mobilePrimaryNavItems.map(item => {
        const IconCmp = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            data-tour={`mobile-dock-${item.id}`}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            onClick={() => {
              if (onNavigateTab(item.id)) {
                onToggleMobileNav(false);
              }
            }}
            className={`mobile-nav-tab ${isActive ? 'is-active' : ''}`}
          >
            <span className="mobile-nav-tab-icon">
              <IconCmp size={18} strokeWidth={2.35} />
              {item.badge && <i />}
            </span>
            <span>{item.id === 'communications' ? 'Support' : item.label}</span>
          </button>
        );
      })}
      <button
        type="button"
        className={`mobile-nav-tab mobile-nav-more-button ${mobileMoreActive || mobileNavOpen ? 'is-active' : ''}`}
        aria-label={mobileNavOpen ? 'Close more navigation' : 'Open more navigation'}
        aria-expanded={mobileNavOpen}
        onClick={onMobileMoreToggle}
      >
        <span className="mobile-nav-tab-icon">
          <Layers size={18} strokeWidth={2.35} />
          {mobileMoreHasBadge && <i />}
        </span>
        <span>More</span>
      </button>
    </div>
  </nav>
);
