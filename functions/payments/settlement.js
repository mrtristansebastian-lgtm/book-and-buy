import { createHash } from 'node:crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { readWorkspace, writeWorkspace } from '../workspaceStore.js';
import { paymentConfirmationSnapshot, clientTransactionSnapshot } from '../financialSnapshots.js';
import { commitInventory,releaseInventory } from '../inventoryDomain.js';
import { reservationRef, inventoryWrite, inventorySettingsPatch } from '../inventoryService.js';
import { paymentAppId, verifiedPaymentEvidence } from './paymentPolicy.js';
export async function settleVerifiedPayment(data, db = getFirestore()) {
  const appId = paymentAppId(data.appId);
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(data.ownerId || '') || !/^[a-zA-Z0-9_-]{1,128}$/.test(data.attemptId || '')) throw new Error('Invalid payment attempt.');
  return db.runTransaction(async (tx) => {
    const root = `artifacts/${appId}/users/${data.ownerId}`;
    const attemptRef = db.doc(`${root}/payment_attempts/${data.attemptId}`);
    const eventId = createHash('sha256').update(`${data.gatewayType}:${data.eventId || data.providerPaymentId}`).digest('hex');
    const eventRef = db.doc(`${root}/payment_events/${eventId}`);
    const [attemptSnap,event,{workspace,exists}] = await Promise.all([tx.get(attemptRef),tx.get(eventRef),readWorkspace(db,data.ownerId,tx)]);
    if (!attemptSnap.exists || !exists) throw new Error('Payment attempt not found.');
    const attempt = attemptSnap.data(); verifiedPaymentEvidence(attempt,data);
    if (event.exists) { if (event.data().attemptId !== data.attemptId) throw new Error('Payment event already mapped to a different attempt.'); return event.data().result; }
    if (attempt.status === 'paid') return { ok: true, paid: true, attemptId: data.attemptId, inventoryException: attempt.inventoryException === true };
    const field = attempt.sourceType === 'order' ? 'orders' : 'bookings';
    const source = (workspace[field] || []).find((item) => item.id === attempt.sourceId);
    if (!source || source.amountInCents !== attempt.amountInCents || source.paymentMethod !== attempt.gatewayType || source.paymentAttemptId && source.paymentAttemptId !== data.attemptId) throw new Error('The saved payment source changed.');
    const reservation = field === 'orders' ? await tx.get(reservationRef(db,data.ownerId,source.id)) : null;
    const cancelled = ['cancelled','declined'].includes(source.status);
    const commit = field === 'orders' ? cancelled ? { ...releaseInventory(workspace,reservation?.exists ? reservation.data() : null,'cancelled'),exception:true } : commitInventory(workspace,reservation?.exists ? reservation.data() : null) : null;
    const exception = ['cancelled','declined'].includes(source.status) || commit?.exception === true;
    const record = { ...source,...paymentConfirmationSnapshot(source),providerPaymentId: data.providerPaymentId,paymentGateway: data.gatewayType,revision: (source.revision || 0) + 1,updatedAt: Date.now(), ...(field === 'orders' ? { inventoryStatus: exception ? 'payment_exception' : 'committed',...(exception ? { paymentException: 'Payment arrived after the inventory hold expired or order was cancelled. Review stock and refund or resolve manually.' } : {}) } : {}) };
    const stock = commit?.changed ? inventorySettingsPatch(workspace,commit.products) : {};
    writeWorkspace(tx,db,data.ownerId,workspace,{ ...workspace,...stock,[field]:workspace[field].map((item) => item.id === source.id ? record : item),...(field === 'bookings' ? { bookingRevision: (workspace.bookingRevision || 0) + 1 } : {}) });
    if (commit?.changed) inventoryWrite(tx,db,data.ownerId,commit,`${source.id}-${commit.reservation.status}-${commit.reservation.revision}`,commit.reservation.status,'payment');
    if (field === 'bookings') {
      tx.set(db.doc(`${root}/bookings/${record.id}`),record);
      if (record.clientEmail && !record.clientEmail.includes('/')) tx.set(db.doc(`artifacts/${appId}/clientAccess/${record.clientEmail}/bookings/${record.id}`),clientTransactionSnapshot(record));
    }
    const result = { ok: true, paid: true, attemptId: data.attemptId,providerPaymentId: data.providerPaymentId,inventoryException: exception };
    tx.update(attemptRef,{ status:'paid',paidAt: Date.now(),providerPaymentId: data.providerPaymentId,inventoryException:exception });
    tx.create(eventRef,{ attemptId:data.attemptId,gatewayType:data.gatewayType,providerPaymentId:data.providerPaymentId,amountInCents:data.amountInCents,currency:data.currency,atMs:Date.now(),result });
    if (exception) tx.set(db.doc(`${root}/notifications/payment-${data.attemptId}`),{ type:'payment_exception',audience:'owner',ownerId:data.ownerId,orderId:record.id,read:false,createdAt:Date.now(),body:record.paymentException || 'Late payment needs review.' });
    return result;
  });
}
