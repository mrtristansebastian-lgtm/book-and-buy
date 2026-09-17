export function AnalyticsGeo({ geo = [] }) {
  return (
    <section className="bb-analytics-panel" aria-label="Locations">
      <header className="bb-analytics-panel-head">
        <h2 className="bb-analytics-panel-title">Locations</h2>
        <p className="bb-analytics-panel-lede">Where sessions are coming from</p>
      </header>
      {geo.length === 0 ? (
        <p className="bb-analytics-empty">No location data yet.</p>
      ) : (
        <ul className="bb-analytics-rank-list">
          {geo.map((row) => (
            <li key={row.label} className="bb-analytics-rank-row">
              <div className="bb-analytics-rank-copy">
                <span className="bb-analytics-rank-label">{row.label}</span>
                <span className="bb-analytics-rank-count">{row.count}</span>
              </div>
              <div className="bb-analytics-rank-track" aria-hidden="true">
                <span style={{ width: `${row.pct}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
