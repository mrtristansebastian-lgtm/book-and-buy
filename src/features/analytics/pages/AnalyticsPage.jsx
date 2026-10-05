import { useState } from 'react';
import { useAnalyticsLive } from '../hooks/useAnalyticsLive';
import { AnalyticsHeader } from '../components/AnalyticsHeader';
import { AnalyticsSalesChart } from '../components/AnalyticsSalesChart';
import { AnalyticsRankTable } from '../components/AnalyticsRankTable';
import { REPORT_METRICS } from '../utils/trafficReports';
import { MetricPicker } from '../../../shared/ui/MetricPicker';
import { Button } from '../../../shared/ui/Button';
import { DashboardStat } from '../../../shared/ui/DashboardStat';
import { navigate } from '../../../app/routing';

const count = (value) => Number(value).toLocaleString();
const percent = (value) => `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
const duration = (value) => {
  const seconds = Math.round(Number(value) / 1000);
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

function ReportStat({ label, value, available = true, note, format = count, appearance = 'insight' }) {
  return (
    <DashboardStat className="bb-reports-stat" appearance={appearance} label={label} value={available && value != null ? format(value) : '—'} note={note} noteHidden />
  );
}

/** Traffic and acquisition only; authoritative money metrics live in Finance. */
export function AnalyticsPage() {
  const [periodId, setPeriodId] = useState('week');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [metricId, setMetricId] = useState('sessions');
  const data = useAnalyticsLive(periodId, customRange, { metricId });
  const traffic = data.traffic;
  const discovery = data.discovery;
  const metric = REPORT_METRICS.find((item) => item.id === metricId) || REPORT_METRICS[0];
  const value = traffic.metrics;
  const available = traffic.availability;
  const places = discovery.metrics;
  const placesAvailable = discovery.availability;
  const visitorTrackingMissing = !available.uniqueVisitors || !available.returningVisitors;

  return (
    <div className="bb-analytics bb-reports">
      <AnalyticsHeader
        periodId={periodId}
        onPeriodChange={setPeriodId}
        customRange={customRange}
        onCustomRangeChange={setCustomRange}
        usingDemo={data.usingDemo}
        headline="Reports" description="Your audience, traffic and Places discovery"
      />

      {data.loading ? <p className="bb-reports-data-notice" role="status">Loading your traffic insights…</p> : null}
      {data.error && !data.usingDemo ? <p className="bb-analytics-error" role="alert">{data.error}</p> : null}
      {!data.complete && !data.loading && !data.error ? <p className="bb-reports-data-notice">Showing the latest 1,000 sessions and events in this period. Choose a shorter period for complete insights.</p> : null}

      <section className="bb-reports-summary" aria-label="Traffic overview">
        <ReportStat label="Unique visitors" value={value.uniqueVisitors} available={available.uniqueVisitors} note="Anonymous visitors, not sessions" />
        <ReportStat label="Sessions" value={value.sessions} available={available.sessions} note="Visits to your website" />
        <ReportStat label="Page views" value={value.pageViews} available={available.pageViews} note="Recorded page openings" />
        <ReportStat label="Returning visitors" value={value.returningVisitors} available={available.returningVisitors} note="Visitors who came back" />
      </section>
      {visitorTrackingMissing && !data.loading ? <p className="bb-reports-note">Visitor identity wasn’t recorded for some older visits. Unique and returning visitor totals will appear for periods with complete visitor tracking.</p> : null}

      <section className="bb-analytics-panel bb-analytics-chart-panel">
        <header className="bb-reports-chart-head">
          <div>
            <h2 className="bb-analytics-panel-title">Traffic over time</h2>
            <p>{metric.lede || metric.description}</p>
          </div>
          <MetricPicker value={metricId} options={REPORT_METRICS} onChange={setMetricId} ariaLabel="Choose traffic statistic" />
        </header>
        {data.series.length ? <AnalyticsSalesChart
          series={data.series}
          currency={data.currency}
          metricId={metricId}
          metricOptions={REPORT_METRICS} showPicker={false}
        /> : <p className="bb-analytics-empty">This statistic needs visitor tracking for the selected period.</p>}
      </section>


      <section aria-label="Audience engagement">
        <header className="bb-reports-section-head"><div><h2>Your audience</h2><p>Understand who visits and how they engage.</p></div></header>
        <div className="bb-reports-details">
          <ReportStat appearance="supporting" label="New visitors" value={value.newVisitors} available={available.newVisitors} />
          <ReportStat appearance="supporting" label="Engagement rate" value={value.engagementRate} available={available.engagementRate} format={percent} />
          <ReportStat appearance="supporting" label="Bounce rate" value={value.bounceRate} available={available.bounceRate} format={percent} />
          <ReportStat appearance="supporting" label="Average engaged time" value={value.averageDurationMs} available={available.averageDurationMs} format={duration} />
        </div>
        {!available.averageDurationMs ? <p className="bb-reports-note">Time and engagement are shown only when measured. A missing value isn’t a zero.</p> : null}
      </section>

      <div className="bb-reports-detail-grid">
        <AnalyticsRankTable title="Traffic sources" lede="Where your sessions come from" rows={traffic.referrers} empty="No traffic sources recorded yet." />
        <AnalyticsRankTable title="Popular pages" lede="Recorded page views · no estimated views" rows={traffic.popularPages} empty="No page views recorded yet." />
        <AnalyticsRankTable title="Locations" lede="Approximate locations of your sessions" rows={traffic.locations} empty="No location data recorded yet." />
        <AnalyticsRankTable title="Devices" lede="How people browse your business" rows={traffic.devices} empty="No device data recorded yet." />
      </div>

      <section className="bb-reports-places" aria-label="Places discovery insights">
        <header className="bb-reports-section-head">
          <div><h2>Places discovery</h2><p>See what happens after people find your business in Places, Book or Buy discovery.</p></div>
          <Button action="open" variant="secondary" onClick={() => navigate('/dashboard/finance')}>Financial insights</Button>
        </header>
        <div className="bb-reports-summary">
          <ReportStat label="Discovery visits" value={places.profileVisits} available={placesAvailable.profileVisits} note="Business or offer openings" />
          <ReportStat label="Message leads" value={places.messageLeads} available={placesAvailable.messageLeads} note="Conversations with a first message" />
          <ReportStat label="Sales" value={places.orders} available={placesAvailable.orders} note="Attributed product orders" />
          <ReportStat label="Bookings" value={places.bookings} available={placesAvailable.bookings} note="Attributed booking requests" />
        </div>
        <p className="bb-reports-note">Places attribution starts when someone opens your business from discovery and follows that visit. Older orders, bookings and messages aren’t assigned a source retroactively. Revenue and profit live in Finance.</p>
        {!placesAvailable.profileVisits ? <p className="bb-reports-data-notice">No Places tracking is available for this period yet. New discovery activity will populate these insights; “—” means not recorded.</p> : null}
      </section>
    </div>
  );
}
