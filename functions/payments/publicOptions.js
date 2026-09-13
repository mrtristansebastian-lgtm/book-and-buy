const NAMES = {
  stripe: 'Stripe',
  paypal: 'PayPal',
  paystack: 'Paystack',
  manual_eft: 'Manual EFT',
  cash: 'Cash'
};

export function getPublicPaymentOptions({ paymentGateways = [] } = {}) {
  const options = (paymentGateways || [])
    .filter((gateway) => gateway.enabled && gateway.configured !== false)
    .map((gateway) => ({
      id: gateway.gatewayType,
      gatewayType: gateway.gatewayType,
      name: gateway.providerName || NAMES[gateway.gatewayType] || gateway.gatewayType,
      enabled: true,
      configured: true,
      mode: gateway.mode || 'test',
      credentialSummary: gateway.credentialSummary || {},
      instructions: gateway.credentialSummary?.instructions || ''
    }));

  return {
    ok: true,
    options,
    manualPaymentOptions: options.filter((option) =>
      ['manual_eft', 'cash'].includes(option.gatewayType)
    )
  };
}

export function toIsoCurrency(currency = 'R') {
  const raw = String(currency || 'R').trim().toUpperCase();
  if (raw === 'R' || raw === 'ZAR') return 'zar';
  if (raw === '$' || raw === 'USD') return 'usd';
  if (raw === '€' || raw === 'EUR') return 'eur';
  if (raw === '£' || raw === 'GBP') return 'gbp';
  if (raw === 'NGN') return 'ngn';
  if (raw.length === 3) return raw.toLowerCase();
  return 'zar';
}

export function pathJoin(...parts) {
  return parts.filter(Boolean).join('/');
}
