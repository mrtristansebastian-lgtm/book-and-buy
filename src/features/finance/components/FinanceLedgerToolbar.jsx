import { Download, Search, Settings } from 'lucide-react';

const STATUS_OPTIONS = [
  { id: 'all', label: 'All statuses' },
  { id: 'paid', label: 'Paid' },
  { id: 'pending', label: 'Pending' },
  { id: 'unpaid', label: 'Unpaid' },
  { id: 'failed', label: 'Failed' },
  { id: 'refunded', label: 'Refunded' }
];

export function FinanceLedgerToolbar({
  tab,
  onTabChange,
  status,
  onStatusChange,
  query,
  onQueryChange,
  sort,
  onSortChange,
  onOpenSettings,
  onDownload
}) {
  const chipLabel =
    STATUS_OPTIONS.find((option) => option.id === status)?.label?.toUpperCase() || 'ALL';

  return (
    <div className="bb-finance-ledger-head">
      <div className="bb-finance-ledger-title-row">
        <h2 className="bb-finance-ledger-title">
          {tab === 'orders' ? 'Order receipts' : 'Booking receipts'}
        </h2>
        <div className="bb-finance-ledger-actions">
          <button
            type="button"
            className="bb-finance-icon-btn bb-finance-icon-btn--accent"
            aria-label="Payment settings"
            onClick={onOpenSettings}
          >
            <Settings size={16} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            className="bb-finance-icon-btn"
            aria-label="Download CSV"
            onClick={onDownload}
          >
            <Download size={16} strokeWidth={2.2} />
          </button>
          <div className="bb-finance-tab-toggle" role="tablist" aria-label="Receipt source">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'bookings'}
              className={tab === 'bookings' ? 'is-active' : ''}
              onClick={() => onTabChange?.('bookings')}
            >
              Bookings
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'orders'}
              className={tab === 'orders' ? 'is-active' : ''}
              onClick={() => onTabChange?.('orders')}
            >
              Orders
            </button>
          </div>
          <button
            type="button"
            className="bb-finance-status-chip"
            onClick={() =>
              onStatusChange?.(status === 'paid' ? 'all' : 'paid')
            }
          >
            {status === 'all' ? 'ALL' : chipLabel}
          </button>
        </div>
      </div>

      <div className="bb-finance-ledger-filters">
        <label className="bb-finance-search">
          <Search size={16} strokeWidth={2.2} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search client, title, reference…"
            value={query}
            onChange={(event) => onQueryChange?.(event.target.value)}
          />
        </label>
        <select value={status} onChange={(event) => onStatusChange?.(event.target.value)}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(event) => onSortChange?.(event.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>
    </div>
  );
}
