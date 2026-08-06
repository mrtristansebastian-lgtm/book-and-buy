const NAMES = {
  stripe: 'Stripe',
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

export function savePaymentGatewaySettings({
  gatewayType,
  enabled,
  mode,
  credentialSummary
} = {}) {
  if (!gatewayType) throw new Error('gatewayType is required');
  return {
    ok: true,
    gatewayType,
    enabled: Boolean(enabled),
    mode: mode === 'live' ? 'live' : 'test',
    configured: true,
    credentialSummary: credentialSummary || {},
    updatedAt: Date.now()
  };
}
