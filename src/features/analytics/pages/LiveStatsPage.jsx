import { useAnalyticsLive } from '../hooks/useAnalyticsLive';
import { AnalyticsLiveStrip } from '../components/AnalyticsLiveStrip';
import { AnalyticsActiveCarts } from '../components/AnalyticsActiveCarts';
import { AnalyticsRankTable } from '../components/AnalyticsRankTable';

/** Realtime presence — visitors, carts, checkouts, live paths. */
export function LiveStatsPage() {
  const data = useAnalyticsLive('day', {});

  return (
    <div className="bb-analytics bb-analytics--live">
      <header className="bb-analytics-header">
        <div className="bb-analytics-header-copy">
          <p className="bb-analytics-eyebrow">Live Stats</p>
          <div className="bb-page-title-wrap">
            <div className="bb-page-header-glow" aria-hidden="true" />
            <h1 className="bb-page-title bb-analytics-title">Right now</h1>
          </div>
          <p className="bb-analytics-demo-note">
            {data.usingDemo
              ? 'Demo data — connect Firebase for live tracking.'
              : 'Updates every few seconds from your public site.'}
          </p>
        </div>
      </header>

      <AnalyticsLiveStrip live={data.live} />

      <div className="bb-analytics-grid">
        <AnalyticsRankTable
          title="Live paths"
          lede="Where visitors are right now"
          rows={data.live?.livePaths || []}
          empty="No one on the site at the moment."
        />
        <section className="bb-analytics-panel">
          <header className="bb-analytics-panel-head">
            <h2 className="bb-analytics-panel-title">Pulse</h2>
            <p className="bb-analytics-panel-lede">Freshness of live signals</p>
          </header>
          <ul className="bb-analytics-pulse-list">
            <li>
              <span>Live visitors</span>
              <strong>{data.live?.liveVisitors ?? 0}</strong>
            </li>
            <li>
              <span>Active carts</span>
              <strong>{data.live?.activeCarts ?? 0}</strong>
            </li>
            <li>
              <span>Active checkouts</span>
              <strong>{data.live?.activeCheckouts ?? 0}</strong>
            </li>
          </ul>
        </section>
      </div>

      <AnalyticsActiveCarts carts={data.activeCarts} currency={data.currency} />

      {data.loading ? (
        <p className="bb-analytics-loading" aria-live="polite">
          Syncing live presence…
        </p>
      ) : null}
    </div>
  );
}
