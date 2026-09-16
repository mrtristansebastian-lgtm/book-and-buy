import { TAB_HINTS, TAB_ICONS } from '../../../config/appLauncher';
import { workspaceTabLabels } from '../../../config/routeConfig';
import { navigate } from '../../../app/routing';

/** iOS-style app icon: category-tinted squircle + white glyph, count badge, label. */
export function AppIcon({ tabId, fallbackIcon, tint, badge = 0, index = 0 }) {
  const Icon = TAB_ICONS[tabId] || fallbackIcon;
  const [tintA, tintB] = tint || ['#cbd5e1', '#94a3b8'];
  const label = workspaceTabLabels[tabId] || tabId;

  return (
    <button
      type="button"
      className="bb-appicon bb-launcher-enter"
      style={{ '--tint-a': tintA, '--tint-b': tintB, '--i': index }}
      title={TAB_HINTS[tabId]}
      aria-label={badge > 0 ? `${label}, ${badge} waiting` : label}
      onClick={() => navigate(`/dashboard/${tabId}`)}
    >
      <span className="bb-appicon-glyph" aria-hidden="true">
        {Icon ? <Icon size={28} strokeWidth={1.9} absoluteStrokeWidth /> : null}
        {badge > 0 ? (
          <span className="bb-appicon-badge">{badge > 99 ? '99+' : badge}</span>
        ) : null}
      </span>
      <span className="bb-appicon-label">{label}</span>
    </button>
  );
}
