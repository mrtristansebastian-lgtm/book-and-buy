const manualPaymentMethods = new Set(['cash', 'manual', 'manual_eft']);

const parseAmountToCents = (value) => {
  const normalized = String(value || '')
    .replace(/[^0-9.,-]/g, '')
    .replace(',', '.');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : 0;
};

export const resolveManualPaymentMethod = (booking = {}) => {
  const method = String(booking.paymentMethod || booking.paymentGateway || '').trim().toLowerCase();
  if (manualPaymentMethods.has(method)) return method;
  if (booking.paymentStatus === 'manual_pending' || booking.manualPayment) return 'manual';
  return method || 'manual';
};

export const resolveManualPaymentAmountInCents = (booking = {}) => {
  const amountInCents = Number(booking.amountInCents);
  if (Number.isSafeInteger(amountInCents) && amountInCents >= 0) return amountInCents;
  const amountPaidInCents = Number(booking.amountPaidInCents);
  if (Number.isSafeInteger(amountPaidInCents) && amountPaidInCents >= 0) return amountPaidInCents;
  return parseAmountToCents(booking.servicePrice);
};

export const isManualPaymentMarkable = (booking = {}) => {
  if (booking.paymentStatus === 'paid') return false;
  const method = resolveManualPaymentMethod(booking);
  return manualPaymentMethods.has(method);
};

export const buildManualPaymentUpdate = (booking = {}, paidAt = Date.now()) => {
  const paymentMethod = resolveManualPaymentMethod(booking);
  const amountInCents = resolveManualPaymentAmountInCents(booking);

  return {
    paymentStatus: 'paid',
    paymentMethod,
    paymentGateway: booking.paymentGateway || paymentMethod,
    paymentProviderName: booking.paymentProviderName || (paymentMethod === 'cash' ? 'Cash' : 'Manual payment'),
    manualPayment: true,
    amountPaidInCents: amountInCents,
    paidAt
  };
};

export const buildManualPaymentCallablePayload = ({ appId, booking = {}, workspaceOwnerId }) => {
  const paymentMethod = resolveManualPaymentMethod(booking);
  return {
    appId,
    businessId: workspaceOwnerId,
    bookingId: booking.id,
    paymentMethod,
    amountInCents: resolveManualPaymentAmountInCents(booking),
    currency: booking.currency || 'ZAR'
  };
};
