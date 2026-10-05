import { useEffect, useMemo, useState } from 'react';
import { Banknote, ChartNoAxesCombined, ShoppingBag, CalendarDays, Wallet, Calculator, Goal, Compass, MapPin, Search, CircleHelp } from 'lucide-react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { useAnalyticsLive } from '../../analytics/hooks/useAnalyticsLive';
import { AnalyticsHeader } from '../../analytics/components/AnalyticsHeader';
import { AnalyticsSalesChart } from '../../analytics/components/AnalyticsSalesChart';
import { AnalyticsStatHelp } from '../../analytics/components/AnalyticsStatHelp';
import { ReportCategory } from '../../analytics/components/ReportCategory';
import { ReportHistory, intervalLabel } from '../../analytics/components/ReportHistory';
import { buildFinanceLedger, FINANCE_PERIODS, formatMoney } from '../utils/financeLedger';
import { FINANCIAL_REPORT_GROUPS, getFinancialStatistic, buildFinancialReport, buildFinancialHistory } from '../utils/financialReports';
import { getLocationPath, navigate } from '../../../app/routing';

const icons = { revenue: Banknote, profit: ChartNoAxesCombined, products: ShoppingBag, services: CalendarDays, payments: Wallet, averages: Calculator, conversion: Goal, discovery: Compass, places: MapPin, buy: ShoppingBag, book: Search };
const currentQuery = () => new URLSearchParams(getLocationPath().split('?')[1] || '');
const formatValue = (value, metric, currency) => value == null ? '—' : metric.format === 'money' ? formatMoney(value, currency) : metric.format === 'percent' ? `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })}%` : Number(value).toLocaleString();

export function FinancialReportsPage({ routeRest = [] }) {
  const { workspace, bookings, orders, services } = useWorkspace();
  const [helpId, setHelpId] = useState(null);
  const [periodId, setPeriodId] = useState(() => FINANCE_PERIODS.some(row => row.id === currentQuery().get('period')) ? currentQuery().get('period') : 'week');
  const [customRange, setCustomRange] = useState(() => ({ from: currentQuery().get('from') || '', to: currentQuery().get('to') || '' }));
  const metric = getFinancialStatistic(routeRest[0]);
  const helpMetric = getFinancialStatistic(helpId);
  const routeQuery = getLocationPath().split('?')[1] || '';
  const currency = workspace.currency || 'R';
  useEffect(() => setHelpId(null), [metric?.id]);
  useEffect(() => {
    const params = new URLSearchParams(routeQuery);
    const selected = params.get('period');
    if (FINANCE_PERIODS.some(row => row.id === selected)) {
      setPeriodId(selected);
      if (selected === 'custom') setCustomRange({ from: params.get('from') || '', to: params.get('to') || '' });
    }
  }, [routeQuery]);
  const data = useAnalyticsLive(periodId, customRange);
  const ledger = useMemo(() => buildFinanceLedger({ bookings, orders, services, currency, brandName: workspace.brandName }), [bookings, orders, services, currency, workspace.brandName]);
  const report = useMemo(() => buildFinancialReport({ ledger, reportTraffic: data.reports, currency, start: data.reports?.options.start, end: data.reports?.options.end, now: data.activityNow, trackingCoverage: data.complete && !data.error }), [ledger, data.reports, currency, data.activityNow, data.complete, data.error]);
  const history = useMemo(() => metric ? buildFinancialHistory({ report, metricId: metric.id, periodId }) : { series: [], unit: 'day' }, [report, metric?.id, periodId]);
  const root = getLocationPath().startsWith('/demo') ? '/demo' : '/dashboard';
  const base = `${root}/finance-reports`;
  const periodQuery = new URLSearchParams({ period: periodId, ...(periodId === 'custom' ? customRange : {}) }).toString();
  const hrefFor = id => `#${base}/${id}?${periodQuery}`;
  const stat = metric ? report.stats[metric.id] : null;
  const receiptsQuery = new URLSearchParams({ period: periodId, ...(periodId === 'custom' ? customRange : {}), ...((metric?.groupId === 'products' || metric?.channel === 'buy' || ['order_aov', 'order_conversion'].includes(metric?.id)) ? { tab: 'orders' } : {}) }).toString();
  const display = (value, item) => formatValue(value, item, currency);
  const selectPeriod = selected => {
    setPeriodId(selected);
    if (selected !== 'custom') navigate(`${base}${metric ? `/${metric.id}` : ''}?period=${selected}`, { replace: true });
  };
  const selectCustomRange = range => {
    setCustomRange(range);
    setPeriodId('custom');
    navigate(`${base}${metric ? `/${metric.id}` : ''}?${new URLSearchParams({ period: 'custom', ...range })}`, { replace: true });
  };

  return <div className={`bb-analytics bb-reports bb-report-workspace bb-financial-reports${metric ? ' is-detail' : ''}`}>
    <AnalyticsHeader periodId={periodId} onPeriodChange={selectPeriod} customRange={customRange} onCustomRangeChange={selectCustomRange} usingDemo={data.usingDemo}
      headline={metric?.label || 'Financial reports'} description={metric ? metric.groupTitle : 'See what your sales bring in and what they leave you'}
      onBack={metric ? () => navigate(`${base}?${periodQuery}`) : undefined} backLabel={metric ? 'Back to Financial reports' : undefined} />
    {data.loading ? <p className="bb-reports-data-notice" role="status">Loading your financial insights…</p> : null}
    {data.error && !data.usingDemo ? <p className="bb-analytics-error" role="alert">{data.error} Receipt totals are still available; conversion may be incomplete.</p> : null}
    {metric ? <>
      <section className="bb-report-detail-total" aria-label="Selected period statistic">
        <div><span className="bb-report-eyebrow">{metric.groupTitle} · {metric.ratio ? 'period rate' : metric.average ? 'period average' : 'period total'}<button type="button" className="bb-report-help-trigger" aria-label={`About ${metric.groupTitle.toLowerCase()}: ${metric.label}`} aria-haspopup="dialog" onClick={() => setHelpId(metric.id)}><CircleHelp size={14} strokeWidth={1.7} aria-hidden="true" /></button></span><strong>{data.loading ? '—' : display(stat?.value, metric)}</strong></div>
        <p>{metric.description}</p>
      </section>
      {!data.loading && stat?.coverageNote ? <p className="bb-reports-data-notice">{stat.coverageNote}</p> : null}
      <section className="bb-analytics-panel bb-analytics-chart-panel">
        <header className="bb-report-detail-section-head"><div><h2>{metric.label} over time</h2><p>{intervalLabel(history.unit)} {metric.ratio ? 'rates' : metric.average ? 'averages' : 'totals'} for the selected period</p></div></header>
        {!data.loading && stat?.available ? <AnalyticsSalesChart series={history.series} currency={currency} metricId={metric.id} metricOptions={[metric]} showPicker={false} /> : <div className="bb-report-unavailable"><span>{data.loading ? 'Loading history…' : 'Not enough data yet'}</span><p>{data.loading ? 'Your saved sales and activity are loading.' : stat?.unavailableReason || 'New paid sales will fill in this report.'}</p></div>}
      </section>
      <ReportHistory metric={metric} history={data.loading ? { series: [], unit: history.unit } : history} total={data.loading ? null : stat?.value} formatValue={display} title="Financial history" />
      <p className="bb-reports-note bb-report-overview-note">Need an individual sale? Open <a href={`#${root}/finance?${receiptsQuery}`}>Receipts & invoices</a> to find its document and payment status.</p>
    </> : <>
      <div className="bb-report-overview-guide"><span>Financial insights</span><p>Select any stat to explore its trend and history.</p><span className="bb-report-period-caption">Values for the selected period · {currency}</span></div>
      <div className="bb-report-categories">{FINANCIAL_REPORT_GROUPS.map(group => <ReportCategory key={group.id} group={group} stats={data.loading ? {} : report.stats} hrefFor={hrefFor} onExplain={setHelpId} formatValue={display} icon={icons[group.id]} />)}</div>
      <p className="bb-reports-note bb-report-overview-note">“—” means there isn't enough saved data for these dates. Gross profit uses the product and service costs saved with each sale, before refunds and other expenses. See visitor activity in <a href={`#${root}/analytics?${periodQuery}`}>Traffic reports</a> or individual documents in <a href={`#${root}/finance?${periodQuery}`}>Receipts & invoices</a>.</p>
    </>}
    {!data.loading && report.notes.length ? <div className="bb-financial-report-notes">{report.notes.map(note => <p className="bb-reports-note" key={note}>{note}</p>)}</div> : null}
    {helpMetric ? <AnalyticsStatHelp metric={helpMetric} {...report.stats[helpMetric.id]} href={metric ? undefined : hrefFor(helpMetric.id)} onClose={() => setHelpId(null)} /> : null}
  </div>;
}
