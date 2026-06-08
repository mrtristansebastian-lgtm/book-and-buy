export const currencyOptions = [
  { code: 'ZAR', label: 'South African rand', locale: 'en-ZA' },
  { code: 'USD', label: 'US dollar', locale: 'en-US' },
  { code: 'GBP', label: 'British pound', locale: 'en-GB' },
  { code: 'EUR', label: 'Euro', locale: 'en-IE' },
  { code: 'AUD', label: 'Australian dollar', locale: 'en-AU' },
  { code: 'CAD', label: 'Canadian dollar', locale: 'en-CA' },
  { code: 'NGN', label: 'Nigerian naira', locale: 'en-NG' },
  { code: 'KES', label: 'Kenyan shilling', locale: 'en-KE' },
  { code: 'BWP', label: 'Botswana pula', locale: 'en-BW' }
];

export const currencyOptionByCode = currencyOptions.reduce((acc, option) => {
  acc[option.code] = option;
  return acc;
}, {});

const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const getWeekStart = (date) => {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
};

const getMonthStart = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const getYearStart = (date) => new Date(date.getFullYear(), 0, 1);

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const addMonths = (date, months) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months, 1);
  next.setHours(0, 0, 0, 0);
  return next;
};

export const dateToMs = (value) => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (value?.toMillis) return value.toMillis();
  if (value?.seconds) return value.seconds * 1000;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const formatMoney = (amountInCents = 0, currency = 'ZAR') => {
  const amount = Math.max(0, Math.round(Number(amountInCents) || 0)) / 100;
  const option = currencyOptionByCode[currency] || currencyOptionByCode.ZAR;
  try {
    return new Intl.NumberFormat(option.locale, {
      style: 'currency',
      currency: option.code,
      maximumFractionDigits: amount % 1 ? 2 : 0
    }).format(amount);
  } catch {
    return `${option.code} ${amount.toFixed(amount % 1 ? 2 : 0)}`;
  }
};

export const formatCompactMoney = (amountInCents = 0, currency = 'ZAR') => {
  const amount = Math.max(0, Math.round(Number(amountInCents) || 0)) / 100;
  const option = currencyOptionByCode[currency] || currencyOptionByCode.ZAR;
  try {
    return new Intl.NumberFormat(option.locale, {
      style: 'currency',
      currency: option.code,
      notation: 'compact',
      maximumFractionDigits: amount >= 1000 ? 1 : 0
    }).format(amount);
  } catch {
    return `${option.code} ${amount >= 1000 ? `${Math.round(amount / 100) / 10}K` : Math.round(amount)}`;
  }
};

export const formatDateTime = (ms) => {
  if (!ms) return 'Not dated';
  return new Intl.DateTimeFormat('en-ZA', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(ms));
};

export const normalizeAttempt = (docSnap) => {
  const data = docSnap.data() || {};
  return {
    id: docSnap.id,
    gatewayType: data.gatewayType || 'stripe',
    status: data.status || 'initiated',
    amountInCents: Number(data.amountInCents || data.amountPaidInCents || 0),
    currency: data.currency || 'ZAR',
    customerName: data.customerName || data.clientName || 'Client',
    customerEmail: data.customerEmail || '',
    description: data.description || 'Booking payment',
    bookingId: data.bookingId || '',
    providerReference: data.providerReference || '',
    checkoutUrl: data.checkoutUrl || '',
    updatedAtMs: dateToMs(data.paidAt || data.updatedAt || data.createdAt)
  };
};

export const manualGatewayIds = new Set(['manual_eft', 'cash']);

export const parseAmountToCents = (value) => {
  if (Number.isSafeInteger(Number(value)) && Number(value) > 1000) return Number(value);
  const cleaned = String(value ?? '').replace(/[^\d.,-]/g, '').replace(',', '.');
  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed * 100));
};

export const getBookingAmountInCents = (booking = {}) => {
  const direct = Number(booking.amountInCents ?? booking.amountPaidInCents ?? booking.totalInCents);
  if (Number.isSafeInteger(direct) && direct > 0) return direct;
  return parseAmountToCents(booking.total || booking.servicePrice || booking.price || booking.deposit || 0);
};

export const getPeriodRange = (period) => {
  const now = new Date();
  if (period === 'all') {
    return { start: new Date(2000, 0, 1), end: new Date(2100, 0, 1), label: 'All time' };
  }
  if (period === 'day') {
    const start = startOfDay(now);
    return { start, end: addDays(start, 1), label: 'Today' };
  }
  if (period === 'week') {
    const start = getWeekStart(now);
    return { start, end: addDays(start, 7), label: 'This week' };
  }
  if (period === 'year') {
    const start = getYearStart(now);
    return { start, end: new Date(now.getFullYear() + 1, 0, 1), label: String(now.getFullYear()) };
  }
  const start = getMonthStart(now);
  return { start, end: new Date(now.getFullYear(), now.getMonth() + 1, 1), label: now.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' }) };
};

export const buildChartBuckets = (records, period, range) => {
  const paidRecords = records
    .filter((record) => record.status === 'paid' && record.updatedAtMs)
    .sort((a, b) => a.updatedAtMs - b.updatedAtMs);
  const dayMs = 86400000;
  const defaultStart = range?.start || startOfDay(new Date());
  const defaultEnd = range?.end || addDays(defaultStart, 1);
  let start = new Date(defaultStart);
  let end = new Date(defaultEnd);
  let unit = 'day';
  let step = 1;

  if (period === 'all' && paidRecords.length) {
    const first = new Date(paidRecords[0].updatedAtMs);
    const last = new Date(paidRecords[paidRecords.length - 1].updatedAtMs);
    const days = Math.max(1, Math.ceil((startOfDay(last).getTime() - startOfDay(first).getTime()) / dayMs) + 1);
    if (days <= 45) {
      unit = 'day';
      start = startOfDay(first);
      end = addDays(startOfDay(last), 1);
    } else if (days <= 160) {
      unit = 'week';
      start = getWeekStart(first);
      end = addDays(getWeekStart(last), 7);
    } else {
      unit = 'month';
      start = getMonthStart(first);
      end = addMonths(getMonthStart(last), 1);
      const monthSpan = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
      step = monthSpan > 36 ? 3 : 1;
    }
  } else if (period === 'day') {
    unit = 'hour';
    step = 3;
    start = startOfDay(defaultStart);
    end = addDays(start, 1);
  } else if (period === 'week') {
    unit = 'day';
    start = getWeekStart(defaultStart);
    end = addDays(start, 7);
  } else if (period === 'month') {
    unit = 'day';
    start = getMonthStart(defaultStart);
    end = addMonths(start, 1);
  } else if (period === 'year') {
    unit = 'month';
    start = getYearStart(defaultStart);
    end = new Date(defaultStart.getFullYear() + 1, 0, 1);
  }

  if (end <= start) end = unit === 'month' ? addMonths(start, step) : unit === 'hour' ? new Date(start.getTime() + step * 60 * 60 * 1000) : addDays(start, step);

  const advance = (date) => {
    if (unit === 'hour') {
      const next = new Date(date);
      next.setHours(next.getHours() + step, 0, 0, 0);
      return next;
    }
    if (unit === 'week') return addDays(date, 7 * step);
    if (unit === 'month') return addMonths(date, step);
    return addDays(date, step);
  };

  const formatLabel = (date) => {
    if (unit === 'hour') return date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
    if (unit === 'week') return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' });
    if (unit === 'month') {
      const options = period === 'all' ? { month: 'short', year: '2-digit' } : { month: 'short' };
      return date.toLocaleDateString('en-ZA', options);
    }
    return period === 'week'
      ? date.toLocaleDateString('en-ZA', { weekday: 'short' })
      : date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' });
  };

  const buckets = [];
  let cursor = new Date(start);
  while (cursor < end && buckets.length < 96) {
    const bucketStart = new Date(cursor);
    const bucketEnd = advance(bucketStart);
    const bucketStartMs = bucketStart.getTime();
    const bucketEndMs = bucketEnd.getTime();
    const bucketRecords = paidRecords.filter((record) => record.updatedAtMs >= bucketStartMs && record.updatedAtMs < bucketEndMs);
    buckets.push({
      label: formatLabel(bucketStart),
      rangeLabel: `${bucketStart.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })} - ${new Date(bucketEndMs - 1).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      value: bucketRecords.reduce((sum, record) => sum + record.amountInCents, 0),
      count: bucketRecords.length,
      startMs: bucketStartMs,
      endMs: bucketEndMs
    });
    cursor = bucketEnd;
  }

  return buckets.length ? buckets : [{ label: 'No data', rangeLabel: 'No paid records', value: 0, count: 0, startMs: start.getTime(), endMs: end.getTime() }];
};

export const getPaidAverageByUnit = (records = [], unit = 'month') => {
  const buckets = records
    .filter((record) => record.status === 'paid' && record.updatedAtMs)
    .reduce((acc, record) => {
      const date = new Date(record.updatedAtMs);
      const key = unit === 'year'
        ? String(date.getFullYear())
        : unit === 'day'
          ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
          : `${date.getFullYear()}-${date.getMonth() + 1}`;
      acc[key] = (acc[key] || 0) + Number(record.amountInCents || 0);
      return acc;
    }, {});
  const values = Object.values(buckets);
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
};

export const getAverageMetricMeta = (period) => {
  if (period === 'day') {
    return { unit: 'day', label: 'Average Daily Income', caption: 'Across paid days' };
  }
  if (period === 'year') {
    return { unit: 'year', label: 'Average Yearly Income', caption: 'Across paid years' };
  }
  return { unit: 'month', label: 'Average Monthly Revenue', caption: 'Across paid months' };
};
