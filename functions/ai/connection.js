import { createHash } from 'node:crypto';

export const PLAN_USAGE_NOTICE_VERSION = '2026-10-08';
export const connectionFingerprint = stored => createHash('sha256').update(JSON.stringify({ connected: stored.connected || false, billingChoice: stored.billingChoice || '', type: stored.type || '', generation: stored.generation || '', subject: stored.subject || '', tokenPresent: Boolean(stored.encrypted), reconnectRequired: Boolean(stored.reconnectRequired), key: stored.type === 'api-key' ? stored.encrypted?.ciphertext || '' : '' })).digest('hex');
export const safeProviderDetails = value => !value ? undefined : {
  ...(Number.isInteger(value.httpStatus) && value.httpStatus >= 100 && value.httpStatus <= 599 ? { httpStatus: value.httpStatus } : {}),
  ...(typeof value.providerCode === 'string' && /^(?:subscription_sharing_|chatpass_v2_)[a-z_]{1,80}$/.test(value.providerCode) ? { providerCode: value.providerCode } : {}),
  ...(typeof value.providerParam === 'string' && /^(?:input|tools|model|reasoning|text|store|stream|background|max_output_tokens|service_tier)(?:[.\[\]A-Za-z0-9_-]{0,100})$/.test(value.providerParam) ? { providerParam: value.providerParam } : {}),
  ...(['structured-error', 'detail', 'json', 'text', 'stream'].includes(value.bodyKind) ? { bodyKind: value.bodyKind } : {}),
  ...(typeof value.requestId === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(value.requestId) ? { requestId: value.requestId } : {}),
  ...(value.recoveryUrl === 'https://chatgpt.com/settings/usage' ? { recoveryUrl: value.recoveryUrl } : {})
};
