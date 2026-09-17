import { useState } from 'react';
import { useAnalyticsLive } from '../hooks/useAnalyticsLive';
import { AnalyticsHeader } from '../components/AnalyticsHeader';
import { AnalyticsLiveStrip } from '../components/AnalyticsLiveStrip';
import { AnalyticsKpiRow } from '../components/AnalyticsKpiRow';
import { AnalyticsSalesChart } from '../components/AnalyticsSalesChart';
import { AnalyticsFunnel } from '../components/AnalyticsFunnel';
import { AnalyticsGeo } from '../components/AnalyticsGeo';
import { AnalyticsRankTable } from '../components/AnalyticsRankTable';
import { AnalyticsActiveCarts } from '../components/AnalyticsActiveCarts';

export function AnalyticsPage() {
  const [periodId, setPeriodId] = useState('week');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const data = useAnalyticsLive(periodId, customRange);

  return (
    <div className="bb-analytics">
      <AnalyticsHeader
        periodId={periodId}
        onPeriodChange={setPeriodId}
        customRange={customRange}
        onCustomRangeChange={setCustomRange}
        usingDemo={data.usingDemo}
      />

      <AnalyticsLiveStrip live={data.live} />

      <AnalyticsKpiRow kpis={data.kpis} currency={data.currency} />

      <section className="bb-analytics-panel bb-analytics-chart-panel">
        <header className="bb-analytics-panel-head">
          <h2 className="bb-analytics-panel-title">Sales over time</h2>
          <p className="bb-analytics-panel-lede">Paid revenue and purchases</p>
        </header>
        <AnalyticsSalesChart series={data.series} currency={data.currency} />
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

      <AnalyticsActiveCarts carts={data.activeCarts} currency={data.currency} />

      {data.loading ? (
        <p className="bb-analytics-loading" aria-live="polite">
          Syncing live analytics…
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
