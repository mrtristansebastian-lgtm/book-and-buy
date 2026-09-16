import { ChevronRight } from 'lucide-react';
import { TAB_HINTS, TAB_ICONS } from '../../../config/appLauncher';
import { workspaceTabLabels } from '../../../config/routeConfig';
import { navigate } from '../../../app/routing';

/**
 * Widget-style mini-app tile: eyebrow + bare glyph, app title,
 * and the app's pages as a clean list. Whole tile opens the first page.
 */
export function AppTile({ app, badgeFor, index = 0 }) {
  const Icon = app.icon;
  const total = app.tabs.reduce((sum, id) => sum + badgeFor(id), 0);

  const open = (tabId = app.tabs[0]) => navigate(`/dashboard/${tabId}`);

  return (
    <article
      className={`bb-app-tile is-${app.size} bb-launcher-enter`}
      style={{ '--i': index }}
    >
      <button
        type="button"
        className="bb-app-tile-hit"
        aria-label={`Open ${app.label}`}
        onClick={() => open()}
      />

      <div className="bb-app-tile-lead">
        <span className="bb-app-tile-icon" aria-hidden="true">
          <Icon size={30} strokeWidth={1.6} absoluteStrokeWidth />
        </span>
        <div className="bb-app-tile-copy">
          <h2 className="bb-app-tile-title">{app.label}</h2>
          <p className="bb-app-tile-blurb">{app.blurb}</p>
        </div>
        {total > 0 ? <span className="bb-app-tile-dot" aria-label={`${total} waiting`} /> : null}
      </div>

      <ul className="bb-app-tile-list" aria-label={`${app.label} pages`}>
        {app.tabs.map((id) => {
          const badge = badgeFor(id);
          const PageIcon = TAB_ICONS[id] || Icon;
          return (
            <li key={id} className="bb-app-tile-row-wrap">
              <button
                type="button"
                className="bb-app-tile-row"
                onClick={(event) => {
                  event.stopPropagation();
                  open(id);
                }}
              >
                <span className="bb-app-tile-row-icon" aria-hidden="true">
                  <PageIcon size={16} strokeWidth={2.1} />
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
    </article>
  );
}
