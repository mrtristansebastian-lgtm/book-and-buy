import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { randomUUID, createHash } from 'node:crypto';
import { shippingQuote } from './marketPolicy.js';
import { getPublicPaymentOptions } from './payments/publicOptions.js';
import { verifiedAnalyticsAttribution } from './analyticsAttribution.js';
import { catalogUnitCostCents, paymentConfirmationSnapshot, clientTransactionSnapshot } from './financialSnapshots.js';
import { reserveInventory, releaseInventory, commitInventory, ONLINE_PAYMENT_METHODS } from './inventoryDomain.js';
import { reservationRef, readExpiredInventory, writeExpiredInventory, inventoryWrite, inventorySettingsPatch } from './inventoryService.js';
import { readWorkspace, writeWorkspace } from './workspaceStore.js';
import { assertCommerceQuoteRevision, assertPublishedWorkspace } from './commercePolicy.js';

const APP_ID = process.env.APP_ID || 'book-and-buy-v1';
const safeId = (value) => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
const fail = (message) => { throw new Error(message); };

export function priceMarketOrder(workspace, data, auth = null, { requireCustomer = true } = {}) {
  const client = data.client || {};
  if (requireCustomer && (!String(client.clientName || '').trim() || !/^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(client.clientEmail || ''))) fail('Enter your name and a valid email address.');
  if (!Array.isArray(data.items) || !data.items.length || data.items.length > 100) fail('Choose between 1 and 100 order items.');
  if (!['cash', 'stripe', 'paypal', 'paystack'].includes(data.paymentMethod)) fail('Choose a supported payment method.');
  if (Array.isArray(workspace.paymentGateways) && !getPublicPaymentOptions(workspace).options.some((option) => option.gatewayType === data.paymentMethod)) fail('This payment method is not enabled by the business.');
  const quantities = new Map();
  const items = data.items.map((item) => {
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 999) fail('Invalid product quantity.');
    const product = (workspace.products || []).find((row) => row.id === item.productId);
    if (!product || product.active === false || (product.status && product.status !== 'active') || product.quoteBased || product.priceType === 'quote') fail('A product is no longer available.');
    const variant = item.variantId ? (product.variants || []).find((row) => row.id === item.variantId) : null;
    if (((product.variants || []).length && !variant) || (item.variantId && !variant) || variant?.available === false) fail('A product variant is no longer available.');
    const key = `${product.id}:${variant?.id || ''}`;
    const quantity = (quantities.get(key) || 0) + item.quantity;
    quantities.set(key, quantity);
    const stock = variant ? variant.stockAvailable : product.stockAvailable;
    if (stock != null && String(stock).trim() !== '' && (!Number.isFinite(Number(stock)) || quantity > Number(stock))) fail('There is not enough stock for your order.');
    const configuredPrice = String(variant?.price ?? product.price ?? '').trim().replace(/^(?:R|ZAR|USD|EUR|GBP|\$|€|£)\s*/i, '');
    if (!/^\d+(?:\.\d{1,2})?$/.test(configuredPrice)) fail('The product price is invalid.');
    const unitPriceCents = Math.round(Number(configuredPrice) * 100);
    if (!Number.isSafeInteger(unitPriceCents) || unitPriceCents < 0) fail('The product price is invalid.');
    const unitCostInCents = catalogUnitCostCents(product, variant);
    const lineCostInCents = unitCostInCents == null ? null : item.quantity * unitCostInCents;
    return { productId: product.id, variantId: variant?.id || '', name: product.name, variantLabel: variant?.title || Object.values(variant?.optionValues || {}).join(' / '), quantity: item.quantity, unitPriceCents, lineTotalCents: item.quantity * unitPriceCents,
      ...(Number.isSafeInteger(lineCostInCents) ? { unitCostInCents, lineCostInCents } : {}) };
  });
  const subtotalCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const configured = Array.isArray(workspace.website?.markets);
  const shipping = configured ? shippingQuote(workspace.website, client.country, items, subtotalCents) : { amountInCents: 0, profileIds: [] };
  if (requireCustomer && configured && !String(client.shippingAddress || '').trim()) fail('Enter your delivery address.');
  const amountInCents = subtotalCents + shipping.amountInCents;
  if (!Number.isSafeInteger(amountInCents)) fail('The order total is invalid.');
  const costBasisInCents = items.every((item) => Number.isSafeInteger(item.lineCostInCents)) ? items.reduce((sum, item) => sum + item.lineCostInCents, 0) : null;
  return { requestType: 'product_order', orderType: 'product', items, subtotalCents, amountInCents,
    ...(Number.isSafeInteger(costBasisInCents) ? { costBasisInCents } : {}),
    shippingAmountInCents: shipping.amountInCents, shippingProfileIds: shipping.profileIds,
    shippingAddress: String(client.shippingAddress || '').trim().slice(0, 1500), clientCountry: String(client.country || '').trim(),
    clientName: String(client.clientName || '').trim().slice(0, 120), clientEmail: String(client.clientEmail || '').trim().toLowerCase(),
    clientPhone: String(client.clientPhone || '').trim().slice(0, 80), clientNote: String(client.clientNote || '').trim().slice(0, 2000),
    clientUid: auth?.token?.email?.toLowerCase() === String(client.clientEmail).trim().toLowerCase() ? auth.uid : '',
    paymentMethod: data.paymentMethod, paymentStatus: data.paymentMethod === 'cash' ? 'manual_pending' : 'unpaid', status: 'pending',
    currency: workspace.currency || 'R', source: 'public_shop', workspaceSlug: workspace.slug, workspaceName: workspace.brandName || workspace.slug };
}

export async function placeMarketOrder(data, auth, db = getFirestore()) {
  if (!safeId(data.slug) || !safeId(data.requestId)) fail('A valid business and order request identifier are required.');
  const published = await db.doc(`artifacts/${APP_ID}/public/data/workspaces/${data.slug}`).get();
  if (!published.exists || !safeId(published.data().ownerId)) fail('Business not found.');
  const ownerId = published.data().ownerId;
  const settings = db.doc(`artifacts/${APP_ID}/users/${ownerId}/config/settings`);
  const receipt = db.doc(`artifacts/${APP_ID}/users/${ownerId}/idempotencyKeys/order-${data.requestId}`);
  const fingerprint = createHash('sha256').update(JSON.stringify(data)).digest('hex');
  return db.runTransaction(async (tx) => {
    const [{ workspace,exists }, prior] = await Promise.all([readWorkspace(db,ownerId,tx), tx.get(receipt)]);
    if (prior.exists) { if (prior.data().fingerprint !== fingerprint) fail('This request identifier was already used for a different order.'); return clientTransactionSnapshot(prior.data().order); }
    if (!exists) fail('Business unavailable.');
    const liveProfile = await tx.get(published.ref || db.doc(`artifacts/${APP_ID}/public/data/workspaces/${data.slug}`));
    assertPublishedWorkspace(workspace,liveProfile.exists ? liveProfile.data() : null,data.slug,ownerId);
    if (data.expectedCatalogRevision !== undefined && data.expectedCatalogRevision !== (workspace.sectionRevisions?.products || 0)) fail('The product catalog changed. Refresh the quote before ordering.');
    assertCommerceQuoteRevision(workspace,'product',data.expectedQuoteRevision);
    const inventory = await readExpiredInventory(tx,db,ownerId,workspace);
    const currentWorkspace = { ...workspace, products: inventory.products };
    const attribution = await verifiedAnalyticsAttribution(data, ownerId, data.slug, async (id) => {
      const session = await tx.get(db.doc(`artifacts/${APP_ID}/analyticsSessions/${id}`));
      return session.exists ? session.data() : null;
    });
    const order = { ...priceMarketOrder(currentWorkspace, data, auth), ...attribution, id: randomUUID(), ownerId, timestamp: Date.now(), revision: 1 };
    const hold = ONLINE_PAYMENT_METHODS.has(order.paymentMethod) ? reserveInventory(currentWorkspace,order) : null;
    if (hold) { order.inventoryStatus = 'reserved'; order.inventoryExpiresAtMs = hold.reservation.expiresAtMs; }
    else order.inventoryStatus = 'unreserved';
    const patch = inventory.expired.length || hold ? inventorySettingsPatch(workspace,hold?.products || inventory.products) : {};
    writeWorkspace(tx,db,ownerId,workspace,{ ...workspace, ...patch, orders: [order, ...(workspace.orders || [])] });
    writeExpiredInventory(tx,db,ownerId,inventory.expired);
    if (hold) inventoryWrite(tx,db,ownerId,hold,`${order.id}-reserve-1`,'reserved',auth?.uid || 'public');
    tx.set(receipt, { fingerprint, order, createdAt: FieldValue.serverTimestamp() });
    return clientTransactionSnapshot(order);
  });
}

export async function updateMarketOrder(data, auth, db = getFirestore()) {
  if (!auth?.uid || !auth.token?.email_verified || !safeId(data.ownerId) || !safeId(data.id)) fail('Verify your email and sign in to manage orders.');
  if (auth.uid !== data.ownerId) {
    const access = await db.doc(`artifacts/${APP_ID}/staffAccess/${auth.token.email}/workspaces/${data.ownerId}`).get();
    if (!access.exists || access.data().status !== 'active' || access.data().role !== 'admin') fail('Business administrator access required.');
  }
  const settings = db.doc(`artifacts/${APP_ID}/users/${data.ownerId}/config/settings`);
  if (data.requestId && !safeId(data.requestId)) fail('Invalid order request identifier.');
  const fingerprint = createHash('sha256').update(JSON.stringify(data)).digest('hex');
  return db.runTransaction(async (tx) => {
    const { workspace,exists } = await readWorkspace(db,data.ownerId,tx);
    if (!exists) fail('Business unavailable.');
    const updateReceipt = data.requestId ? db.doc(`artifacts/${APP_ID}/users/${data.ownerId}/idempotencyKeys/order-update-${data.requestId}`) : null;
    if (updateReceipt) { const prior = await tx.get(updateReceipt); if (prior.exists) { if (prior.data().fingerprint !== fingerprint || prior.data().uid !== auth.uid) fail('Request identifier already used.'); return prior.data().result; } }
    const orders = workspace.orders || [];
    const current = orders.find((order) => order.id === data.id);
    if (!current || (current.revision || 0) !== data.expectedRevision) fail('This order changed. Refresh before editing.');
    const patch = {};
    if (data.patch?.status != null) {
      if (!['accepted', 'fulfilled', 'shipped', 'cancelled'].includes(data.patch.status)) fail('Invalid order status.');
      const transitions = { pending: ['accepted','cancelled'], accepted: ['fulfilled','shipped','cancelled'], fulfilled: ['shipped'], shipped: [], cancelled: [] };
      if (data.patch.status !== current.status && !(transitions[current.status] || []).includes(data.patch.status)) fail('This order status transition is not allowed.');
      patch.status = data.patch.status;
    }
    if (data.patch?.paymentStatus != null) {
      if (data.patch.paymentStatus !== 'paid' || !['cash', 'manual_eft'].includes(current.paymentMethod)) fail('Online payments must be confirmed by the payment provider.');
      if (current.status === 'cancelled' && current.paymentStatus !== 'paid') fail('A cancelled order cannot be marked paid.');
      Object.assign(patch, paymentConfirmationSnapshot(current));
    }
    const inventory = await readExpiredInventory(tx,db,data.ownerId,workspace);
    const reservationSnapshot = await tx.get(reservationRef(db,data.ownerId,current.id));
    let reservation = inventory.expired.find((item) => item.reservation.id === current.id)?.reservation || (reservationSnapshot.exists ? reservationSnapshot.data() : null);
    let transition = null; let products = inventory.products;
    const nextStatus = patch.status || current.status;
    if (current.inventoryStatus === 'payment_exception' && ['accepted','fulfilled','shipped'].includes(nextStatus)) fail('The inventory hold has expired. Resolve the late payment inventory exception before accepting or fulfilling.');
    if (patch.status === 'accepted' && reservation && !['reserved', 'committed'].includes(reservation.status)) fail('The inventory hold has expired. Create a new order.');
    if (nextStatus === 'cancelled') transition = releaseInventory({ ...workspace,products },reservation,'cancelled');
    else if (patch.status === 'accepted' || patch.paymentStatus === 'paid' || ['fulfilled','shipped'].includes(patch.status)) {
      if (!reservation) { transition = reserveInventory({ ...workspace,products },current); products = transition.products; reservation = transition.reservation; }
      if (patch.paymentStatus === 'paid' || ['fulfilled','shipped'].includes(patch.status)) {
        if (ONLINE_PAYMENT_METHODS.has(current.paymentMethod) && current.paymentStatus !== 'paid') fail('Online payment must complete before fulfilment.');
        const commit = commitInventory({ ...workspace,products },reservation);
        if (commit.exception) fail('The inventory hold has expired. Create a new order.');
        transition = { ...commit, products, changed: commit.changed || transition?.changed === true };
      }
    }
    if (transition?.changed) { products = transition.products; patch.inventoryStatus = transition.reservation.status; patch.inventoryExpiresAtMs = transition.reservation.expiresAtMs; }
    const order = { ...current, ...patch, updatedAt: Date.now(), revision: (current.revision || 0) + 1 };
    const stockPatch = inventory.expired.length || transition?.changed ? inventorySettingsPatch(workspace,products) : {};
    writeWorkspace(tx,db,data.ownerId,workspace,{ ...workspace, ...stockPatch, orders: orders.map((item) => item.id === data.id ? order : item) });
    writeExpiredInventory(tx,db,data.ownerId,inventory.expired);
    if (transition?.changed) inventoryWrite(tx,db,data.ownerId,transition,`${order.id}-${transition.reservation.status}-${transition.reservation.revision}`,transition.reservation.status,auth.uid);
    if (updateReceipt) tx.set(updateReceipt,{fingerprint,uid:auth.uid,result:order,createdAt:FieldValue.serverTimestamp()});
    return order;
  });
}
