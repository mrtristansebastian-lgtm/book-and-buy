import './period-page-header.css';

/** Page heading and period controls share one responsive reading order. */
export function PeriodPageHeader({ title, period, description, notice, actions, filters, desktopLayout = 'heading', className = '' }) {
  const hasMeta = Boolean(description || notice);

  return (
    <div className={`bb-period-page-header ${className}`.trim()} data-desktop-layout={desktopLayout}>
      <div className="bb-period-page-header-title">{title}</div>
      <div className="bb-period-page-header-period">{period}</div>
      {hasMeta ? (
        <div className="bb-period-page-header-meta">
          {description}
          {notice}
        </div>
      ) : null}
      {actions ? <div className="bb-period-page-header-actions">{actions}</div> : null}
      {filters ? <div className="bb-period-page-header-filters">{filters}</div> : null}
    </div>
  );
}
