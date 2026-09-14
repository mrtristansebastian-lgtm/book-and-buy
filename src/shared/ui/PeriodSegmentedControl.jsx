export function PeriodSegmentedControl({
  options = [],
  value,
  onChange,
  onCustomSelect,
  ariaLabel = 'View',
  variant = 'default'
}) {
  return (
    <div
      className={`bb-segment${variant === 'period' ? ' bb-segment-period' : ''}`}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          onClick={() => {
            if (option.id === 'custom' && onCustomSelect) {
              onCustomSelect();
              return;
            }
            onChange?.(option.id);
          }}
        >
          {option.shortLabel ? (
            <>
              <span className="bb-segment-label-full">{option.label}</span>
              <span className="bb-segment-label-short">{option.shortLabel}</span>
            </>
          ) : (
            option.label
          )}
          {typeof option.count === 'number' ? ` (${option.count})` : ''}
        </button>
      ))}
    </div>
  );
}
