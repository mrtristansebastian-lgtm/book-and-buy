import { useState } from 'react';
import { PeriodCustomPicker } from '../../../shared/ui/PeriodCustomPicker';
import { PeriodSegmentedControl } from '../../../shared/ui/PeriodSegmentedControl';
import { PeriodPageHeader } from '../../../shared/ui/PeriodPageHeader';
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
      <PeriodPageHeader
        className="bb-finance-header-top"
        title={
          <div className="bb-page-title-wrap">
            <PageBackButton />
            <span className="bb-page-title-main">
              <div className="bb-page-header-glow" aria-hidden="true" />
              <h1 className="bb-page-title bb-finance-title">Receipts &amp; invoices</h1>
            </span>
          </div>
        }
        period={<PeriodSegmentedControl
          variant="period"
          ariaLabel="Time period"
          value={periodId}
          options={periodOptions}
          onChange={onPeriodChange}
          onCustomSelect={() => setCustomPickerOpen(true)}
        />}
        description={<p className="bb-muted m-0 text-sm">{periodTitle(periodId, customRange)} · Paid receipts and invoices waiting for payment</p>}
      />

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
