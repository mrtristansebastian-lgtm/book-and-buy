import { useState } from 'react';
import { PeriodCustomPicker } from '../../../shared/ui/PeriodCustomPicker';
import { PeriodSegmentedControl } from '../../../shared/ui/PeriodSegmentedControl';
import { ANALYTICS_PERIODS, periodTitle } from '../utils/analyticsMetrics';

export function AnalyticsHeader({
  periodId,
  onPeriodChange,
  customRange,
  onCustomRangeChange,
  usingDemo = false
}) {
  const [customPickerOpen, setCustomPickerOpen] = useState(false);
  const periodOptions = ANALYTICS_PERIODS.map((period) => ({
    id: period.id,
    label: period.label,
    shortLabel: period.shortLabel
  }));

  return (
    <header className="bb-analytics-header">
      <div className="bb-analytics-header-top">
        <div className="bb-analytics-header-copy">
          <p className="bb-analytics-eyebrow">Analytics</p>
          <div className="bb-page-title-wrap">
            <div className="bb-page-header-glow" aria-hidden="true" />
            <h1 className="bb-page-title bb-analytics-title">
              {periodTitle(periodId, customRange)}
            </h1>
          </div>
          {usingDemo ? (
            <p className="bb-analytics-demo-note">Demo data — connect Firebase for live tracking.</p>
          ) : null}
        </div>

        <PeriodSegmentedControl
          variant="period"
          ariaLabel="Time period"
          value={periodId}
          options={periodOptions}
          onChange={onPeriodChange}
          onCustomSelect={() => setCustomPickerOpen(true)}
        />
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
