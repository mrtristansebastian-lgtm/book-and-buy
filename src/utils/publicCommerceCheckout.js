export const ONLINE_CHECKOUT_METHODS = ['stripe', 'paypal', 'paystack'];

export function mergePublicCommerceWorkspace(snapshot = {}, catalog) {
  if (!catalog) return snapshot;
  const { markets: ignoredMarkets, ...website } = snapshot.website || {};
  return {
    ...snapshot,
    ownerId: catalog.ownerId,
    slug: catalog.slug,
    brandName: catalog.brandName,
    currency: catalog.currency,
    timezone: catalog.timezone,
    products: catalog.products.map((item) => ({ ...item, currency: catalog.currency })),
    services: catalog.services.map((item) => ({ ...item, currency: catalog.currency })),
    staff: catalog.staff,
    features: { ...snapshot.features, ...catalog.checkout },
    paymentGateways: catalog.paymentOptions.map((option) => ({ ...option, configured: true })),
    website: { ...website, ...(catalog.marketsConfigured ? { markets: catalog.markets } : {}), catalogAvailability: catalog.catalogAvailability },
    commerceRevision: catalog.revision
  };
}

export function onlineCheckoutRestriction(items, paymentMethod) {
  if (!ONLINE_CHECKOUT_METHODS.includes(paymentMethod)) return '';
  const sources = Number(items.some((item) => item.kind === 'product')) + items.filter((item) => item.kind === 'service').length;
  return sources > 1
    ? 'Online checkout supports one product order or one service booking at a time. Separate these items into checkouts, or choose an available manual payment option.'
    : '';
}

export function checkoutQuoteInput({ slug, items, details, countryCode, paymentMethod }) {
  return { slug, items: items.map((item) => ({ kind: item.kind, lineKey: item.lineKey,
    productId: item.productId, serviceId: item.serviceId, variantId: item.variantId || '',
    quantity: item.quantity, dateKey: item.dateKey, time: item.time })),
  client: { ...details, country: countryCode }, countryCode, paymentMethod };
}

/** Resolve current prices and selected slots before a buyer can submit. */
export async function quotePublicCart(input, api) {
  const restriction = onlineCheckoutRestriction(input.items, input.paymentMethod);
  if (restriction) throw new Error(restriction);
  const products = input.items.filter((item) => item.kind === 'product');
  const services = input.items.filter((item) => item.kind === 'service');
  const [productQuote, serviceQuotes] = await Promise.all([
    products.length ? api.quotePublicCommerce({ slug: input.slug, kind: 'product', items: products,
      client: input.client, paymentMethod: input.paymentMethod }) : null,
    Promise.all(services.map(async (item) => {
      const args = { slug: input.slug, kind: 'service', serviceId: item.serviceId,
        variantId: item.variantId, countryCode: input.countryCode };
      const [quote, slots] = await Promise.all([
        api.quotePublicCommerce(args),
        api.getPublicServiceAvailability({ ...args, dateKey: item.dateKey })
      ]);
      if (!Array.isArray(slots) || !slots.some((slot) => slot.available !== false && slot.time === item.time)) {
        throw new Error('A selected booking time is no longer available. Return to review and choose another time.');
      }
      return { ...quote, lineKey: item.lineKey };
    }))
  ]);
  const quotes = [productQuote, ...serviceQuotes].filter(Boolean);
  if (!quotes.length || quotes.some((quote) => !quote.ok || !Number.isSafeInteger(quote.amountInCents) || quote.amountInCents < 0 || !quote.quoteRevision || !Number.isSafeInteger(quote.revision))) {
    throw new Error('The business could not confirm a current checkout quote. Please refresh and try again.');
  }
  if (new Set(quotes.map((quote) => quote.currency)).size !== 1) throw new Error('These items require separate checkouts because their currencies differ.');
  if (ONLINE_CHECKOUT_METHODS.includes(input.paymentMethod) && quotes.reduce((sum, quote) => sum + quote.amountInCents, 0) === 0) {
    throw new Error('This request has no payable amount yet. Choose an available manual payment option to request it.');
  }
  return { productQuote, serviceQuotes, currency: quotes[0].currency,
    amountInCents: quotes.reduce((sum, quote) => sum + quote.amountInCents, 0),
    shippingAmountInCents: productQuote?.shippingAmountInCents || 0 };
}

export function quoteRevisionPayload(quote) {
  if (!quote?.quoteRevision || !Number.isSafeInteger(quote.revision)) throw new Error('Refresh the checkout quote before submitting.');
  return { expectedQuoteRevision: quote.quoteRevision, expectedCatalogRevision: quote.revision };
}

const recoveryKey = (slug) => `bab-payment-recovery:${slug}`;
export function saveCheckoutRecovery(storage, recovery) {
  if (!recovery?.sourceId || !recovery.slug) return;
  // Store only confirmed references and public labels, never buyer details or credentials.
  const record = { slug: recovery.slug, sourceId: recovery.sourceId, sourceType: recovery.sourceType,
    paymentMethod: recovery.paymentMethod, createdAt: Date.now(),
    result: recovery.sourceType === 'order' ? { order: { id: recovery.sourceId }, bookings: [] }
      : { order: null, bookings: [{ id: recovery.sourceId, serviceId: recovery.serviceId || '', serviceName: recovery.serviceName || '' }] } };
  try { storage?.setItem(recoveryKey(record.slug), JSON.stringify(record)); } catch { /* Browser storage can be disabled. */ }
  return record;
}
export function readCheckoutRecovery(storage, slug) {
  try {
    const record = JSON.parse(storage?.getItem(recoveryKey(slug)) || 'null');
    if (!record || record.slug !== slug || !/^[a-zA-Z0-9_-]{1,128}$/.test(record.sourceId || '') ||
      !['order', 'booking'].includes(record.sourceType) || !ONLINE_CHECKOUT_METHODS.includes(record.paymentMethod) ||
      !Number.isFinite(record.createdAt) || Date.now() - record.createdAt > 48 * 60 * 60 * 1000) return null;
    return record;
  } catch { return null; }
}
export function clearCheckoutRecovery(storage, slug) {
  try { storage?.removeItem(recoveryKey(slug)); } catch { /* Browser storage can be disabled. */ }
}
