import {
  Bell,
  CalendarDays,
  Check,
  CircleHelp,
  ClipboardList,
  Clock3,
  History,
  Layers,
  MessageSquare,
  Package,
  Truck,
  X
} from 'lucide-react';

const TAB_ICONS = {
  upcoming: CalendarDays,
  review: Bell,
  confirmed: Check,
  waitlist: Clock3,
  history: History,
  all: Layers,
  new: Bell,
  accepted: Check,
  shipped: Truck,
  fulfilled: Package,
  cancelled: X
};

export function OpsDeskTabs({ ariaLabel, value, onChange, options = [] }) {
  return (
    <div className="bb-ops-tabs" role="tablist" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = value === option.id;
        const Icon = option.icon || TAB_ICONS[option.id] || ClipboardList;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`bb-ops-tab ${active ? 'is-active' : ''}`}
            onClick={() => onChange?.(option.id)}
          >
            <span className="bb-ops-tab-icon" aria-hidden="true">
              <Icon size={13} strokeWidth={2.35} />
            </span>
            <span>{option.label}</span>
            <span className="bb-ops-tab-count">{option.count ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}

export function OpsStatusBadge({ status = '', label }) {
  const tone = String(status || 'pending').toLowerCase().replace(/\s+/g, '-');
  return <span className={`bb-ops-badge is-${tone}`}>{label || status}</span>;
}

export function OpsAvatar({ name = '', src = '' }) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const initials =
    parts.length === 0
      ? '?'
      : parts.length === 1
        ? parts[0].slice(0, 2).toUpperCase()
        : `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (
    <span className="bb-ops-avatar" aria-hidden="true">
      {src ? <img src={src} alt="" /> : initials}
    </span>
  );
}

export function OpsAction({ children, onClick, tone = 'default', ariaLabel, className = '' }) {
  return (
    <button
      type="button"
      className={`bb-ops-action ${tone !== 'default' ? `is-${tone}` : ''} ${className}`.trim()}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

export function OpsChatAction({ onClick }) {
  return (
    <OpsAction onClick={onClick}>
      <MessageSquare size={13} strokeWidth={2.2} />
      Chat
    </OpsAction>
  );
}

export function OpsDeclineAction({ onClick, label = 'Decline' }) {
  return (
    <OpsAction tone="danger" ariaLabel={label} onClick={onClick}>
      <X size={14} strokeWidth={2.4} />
    </OpsAction>
  );
}

export function OpsAssignSelect({ label = 'Assigned', value, options = [], onChange, hint }) {
  return (
    <div className="bb-ops-assign">
      <p className="bb-ops-assign-label">{label}</p>
      <div className="bb-ops-assign-control">
        <select value={value || ''} onChange={(event) => onChange?.(event.target.value)}>
          <option value="">Unassigned</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        {hint ? (
          <button type="button" className="bb-ops-assign-hint" title={hint} aria-label={hint}>
            <CircleHelp size={14} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** "Thu, 20 Aug" — matches screenshot date line */
export function formatOpsDayLabel(key = '') {
  const [y, m, d] = String(key).split('-').map(Number);
  if (!y || !m || !d) return key || '—';
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'short' });
  const day = date.getDate();
  const month = date.toLocaleDateString('en-GB', { month: 'short' });
  return `${weekday}, ${day} ${month}`;
}
