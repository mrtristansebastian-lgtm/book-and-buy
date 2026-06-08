export const normalizeCsvPaymentStatus = (value = '', amountInCents = 0) => {
  const clean = String(value || '').trim().toLowerCase();
  if (clean.includes('unpaid') || clean.includes('not paid') || clean.includes('not_paid')) return 'manual_pending';
  if (clean.includes('paid') && !clean.includes('unpaid')) return 'paid';
  if (clean.includes('settled') || clean.includes('complete') || clean.includes('success')) return 'paid';
  if (clean.includes('pending') || clean.includes('open') || clean.includes('due') || clean.includes('manual')) return 'manual_pending';
  if (clean.includes('fail') || clean.includes('cancel') || clean.includes('refund')) return 'failed';
  return amountInCents > 0 ? 'paid' : 'manual_pending';
};

export const normalizeCsvGateway = (value = '') => {
  const clean = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
  if (clean.includes('eft') || clean.includes('bank')) return 'manual_eft';
  if (clean.includes('cash')) return 'cash';
  if (clean.includes('stripe')) return 'stripe';
  if (clean.includes('payfast')) return 'payfast';
  if (clean.includes('paystack')) return 'paystack';
  if (clean.includes('yoco')) return 'yoco';
  if (clean.includes('ozow')) return 'manual_eft';
  return clean || 'cash';
};
