import { forwardRef } from 'react';

/** Text-only selection; click/toggle behaviour remains owned by its screen. */
export const FilterChip = forwardRef(function FilterChip({
  selected = false,
  count,
  label,
  children,
  className = '',
  type = 'button',
  ...props
}, ref) {
  const hasCount = count !== undefined && count !== null;
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      className={`bb-filter-chip${selected ? ' is-active' : ''}${className ? ` ${className}` : ''}`}
      aria-pressed={props.role === 'tab' ? undefined : selected}
      aria-selected={props.role === 'tab' ? selected : props['aria-selected']}
    >
      <span className="bb-filter-label">{label ?? children}</span>
      {hasCount && <span className="bb-count-badge">{count}</span>}
    </button>
  );
});
