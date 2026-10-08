import { createHash } from 'node:crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { releaseInventory } from './inventoryDomain.js';
import { readWorkspace, writeWorkspace } from './workspaceStore.js';
export const COMMERCE_APP_ID = process.env.APP_ID || 'book-and-buy-v1';
export const ownerRoot = (ownerId) => `artifacts/${COMMERCE_APP_ID}/users/${ownerId}`;
export const reservationRef = (db, ownerId, id) => db.doc(`${ownerRoot(ownerId)}/inventoryReservations/${id}`);
export function inventoryWrite(tx, db, ownerId, transition, eventId, type, actor = 'system') {
  if (!transition.changed) return;
  tx.set(reservationRef(db, ownerId, transition.reservation.id), transition.reservation);
  tx.create(db.doc(`${ownerRoot(ownerId)}/inventoryLedger/${eventId}`), { orderId: transition.reservation.orderId, type, actor, items: transition.reservation.items, atMs: Date.now(), reservationRevision: transition.reservation.revision });
}
export function inventorySettingsPatch(workspace, products) {
  return { products, sectionRevisions: { ...(workspace.sectionRevisions || {}), products: (workspace.sectionRevisions?.products || 0) + 1 } };
}
export async function readExpiredInventory(tx, db, ownerId, workspace, now = Date.now()) {
  const snapshot = await tx.get(db.collection(`${ownerRoot(ownerId)}/inventoryReservations`).where('status', '==', 'reserved'));
  let products = workspace.products; const expired = [];
  for (const doc of snapshot.docs) if (doc.data().expiresAtMs <= now) {
    const transition = releaseInventory({ ...workspace, products }, doc.data(), 'expired', now);
    products = transition.products; expired.push(transition);
  }
  return { products, expired };
}
export function writeExpiredInventory(tx, db, ownerId, expired) {
  for (const transition of expired) inventoryWrite(tx, db, ownerId, transition, `${transition.reservation.id}-expire-${transition.reservation.revision}`, 'expired');
}
export async function expireInventoryReservations({ ownerId }, db = getFirestore()) {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(ownerId || '')) throw new Error('Invalid business.');
  return db.runTransaction(async (tx) => {
    const { workspace,exists } = await readWorkspace(db,ownerId,tx);
    if (!exists) throw new Error('Business unavailable.');
    const { products, expired } = await readExpiredInventory(tx, db, ownerId, workspace);
    if (expired.length) { writeWorkspace(tx,db,ownerId,workspace,{ ...workspace,...inventorySettingsPatch(workspace,products) }); writeExpiredInventory(tx, db, ownerId, expired); }
    return { ok: true, expiredCount: expired.length };
  });
}
export async function adjustInventory(data, auth, db = getFirestore()) {
  if (!auth?.uid || auth.token?.email_verified !== true || !/^[a-zA-Z0-9_-]{1,128}$/.test(data.ownerId || '') || !/^[a-zA-Z0-9_-]{1,128}$/.test(data.requestId || '')) throw new Error('Verify your email and choose a valid inventory request.');
  if (auth.uid !== data.ownerId) {
    const access = await db.doc(`artifacts/${COMMERCE_APP_ID}/staffAccess/${auth.token.email}/workspaces/${data.ownerId}`).get();
    if (!access.exists || access.data().status !== 'active' || access.data().role !== 'admin') throw new Error('Business administrator access required.');
  }
  const fingerprint = createHash('sha256').update(JSON.stringify({ updates: data.updates, expectedRevision: data.expectedRevision })).digest('hex');
  return db.runTransaction(async (tx) => {
    const ref = db.doc(`${ownerRoot(data.ownerId)}/config/settings`); const receiptRef = db.doc(`${ownerRoot(data.ownerId)}/idempotencyKeys/inventory-${data.requestId}`);
    const [{ workspace,exists }, receipt] = await Promise.all([readWorkspace(db,data.ownerId,tx), tx.get(receiptRef)]);
    if (receipt.exists) { if (receipt.data().fingerprint !== fingerprint || receipt.data().uid !== auth.uid) throw new Error('Request identifier already used.'); return receipt.data().result; }
    if (!exists) throw new Error('Business unavailable.');
    if ((workspace.sectionRevisions?.products || 0) !== data.expectedRevision) throw new Error('Inventory changed. Refresh before adjusting.');
    if (!Array.isArray(data.updates) || !data.updates.length || data.updates.length > 100) throw new Error('Choose between 1 and 100 inventory adjustments.');
    const holds = await tx.get(db.collection(`${ownerRoot(data.ownerId)}/inventoryReservations`).where('status', '==', 'reserved'));
    const products = structuredClone(workspace.products || []); const seen = new Set(); const entries = [];
    for (const update of data.updates) {
      const key = JSON.stringify([update.productId, update.variantId || '']);
      if (seen.has(key)) throw new Error('Duplicate inventory item.'); seen.add(key);
      const product = products.find((item) => item.id === update.productId);
      const target = update.variantId ? product?.variants?.find((item) => item.id === update.variantId) : product;
      const patch = { ...(update.patch || { stockAvailable: update.stockAvailable }) };
      const allowed = ['sku', 'stockAvailable', 'lowStockThreshold', 'cost', 'weight', 'weightUnit', 'length', 'width', 'height', 'dimensionUnit', ...(update.variantId ? ['available'] : ['stockLabel', 'hideStockOnCard'])];
      if (!target || Object.keys(patch).some(field => !allowed.includes(field))) throw new Error('Choose valid inventory fields.');
      if (Object.hasOwn(patch, 'stockAvailable')) {
        if (product.variants?.some(row => row.available !== false) && !update.variantId) throw new Error('Choose a product variant for stock quantities.');
        const raw = patch.stockAvailable; const blank = raw == null || String(raw).trim() === ''; const quantity = Number(raw);
        if (!blank && (!Number.isSafeInteger(quantity) || quantity < 0) || String(target.stockAvailable ?? '') !== String(update.expectedStockAvailable ?? '')) throw new Error('Invalid or changed inventory quantity.');
        if (blank && holds.docs.some(hold => hold.data().items.some(item => item.productId === update.productId && (item.variantId || '') === (update.variantId || '')))) throw new Error('Release outstanding reservations before turning off stock tracking.');
        patch.stockAvailable = blank ? '' : String(quantity);
      }
      for (const [field, value] of Object.entries(patch)) {
        if (['lowStockThreshold', 'cost', 'weight', 'length', 'width', 'height'].includes(field) && value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0 || field === 'lowStockThreshold' && !Number.isSafeInteger(Number(value)))) throw new Error('Use valid non-negative inventory values.');
        if (['available', 'hideStockOnCard'].includes(field) && typeof value !== 'boolean') throw new Error('Use a valid inventory switch.');
        if (['sku', 'weightUnit', 'dimensionUnit', 'stockLabel'].includes(field) && (typeof value !== 'string' || value.length > 200)) throw new Error('Use a short inventory label.');
      }
      entries.push({ productId: update.productId, variantId: update.variantId || '', before: Object.fromEntries(Object.keys(patch).map(field => [field, target[field] ?? null])), after: patch }); Object.assign(target, patch);
    }
    const patch = inventorySettingsPatch(workspace, products); const result = { ok: true, products, revision: patch.sectionRevisions.products };
    writeWorkspace(tx,db,data.ownerId,workspace,{ ...workspace,...patch }); tx.create(db.doc(`${ownerRoot(data.ownerId)}/inventoryLedger/adjust-${data.requestId}`), { type: 'adjustment', actor: auth.uid, entries, atMs: Date.now() });
    tx.create(receiptRef, { fingerprint, uid: auth.uid, result }); return result;
  });
}
