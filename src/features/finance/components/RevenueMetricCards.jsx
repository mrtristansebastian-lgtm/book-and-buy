import { formatMoney } from '../utils/financeLedger';

export function RevenueMetricCards({ metrics, currency = 'R' }) {
  return (
    <div className="bb-finance-metrics">
      <article className="bb-finance-metric bb-finance-metric--hero">
        <p className="bb-finance-metric-label">Total Revenue</p>
        <p className="bb-finance-metric-value">
          {formatMoney(metrics.totalRevenueInCents, currency)}
        </p>
      </article>
      <article className="bb-finance-metric">
        <p className="bb-finance-metric-label">Average Monthly Revenue</p>
        <p className="bb-finance-metric-value">
          {formatMoney(metrics.averageMonthlyInCents, currency, { decimals: true })}
        </p>
      </article>
      <article className="bb-finance-metric">
        <p className="bb-finance-metric-label">Pending Payments</p>
        <p className="bb-finance-metric-value">
          {formatMoney(metrics.pendingInCents, currency)}
        </p>
      </article>
    </div>
  );
}
