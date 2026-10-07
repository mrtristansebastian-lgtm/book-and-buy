import { ArrowUpRight, CircleHelp } from 'lucide-react';
import { ReportCategoryIcon } from './ReportCategoryIcon';

const count = value => value == null ? '—' : Number(value).toLocaleString();

export function ReportCategory({ group, stats, hrefFor, onExplain, formatValue = count }) {
  return <section className="bb-report-category" aria-labelledby={`report-${group.id}`}>
    <header className="bb-report-category-head">
      <ReportCategoryIcon category={group.id} />
      <div className="bb-report-category-copy"><h2 id={`report-${group.id}`}>{group.title}</h2><p>{group.description}</p></div>
    </header>
    <div className="bb-report-metric-row" style={{ '--report-columns': group.metrics.length }}>
      {group.metrics.map(metric => {
        const value = formatValue(stats[metric.id]?.value, metric);
        return <div className="bb-report-metric-cell" key={metric.id}>
          <a className="bb-report-metric-link" href={hrefFor(metric.id)} aria-label={`${metric.label}: ${value}. View ${group.title.toLowerCase()} report`}>
            <span className="bb-report-metric-label">{metric.label}</span>
            <span className="bb-report-metric-value-row">
              <span className={`bb-report-metric-value${metric.format === 'money' && value.length > 13 ? ' is-long' : ''}`}>{value}</span>
              <ArrowUpRight className="bb-report-metric-arrow" size={14} aria-hidden="true" />
            </span>
          </a>
          <button type="button" className="bb-report-help-trigger" aria-label={`About ${group.title.toLowerCase()}: ${metric.label}`} aria-haspopup="dialog" onClick={() => onExplain(metric.id)}><CircleHelp size={14} strokeWidth={1.7} aria-hidden="true" /></button>
        </div>;
      })}
    </div>
  </section>;
}
