export const defaultPeriodOptions = [
  { id: 'all', label: 'All time' },
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'custom', label: 'Custom' }
];

export function PeriodSegmentedControl({
  ariaLabel = 'Time period',
  className = '',
  onCustomSelect,
  onChange,
  options = defaultPeriodOptions,
  testIdPrefix = 'period',
  value
}) {
  return (
    <div className={`period-segmented-control booking-period-tabs schedule-scope-toggle ${className}`} role="group" aria-label={ariaLabel}>
      {options.map((period) => {
        const isActive = value === period.id;
        return (
          <button
            key={period.id}
            type="button"
            data-testid={`${testIdPrefix}-${period.id}`}
            aria-pressed={isActive}
            onClick={() => {
              onChange?.(period.id);
              if (period.id === 'custom') onCustomSelect?.();
            }}
            className={`period-segmented-option booking-period-tab ${isActive ? 'is-active' : ''}`}
          >
            {period.label}
          </button>
        );
      })}
    </div>
  );
}
