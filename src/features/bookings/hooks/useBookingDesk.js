import { useMemo } from 'react';
import { Bell, CalendarCheck, Check, CheckCircle2, Clock, History, Layers } from 'lucide-react';
import { getLocalDateStr } from '../../../utils/dates';

const monthLookup = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11
};

const formatRangeDate = (date) => date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const toMinutes = (time = '') => {
  const match = String(time || '').match(/^(\d{1,2}):(\d{2})/);
  return match ? (Number(match[1]) * 60) + Number(match[2]) : 9999;
};

const sortUpcoming = (rows = []) => [...rows].sort((a, b) => (
  String(a.dateKeyResolved || '9999-12-31').localeCompare(String(b.dateKeyResolved || '9999-12-31')) ||
  toMinutes(a.time) - toMinutes(b.time) ||
  String(b.timestamp || 0).localeCompare(String(a.timestamp || 0))
));

const sortRecent = (rows = []) => [...rows].sort((a, b) => (
  String(b.dateKeyResolved || '').localeCompare(String(a.dateKeyResolved || '')) ||
  toMinutes(b.time) - toMinutes(a.time) ||
  Number(b.timestamp || 0) - Number(a.timestamp || 0)
));

const sortBookingRows = (rows = [], bookingSort = 'newest') => {
  const nextRows = [...rows];
  if (bookingSort === 'oldest') return nextRows.sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
  if (bookingSort === 'amount-high') return nextRows.sort((a, b) => Number(b.amountInCents || 0) - Number(a.amountInCents || 0));
  if (bookingSort === 'amount-low') return nextRows.sort((a, b) => Number(a.amountInCents || 0) - Number(b.amountInCents || 0));
  if (bookingSort === 'client') return nextRows.sort((a, b) => String(a.clientName || '').localeCompare(String(b.clientName || '')));
  if (bookingSort === 'service') return nextRows.sort((a, b) => String(a.serviceName || '').localeCompare(String(b.serviceName || '')));
  return nextRows.sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
};

const createBookingDateParser = ({ todayKey, tomorrowKey, todayStart }) => (booking = {}) => {
  if (booking.dateKey) return booking.dateKey;
  const rawDate = String(booking.date || '').trim();
  if (!rawDate) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return rawDate;
  if (/^today$/i.test(rawDate)) return todayKey;
  if (/^tomorrow$/i.test(rawDate)) return tomorrowKey;

  const dayMonthMatch = rawDate.match(/(?:mon|tue|wed|thu|fri|sat|sun)?[a-z]*,?\s*(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?/i);
  if (dayMonthMatch) {
    const day = Number(dayMonthMatch[1]);
    const month = monthLookup[dayMonthMatch[2].toLowerCase()];
    const year = Number(dayMonthMatch[3]) || todayStart.getFullYear();
    if (!Number.isNaN(day) && month !== undefined) return getLocalDateStr(new Date(year, month, day));
  }

  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? null : getLocalDateStr(parsed);
};

const createPeriodConfig = ({ bookingCustomRange, monthEnd, monthStart, todayStart, weekEnd }) => ({
  all: {
    id: 'all',
    label: 'All time',
    periodName: 'All time',
    rangeLabel: 'All time',
    start: null,
    end: null
  },
  day: {
    id: 'day',
    label: 'Day',
    periodName: 'Day',
    rangeLabel: todayStart.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
    start: todayStart,
    end: todayStart
  },
  week: {
    id: 'week',
    label: 'Week',
    periodName: 'Week',
    rangeLabel: `${formatRangeDate(todayStart)} - ${formatRangeDate(weekEnd)}`,
    start: todayStart,
    end: weekEnd
  },
  month: {
    id: 'month',
    label: 'Month',
    periodName: 'Month',
    rangeLabel: todayStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    start: monthStart,
    end: monthEnd
  },
  custom: {
    id: 'custom',
    label: 'Custom',
    periodName: 'Custom',
    rangeLabel: `${formatRangeDate(new Date(`${bookingCustomRange.from}T00:00:00`))} - ${formatRangeDate(new Date(`${bookingCustomRange.to || bookingCustomRange.from}T00:00:00`))}`,
    start: new Date(`${bookingCustomRange.from}T00:00:00`),
    end: new Date(`${bookingCustomRange.to || bookingCustomRange.from}T00:00:00`)
  }
});

const bookingMatchesSearch = ({ booking, normalizedSearch, safeStaffList }) => [
  booking.clientName,
  booking.clientPhone,
  booking.clientEmail,
  booking.clientBirthday,
  booking.clientNote,
  booking.date,
  booking.dateKeyResolved,
  booking.time,
  booking.status,
  booking.serviceName,
  booking.serviceCategory,
  booking.serviceDescription,
  booking.servicePrice,
  booking.serviceDuration,
  booking.staffName,
  safeStaffList.find(staff => staff.id === booking.staffId)?.name
].filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch);

const bookingMatchesPaymentFilter = (booking, bookingPaymentFilter) => {
  if (bookingPaymentFilter === 'paid') return booking.paymentStatus === 'paid';
  if (bookingPaymentFilter === 'open') return booking.paymentStatus !== 'paid';
  const method = booking.paymentGateway || booking.paymentMethod || '';
  if (bookingPaymentFilter === 'cash') return method === 'cash';
  if (bookingPaymentFilter === 'eft') return method === 'manual_eft';
  if (bookingPaymentFilter === 'card') return method && !['cash', 'manual_eft'].includes(method);
  return true;
};

export const useBookingDesk = ({
  bookingCustomRange,
  bookingDeskPeriod,
  bookingFilter,
  bookingPaymentFilter,
  bookingSearch,
  bookingSort,
  safeStaffList = [],
  visibleBookings = []
}) => useMemo(() => {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayKey = getLocalDateStr(todayStart);
  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = getLocalDateStr(tomorrow);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
  const monthEnd = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 0);
  const periodConfig = createPeriodConfig({ bookingCustomRange, monthEnd, monthStart, todayStart, weekEnd });
  const activePeriod = periodConfig[bookingDeskPeriod] || periodConfig.all;
  const isAllTime = activePeriod.id === 'all';
  const startKey = isAllTime ? '' : getLocalDateStr(activePeriod.start);
  const endKey = isAllTime ? '9999-12-31' : getLocalDateStr(activePeriod.end);
  const parseBookingDate = createBookingDateParser({ todayKey, tomorrowKey, todayStart });
  const records = visibleBookings.map(booking => ({
    ...booking,
    dateKeyResolved: parseBookingDate(booking)
  }));
  const periodRecords = isAllTime ? records : records.filter(booking => (
    booking.dateKeyResolved &&
    booking.dateKeyResolved >= startKey &&
    booking.dateKeyResolved <= endKey
  ));
  const normalizedSearch = bookingSearch.trim().toLowerCase();
  const searchedRecords = normalizedSearch
    ? periodRecords.filter(booking => bookingMatchesSearch({ booking, normalizedSearch, safeStaffList }))
    : periodRecords;
  const paymentFilteredRecords = searchedRecords.filter(booking => bookingMatchesPaymentFilter(booking, bookingPaymentFilter));
  const activeRecords = paymentFilteredRecords.filter(booking => booking.status !== 'declined');
  const pending = paymentFilteredRecords.filter(booking => booking.status === 'pending').length;
  const waitlist = paymentFilteredRecords.filter(booking => booking.status === 'waitlist').length;
  const confirmedRecords = paymentFilteredRecords.filter(booking => booking.status === 'confirmed');
  const declinedRecords = paymentFilteredRecords.filter(booking => booking.status === 'declined');
  const reviewRecords = paymentFilteredRecords.filter(booking => booking.status === 'pending' || booking.status === 'waitlist');
  const upcomingRecords = activeRecords.filter(booking => !booking.dateKeyResolved || booking.dateKeyResolved >= todayKey);
  const historyRecords = searchedRecords.filter(booking => (
    booking.status === 'declined' ||
    booking.status === 'completed' ||
    (booking.dateKeyResolved && booking.dateKeyResolved < todayKey)
  ));
  const eligibleCount = activeRecords.length;
  const bookingRate = eligibleCount ? Math.round((confirmedRecords.length / eligibleCount) * 100) : 0;
  const rowsByFilter = {
    all: [...sortUpcoming(activeRecords), ...sortRecent(declinedRecords)],
    review: sortUpcoming(reviewRecords),
    upcoming: sortUpcoming(upcomingRecords),
    confirmed: sortUpcoming(confirmedRecords),
    waitlist: sortUpcoming(paymentFilteredRecords.filter(booking => booking.status === 'waitlist')),
    history: sortRecent(historyRecords)
  };
  const filters = [
    { id: 'upcoming', label: 'Upcoming', count: upcomingRecords.length, icon: CalendarCheck },
    { id: 'review', label: 'Review', count: reviewRecords.length, icon: Bell },
    { id: 'confirmed', label: 'Confirmed', count: confirmedRecords.length, icon: Check },
    { id: 'waitlist', label: 'Waitlist', count: waitlist, icon: Clock },
    { id: 'history', label: 'History', count: historyRecords.length, icon: History },
    { id: 'all', label: 'All', count: paymentFilteredRecords.length, icon: Layers }
  ];
  const activeFilter = filters.some(filter => filter.id === bookingFilter) ? bookingFilter : 'upcoming';
  const activeFilterLabel = filters.find(filter => filter.id === activeFilter)?.label || 'Upcoming';

  return {
    periods: Object.values(periodConfig),
    period: activePeriod,
    filters,
    activeFilter,
    activeFilterLabel,
    rowsByFilter,
    filteredRows: sortBookingRows(rowsByFilter[activeFilter] || rowsByFilter.all, bookingSort),
    total: paymentFilteredRecords.length,
    periodTotal: periodRecords.length,
    searchActive: Boolean(normalizedSearch),
    paymentFilter: bookingPaymentFilter,
    sort: bookingSort,
    pending,
    waitlist,
    confirmed: confirmedRecords.length,
    declined: declinedRecords.length,
    review: reviewRecords.length,
    upcoming: upcomingRecords.length,
    history: historyRecords.length,
    bookingRate,
    eligibleCount,
    metrics: [
      { label: 'Upcoming', value: upcomingRecords.length, hint: activePeriod.id === 'all' ? 'All time' : activePeriod.id === 'day' ? 'Today' : activePeriod.id === 'week' ? 'This week' : 'This month', icon: CalendarCheck },
      { label: 'Needs Review', value: reviewRecords.length, hint: `${pending} pending / ${waitlist} waitlist`, icon: Bell },
      { label: 'Confirmed', value: confirmedRecords.length, hint: `${bookingRate}% booking rate`, icon: CheckCircle2 },
      { label: 'History', value: historyRecords.length, hint: `${declinedRecords.length} declined`, icon: History }
    ]
  };
}, [bookingDeskPeriod, bookingFilter, bookingSearch, bookingPaymentFilter, bookingSort, visibleBookings, safeStaffList, bookingCustomRange]);
