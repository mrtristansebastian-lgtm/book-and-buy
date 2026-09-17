export function AnalyticsFunnel({ funnel = [] }) {
  return (
    <section className="bb-analytics-panel bb-analytics-funnel" aria-label="Conversion funnel">
      <header className="bb-analytics-panel-head">
        <h2 className="bb-analytics-panel-title">Funnel</h2>
        <p className="bb-analytics-panel-lede">Sessions through purchase</p>
      </header>
      <div className="bb-analytics-funnel-track">
        {funnel.map((step, index) => (
          <div key={step.id} className="bb-analytics-funnel-step">
            <div
              className="bb-analytics-funnel-bar"
              style={{ '--bb-funnel-pct': `${Math.max(8, step.pct)}%` }}
            />
            <div className="bb-analytics-funnel-meta">
              <span className="bb-analytics-funnel-label">
                {index + 1}. {step.label}
              </span>
              <span className="bb-analytics-funnel-value">{step.value}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
