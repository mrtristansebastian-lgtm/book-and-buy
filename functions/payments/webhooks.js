import { createHmac } from 'node:crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { safeEqual } from './encrypt.js';
import { applyWebhookPaid } from './gatewayService.js';
import { findOwnerBySlug,loadDecryptedGateway } from './store.js';
import { paymentAppId } from './paymentPolicy.js';
import { verifyPayPalWebhook } from './providers.js';
async function webhookOwner(appId,ownerId,slug) {
  const found = slug ? await findOwnerBySlug(appId,slug) : null;
  if (found && ownerId && found.ownerId !== ownerId) throw new Error('Webhook business mismatch.');
  const resolved = found?.ownerId || ownerId;
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(resolved || '')) throw new Error('A valid business is required for this webhook.'); return resolved;
}
export function verifyStripeSignature(rawBody,signature,secret,now = Date.now()) {
  const parts = String(signature || '').split(',').map((chunk) => chunk.trim().split('='));
  const timestamp = parts.find(([key]) => key === 't')?.[1]; const values = parts.filter(([key]) => key === 'v1').map(([,value]) => value);
  if (!/^\d+$/.test(timestamp || '') || Math.abs(now / 1000 - Number(timestamp)) > 300) throw new Error('Expired Stripe webhook signature.');
  const expected = createHmac('sha256',secret).update(`${timestamp}.${rawBody}`,'utf8').digest('hex');
  if (!values.some((value) => safeEqual(expected,value))) throw new Error('Invalid Stripe webhook signature.'); return true;
}
export async function handleStripeWebhook({appId,ownerId,slug,rawBody,signature,webhookSecret}) {
  appId = paymentAppId(appId); ownerId = await webhookOwner(appId,ownerId,slug);
  const secret = webhookSecret || (await loadDecryptedGateway(appId,ownerId,'stripe')).webhookSecret;
  if (!secret) throw new Error('Stripe webhook signing secret is not connected.');
  verifyStripeSignature(rawBody,signature,secret);
  const event = JSON.parse(rawBody); if (!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)) return {ok:true,ignored:true,type:event.type};
  const session = event.data?.object || {}; if (session.payment_status !== 'paid') return {ok:true,ignored:true,type:event.type};
  if (session.metadata?.ownerId !== ownerId || session.metadata?.appId !== appId) throw new Error('Webhook payment ownership mismatch.');
  return applyWebhookPaid({appId,ownerId,gatewayType:'stripe',providerPaymentId:session.payment_intent || session.id,providerRef:session.id,attemptId:session.metadata?.attemptId,sourceType:session.metadata?.sourceType,sourceId:session.metadata?.sourceId,amountInCents:session.amount_total,currency:session.currency,eventId:event.id});
}
export async function handlePaystackWebhook({appId,ownerId,slug,rawBody,signature}) {
  appId = paymentAppId(appId); ownerId = await webhookOwner(appId,ownerId,slug);
  const gateway = await loadDecryptedGateway(appId,ownerId,'paystack');
  const hash = createHmac('sha512',gateway.secretKey).update(rawBody).digest('hex'); if (!safeEqual(hash,signature || '')) throw new Error('Invalid Paystack webhook signature.');
  const event = JSON.parse(rawBody); if (event.event !== 'charge.success') return {ok:true,ignored:true,type:event.event};
  const data = event.data || {};
  if (data.status !== 'success' || data.metadata?.ownerId !== ownerId || data.metadata?.appId !== appId) throw new Error('Webhook payment ownership mismatch.');
  return applyWebhookPaid({appId,ownerId,gatewayType:'paystack',providerPaymentId:data.reference,providerRef:data.reference,attemptId:data.metadata?.attemptId,sourceType:data.metadata?.sourceType,sourceId:data.metadata?.sourceId,amountInCents:data.amount,currency:data.currency,eventId:`charge-${data.id || data.reference}`});
}
export async function handlePayPalWebhook({appId,ownerId,slug,event,headers}) {
  appId = paymentAppId(appId); ownerId = await webhookOwner(appId,ownerId,slug);
  const gateway = await loadDecryptedGateway(appId,ownerId,'paypal');
  await verifyPayPalWebhook({clientId:gateway.clientId,secretKey:gateway.secretKey,mode:gateway.mode,webhookId:gateway.webhookId,headers,event});
  if (event?.event_type !== 'PAYMENT.CAPTURE.COMPLETED') return {ok:true,ignored:true,type:event?.event_type};
  const resource = event.resource || {}; if (resource.status !== 'COMPLETED') throw new Error('PayPal capture has not completed.');
  const providerRef = resource.supplementary_data?.related_ids?.order_id;
  let attemptId = resource.custom_id;
  if (!attemptId && providerRef) {
    const match = await getFirestore().collection(`artifacts/${appId}/users/${ownerId}/payment_attempts`).where('providerRef','==',providerRef).limit(2).get();
    if (match.size !== 1) throw new Error('Could not map PayPal capture to one payment attempt.'); attemptId = match.docs[0].id;
  }
  return applyWebhookPaid({appId,ownerId,gatewayType:'paypal',providerPaymentId:resource.id,providerRef,attemptId,amountInCents:Math.round(Number(resource.amount?.value) * 100),currency:resource.amount?.currency_code,eventId:event.id});
}
