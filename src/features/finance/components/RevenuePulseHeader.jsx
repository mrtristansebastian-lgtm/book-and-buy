import { useState } from 'react';
import { PeriodCustomPicker } from '../../../shared/ui/PeriodCustomPicker';
import { PeriodSegmentedControl } from '../../../shared/ui/PeriodSegmentedControl';
import { PageBackButton } from '../../../shared/ui/PageBackButton';
import { FINANCE_PERIODS, periodTitle } from '../utils/financeLedger';

export function RevenuePulseHeader({
  periodId,
  onPeriodChange,
  customRange,
  onCustomRangeChange
}) {
  const [customPickerOpen, setCustomPickerOpen] = useState(false);
  const periodOptions = FINANCE_PERIODS.map((period) => ({
    id: period.id,
    label: period.label,
    shortLabel: period.shortLabel
  }));

  return (
    <header className="bb-finance-header">
      <div className="bb-finance-header-top">
        <div className="bb-finance-header-copy">
          <div className="bb-page-title-wrap">
            <PageBackButton />
            <span className="bb-page-title-main">
              <div className="bb-page-header-glow" aria-hidden="true" />
              <h1 className="bb-page-title bb-finance-title">Receipts &amp; invoices</h1>
            </span>
          </div>
          <p className="bb-muted m-0 text-sm">{periodTitle(periodId, customRange)} · Paid receipts and invoices waiting for payment</p>
        </div>

        <div className="bb-finance-header-controls">
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
