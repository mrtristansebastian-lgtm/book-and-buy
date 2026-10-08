import { getFirestore } from 'firebase-admin/firestore';
import { catalogAllowed, resolveMarket, getMarkets } from './marketPolicy.js';
import { priceMarketOrder } from './marketOrders.js';
import { getPublicPaymentOptions } from './payments/publicOptions.js';
import { expireInventoryReservations, COMMERCE_APP_ID } from './inventoryService.js';
import { readWorkspace } from './workspaceStore.js';
import { commerceQuoteRevision } from './commercePolicy.js';
export async function loadPublishedCommerce(slug, db = getFirestore()) {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(slug || '')) throw new Error('Choose a valid business.');
  const published = await db.doc(`artifacts/${COMMERCE_APP_ID}/public/data/workspaces/${slug}`).get();
  if (!published.exists || published.data().published === false || !/^[a-zA-Z0-9_-]{1,128}$/.test(published.data().ownerId || '')) throw new Error('Business not found.');
  const ownerId = published.data().ownerId;
  const { workspace,exists } = await readWorkspace(db,ownerId);
  if (!exists) throw new Error('Business unavailable.');
  return { ownerId, workspace: { ...workspace, slug, ownerId } };
}
const pick = (source, keys) => Object.fromEntries(keys.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]));
export function publicCommerceCatalog(workspace, countryCode = '') {
  const configured = Array.isArray(workspace.website?.markets); const country = String(countryCode || '').toUpperCase();
  const market = configured ? resolveMarket(workspace.website, country) : null;
  const allowed = (kind, id, variantId = '') => !configured || country && catalogAllowed(market, kind, id, variantId);
  const productKeys = ['id','name','title','description','price','priceInCents','compareAtPrice','currency','priceType','quoteBased','category','productType','vendor','tags','collections','sku','stockAvailable','stockLabel','hideStockOnCard','image','imageUrls','options'];
  const variantKeys = ['id','title','optionValues','price','priceInCents','compareAtPrice','sku','stockAvailable','imageUrl','available','weight','weightUnit','length','width','height','dimensionUnit','size'];
  const serviceKeys = ['id','name','description','price','priceType','duration','durationMinutes','minDuration','fixedDuration','category','scheduleType','capacity','sessions','sessionStartDate','sessionStartTime','sessionEndDate','sessionEndTime','sessionLabel','staffIds','photoURL','imageUrls'];
  return { ok: true, ownerId: workspace.ownerId, slug: workspace.slug, brandName: workspace.brandName || '', currency: workspace.currency || 'R', timezone: workspace.timezone || 'Africa/Johannesburg',
    products: (workspace.products || []).filter((item) => item.active !== false && !['draft','archived'].includes(item.status) && allowed('product',item.id)).map((item) => ({ ...pick(item, productKeys), active: true, variants: (item.variants || []).filter((variant) => allowed('product',item.id,variant.id)).map((variant) => pick(variant,variantKeys)) })),
    services: (workspace.services || []).filter((item) => item.active !== false && item.available !== false && allowed('service',item.id)).map((item) => ({ ...pick(item,serviceKeys), active: true, variants: (item.variants || []).filter((variant) => variant.available !== false).map((variant) => pick(variant,['id','name','description','price','minDuration','available'])) })),
    staff: (workspace.staff || []).map((item) => pick(item,['id','name','role','color'])),
    markets: getMarkets(workspace.website).map((market) => pick(market,['id','countryCode','enabled'])), paymentOptions: getPublicPaymentOptions(workspace).options.map((option) => pick(option,['id','gatewayType','name','enabled','mode'])),
    policies: pick(workspace.policies || {},['cancellation','terms','privacy']), checkout: pick(workspace.features || {},['collectClientPhone','collectClientNotes','birthday']),
    revision: { ...commerceQuoteRevision(workspace,'product'),services:workspace.sectionRevisions?.services || 0 }, marketsConfigured: configured, catalogAvailability: !configured ? 'available' : !country ? 'country-required' : !market?.enabled ? 'country-disabled' : 'available' };
}
export function serviceCommerceQuote(workspace, data) {
  const service = (workspace.services || []).find((item) => item.id === data.serviceId);
  if (!service || service.active === false || service.available === false) throw new Error('Service unavailable.');
  const countryCode = String(data.countryCode || data.client?.country || data.clientCountry || '').trim().toUpperCase();
  if (Array.isArray(workspace.website?.markets) && (!/^[A-Z]{2}$/.test(countryCode) || !catalogAllowed(resolveMarket(workspace.website, countryCode), 'service', service.id))) throw new Error('This service is not available in the selected country.');
  const variant = data.variantId ? (service.variants || []).find((item) => item.id === data.variantId && item.available !== false) : null;
  if (data.variantId && !variant) throw new Error('That service option is unavailable.');
  const price = variant?.price ?? service.price;
  const amountInCents = ['quote','free'].includes(service.priceType) ? 0 : moneyInCents(price);
  let durationMinutes = Number(variant?.minDuration || service.durationMinutes || service.minDuration || service.duration || 60);
  if (service.scheduleType === 'class_session') { const elapsed = Date.parse(`${service.sessionEndDate || service.sessionStartDate}T${service.sessionEndTime}:00Z`) - Date.parse(`${service.sessionStartDate}T${service.sessionStartTime}:00Z`); if (elapsed > 0) durationMinutes = elapsed / 60000; }
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) throw new Error('The service duration is invalid.');
  return { ok: true, kind: 'service', serviceId: service.id, variantId: variant?.id || '', variantName: variant?.name || '', amountInCents, durationMinutes, currency: workspace.currency || 'R', quoteBased: service.priceType === 'quote', revision: workspace.sectionRevisions?.services || 0, quoteRevision:commerceQuoteRevision(workspace,'service') };
}
export function moneyInCents(price) {
  const raw = String(price ?? '').trim().replace(/^(?:R|ZAR|USD|EUR|GBP|\$|€|£)\s*/i,'');
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) throw new Error('The catalog price is invalid.');
  const amount = Math.round(Number(raw) * 100); if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('The catalog price is invalid.'); return amount;
}
export async function getPublicCommerceCatalog(data, db = getFirestore()) {
  const initial = await loadPublishedCommerce(data.slug,db); await expireInventoryReservations({ ownerId: initial.ownerId },db);
  const { workspace } = await loadPublishedCommerce(data.slug,db); return publicCommerceCatalog(workspace,data.countryCode);
}
export async function getPublicCommerceQuote(data, auth = null, db = getFirestore()) {
  const initial = await loadPublishedCommerce(data.slug,db); await expireInventoryReservations({ ownerId: initial.ownerId },db);
  const { workspace } = await loadPublishedCommerce(data.slug,db);
  if (data.kind === 'service' || data.serviceId) return serviceCommerceQuote(workspace,data);
  const order = priceMarketOrder(workspace,{ ...data, client: { ...data.client, clientEmail: data.client?.clientEmail || data.client?.email, country: data.client?.country || data.countryCode } },auth);
  return { ok: true, kind: 'product', items: order.items.map((item) => pick(item,['productId','variantId','name','variantLabel','quantity','unitPriceCents','lineTotalCents'])), currency: order.currency, amountInCents: order.amountInCents, subtotalCents: order.subtotalCents, shippingAmountInCents: order.shippingAmountInCents, quoteBased: false, revision: workspace.sectionRevisions?.products || 0, quoteRevision:commerceQuoteRevision(workspace,'product') };
}
export const getPublicCommerceContext = getPublicCommerceCatalog;
export const quotePublicCommerce = getPublicCommerceQuote;
