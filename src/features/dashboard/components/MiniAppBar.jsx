import { ArrowLeft } from 'lucide-react';
import { LAUNCHER_TAB, TAB_ICONS } from '../../../config/appLauncher';
import { workspaceTabLabels } from '../../../config/routeConfig';
import { navigate } from '../../../app/routing';
import { useWorkspaceBadges } from '../hooks/useWorkspaceBadges';

/**
 * Top bar inside a mini-app: Back to launcher, app identity, and the app's
 * pages as a segmented control. Replaces the sidebar.
 */
export function MiniAppBar({ app, tab }) {
  const { badgeFor } = useWorkspaceBadges();
  const AppIcon = app?.icon || TAB_ICONS[tab] || ArrowLeft;
  const label = app?.label || workspaceTabLabels[tab] || '';
  const tabs = app?.tabs || [tab];
  const multi = tabs.length > 1;

  return (
    <header className="bb-miniapp-bar" data-hue={app?.hue || 'mint'}>
      <div className="bb-miniapp-bar-inner">
        <button
          type="button"
          className="bb-miniapp-back"
          aria-label="Back to Home"
          onClick={() => navigate(`/dashboard/${LAUNCHER_TAB}`)}
        >
          <ArrowLeft size={18} strokeWidth={2.4} />
        </button>

        <div className="bb-miniapp-identity">
          <span className="bb-miniapp-chip" aria-hidden="true">
            <AppIcon size={16} strokeWidth={2.3} />
          </span>
          <span className="bb-miniapp-name">{label}</span>
        </div>

        {multi ? (
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
        ) : null}
      </div>
    </header>
  );
}
