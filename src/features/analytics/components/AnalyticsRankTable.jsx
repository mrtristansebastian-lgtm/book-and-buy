export function AnalyticsRankTable({ title, lede, rows = [], empty = 'Nothing yet.' }) {
  return (
    <section className="bb-analytics-panel">
      <header className="bb-analytics-panel-head">
        <h2 className="bb-analytics-panel-title">{title}</h2>
        {lede ? <p className="bb-analytics-panel-lede">{lede}</p> : null}
      </header>
      {rows.length === 0 ? (
        <p className="bb-analytics-empty">{empty}</p>
      ) : (
        <ol className="bb-analytics-table">
          {rows.map((row, index) => (
            <li key={`${row.label}-${index}`} className="bb-analytics-table-row">
              <span className="bb-analytics-table-rank">{index + 1}</span>
              <span className="bb-analytics-table-label">{row.label}</span>
              <span className="bb-analytics-table-count">{row.count}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
