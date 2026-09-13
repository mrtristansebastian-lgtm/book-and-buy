import { useState } from 'react';
import { PeriodCustomPicker } from '../../../shared/ui/PeriodCustomPicker';
import { PeriodSegmentedControl } from '../../../shared/ui/PeriodSegmentedControl';
import { CURRENCY_OPTIONS, FINANCE_PERIODS, periodTitle } from '../utils/financeLedger';

export function RevenuePulseHeader({
  periodId,
  onPeriodChange,
  currency,
  onCurrencyChange,
  customRange,
  onCustomRangeChange
}) {
  const [customPickerOpen, setCustomPickerOpen] = useState(false);
  const periodOptions = FINANCE_PERIODS.map((period) => ({
    id: period.id,
    label: period.label
  }));

  return (
    <header className="bb-finance-header">
      <div className="bb-finance-header-top">
        <div className="bb-finance-header-copy">
          <div className="bb-page-title-wrap">
            <div className="bb-page-header-glow" aria-hidden="true" />
            <h1 className="bb-page-title bb-finance-title">{periodTitle(periodId, customRange)}</h1>
          </div>
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

          <PeriodSegmentedControl
            variant="period"
            ariaLabel="Time period"
            value={periodId}
            options={periodOptions}
            onChange={onPeriodChange}
            onCustomSelect={() => setCustomPickerOpen(true)}
          />
        </div>
      </div>

      <PeriodCustomPicker
        open={customPickerOpen}
        from={customRange.from || ''}
        to={customRange.to || customRange.from || ''}
        onClose={() => setCustomPickerOpen(false)}
        onApply={({ from, to }) => {
          onCustomRangeChange?.({ from, to });
          onPeriodChange?.('custom');
          setCustomPickerOpen(false);
        }}
      />
    </header>
  );
}
