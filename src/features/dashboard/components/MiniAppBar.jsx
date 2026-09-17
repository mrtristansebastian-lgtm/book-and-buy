import { navigate } from '../../../app/routing';
import { workspaceTabLabels } from '../../../config/routeConfig';
import { useWorkspaceBadges } from '../hooks/useWorkspaceBadges';

/**
 * Sub-page switcher for multi-tab mini-apps. Back + app identity live in
 * each page heading instead of a category header.
 */
export function MiniAppBar({ app, tab }) {
  const { badgeFor } = useWorkspaceBadges();
  const label = app?.label || workspaceTabLabels[tab] || '';
  const tabs = app?.tabs || [tab];
  if (tabs.length <= 1) return null;

  return (
    <div className="bb-miniapp-tabs-bar" data-hue={app?.hue || 'mint'}>
      <nav className="bb-miniapp-tabs" aria-label={`${label} pages`}>
        <div className="bb-segment bb-miniapp-segment" role="group">
          {tabs.map((id) => {
            const badge = badgeFor(id);
            return (
              <button
                key={id}
                type="button"
                aria-pressed={tab === id}
                onClick={() => navigate(`/dashboard/${id}`)}
              >
                <span>{workspaceTabLabels[id]}</span>
                {badge > 0 ? (
                  <span className="bb-miniapp-tab-badge">{badge > 9 ? '9+' : badge}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
