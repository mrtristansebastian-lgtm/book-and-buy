import { cardGatewayIds, gatewayById } from '../config/gatewayConfig';
import {
  currencyOptionByCode,
  dateToMs,
  formatDateTime,
  formatMoney,
  getAverageMetricMeta,
  getBookingAmountInCents,
  getPaidAverageByUnit,
  manualGatewayIds
} from './financeMetrics';

export const getFinanceCurrencyStorageKey = ({ businessId, isGuestWorkspace = false }) => (
  `build-a-booking-finance-currency-${String(businessId || (isGuestWorkspace ? 'guest' : 'local')).replace(/[^a-zA-Z0-9_-]/g, '-')}`
);

export const buildManualBookingRows = ({ bookings = [], isGuestWorkspace = false }) => (
  (bookings || [])
    .filter((booking) => {
      if (!booking || booking.isExample) return false;
      const method = booking.paymentGateway || booking.paymentMethod || '';
      return isGuestWorkspace || manualGatewayIds.has(method) || booking.paymentStatus === 'manual_pending';
    })
    .map((booking) => {
      const method = booking.paymentGateway || booking.paymentMethod || 'cash';
      const paid = booking.paymentStatus === 'paid';
      return {
        id: `manual-${booking.id}`,
        gatewayType: isGuestWorkspace ? method : (manualGatewayIds.has(method) ? method : 'cash'),
        status: paid ? 'paid' : 'manual_pending',
        amountInCents: getBookingAmountInCents(booking),
        currency: booking.currency || 'ZAR',
        customerName: booking.clientName || booking.name || 'Client',
        customerEmail: booking.clientEmail || booking.email || '',
        description: booking.serviceName || booking.description || 'Manual booking payment',
        bookingId: booking.id || '',
        updatedAtMs: dateToMs(booking.paidAt || booking.updatedAt || booking.timestamp || booking.createdAt) || Date.now(),
        originalBooking: booking,
        canMarkPaid: !paid
      };
    })
);

export const mergeFinanceRecords = ({ manualBookingRows = [], paymentAttempts = [] }) => (
  [...manualBookingRows, ...paymentAttempts]
    .sort((a, b) => (b.updatedAtMs || 0) - (a.updatedAtMs || 0))
);

export const inferFinanceCurrency = ({ financeSummary = {}, records = [] }) => {
  if (currencyOptionByCode[financeSummary.currency]) return financeSummary.currency;
  const counts = records.reduce((acc, record) => {
    const code = currencyOptionByCode[record.currency] ? record.currency : '';
    if (code) acc[code] = (acc[code] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'ZAR';
};

export const filterRecordsByPeriod = ({ records = [], periodRange }) => {
  const startMs = periodRange.start.getTime();
  const endMs = periodRange.end.getTime();
  return records.filter((record) => {
    if (!record.updatedAtMs) return false;
    return record.updatedAtMs >= startMs && record.updatedAtMs < endMs;
  });
};

export const calculateFinanceMetrics = ({ allRecords = [], period = 'all', periodRecords = [] }) => {
  const paid = periodRecords.filter((record) => record.status === 'paid');
  const pending = periodRecords.filter((record) => (
    record.status === 'manual_pending'
    || (record.canMarkPaid && !['paid', 'failed', 'cancelled', 'canceled'].includes(record.status))
  ));
  const averageMeta = getAverageMetricMeta(period);
  return {
    revenueInCents: paid.reduce((sum, record) => sum + record.amountInCents, 0),
    paidCount: paid.length,
    pendingInCents: pending.reduce((sum, record) => sum + Number(record.amountInCents || 0), 0),
    pendingCount: pending.length,
    averageLabel: averageMeta.label,
    averageCaption: averageMeta.caption,
    averageInCents: getPaidAverageByUnit(allRecords, averageMeta.unit)
  };
};

export const buildFinanceStatItems = ({ displayCurrency = 'ZAR', financeMetrics }) => ([
  {
    label: 'Total Revenue',
    value: formatMoney(financeMetrics.revenueInCents, displayCurrency),
    caption: `${financeMetrics.paidCount} paid booking${financeMetrics.paidCount === 1 ? '' : 's'}`
  },
  {
    label: financeMetrics.averageLabel,
    value: formatMoney(financeMetrics.averageInCents, displayCurrency),
    caption: financeMetrics.averageCaption
  },
  {
    label: 'Pending Payments',
    value: formatMoney(financeMetrics.pendingInCents, displayCurrency),
    caption: `${financeMetrics.pendingCount} awaiting confirmation`
  }
]);

export const getVisibleFinanceDeskRows = ({
  deskSort = 'newest',
  deskStatusFilter = 'all',
  deskView = 'transactions',
  records = [],
  search = '',
  limit = 12
}) => {
  const queryText = search.trim().toLowerCase();
  const filtered = records.filter((row) => {
    const typeMatches = deskView === 'transactions'
      ? true
      : deskView === 'invoices'
        ? ['initiated', 'checkout_ready', 'paid'].includes(row.status)
        : row.status === 'paid';
    if (!typeMatches) return false;
    if (deskStatusFilter === 'paid' && row.status !== 'paid') return false;
    if (deskStatusFilter === 'open' && ['paid', 'failed', 'cancelled', 'canceled'].includes(row.status)) return false;
    if (deskStatusFilter === 'cash' && row.gatewayType !== 'cash') return false;
    if (deskStatusFilter === 'eft' && row.gatewayType !== 'manual_eft') return false;
    if (deskStatusFilter === 'card' && !cardGatewayIds.has(row.gatewayType)) return false;
    if (!queryText) return true;
    return [
      row.customerName,
      row.customerEmail,
      row.description,
      row.gatewayType,
      row.bookingId,
      row.status
    ].some((value) => String(value || '').toLowerCase().includes(queryText));
  });
  const sorted = [...filtered].sort((a, b) => {
    if (deskSort === 'oldest') return Number(a.updatedAtMs || 0) - Number(b.updatedAtMs || 0);
    if (deskSort === 'amount-high') return Number(b.amountInCents || 0) - Number(a.amountInCents || 0);
    if (deskSort === 'amount-low') return Number(a.amountInCents || 0) - Number(b.amountInCents || 0);
    if (deskSort === 'client') return String(a.customerName || '').localeCompare(String(b.customerName || ''));
    if (deskSort === 'status') return String(a.status || '').localeCompare(String(b.status || ''));
    return Number(b.updatedAtMs || 0) - Number(a.updatedAtMs || 0);
  });
  return sorted.slice(0, limit);
};

export const buildFinanceCsvRows = ({ displayCurrency = 'ZAR', records = [] }) => (
  records.map((row) => ({
    id: row.id,
    status: row.status,
    gateway: gatewayById[row.gatewayType]?.name || row.gatewayType || 'Gateway',
    client: row.customerName || 'Client',
    email: row.customerEmail || '',
    description: row.description || '',
    bookingId: row.bookingId || '',
    amount: formatMoney(row.amountInCents, displayCurrency),
    updated: formatDateTime(row.updatedAtMs)
  }))
);

export const buildFinanceCsvText = (rows = []) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escapeCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(','))
  ].join('\n');
};
