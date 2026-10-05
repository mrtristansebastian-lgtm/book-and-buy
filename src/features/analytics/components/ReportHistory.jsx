import { useEffect, useState } from 'react';
import { Button } from '../../../shared/ui/Button';

const count = value => value == null ? '—' : Number(value).toLocaleString();
export const intervalLabel = unit => ({ hour: 'Hourly', day: 'Daily', week: 'Weekly', month: 'Monthly', year: 'Yearly' })[unit];
const intervalDate = unit => unit === 'hour' ? { month: 'short', day: 'numeric', hour: 'numeric' } : unit === 'year' ? { year: 'numeric' } : unit === 'month' ? { month: 'long', year: 'numeric' } : { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };

export function ReportHistory({ metric, history, total, formatValue = count, title = 'Activity history' }) {
  const [limit, setLimit] = useState(15);
  useEffect(() => setLimit(15), [metric.id, history.series.length, history.series[0]?.at]);
  const rows = [...history.series].reverse();
  const peak = Math.max(1, ...rows.map(row => Math.abs(row.raw || 0)));
  return <section className="bb-report-history" aria-label={`${metric.label} history`}>
    <header className="bb-report-detail-section-head"><div><h2>{title}</h2><p>{intervalLabel(history.unit)} {metric.ratio ? 'rates' : metric.average ? 'averages' : 'totals'} · most recent first</p></div><span>{rows.length} {history.unit}s</span></header>
    <table className="bb-report-history-table">
      <thead><tr><th scope="col">Period</th><th scope="col">{metric.label}</th></tr></thead>
      <tbody>{rows.length ? rows.slice(0, limit).map(row => <tr key={row.at}>
        <th scope="row">{new Date(row.at).toLocaleString(undefined, intervalDate(history.unit))}{history.unit === 'week' ? <small>through {new Date(row.end).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small> : null}</th>
        <td>{row.raw != null ? <span className={`bb-report-history-bar${row.raw < 0 ? ' is-negative' : ''}`} aria-hidden="true" style={{ '--activity-width': `${Math.abs(row.raw) / peak * 100}%` }} /> : null}<span>{formatValue(row.raw, metric)}</span></td>
      </tr>) : <tr><td colSpan={2}>No recorded history for the selected period.</td></tr>}</tbody>
      <tfoot><tr><th scope="row">Selected period</th><td>{formatValue(total, metric)}</td></tr></tfoot>
    </table>
    {rows.length > limit ? <Button action="view" variant="secondary" onClick={() => setLimit(value => value + 30)}>Show more history</Button> : null}
    {metric.ratio || metric.average ? <p className="bb-reports-note">Each row uses the activity in that interval. The selected period uses all its activity together, so it can differ from the average of these rows. “—” means there isn't enough data to calculate a value.</p> : null}
    {metric.distinct ? <p className="bb-reports-note">Each row counts visitors or conversations once for that time. They can appear in more than one row, so adding the rows may give a higher number than the period total.</p> : null}
    {metric.snapshot ? <p className="bb-reports-note">{metric.groupId === 'payments' ? "Receipts appear under their creation date with their current payment status. A later payment can change these past rows." : "Carts appear under their latest activity date. If a customer comes back, the cart's status and its place in this history can change."}</p> : null}
  </section>;
}
