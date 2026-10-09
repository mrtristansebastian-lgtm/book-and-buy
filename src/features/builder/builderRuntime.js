import { httpsCallable } from 'firebase/functions';
import { getFirebase } from '../../shared/firebase/client';
import { buildBuilderCommerceContext, resolveBuilderCommerceAction } from './builderCommerce';
import { validateWebsiteRequest } from '../../../functions/websiteContract.js';
import { getProductUnitPriceCents, isVariantPurchasable } from '../../utils/products';
import { getServiceUnitPriceCents, getServiceDurationMinutes } from '../../utils/services';
import { getDaySlots } from '../../utils/availability';
import { buildTestCheckoutResult } from '../../utils/testCheckout';
import { shippingQuote } from '../../../functions/marketPolicy.js';
import { assertBusinessCommerceEnabled, isPresenceOnlyBusiness } from '../../../functions/businessCapabilities.js';

export async function builderCallable(name, payload) {
  const firebase = getFirebase();
  if (!firebase || !firebase.auth.currentUser) throw new Error('Sign in to a configured Book & Buy account to use hosted AI and publishing. Your local draft is saved.');
  return (await httpsCallable(firebase.functions, name)(payload)).data;
}
export function builderTestQuote(workspace, payload, includeShipping = true) {
  assertBusinessCommerceEnabled(workspace);
  const client = payload.client || {};
  const items = payload.items || [];
  if (!items.length) throw new Error('Add an item before checkout.');
  const quantities = new Map();
  const lines = items.map(line => {
    const product = workspace.products?.find(row => row.id === line.productId);
    if (!product || !buildBuilderCommerceContext(workspace).products.some(row => row.id === product.id)) throw new Error('Product unavailable.');
    const variant = line.variantId ? product.variants?.find(row => row.id === line.variantId) : null;
    if (!isVariantPurchasable(product, variant)) throw new Error('Choose an available product option.');
    const quantity = Number(line.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999) throw new Error('Choose a valid quantity.');
    const stock = variant?.stockAvailable ?? product.stockAvailable;
    const key = product.id + ':' + (variant?.id || '');
    quantities.set(key, (quantities.get(key) || 0) + quantity);
    if (stock != null && String(stock).trim() !== '' && quantities.get(key) > Number(stock)) throw new Error('There is not enough stock for that quantity.');
    return { ...line, quantity, unitPriceCents: getProductUnitPriceCents(product, variant) };
  });
  const subtotalCents = lines.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0);
  const shipping = includeShipping && Array.isArray(workspace.website?.markets) ? shippingQuote(workspace.website, payload.countryCode || client.country, lines, subtotalCents) : { amountInCents: 0 };
  return { test: true, kind: 'product', currency: workspace.currency || 'R', items: lines, subtotalCents, shippingAmountInCents: shipping.amountInCents, amountInCents: subtotalCents + shipping.amountInCents };
}

export async function executeBuilderRuntime(workspace, cart, action, payload, open) {
  validateWebsiteRequest(action, payload);
  const snapshot = () => ({ items: cart.items, count: cart.count, subtotalCents: cart.subtotalCents, currency: cart.currency, test: true });
  if (action === 'catalog.get') return buildBuilderCommerceContext(workspace);
  if (isPresenceOnlyBusiness(workspace) && action === 'cart.get') return { ...snapshot(), items: [], count: 0, subtotalCents: 0 };
  if (action !== 'cart.close') assertBusinessCommerceEnabled(workspace);
  if (action === 'cart.get') return snapshot();
  if (action === 'quote.get' && payload.serviceId) {
    resolveBuilderCommerceAction(workspace, 'service.open', payload);
    const service = workspace.services.find(row => row.id === payload.serviceId);
    const variant = payload.variantId ? service.variants?.find(row => row.id === payload.variantId && row.available !== false) : null;
    if (payload.variantId && !variant) throw new Error('Choose an available service option.');
    return { test: true, kind: 'service', amountInCents: getServiceUnitPriceCents(service, variant), durationMinutes: getServiceDurationMinutes(service, variant) };
  }
  if (action === 'quote.get') return builderTestQuote(workspace, payload);
  if (action === 'availability.get') {
    resolveBuilderCommerceAction(workspace, 'service.open', payload);
    const service = workspace.services.find(row => row.id === payload.serviceId);
    const variant = service.variants?.find(row => row.id === payload.variantId);
    return getDaySlots({ ...payload, bookings: workspace.bookings, services: workspace.services, staff: workspace.staff, staffAvailability: workspace.staffAvailability, availabilityRules: workspace.availabilityRules, durationMinutes: getServiceDurationMinutes(service, variant) }).map(slot => ({ ...slot, dateKey: payload.dateKey }));
  }
  if (action === 'cart.add' && payload.productId) {
    resolveBuilderCommerceAction(workspace, 'product.open', payload);
    const product = workspace.products.find(row => row.id === payload.productId);
    const variant = product.variants?.find(row => row.id === payload.variantId);
    builderTestQuote(workspace, { ...payload, items: [...cart.items.filter(row => row.kind === 'product').map(row => ({ productId: row.productId, variantId: row.variantId, quantity: row.quantity })), { productId: payload.productId, variantId: payload.variantId, quantity: payload.quantity || 1 }] }, false);
    cart.addItem(product, payload.quantity || 1, variant); return { ok: true, test: true };
  }
  if (action === 'cart.add' && payload.serviceId) {
    const slots = await executeBuilderRuntime(workspace, cart, 'availability.get', payload, open);
    if (!slots.some(slot => slot.time === payload.time)) throw new Error('Choose an available booking time.');
    const service = workspace.services.find(row => row.id === payload.serviceId);
    const variant = service.variants?.find(row => row.id === payload.variantId);
    if (!cart.addService(service, payload, variant)) throw new Error('Choose a date and time.');
    return { ok: true, test: true };
  }
  if (action === 'cart.remove') { cart.removeItem(payload.lineKey || payload.productId || payload.serviceId); return { ok: true, test: true }; }
  if (action === 'cart.updateQuantity') {
    const lines = cart.items.filter(row => row.kind === 'product').map(row => ({ productId: row.productId, variantId: row.variantId, quantity: row.lineKey === payload.lineKey ? payload.quantity : row.quantity }));
    builderTestQuote(workspace, { ...payload, items: lines }, false); cart.setQuantity(payload.lineKey, payload.quantity); return { ok: true, test: true };
  }
  if (['payment.start', 'payment.confirm', 'checkout.status'].includes(action)) return { test: true, status: 'simulated', message: 'Preview does not contact payment providers.' };
  if (['checkout.create', 'booking.create'].includes(action) && (payload.client || payload.clientName)) {
    const details = payload.client || payload;
    if (!String(details.clientName || '').trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.clientEmail || details.email || '')) throw new Error('Enter your name and a valid email address.');
    const products = cart.items.filter(row => row.kind === 'product');
    if (products.length) builderTestQuote(workspace, { ...payload, items: products, client: details });
    return buildTestCheckoutResult(cart.items, details);
  }
  open(resolveBuilderCommerceAction(workspace, action, payload));
  return { opened: true, test: true };
}
