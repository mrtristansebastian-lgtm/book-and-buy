export function AnalyticsLiveStrip({ live }) {
  const items = [
    { id: 'visitors', label: 'Live visitors', value: live?.liveVisitors ?? 0 },
    { id: 'carts', label: 'Active carts', value: live?.activeCarts ?? 0 },
    { id: 'checkouts', label: 'Active checkouts', value: live?.activeCheckouts ?? 0 }
  ];

  return (
    <section className="bb-analytics-live" aria-label="Live activity">
      {items.map((item) => (
        <div key={item.id} className="bb-analytics-live-card">
          <span className="bb-analytics-live-pulse" aria-hidden="true" />
          <div>
            <p className="bb-analytics-live-label">{item.label}</p>
            <p className="bb-analytics-live-value">{item.value}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
