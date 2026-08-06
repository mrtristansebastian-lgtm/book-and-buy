/**
 * Backend mirror of src/utils/payments.js#getPublicPaymentOptions
 */
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
