export { getPublicPaymentOptions } from './publicOptions.js';

/** Backend mirror of src/utils/payments.js#savePaymentGatewaySettings */
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
