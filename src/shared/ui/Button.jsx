import { cloneElement, forwardRef, isValidElement } from 'react';
import { getButtonActionIcon } from './buttonActions';
import { LoaderCircle } from 'lucide-react';

const VARIANTS = new Set(['primary', 'secondary', 'positive', 'destructive']);

/** A text action with an explicit purpose, separate from tabs and icon controls. */
export const Button = forwardRef(function Button({
  as = 'button',
  variant = 'secondary',
  action,
  icon,
  selected = false,
  busy = false,
  busyLabel = 'Working…',
  disabled = false,
  type = 'button',
  className = '',
  children,
  onClick,
  href,
  tabIndex,
  ...props
}, ref) {
  const blocked = disabled || busy;
  const iconOnly = action === 'delete' || action === 'remove';
  const ActionIcon = iconOnly ? getButtonActionIcon('delete') : icon === undefined ? getButtonActionIcon(action) : icon;
  const iconProps = {
    className: 'bb-button-icon',
    'data-bb-keep-icon': true,
    size: 16,
    strokeWidth: 1.6,
    'aria-hidden': true,
    focusable: false
  };
  const actionIcon = ActionIcon
    ? isValidElement(ActionIcon)
      ? cloneElement(ActionIcon, iconProps)
      : <ActionIcon {...iconProps} />
    : null;
  const isLink = as === 'a';
  const Tag = isLink ? 'a' : 'button';
  const nativeProps = isLink
    ? { href: blocked ? undefined : href, 'aria-disabled': blocked || undefined, tabIndex: blocked ? -1 : tabIndex }
    : { type, disabled: blocked, tabIndex };
  return (
    <Tag
      {...props}
      {...nativeProps}
      ref={ref}
      className={`bb-button${iconOnly ? ' is-icon-only' : ''}${busy ? ' is-busy' : ''}${className ? ` ${className}` : ''}`}
      data-variant={VARIANTS.has(variant) ? variant : 'secondary'}
      data-action={action || undefined}
      data-selected={selected ? 'true' : undefined}
      aria-busy={busy || undefined}
      title={props.title || (iconOnly && typeof children === 'string' ? children.trim() : undefined)}
      onClick={blocked ? undefined : onClick}
    >
      {/* The original label stays in flow so submitting never collapses the button. */}
      <span className="bb-button-label" aria-hidden={busy || undefined}>{actionIcon}<span className={`bb-button-text${iconOnly ? ' bb-control-sr-only' : ''}`}>{children}</span></span>
      {busy && <span className="bb-button-busy-label">{iconOnly ? <><LoaderCircle className="bb-delete-busy-icon" data-bb-keep-icon size={16} aria-hidden="true" /><span className="bb-control-sr-only">{busyLabel}</span></> : busyLabel}</span>}
    </Tag>
  );
});
