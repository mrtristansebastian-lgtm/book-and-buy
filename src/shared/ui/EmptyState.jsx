/**
 * Universal empty-state panel for feeds, libraries, and studios.
 * Keep copy short; one primary CTA when an action exists.
 */
export function EmptyState({
  icon: Icon = null,
  eyebrow = '',
  title,
  description = '',
  action = null,
  secondaryAction = null,
  className = '',
  compact = false
}) {
  return (
    <div
      className={`bb-empty-state${compact ? ' is-compact' : ''}${className ? ` ${className}` : ''}`}
    >
      {Icon ? (
        <div className="bb-empty-state-icon" aria-hidden="true">
          <Icon size={compact ? 22 : 28} strokeWidth={1.7} />
        </div>
      ) : null}
      {eyebrow ? <p className="bb-empty-state-eyebrow">{eyebrow}</p> : null}
      {title ? <h2 className="bb-empty-state-title">{title}</h2> : null}
      {description ? <p className="bb-empty-state-copy">{description}</p> : null}
      {action || secondaryAction ? (
        <div className="bb-empty-state-actions">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
