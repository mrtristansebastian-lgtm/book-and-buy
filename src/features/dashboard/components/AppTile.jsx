import { ChevronRight } from 'lucide-react';
import { TAB_HINTS, TAB_ICONS } from '../../../config/appLauncher';
import { workspaceTabLabels } from '../../../config/routeConfig';
import { navigate } from '../../../app/routing';
import { AppIcon } from './AppIcon';

/** One launcher section: category heading + either app icons or a list of pages. */
export function AppTile({ app, badgeFor, index = 0, view = 'icons', onSelect = null }) {
  const Icon = app.icon;
  const open = (tabId) => {
    navigate(`/dashboard/${tabId}`);
    onSelect?.(tabId);
  };

  return (
    <section
      className={`bb-appgroup is-${view} bb-launcher-enter`}
      style={{ '--i': index }}
      aria-label={app.label}
    >
      <header className="bb-appgroup-head">
        <span className="bb-appgroup-icon" aria-hidden="true">
          <Icon size={24} strokeWidth={1.6} absoluteStrokeWidth />
        </span>
        <div className="bb-appgroup-copy">
          <h2 className="bb-appgroup-title">{app.label}</h2>
          <p className="bb-appgroup-blurb">{app.blurb}</p>
        </div>
      </header>

      {view === 'list' ? (
        <ul className="bb-app-tile-list" aria-label={`${app.label} pages`}>
          {app.tabs.map((id) => {
            const badge = badgeFor(id);
            const PageIcon = TAB_ICONS[id] || Icon;
            return (
              <li key={id} className="bb-app-tile-row-wrap">
                <button type="button" className="bb-app-tile-row" onClick={() => open(id)}>
                  <span className="bb-app-tile-row-icon" aria-hidden="true">
                    <PageIcon size={20} strokeWidth={1.8} absoluteStrokeWidth />
                  </span>
                  <span className="bb-app-tile-row-text">
                    <span className="bb-app-tile-row-label">{workspaceTabLabels[id]}</span>
                    <span className="bb-app-tile-row-hint">{TAB_HINTS[id]}</span>
                  </span>
                  {badge > 0 ? (
                    <span className="bb-app-tile-row-count">{badge > 99 ? '99+' : badge}</span>
                  ) : (
                    <ChevronRight
                      size={15}
                      strokeWidth={2.2}
                      className="bb-app-tile-row-chevron"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="bb-appgroup-row">
          {app.tabs.map((tabId, i) => (
            <AppIcon
              key={tabId}
              tabId={tabId}
              fallbackIcon={Icon}
              tint={app.tint}
              badge={badgeFor(tabId)}
              index={index + i * 0.25}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </section>
  );
}
