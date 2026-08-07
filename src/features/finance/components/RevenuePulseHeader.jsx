import { CURRENCY_OPTIONS, FINANCE_PERIODS, periodTitle } from '../utils/financeLedger';

export function RevenuePulseHeader({
  periodId,
  onPeriodChange,
  currency,
  onCurrencyChange,
  customRange,
  onCustomRangeChange
}) {
  return (
    <header className="bb-finance-header">
      <div className="bb-finance-header-top">
        <div className="bb-finance-header-copy">
          <p className="bb-finance-eyebrow">Revenue pulse</p>
          <h1 className="bb-finance-title">{periodTitle(periodId, customRange)}</h1>
        </div>

        <div className="bb-finance-header-controls">
          <label className="bb-finance-currency">
            <span className="sr-only">Currency</span>
            <select
              value={currency}
              onChange={(event) => onCurrencyChange?.(event.target.value)}
              aria-label="Currency"
            >
              {CURRENCY_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="bb-finance-period-pills" role="tablist" aria-label="Time period">
            {FINANCE_PERIODS.map((period) => (
              <button
                key={period.id}
                type="button"
                role="tab"
                aria-selected={periodId === period.id}
                className={`bb-finance-period-pill${periodId === period.id ? ' is-active' : ''}`}
                onClick={() => onPeriodChange?.(period.id)}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {periodId === 'custom' ? (
        <div className="bb-finance-custom-range">
          <label>
            From
            <input
              type="date"
              value={customRange.from || ''}
              onChange={(event) =>
                onCustomRangeChange?.({ ...customRange, from: event.target.value })
              }
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={customRange.to || ''}
              onChange={(event) =>
                onCustomRangeChange?.({ ...customRange, to: event.target.value })
              }
            />
          </label>
        </div>
      ) : null}
    </header>
  );
}
