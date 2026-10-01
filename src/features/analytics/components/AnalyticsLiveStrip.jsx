export function AnalyticsLiveStrip({ live }) {
  const items = [
    {
      id: 'visitors',
      label: 'Visitors now',
      value: live?.liveVisitors ?? 0
    },
    {
      id: 'carts',
      label: 'Carts now',
      value: live?.activeCarts ?? 0
    },
    {
      id: 'checkouts',
      label: 'Checking out',
      value: live?.activeCheckouts ?? 0
    }
  ];

  return (
    <section className="bb-live-status-strip" aria-label="Live activity summary">
      {items.map((item) => (
        <article key={item.id} className="bb-live-stat">
          <div className="bb-live-stat-value-row">
            <span className="bb-live-stat-dot" aria-hidden="true" />
            <p className="bb-live-stat-value">{item.value}</p>
          </div>
          <p className="bb-live-stat-label">
            <span>{item.label}</span>
          </p>
        </article>
      ))}
    </section>
  );
}
