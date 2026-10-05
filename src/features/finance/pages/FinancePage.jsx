import { useEffect, useMemo, useRef, useState } from 'react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { RevenuePulseHeader } from '../components/RevenuePulseHeader';
import { FinanceLedgerToolbar } from '../components/FinanceLedgerToolbar';
import { TransactionReceiptCard } from '../components/TransactionReceiptCard';
import { getLocationPath, navigate, workspacePagePath } from '../../../app/routing';
import {
  buildFinanceLedger,
  FINANCE_PERIODS,
  filterLedgerByPeriod,
  filterLedgerRows,
  ledgerToCsv
} from '../utils/financeLedger';

const currentQuery = () => new URLSearchParams(getLocationPath().split('?')[1] || '');
const queryPeriod = (params) => FINANCE_PERIODS.some((period) => period.id === params.get('period')) ? params.get('period') : 'all';
const queryTab = (params) => params.get('tab') === 'orders' ? 'orders' : 'bookings';

export function FinancePage() {
  const {
    workspace,
    bookings,
    orders,
    services,
    markPaid,
    markOrderPaid
  } = useWorkspace();

  const [periodId, setPeriodId] = useState(() => queryPeriod(currentQuery()));
  const [customRange, setCustomRange] = useState(() => ({ from: currentQuery().get('from') || '', to: currentQuery().get('to') || '' }));
  const currency = workspace.currency || 'R';
  const [tab, setTab] = useState(() => queryTab(currentQuery()));
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [paymentBusy, setPaymentBusy] = useState({});
  const [paymentErrors, setPaymentErrors] = useState({});
  const paymentInFlight = useRef(new Set());
  const routeQuery = getLocationPath().split('?')[1] || '';
  useEffect(() => {
    const params = new URLSearchParams(routeQuery);
    setPeriodId(queryPeriod(params));
    setTab(queryTab(params));
    setCustomRange({ from: params.get('from') || '', to: params.get('to') || '' });
  }, [routeQuery]);

  const updatePermalink = (selectedPeriod, range, selectedTab = tab) => {
    const params = new URLSearchParams({ period: selectedPeriod, tab: selectedTab,
      ...(selectedPeriod === 'custom' ? range : {}) });
    navigate(`${workspacePagePath('finance')}?${params}`, { replace: true });
  };

  const selectPeriod = (selected) => {
    setPeriodId(selected);
    if (selected !== 'custom') updatePermalink(selected, customRange);
  };
  const selectCustomRange = (range) => {
    setCustomRange(range);
    setPeriodId('custom');
    updatePermalink('custom', range);
  };
  const selectTab = (selected) => {
    setTab(selected);
    updatePermalink(periodId, customRange, selected);
  };

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
    anchor.download = `receipts-invoices-${tab}-${Date.now()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleMarkPaid = async (row) => {
    if (row.canMarkPaid !== true || paymentInFlight.current.has(row.id)) return;
    paymentInFlight.current.add(row.id);
    setPaymentBusy((previous) => ({ ...previous, [row.id]: true }));
    setPaymentErrors((previous) => ({ ...previous, [row.id]: '' }));
    try {
      const handler = row.source === 'booking' ? markPaid : markOrderPaid;
      if (typeof handler !== 'function') throw new Error('Payment confirmation is unavailable. Please try again.');
      const result = await handler(row.sourceId);
      if (result === null) throw new Error('Payment could not be confirmed. Please try again.');
    } catch (error) {
      setPaymentErrors((previous) => ({ ...previous, [row.id]: error?.message || 'Payment could not be confirmed. Please try again.' }));
    } finally {
      paymentInFlight.current.delete(row.id);
      setPaymentBusy((previous) => ({ ...previous, [row.id]: false }));
    }
  };

  return (
    <div className="bb-finance">
      <RevenuePulseHeader
        periodId={periodId}
        onPeriodChange={selectPeriod}
        customRange={customRange}
        onCustomRangeChange={selectCustomRange}
      />

      <section className="bb-finance-ledger">
        <FinanceLedgerToolbar
          tab={tab}
          onTabChange={selectTab}
          status={status}
          onStatusChange={setStatus}
          query={query}
          onQueryChange={setQuery}
          sort={sort}
          onSortChange={setSort}
          onOpenSettings={() => navigate(`${workspace.isDemo ? '/demo' : '/dashboard'}/settings/payments`)}
          onDownload={downloadCsv}
        />

        {visibleRows.length === 0 ? (
          <div className="bb-finance-empty">
            {tab === 'orders'
              ? 'No order receipts or invoices match these filters.'
              : 'No booking receipts or invoices match these filters.'}
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
                markingPaid={Boolean(paymentBusy[row.id])}
                paymentError={paymentErrors[row.id] || ''}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
