export const DesktopWorkspaceDock = ({ activeTab, navItems, onNavigateTab }) => (
  <nav className="desktop-bottom-nav hidden md:flex fixed left-1/2 bottom-5 z-[120]" aria-label="Desktop workspace navigation">
    <div className="desktop-nav-dock">
      {navItems.map(item => {
        const IconCmp = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            data-tour={`desktop-dock-${item.id}`}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.label}
            title={item.label}
            onClick={() => onNavigateTab(item.id)}
            className={`desktop-nav-tab ${isActive ? 'is-active' : ''}`}
          >
            <span className="desktop-nav-tab-icon">
              <IconCmp size={18} strokeWidth={2.35} />
              {item.badge && <i />}
            </span>
            <span>{item.id === 'communications' ? 'Support' : item.label}</span>
          </button>
        );
      })}
    </div>
  </nav>
);
