const NAMES = {
  stripe: 'Stripe',
  paypal: 'PayPal',
  paystack: 'Paystack',
  manual_eft: 'Manual EFT',
  cash: 'Cash'
};

export const ONLINE_GATEWAYS = ['stripe', 'paypal', 'paystack'];

export function last4(value = '') {
  const raw = String(value || '').replace(/\s/g, '');
  if (!raw) return '';
  return raw.slice(-4);
}

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

export function savePaymentGatewaySettings({
  gatewayType,
  enabled,
  mode,
  credentialSummary
} = {}) {
  if (!gatewayType) throw new Error('gatewayType is required');
  const summary = { ...(credentialSummary || {}) };
  const needsKeys = ONLINE_GATEWAYS.includes(gatewayType);
  const configured = needsKeys
    ? Boolean(summary.publicKeyLast4 || summary.secretKeyConfigured || summary.demoConfigured)
    : gatewayType === 'manual_eft'
      ? Boolean(summary.accountHolder || summary.bankName || summary.instructions)
      : true;
  return {
    ok: true,
    gatewayType,
    enabled: Boolean(enabled),
    mode: mode === 'live' ? 'live' : 'test',
    configured,
    credentialSummary: summary,
    updatedAt: Date.now()
  };
}

export function ensureGatewayRoster(paymentGateways = []) {
  const byType = Object.fromEntries(
    (paymentGateways || []).map((gateway) => [gateway.gatewayType, gateway])
  );
  return ['stripe', 'paypal', 'paystack', 'manual_eft', 'cash'].map((id) => {
    if (byType[id]) return byType[id];
    return {
      gatewayType: id,
      enabled: false,
      mode: 'test',
      configured: false,
      providerName: NAMES[id],
      credentialSummary: {}
    };
  });
}

/** Map workspace currency symbol/code to ISO 4217 for providers. */
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
