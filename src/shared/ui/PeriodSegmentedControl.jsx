export function PeriodSegmentedControl({ options = [], value, onChange, ariaLabel = 'View' }) {
  return (
    <div className="bb-segment" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          onClick={() => onChange?.(option.id)}
        >
          {option.label}
          {typeof option.count === 'number' ? ` (${option.count})` : ''}
        </button>
      ))}
    </div>
  );
}
