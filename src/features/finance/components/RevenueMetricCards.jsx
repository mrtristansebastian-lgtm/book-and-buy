import { useId } from 'react';
import { formatFinanceMetricValue } from '../utils/financeMetrics';
import { DashboardStat } from '../../../shared/ui/DashboardStat';

/** A single selected statistic and its companion chart share one metric state. */
export function RevenueMetricCards({ metricView, currency = 'R' }) {
  const titleId = useId();
  const { metric, value, available, description, unavailableReason } = metricView;
  const detail = [unavailableReason || description, unavailableReason && metricView.currencyNote].filter(Boolean).join(' ');
  const disclosure = unavailableReason || metricView.coverageNote;
  return (
    <div className="bb-finance-readout">
    <DashboardStat
      className="bb-finance-metric-card"
      appearance="primary"
      titleTag="h2"
      labelId={titleId}
      label={metric.label}
      value={formatFinanceMetricValue(value, metric.format, currency)}
      note={detail}
      noteHidden
      valueProps={{ 'data-unavailable': !available || undefined, 'aria-live': 'polite', 'aria-atomic': true }}
    />
    {disclosure ? <p className="bb-finance-readout-disclosure">{disclosure}</p> : null}
    </div>
  );
}
