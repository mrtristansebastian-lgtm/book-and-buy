import { useState } from 'react';
import { useAnalyticsLive } from '../hooks/useAnalyticsLive';
import { AnalyticsHeader } from '../components/AnalyticsHeader';
import { AnalyticsKpiRow } from '../components/AnalyticsKpiRow';
import { AnalyticsSalesChart } from '../components/AnalyticsSalesChart';
import { AnalyticsFunnel } from '../components/AnalyticsFunnel';
import { AnalyticsGeo } from '../components/AnalyticsGeo';
import { AnalyticsRankTable } from '../components/AnalyticsRankTable';
import { CHART_METRICS } from '../utils/analyticsMetrics';

/** Reports dashboard — historical KPIs, chart, funnel, rankings. */
export function AnalyticsPage() {
  const [periodId, setPeriodId] = useState('week');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [metricId, setMetricId] = useState('revenue');
  const data = useAnalyticsLive(periodId, customRange, { metricId });
  const metric = CHART_METRICS.find((m) => m.id === metricId) || CHART_METRICS[0];

  return (
    <div className="bb-analytics">
      <AnalyticsHeader
        periodId={periodId}
        onPeriodChange={setPeriodId}
        customRange={customRange}
        onCustomRangeChange={setCustomRange}
        usingDemo={data.usingDemo}
        title="Reports"
      />

      <AnalyticsKpiRow kpis={data.kpis} currency={data.currency} />

      <section className="bb-analytics-panel bb-analytics-chart-panel">
        <header className="bb-analytics-panel-head bb-analytics-panel-head--row">
          <div>
            <h2 className="bb-analytics-panel-title">Over time</h2>
            <p className="bb-analytics-panel-lede">{metric.lede}</p>
          </div>
        </header>
        <AnalyticsSalesChart
          series={data.series}
          currency={data.currency}
          metricId={metricId}
          onMetricChange={setMetricId}
        />
      </section>

      <AnalyticsFunnel funnel={data.funnel} />

      <div className="bb-analytics-grid">
        <AnalyticsGeo geo={data.geo} />
        <AnalyticsRankTable
          title="Top paths"
          lede="Pages visitors open most"
          rows={data.topPaths}
        />
        <AnalyticsRankTable
          title="Top products"
          lede="Views and add-to-carts"
          rows={data.topProducts}
        />
        <AnalyticsRankTable
          title="Top referrers"
          lede="Where traffic arrives from"
          rows={data.topReferrers}
        />
      </div>

      {data.loading ? (
        <p className="bb-analytics-loading" aria-live="polite">
          Syncing analytics…
        </p>
      ) : null}
      {data.error && !data.usingDemo ? (
        <p className="bb-analytics-error" role="alert">
          {data.error}
        </p>
      ) : null}
    </div>
  );
}
