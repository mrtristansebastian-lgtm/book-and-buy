import { useMemo, useState } from 'react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { RevenuePulseHeader } from '../components/RevenuePulseHeader';
import { RevenueMetricCards } from '../components/RevenueMetricCards';
import { RevenueChart } from '../components/RevenueChart';
import { FinanceLedgerToolbar } from '../components/FinanceLedgerToolbar';
import { TransactionReceiptCard } from '../components/TransactionReceiptCard';
import { FinanceSettingsSheet } from '../components/FinanceSettingsSheet';
import {
  buildFinanceLedger,
  buildRevenueSeries,
  computeFinanceMetrics,
  filterLedgerByPeriod,
  filterLedgerRows,
  ledgerToCsv
} from '../utils/financeLedger';

export function FinancePage() {
  const {
    workspace,
    bookings,
    orders,
    services,
    paymentGateways,
    updatePaymentGateway,
    markPaid,
    markOrderPaid
  } = useWorkspace();

  const [periodId, setPeriodId] = useState('all');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [currency, setCurrency] = useState('R');
  const [tab, setTab] = useState('transactions');
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const ledger = useMemo(
    () =>
      buildFinanceLedger({
        bookings,
        orders,
        services,
        brandName: workspace.brandName
      }),
    [bookings, orders, services, workspace.brandName]
  );

  const periodLedger = useMemo(
    () => filterLedgerByPeriod(ledger, periodId, customRange),
    [ledger, periodId, customRange]
  );

  const metrics = useMemo(
    () => computeFinanceMetrics(periodLedger, periodId),
    [periodLedger, periodId]
  );

  const series = useMemo(
    () => buildRevenueSeries(periodLedger, periodId, customRange),
    [periodLedger, periodId, customRange]
  );

  const visibleRows = useMemo(() => {
    const base =
      tab === 'invoices'
        ? periodLedger.filter((row) => row.paymentStatus === 'paid')
        : periodLedger;
    return filterLedgerRows(base, {
      status: tab === 'invoices' ? 'paid' : status,
      query,
      sort
    });
  }, [periodLedger, tab, status, query, sort]);

  const downloadCsv = () => {
    const csv = ledgerToCsv(visibleRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `finance-${tab}-${Date.now()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleMarkPaid = (row) => {
    if (row.source === 'booking') markPaid?.(row.sourceId);
    else markOrderPaid?.(row.sourceId);
  };

  return (
    <div className="bb-finance">
      <RevenuePulseHeader
        periodId={periodId}
        onPeriodChange={setPeriodId}
        currency={currency}
        onCurrencyChange={setCurrency}
        customRange={customRange}
        onCustomRangeChange={setCustomRange}
      />

      <section className="bb-finance-pulse">
        <RevenueMetricCards metrics={metrics} currency={currency} />
        <RevenueChart series={series} currency={currency} />
      </section>

      <section className="bb-finance-ledger">
        <FinanceLedgerToolbar
          tab={tab}
          onTabChange={(next) => {
            setTab(next);
            if (next === 'invoices') setStatus('paid');
          }}
          status={status}
          onStatusChange={setStatus}
          query={query}
          onQueryChange={setQuery}
          sort={sort}
          onSortChange={setSort}
          onOpenSettings={() => setSettingsOpen(true)}
          onDownload={downloadCsv}
        />

        {visibleRows.length === 0 ? (
          <div className="bb-finance-empty">
            {tab === 'invoices'
              ? 'No paid invoices in this period.'
              : 'No transactions match these filters.'}
          </div>
        ) : (
          <div className="bb-finance-receipts">
            {visibleRows.map((row) => (
              <TransactionReceiptCard
                key={row.id}
                row={row}
                currency={currency}
                mode={tab}
                brandName={workspace.brandName}
                onMarkPaid={handleMarkPaid}
              />
            ))}
          </div>
        )}
      </section>

      <FinanceSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        paymentGateways={paymentGateways}
        brandName={workspace.brandName}
        onSaveGateway={updatePaymentGateway}
      />
    </div>
  );
}
