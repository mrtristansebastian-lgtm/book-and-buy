import { createHash } from 'node:crypto';
import { toIsoCurrency } from './publicOptions.js';
import { assertBusinessCommerceEnabled } from '../businessCapabilities.js';
import { isEnquiryListing } from '../listingTypes.js';
export const PAYMENT_APP_ID = process.env.APP_ID || 'book-and-buy-v1';
export function configuredPaymentOrigins(env = process.env, projectId = '') {
  const values = [...String(env.PAYMENT_RETURN_ORIGINS || '').split(','),env.APP_PUBLIC_BASE_URL,env.WEBSITE_PUBLIC_BASE_URL,
    ...(projectId ? [`https://${projectId}.web.app`,`https://${projectId}.firebaseapp.com`] : [])].map(value => String(value || '').trim()).filter(Boolean);
  return [...new Set(values.map(value => {
    let url; try { url = new URL(value); } catch { throw new Error('Configure valid HTTPS payment return origins.'); }
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Configure valid HTTPS payment return origins.');
    return url.origin;
  }))];
}
export function paymentAppId(input) { if (input && input !== PAYMENT_APP_ID) throw new Error('Invalid application.'); return PAYMENT_APP_ID; }
export function canonicalPayment(source, workspace, payload) {
  assertBusinessCommerceEnabled(workspace);
  if (!source || !['order','booking'].includes(payload.sourceType)) throw new Error('Choose a valid payment source.');
  if (payload.sourceType === 'order' && (source.items || []).some(line => isEnquiryListing((workspace.products || []).find(product => product.id === line.productId)))) throw new Error('This listing accepts enquiries only and cannot be paid for here.');
  if (['paid','refunded'].includes(source.paymentStatus) || ['cancelled','declined'].includes(source.status)) throw new Error('This transaction cannot accept a new payment.');
  if (source.inventoryStatus === 'payment_exception') throw new Error('Resolve this payment exception with the business.');
  if (source.paymentMethod !== payload.gatewayType) throw new Error('The payment gateway does not match this transaction.');
  if (!(workspace.paymentGateways || []).some((gateway) => gateway.gatewayType === payload.gatewayType && gateway.enabled && gateway.configured !== false)) throw new Error('This payment gateway is disabled.');
  const currency = toIsoCurrency(source.currency || workspace.currency || 'R');
  if (payload.currency && toIsoCurrency(payload.currency) !== currency) throw new Error('The payment currency does not match the saved transaction.');
  if (!Number.isSafeInteger(source.amountInCents) || source.amountInCents <= 0) throw new Error('A valid saved payment amount is required.');
  return { amountInCents: source.amountInCents, currency };
}
export function verifiedPaymentEvidence(attempt, evidence) {
  if (!attempt || attempt.gatewayType !== evidence.gatewayType || !evidence.providerPaymentId || (evidence.providerRef && evidence.providerRef !== attempt.providerRef)) throw new Error('The payment provider does not match this payment attempt.');
  if (!Number.isSafeInteger(evidence.amountInCents) || evidence.amountInCents !== attempt.amountInCents || String(evidence.currency || '').toLowerCase() !== attempt.currency) throw new Error('The verified payment amount or currency does not match.');
  if (evidence.sourceId && evidence.sourceId !== attempt.sourceId || evidence.sourceType && evidence.sourceType !== attempt.sourceType) throw new Error('The payment source does not match.');
  return true;
}
export function validatePaymentReturnUrls(successUrl, cancelUrl, origins = [], allowLocal = false) {
  const allowed = new Set(origins.filter(Boolean).map((origin) => new URL(origin).origin));
  const parse = (raw) => {
    let url; try { url = new URL(raw); } catch { throw new Error('Choose a valid payment return URL.'); }
    const local = ['localhost','127.0.0.1','[::1]'].includes(url.hostname);
    if (url.username || url.password || url.protocol !== 'https:' && !(allowLocal && local && url.protocol === 'http:') || !allowed.has(url.origin) && !(allowLocal && local)) throw new Error('Payment return URLs must use the business website or an approved Book and Buy origin.');
    return url;
  };
  const success = parse(successUrl); const cancel = parse(cancelUrl);
  if (success.origin !== cancel.origin) throw new Error('Payment return URLs must use the same origin.');
  return { successUrl: success.href, cancelUrl: cancel.href };
}
export const paymentAttemptKey = (ownerId,sourceType,sourceId,gatewayType,requestId) => `pay-${createHash('sha256').update(JSON.stringify([ownerId,sourceType,sourceId,gatewayType,requestId])).digest('hex').slice(0,48)}`;
export function paymentReturnUrl(raw, attemptId, gatewayType) {
  const url = new URL(raw);
  // Existing sites route with #/w/...?...; preserve that route's query location.
  if (url.hash.startsWith('#/')) { const [path,query = ''] = url.hash.slice(1).split('?'); const params = new URLSearchParams(query); params.set('attemptId',attemptId); params.set('gateway',gatewayType); url.hash = `${path}?${params}`; }
  else { url.searchParams.set('attemptId',attemptId); url.searchParams.set('gateway',gatewayType); }
  return url.href;
}
