import { CircleHelp } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { FilterChip } from '../../../shared/ui/FilterChip';
import { StatusBadge } from '../../../shared/ui/StatusBadge';

export function OpsDeskTabs({ ariaLabel, value, onChange, options = [] }) {
  return (
    <div className="bb-support-chips bb-ops-filter-chips" role="toolbar" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = value === option.id;
        return (
          <FilterChip
            key={option.id}
            type="button"
            selected={active}
            count={option.count ?? 0}
            className={`bb-support-filter-chip${active ? ' is-active' : ''}`}
            onClick={() => onChange?.(option.id)}
          >
            <span>{option.label}</span>
          </FilterChip>
        );
      })}
    </div>
  );
}

export function OpsStatusBadge({ status = '', label }) {
  const tone = String(status || 'pending').toLowerCase().replace(/\s+/g, '-');
  return <StatusBadge className={`bb-ops-badge is-${tone}`} status={status} label={label || status} />;
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

export function OpsAction({ children, onClick, tone = 'default', variant, ariaLabel, className = '', iconOnly = false, disabled = false, busy = false, busyLabel, ...props }) {
  const actionVariant = variant || ({ primary: 'primary', positive: 'positive', danger: 'destructive' }[tone] || 'secondary');
  const Component = iconOnly ? 'button' : Button;
  return (
    <Component
      {...props}
      type="button"
      className={`bb-ops-action ${tone !== 'default' ? `is-${tone}` : ''}${iconOnly ? ' is-icon' : ''} ${className}`.trim()}
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled || busy}
      {...(!iconOnly ? { variant: actionVariant, busy, busyLabel } : {})}
    >
      {children}
    </Component>
  );
}

export function OpsChatAction({ onClick }) {
  return (
    <OpsAction action="chat" onClick={onClick}>
      Chat
    </OpsAction>
  );
}

export function OpsDeclineAction({ onClick, label = 'Decline' }) {
  return (
    <OpsAction action="decline" tone="danger" ariaLabel={label} onClick={onClick}>
      <span>{label}</span>
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
