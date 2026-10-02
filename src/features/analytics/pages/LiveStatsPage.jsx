import { useAnalyticsLive } from '../hooks/useAnalyticsLive';
import { PageBackButton } from '../../../shared/ui/PageBackButton';
import { AnalyticsLiveStrip } from '../components/AnalyticsLiveStrip';
import { AnalyticsActiveCarts } from '../components/AnalyticsActiveCarts';
import { AnalyticsLiveVisitors } from '../components/AnalyticsLiveVisitors';
import { AnalyticsLiveWorldMap } from '../components/AnalyticsLiveWorldMap';

/** Realtime presence — visitors, carts, checkouts, live paths. */
export function LiveStatsPage() {
  const data = useAnalyticsLive('day', {}, { mode: 'live' });

  return (
    <div className="bb-analytics bb-analytics--live">
      <header className="bb-analytics-header">
        <div className="bb-analytics-header-copy">
          <p className="bb-analytics-eyebrow">Live Stats</p>
          <div className="bb-page-title-wrap">
            <PageBackButton />
            <span className="bb-page-title-main">
              <div className="bb-page-header-glow" aria-hidden="true" />
              <h1 className="bb-page-title bb-analytics-title">Right now</h1>
            </span>
          </div>
          <div
            className={`bb-live-feed-state${data.usingDemo ? ' is-demo' : ''}${
              data.error && !data.usingDemo ? ' is-error' : ''
            }`}
            role={data.error && !data.usingDemo ? 'alert' : 'status'}
            aria-live="polite"
          >
            <span className="bb-live-feed-dot" aria-hidden="true" />
            <strong>
              {data.error && !data.usingDemo
                ? 'Live feed unavailable'
                : data.usingDemo
                  ? 'Demo feed'
                  : data.loading
                    ? 'Syncing'
                    : 'Live'}
            </strong>
            <span aria-hidden="true">·</span>
            <span>
              {data.error && !data.usingDemo
                ? data.error
                : data.usingDemo
                  ? 'sample activity, not live business traffic'
                  : 'activity from the past 5 minutes'}
            </span>
          </div>
        </div>
      </header>

      <AnalyticsLiveStrip live={data.live} />

      <AnalyticsLiveWorldMap
        sessions={data.liveSessions}
        total={data.live?.liveVisitors || 0}
        totalLabel={data.liveCountLabel}
        now={data.activityNow}
        loading={data.loading}
        error={data.error}
        usingDemo={data.usingDemo}
        variant="live"
      />

      <div className="bb-live-desk">
        <AnalyticsLiveVisitors
          sessions={data.liveSessions}
          total={data.live?.liveVisitors || 0}
          now={data.activityNow}
        />
        <AnalyticsActiveCarts
          carts={data.activeCarts}
          currency={data.currency}
          total={data.live?.activeCarts || 0}
          now={data.activityNow}
        />
      </div>
    </div>
  );
}
