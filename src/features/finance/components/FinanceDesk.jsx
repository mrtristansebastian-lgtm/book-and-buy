import {
  ArrowUpRight,
  ChevronDown,
  Download,
  PlugZap,
  Search,
  Settings,
  WalletCards
} from 'lucide-react';
import { GatewayLogo, gatewayById, gatewayCards } from '../config/gatewayConfig';
import { formatDateTime, formatMoney } from '../utils/financeMetrics';

const financeStatusFilterOptions = [
  ['all', 'All statuses'],
  ['paid', 'Paid'],
  ['open', 'Pending payment'],
  ['cash', 'Cash'],
  ['card', 'Card'],
  ['eft', 'Manual EFT']
];

const financeSortOptions = [
  ['newest', 'Newest first'],
  ['oldest', 'Oldest first'],
  ['amount-high', 'Amount high'],
  ['amount-low', 'Amount low'],
  ['client', 'Client A-Z'],
  ['status', 'Status A-Z']
];

const StatusPill = ({ status }) => {
  const clean = String(status || 'initiated').toLowerCase();
  const label = clean === 'manual_pending' ? 'pending payment' : clean.replace(/_/g, ' ');
  const tone = clean === 'paid'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
    : clean.includes('ready')
      ? 'bg-blue-50 text-blue-700 border-blue-100'
      : clean.includes('fail') || clean.includes('cancel')
        ? 'bg-rose-50 text-rose-700 border-rose-100'
        : clean.includes('pending') || clean.includes('manual')
          ? 'bg-amber-50 text-amber-700 border-amber-100'
          : 'bg-neutral-50 text-neutral-500 border-neutral-100';
  return <span className={`rounded-full border px-2 py-1 text-[8px] font-bold uppercase tracking-widest ${tone}`}>{label}</span>;
};

export const FinanceDesk = ({
  deskSort,
  deskStatusFilter,
  deskView,
  displayCurrency,
  onDownloadFinanceCsv,
  onMarkBookingPaid,
  onOpenGatewayModal,
  rows = [],
  search,
  setDeskSort,
  setDeskStatusFilter,
  setDeskView,
  setSearch
}) => (
  <div className="mt-4 md:mt-5">
    <section className="finance-desk rounded-[1.25rem] border border-neutral-200 bg-white shadow-sm overflow-hidden">
      <div className="finance-desk-head p-4 md:p-5 border-b border-neutral-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Finance desk</p>
          <h3 className="text-2xl font-black tracking-tight text-black mt-1">Transactions and invoices</h3>
        </div>
        <div className="finance-desk-head-actions">
          <div className="finance-desk-icon-actions" aria-label="Finance actions">
            <button
              type="button"
              onClick={onOpenGatewayModal}
              className="finance-desk-icon-button is-primary"
              aria-label="Gateway setup"
              title="Gateway setup"
            >
              <Settings size={16} />
            </button>
            <button
              type="button"
              onClick={onDownloadFinanceCsv}
              className="finance-desk-icon-button"
              aria-label="Export finance CSV"
              title="Export finance CSV"
            >
              <Download size={16} />
            </button>
          </div>
          <div className="finance-desk-tabs grid grid-cols-3 rounded-2xl border border-neutral-100 bg-neutral-50 p-1 min-w-full sm:min-w-[360px]">
            {[
              ['transactions', 'Transactions'],
              ['invoices', 'Invoices'],
              ['paid', 'Paid']
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setDeskView(id)}
                className={`h-10 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all ${deskView === id ? 'bg-black text-white shadow-lg shadow-black/10' : 'text-neutral-400 hover:text-black'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="finance-desk-controls p-4 md:p-5 border-b border-neutral-100 grid gap-3 lg:grid-cols-[1fr_220px_220px]">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search client, gateway, booking, reference"
            aria-label="Search finance records"
            className="h-12 w-full rounded-2xl border border-neutral-200 bg-white pl-11 pr-4 text-sm font-bold text-black outline-none focus:border-black transition-colors placeholder:text-neutral-300"
          />
        </div>
        <details name="finance-desk-filter-menu" className="booking-desk-menu finance-desk-menu relative" onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && event.currentTarget.removeAttribute('open')}>
          <summary className="booking-desk-select-face" aria-label="Filter finance records by status">
            <span>{financeStatusFilterOptions.find(([value]) => value === deskStatusFilter)?.[1] || 'All statuses'}</span>
            <ChevronDown size={14} aria-hidden="true" />
          </summary>
          <div className="booking-desk-menu-panel">
            {financeStatusFilterOptions.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={deskStatusFilter === value ? 'is-selected' : ''}
                onClick={(event) => {
                  setDeskStatusFilter(value);
                  event.currentTarget.closest('details')?.removeAttribute('open');
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </details>
        <details name="finance-desk-filter-menu" className="booking-desk-menu finance-desk-menu relative" onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && event.currentTarget.removeAttribute('open')}>
          <summary className="booking-desk-select-face" aria-label="Sort finance records">
            <span>{financeSortOptions.find(([value]) => value === deskSort)?.[1] || 'Newest first'}</span>
            <ChevronDown size={14} aria-hidden="true" />
          </summary>
          <div className="booking-desk-menu-panel">
            {financeSortOptions.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={deskSort === value ? 'is-selected' : ''}
                onClick={(event) => {
                  setDeskSort(value);
                  event.currentTarget.closest('details')?.removeAttribute('open');
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </details>
      </div>
      <div className="finance-desk-list divide-y divide-neutral-100">
        {rows.length === 0 ? (
          <div className="launch-empty-state finance-empty-state">
            <div className="launch-empty-icon native-gradient-icon"><WalletCards size={23} /></div>
            <p className="launch-empty-eyebrow">Finance desk</p>
            <h3>No payment records yet</h3>
            <p className="launch-empty-copy">
              Paid bookings, invoices, manual EFTs, cash payments, refunds, and gateway references will appear here after clients start checking out.
            </p>
            <div className="launch-empty-steps" aria-label="Finance setup steps">
              <span><PlugZap size={14} /> Connect gateway</span>
              <span><ArrowUpRight size={14} /> Mark manual payments</span>
              <span><Download size={14} /> Export when ready</span>
            </div>
            <button type="button" onClick={onOpenGatewayModal} className="launch-empty-primary">
              <Settings size={15} /> Set up payments
            </button>
          </div>
        ) : rows.map((row) => {
          const gateway = gatewayById[row.gatewayType] || gatewayCards[0];
          return (
            <div key={row.id} className="finance-desk-row p-4 md:p-5">
              <div className="finance-desk-row-main">
                <span className={`finance-gateway-mark ${gateway.logo ? 'has-logo' : ''}`}>
                  <GatewayLogo gateway={gateway} />
                </span>
                <div className="finance-desk-row-copy">
                  <div className="finance-desk-row-title-line">
                    <p className="finance-desk-row-client">{row.customerName || 'Client'}</p>
                    {row.isExample && <span className="rounded-full bg-neutral-50 border border-neutral-100 px-2 py-1 text-[8px] font-bold uppercase tracking-widest text-neutral-400">Example</span>}
                    <StatusPill status={row.status} />
                  </div>
                  <p className="finance-desk-row-description">{row.description || 'Booking payment'} / {gateway.name}</p>
                  {row.bookingId && (
                    <p className="finance-desk-row-reference">Reference: {row.bookingId}</p>
                  )}
                </div>
              </div>
              <div className="finance-desk-row-stats" aria-label="Payment details">
                <div className="finance-desk-stat">
                  <p className="finance-desk-stat-label">Amount</p>
                  <p className="finance-desk-stat-value">{formatMoney(row.amountInCents, displayCurrency)}</p>
                </div>
                <div className="finance-desk-stat">
                  <p className="finance-desk-stat-label">Updated</p>
                  <p className="finance-desk-stat-value is-date">{formatDateTime(row.updatedAtMs)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => row.canMarkPaid ? onMarkBookingPaid?.(row.originalBooking) : null}
                  disabled={!row.canMarkPaid}
                  className={`finance-desk-row-action ${row.canMarkPaid ? 'is-payable' : 'is-view-only'}`}
                >
                  {row.canMarkPaid ? 'Mark Paid' : 'View'} <ArrowUpRight size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  </div>
);
