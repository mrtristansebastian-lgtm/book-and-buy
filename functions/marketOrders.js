import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { randomUUID, createHash } from 'node:crypto';
import { shippingQuote } from './marketPolicy.js';
import { getPublicPaymentOptions } from './payments/publicOptions.js';

const APP_ID = process.env.APP_ID || 'book-and-buy-v1';
const safeId = (value) => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
const fail = (message) => { throw new Error(message); };

export function priceMarketOrder(workspace, data, auth = null) {
  const client = data.client || {};
  if (!String(client.clientName || '').trim() || !/^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(client.clientEmail || '')) fail('Enter your name and a valid email address.');
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
    const stock = variant?.stockAvailable ?? product.stockAvailable;
    if (stock != null && String(stock).trim() !== '' && (!Number.isFinite(Number(stock)) || quantity > Number(stock))) fail('There is not enough stock for your order.');
    const unitPriceCents = Math.round(Number(String(variant?.price ?? product.price ?? '').replace(/[^\d.]/g, '')) * 100);
    if (!Number.isSafeInteger(unitPriceCents) || unitPriceCents < 0) fail('The product price is invalid.');
    return { productId: product.id, variantId: variant?.id || '', name: product.name, variantLabel: variant?.title || Object.values(variant?.optionValues || {}).join(' / '), quantity: item.quantity, unitPriceCents, lineTotalCents: item.quantity * unitPriceCents };
  });
  const subtotalCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const configured = Array.isArray(workspace.website?.markets);
  const shipping = configured ? shippingQuote(workspace.website, client.country, items, subtotalCents) : { amountInCents: 0, profileIds: [] };
  if (configured && !String(client.shippingAddress || '').trim()) fail('Enter your delivery address.');
  const amountInCents = subtotalCents + shipping.amountInCents;
  if (!Number.isSafeInteger(amountInCents)) fail('The order total is invalid.');
  return { requestType: 'product_order', orderType: 'product', items, subtotalCents, amountInCents,
    shippingAmountInCents: shipping.amountInCents, shippingProfileIds: shipping.profileIds,
    shippingAddress: String(client.shippingAddress || '').trim().slice(0, 1500), clientCountry: String(client.country || '').trim(),
    clientName: String(client.clientName).trim().slice(0, 120), clientEmail: String(client.clientEmail).trim().toLowerCase(),
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
    const [snap, prior] = await Promise.all([tx.get(settings), tx.get(receipt)]);
    if (prior.exists) { if (prior.data().fingerprint !== fingerprint) fail('This request identifier was already used for a different order.'); return prior.data().order; }
    if (!snap.exists) fail('Business unavailable.');
    const workspace = snap.data();
    const order = { ...priceMarketOrder(workspace, data, auth), id: randomUUID(), ownerId, timestamp: Date.now(), revision: 1 };
    tx.update(settings, { orders: [order, ...(workspace.orders || [])] });
    tx.set(receipt, { fingerprint, order, createdAt: FieldValue.serverTimestamp() });
    return order;
  });
}

export async function updateMarketOrder(data, auth, db = getFirestore()) {
  if (!auth?.uid || !auth.token?.email_verified || !safeId(data.ownerId) || !safeId(data.id)) fail('Verify your email and sign in to manage orders.');
  if (auth.uid !== data.ownerId) {
    const access = await db.doc(`artifacts/${APP_ID}/staffAccess/${auth.token.email}/workspaces/${data.ownerId}`).get();
    if (!access.exists || access.data().status !== 'active' || access.data().role !== 'admin') fail('Business administrator access required.');
  }
  const settings = db.doc(`artifacts/${APP_ID}/users/${data.ownerId}/config/settings`);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(settings);
    const orders = snap.data()?.orders || [];
    const current = orders.find((order) => order.id === data.id);
    if (!current || (current.revision || 0) !== data.expectedRevision) fail('This order changed. Refresh before editing.');
    const patch = {};
    if (data.patch?.status != null) {
      if (!['accepted', 'fulfilled', 'shipped', 'cancelled'].includes(data.patch.status)) fail('Invalid order status.');
      patch.status = data.patch.status;
    }
    if (data.patch?.paymentStatus != null) {
      if (data.patch.paymentStatus !== 'paid' || !['cash', 'manual_eft'].includes(current.paymentMethod)) fail('Online payments must be confirmed by the payment provider.');
      patch.paymentStatus = 'paid';
    }
    const order = { ...current, ...patch, updatedAt: Date.now(), revision: (current.revision || 0) + 1 };
    tx.update(settings, { orders: orders.map((item) => item.id === data.id ? order : item) });
    return order;
  });
}
