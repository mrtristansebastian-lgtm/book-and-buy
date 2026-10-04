import { useMemo, useState } from 'react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { RevenuePulseHeader } from '../components/RevenuePulseHeader';
import { RevenueMetricCards } from '../components/RevenueMetricCards';
import { RevenueChart } from '../components/RevenueChart';
import { FinanceLedgerToolbar } from '../components/FinanceLedgerToolbar';
import { TransactionReceiptCard } from '../components/TransactionReceiptCard';
import { navigate } from '../../../app/routing';
import {
  buildFinanceLedger,
  filterLedgerByPeriod,
  filterLedgerRows,
  ledgerToCsv
} from '../utils/financeLedger';
import { FINANCE_METRICS, buildFinanceMetricView } from '../utils/financeMetrics';
import { MetricPicker } from '../../../shared/ui/MetricPicker';

export function FinancePage() {
  const {
    workspace,
    bookings,
    orders,
    services,
    markPaid,
    markOrderPaid
  } = useWorkspace();

  const [periodId, setPeriodId] = useState('all');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const currency = workspace.currency || 'R';
  const [tab, setTab] = useState('bookings');
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [metricId, setMetricId] = useState('revenue');

  const ledger = useMemo(
    () =>
      buildFinanceLedger({
        bookings,
        orders,
        services,
        brandName: workspace.brandName,
        currency
      }),
    [bookings, orders, services, workspace.brandName, currency]
  );

  const periodLedger = useMemo(
    () => filterLedgerByPeriod(ledger, periodId, customRange),
    [ledger, periodId, customRange]
  );

  const metricView = useMemo(
    () => buildFinanceMetricView({ ledger, metricId, periodId, customRange, currency }),
    [ledger, metricId, periodId, customRange, currency]
  );

  const visibleRows = useMemo(() => {
    const source = tab === 'orders' ? 'order' : 'booking';
    const base = periodLedger.filter((row) => row.source === source);
    return filterLedgerRows(base, {
      status,
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
        customRange={customRange}
        onCustomRangeChange={setCustomRange}
      />

      <div className="bb-finance-stat-selector">
        <span className="bb-field-label">Statistic</span>
        <MetricPicker value={metricId} options={FINANCE_METRICS} onChange={setMetricId} ariaLabel="Choose finance statistic" />
      </div>

      <section className="bb-finance-pulse">
        <RevenueMetricCards metricView={metricView} currency={currency} />
        <RevenueChart series={metricView.series} currency={currency} metric={metricView.metric} unavailableReason={metricView.unavailableReason} />
      </section>

      <section className="bb-finance-ledger">
        <FinanceLedgerToolbar
          tab={tab}
          onTabChange={setTab}
          status={status}
          onStatusChange={setStatus}
          query={query}
          onQueryChange={setQuery}
          sort={sort}
          onSortChange={setSort}
          onOpenSettings={() => navigate('/dashboard/settings/payments')}
          onDownload={downloadCsv}
        />

        {visibleRows.length === 0 ? (
          <div className="bb-finance-empty">
            {tab === 'orders'
              ? 'No order receipts match these filters.'
              : 'No booking receipts match these filters.'}
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
    </div>
  );
}
