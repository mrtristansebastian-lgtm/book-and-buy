export function AnalyticsOfferTable({ report, title = 'Products & services' }) {
  const { items, itemAvailability } = report;
  const value = (row, key) => itemAvailability[key] ? row[key].toLocaleString() : '—';
  return (
    <section className="bb-analytics-panel bb-reports-offers" aria-label="Product and service activity">
      <header className="bb-analytics-panel-head">
        <h2 className="bb-analytics-panel-title">{title}</h2>
        <p className="bb-analytics-panel-lede">Page views, views from discovery and add-to-cart actions by item.</p>
      </header>
      {items.length ? <table className="bb-reports-offer-table">
        <thead><tr><th scope="col">Item</th><th scope="col">Page views</th><th scope="col">From discovery</th><th scope="col">Add to cart</th></tr></thead>
        <tbody>{items.map(row => <tr key={`${row.kind}:${row.id}`}>
          <th scope="row"><span>{row.name}</span><small>{row.kind === 'service' ? 'Service' : 'Product'}</small></th>
          <td>{value(row, 'views')}</td><td>{value(row, 'discoveryViews')}</td><td>{value(row, 'adds')}</td>
        </tr>)}</tbody>
      </table> : <p className="bb-analytics-empty">Product and service activity will appear here as people browse and add items.</p>}
    </section>
  );
}
