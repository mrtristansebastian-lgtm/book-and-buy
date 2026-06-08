import {
  ArrowUpRight,
  ChevronDown,
  Download,
  Search,
  Settings
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
        {rows.map((row) => {
          const gateway = gatewayById[row.gatewayType] || gatewayCards[0];
          return (
            <div key={row.id} className="finance-desk-row p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className={`finance-gateway-mark w-11 h-11 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center text-black shrink-0 ${gateway.logo ? 'has-logo' : ''}`}>
                  <GatewayLogo gateway={gateway} />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black text-black truncate">{row.customerName || 'Client'}</p>
                    {row.isExample && <span className="rounded-full bg-neutral-50 border border-neutral-100 px-2 py-1 text-[8px] font-bold uppercase tracking-widest text-neutral-400">Example</span>}
                    <StatusPill status={row.status} />
                  </div>
                  <p className="mt-1 text-sm text-neutral-500 truncate">{row.description || 'Booking payment'} / {gateway.name}</p>
                  {row.bookingId && (
                    <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-neutral-300">Reference: {row.bookingId}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 md:flex md:items-center gap-3 md:text-right">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">Amount</p>
                  <p className="font-black text-black">{formatMoney(row.amountInCents, displayCurrency)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">Updated</p>
                  <p className="font-bold text-sm text-neutral-500">{formatDateTime(row.updatedAtMs)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => row.canMarkPaid ? onMarkBookingPaid?.(row.originalBooking) : null}
                  disabled={!row.canMarkPaid}
                  className={`h-10 px-3 rounded-xl border text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 ${row.canMarkPaid ? 'native-gradient-button text-black border-transparent' : 'border-neutral-200 bg-white text-black opacity-60'}`}
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
