export const manualPaymentGatewayIds = new Set(['manual_eft', 'cash']);
export const hostedPaymentGatewayIds = new Set(['stripe', 'payfast', 'yoco', 'paystack']);

export const isHostedPaymentOption = (option = {}) => (
  hostedPaymentGatewayIds.has(option.gatewayType || option.id)
);

export const isManualPaymentOption = (option = {}) => (
  manualPaymentGatewayIds.has(option.gatewayType || option.id)
);

export const getPaymentOptionDisplay = (option = {}) => {
  const id = option.id || option.gatewayType || '';
  if (id === 'cash') {
    return {
      label: 'Pay on site',
      eyebrow: 'Cash or card at the venue',
      copy: option.credentialSummary?.instructions || option.instructions || 'Pay the total by cash or card when you arrive. No online payment is taken now.'
    };
  }
  if (id === 'manual_eft') {
    return {
      label: option.name || 'Bank transfer',
      eyebrow: 'Manual EFT',
      copy: option.credentialSummary?.instructions || option.instructions || 'Use your booking reference after submitting so the business can match your payment.'
    };
  }
  return {
    label: option.name || option.providerName || 'Secure online payment',
    eyebrow: 'Online checkout',
    copy: 'Continue to secure payment after the booking request is created.'
  };
};

export const parseCheckoutAmountToCents = (value, priceType = '') => {
  if (priceType === 'quote') return 0;
  const normalized = String(value || '')
    .replace(/[^0-9.,-]/g, '')
    .replace(',', '.');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : 0;
};

export const getPaymentOptionsForCheckout = ({ options = [], amountInCents = 0 }) => (
  options.filter((option) => {
    if (!option || option.enabled === false) return false;
    if (isHostedPaymentOption(option)) return amountInCents > 0 && option.configured !== false;
    return true;
  })
);
