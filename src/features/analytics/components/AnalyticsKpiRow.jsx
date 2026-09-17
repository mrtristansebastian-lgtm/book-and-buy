import { formatMoney } from '../utils/analyticsMetrics';

export function AnalyticsKpiRow({ kpis, currency = 'R' }) {
  const cards = [
    { id: 'sessions', label: 'Sessions', value: String(kpis.sessions ?? 0) },
    { id: 'visitors', label: 'Unique visitors', value: String(kpis.uniqueVisitors ?? 0) },
    {
      id: 'conversion',
      label: 'Conversion',
      value: `${kpis.conversionRate ?? 0}%`
    },
    {
      id: 'aov',
      label: 'AOV',
      value: formatMoney(kpis.aovCents ?? 0, currency)
    },
    {
      id: 'revenue',
      label: 'Revenue',
      value: formatMoney(kpis.revenueCents ?? 0, currency)
    },
    {
      id: 'atc',
      label: 'Add-to-cart rate',
      value: `${kpis.addToCartRate ?? 0}%`
    }
  ];

  return (
    <section className="bb-analytics-kpis" aria-label="Key metrics">
      {cards.map((card, index) => (
        <article
          key={card.id}
          className="bb-analytics-kpi"
          style={{ animationDelay: `${index * 40}ms` }}
        >
          <p className="bb-analytics-kpi-label">{card.label}</p>
          <p className="bb-analytics-kpi-value">{card.value}</p>
        </article>
      ))}
    </section>
  );
}
