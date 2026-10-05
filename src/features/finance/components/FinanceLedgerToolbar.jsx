import { Download, Search, Settings } from 'lucide-react';
import { FilterChip } from '../../../shared/ui/FilterChip';

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
  return (
    <div className="bb-finance-ledger-head">
      <div className="bb-finance-ledger-title-row">
        <h2 className="bb-finance-ledger-title">
          {tab === 'orders' ? 'Order records' : 'Booking records'}
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
          <div className="bb-finance-tab-toggle" role="tablist" aria-label="Record source">
            <FilterChip
              type="button"
              role="tab"
              selected={tab === 'bookings'}
              className={tab === 'bookings' ? 'is-active' : ''}
              onClick={() => onTabChange?.('bookings')}
            >
              Bookings
            </FilterChip>
            <FilterChip
              type="button"
              role="tab"
              selected={tab === 'orders'}
              className={tab === 'orders' ? 'is-active' : ''}
              onClick={() => onTabChange?.('orders')}
            >
              Orders
            </FilterChip>
          </div>
        </div>
      </div>

      <div className="bb-finance-ledger-filters">
        <label className="bb-finance-search bb-search-field">
          <Search size={16} strokeWidth={2.2} className="bb-search-field-icon" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search receipts and invoices"
            className="native-search-input"
            placeholder="Search client, title, reference…"
            value={query}
            onChange={(event) => onQueryChange?.(event.target.value)}
          />
        </label>
        <select aria-label="Payment status filter" value={status} onChange={(event) => onStatusChange?.(event.target.value)}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <select aria-label="Sort receipts and invoices" value={sort} onChange={(event) => onSortChange?.(event.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>
    </div>
  );
}
