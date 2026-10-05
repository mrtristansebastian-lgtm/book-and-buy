import { useEffect, useMemo, useState } from 'react';
import { CircleHelp, Users, ShoppingBag, CalendarDays, ShoppingCart, Compass, MapPin, Search } from 'lucide-react';
import { useAnalyticsLive } from '../hooks/useAnalyticsLive';
import { AnalyticsHeader } from '../components/AnalyticsHeader';
import { AnalyticsSalesChart } from '../components/AnalyticsSalesChart';
import { AnalyticsRankTable } from '../components/AnalyticsRankTable';
import { AnalyticsOfferTable } from '../components/AnalyticsOfferTable';
import { AnalyticsStatHelp } from '../components/AnalyticsStatHelp';
import { REPORT_GROUPS, getReportStatistic, buildReportHistory } from '../utils/reportCatalog';
import { ANALYTICS_PERIODS } from '../utils/analyticsMetrics';
import { buildCommerceReport } from '../utils/commerceReports';
import { ReportCategory } from '../components/ReportCategory';
import { ReportHistory, intervalLabel } from '../components/ReportHistory';
import { getLocationPath, navigate } from '../../../app/routing';

const icons = { audience: Users, products: ShoppingBag, services: CalendarDays, checkout: ShoppingCart, discovery: Compass, places: MapPin, buy: Search, book: Search };
const count = value => value == null ? '—' : Number(value).toLocaleString();
const currentQuery = () => new URLSearchParams(getLocationPath().split('?')[1] || '');
export function AnalyticsPage({ routeRest = [] }) {
  const [helpId, setHelpId] = useState(null);
  const [periodId, setPeriodId] = useState(() => ANALYTICS_PERIODS.some(row => row.id === currentQuery().get('period')) ? currentQuery().get('period') : 'week');
  const [customRange, setCustomRange] = useState(() => ({ from: currentQuery().get('from') || '', to: currentQuery().get('to') || '' }));
  const metric = getReportStatistic(routeRest[0]);
  const helpMetric = getReportStatistic(helpId);
  useEffect(() => setHelpId(null), [metric?.id]);
  const routeQuery = getLocationPath().split('?')[1] || '';
  useEffect(() => {
    const params = new URLSearchParams(routeQuery);
    const selected = params.get('period');
    if (ANALYTICS_PERIODS.some(row => row.id === selected)) {
      setPeriodId(selected);
      if (selected === 'custom') setCustomRange({ from: params.get('from') || '', to: params.get('to') || '' });
    }
  }, [routeQuery]);
  const data = useAnalyticsLive(periodId, customRange);
  const report = data.reports;
  const history = useMemo(() => metric && report ? buildReportHistory({ report, metricId: metric.id, periodId }) : { series: [], unit: 'day' }, [report, metric?.id, periodId]);
  const base = getLocationPath().startsWith('/demo') ? '/demo/analytics' : '/dashboard/analytics';
  const periodQuery = new URLSearchParams({ period: periodId, ...(periodId === 'custom' ? customRange : {}) }).toString();
  const hrefFor = id => `#${base}/${id}?${periodQuery}`;
  const stat = metric ? report?.stats[metric.id] : null;
  const offerReport = useMemo(() => {
    if (!metric?.kind || !report) return null;
    const commerce = metric.surface ? buildCommerceReport({ ...report.options, events: report.options.events.filter(row => row.discoverySurface === metric.surface) }) : report.commerce;
    return { ...commerce, items: commerce.items.filter(row => row.kind === metric.kind) };
  }, [report, metric?.id]);
  const selectPeriod = selected => {
    setPeriodId(selected);
    if (selected !== 'custom') navigate(`${base}${metric ? `/${metric.id}` : ''}?period=${selected}`, { replace: true });
  };
  const selectCustomRange = range => {
    setCustomRange(range);
    setPeriodId('custom');
    navigate(`${base}${metric ? `/${metric.id}` : ''}?${new URLSearchParams({ period: 'custom', ...range })}`, { replace: true });
  };

  return <div className={`bb-analytics bb-reports bb-report-workspace${metric ? ' is-detail' : ''}`}>
    <AnalyticsHeader periodId={periodId} onPeriodChange={selectPeriod} customRange={customRange} onCustomRangeChange={selectCustomRange} usingDemo={data.usingDemo}
      headline={metric?.label || 'Traffic reports'} description={metric ? metric.groupTitle : 'A clear picture of your business activity'}
      onBack={metric ? () => navigate(`${base}?${periodQuery}`) : undefined} backLabel={metric ? 'Back to Traffic reports' : undefined} />
    {data.loading ? <p className="bb-reports-data-notice" role="status">Loading your insights…</p> : null}
    {data.error && !data.usingDemo ? <p className="bb-analytics-error" role="alert">{data.error}</p> : null}
    {!data.complete && !data.loading && !data.error ? <p className="bb-reports-data-notice">This period exceeds the latest 1,000 sessions, events or carts. Choose a shorter period for complete insights.</p> : null}
    {metric ? <>
      <section className="bb-report-detail-total" aria-label="Selected period total">
        <div><span className="bb-report-eyebrow">{metric.groupTitle} · period total<button type="button" className="bb-report-help-trigger" aria-label={`About ${metric.groupTitle.toLowerCase()}: ${metric.label}`} aria-haspopup="dialog" onClick={() => setHelpId(metric.id)}><CircleHelp size={14} strokeWidth={1.7} aria-hidden="true" /></button></span><strong>{count(stat?.value)}</strong></div>
        <p>{metric.description}</p>
      </section>
      <section className="bb-analytics-panel bb-analytics-chart-panel">
        <header className="bb-report-detail-section-head"><div><h2>{metric.label} over time</h2><p>{intervalLabel(history.unit)} activity for the selected period</p></div></header>
        {stat?.available ? <AnalyticsSalesChart series={history.series} metricId={metric.id} metricOptions={[metric]} showPicker={false} /> : <div className="bb-report-unavailable"><span>Tracking unavailable</span><p>This statistic wasn’t recorded for the selected period. New tracked activity will populate this report.</p></div>}
      </section>
      <ReportHistory metric={metric} history={history} total={stat?.value} />
      {offerReport ? <AnalyticsOfferTable report={offerReport} title={metric.kind === 'service' ? 'Service activity' : 'Product activity'} /> : null}
      {metric.groupId === 'audience' && report ? <div className="bb-reports-detail-grid">
        <AnalyticsRankTable title="Traffic sources" lede="Where recorded sessions come from" rows={report.traffic.referrers} empty="No sources recorded yet." />
        <AnalyticsRankTable title="Devices" lede="How customers browse" rows={report.traffic.devices} empty="No devices recorded yet." />
        <AnalyticsRankTable title="Locations" lede="Approximate session locations" rows={report.traffic.locations} empty="No locations recorded yet." />
      </div> : null}
      {metric.surface || metric.discoveryKey ? <p className="bb-reports-note">These totals use visits we can link to discovery. Older visits may appear only under Discovery outcomes. Money and payment stats are in Financial reports.</p> : null}
    </> : <>
      <div className="bb-report-overview-guide"><span>Business insights</span><p>Select any total to explore its trend and history.</p><span className="bb-report-period-caption">Totals for the selected period</span></div>
      <div className="bb-report-categories">{REPORT_GROUPS.map(group => <ReportCategory key={group.id} group={group} stats={report?.stats || {}} hrefFor={hrefFor} onExplain={setHelpId} icon={icons[group.id]} />)}</div>
      <p className="bb-reports-note bb-report-overview-note">“—” means we don't have that stat for these dates yet. Older discovery activity may appear only under Discovery outcomes. Money and payment stats are in <a href={base.startsWith('/demo') ? '#/demo/finance-reports' : '#/dashboard/finance-reports'}>Financial reports</a>.</p>
    </>}
    {helpMetric ? <AnalyticsStatHelp metric={helpMetric} available={report?.stats[helpMetric.id]?.available} href={metric ? undefined : hrefFor(helpMetric.id)} onClose={() => setHelpId(null)} /> : null}
  </div>;
}
