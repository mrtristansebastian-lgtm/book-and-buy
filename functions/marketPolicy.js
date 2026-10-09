/** Backward-compatible market settings. Country selection is explicit, never inferred from IP. */
import { isEnquiryListing } from './listingTypes.js';
export function getMarkets(website = {}) {
  if (Array.isArray(website.markets)) return website.markets;
  return (website.servesCountries || []).map((countryCode) => ({
    id: countryCode, countryCode, enabled: true, catalogMode: 'all',
    productIds: [], variantKeys: [], serviceIds: [], shippingProfileIds: []
  }));
}

export function marketPatch(markets) {
  return { markets, servesCountries: markets.filter((market) => market.enabled).map((market) => market.countryCode) };
}

export function resolveMarket(website, countryCode) {
  const markets = getMarkets(website);
  const exact = markets.find((market) => market.countryCode === String(countryCode || '').toUpperCase());
  return exact || markets.find((market) => market.countryCode === '*') || null;
}

export function catalogAllowed(market, kind, id, variantId = '') {
  if (!market?.enabled) return false;
  if (market.catalogMode !== 'selected') return true;
  if (kind === 'service') return (market.serviceIds || []).includes(id);
  return (market.productIds || []).includes(id) || (variantId
    ? (market.variantKeys || []).includes(`${id}:${variantId}`)
    : (market.variantKeys || []).some((key) => key.startsWith(`${id}:`)));
}

export function profileApplies(profile, item) {
  return profile.enabled !== false && (profile.productMode !== 'selected'
    || (profile.productIds || []).includes(item.productId)
    || (profile.variantKeys || []).includes(`${item.productId}:${item.variantId || ''}`));
}

/** Never expose the internal profile name to a customer. */
export function shippingDisplayName(profile) {
  return String(profile?.customerFacingName || '').trim() || 'Delivery';
}

/** Each matching profile is charged once per order; mixed-profile orders add their rates. */
export function shippingQuote(website, countryCode, items = [], subtotalCents = 0) {
  if (!/^[A-Z]{2}$/.test(String(countryCode || ''))) throw new Error('Choose a country before checkout.');
  const market = resolveMarket(website, countryCode);
  if (!market?.enabled) throw new Error('This business does not sell to the selected country.');
  if (items.some((item) => !catalogAllowed(market, 'product', item.productId, item.variantId))) {
    throw new Error('One or more products are not available in this market.');
  }
  const profiles = (website.shippingProfiles || []).filter((profile) =>
    (market.shippingProfileIds || []).includes(profile.id) && profile.enabled !== false);
  const used = new Map();
  for (const item of items) {
    const matches = profiles.filter((profile) => profileApplies(profile, item));
    // Specific profiles override an all-product default; ambiguity is never silently priced.
    const specific = matches.filter((profile) => profile.productMode === 'selected');
    const candidates = specific.length ? specific : matches;
    if (candidates.length !== 1) throw new Error(candidates.length
      ? 'Shipping profiles overlap for this product. Please contact the business.'
      : 'Shipping is not available for one or more products in this country.');
    used.set(candidates[0].id, candidates[0]);
  }
  const amountInCents = [...used.values()].reduce((sum, profile) => {
    const rate = Number(profile.rateCents);
    if (!Number.isSafeInteger(rate) || rate < 0) throw new Error('The shipping rate needs to be corrected by the business.');
    const threshold = Number(profile.freeAboveCents);
    return sum + (profile.freeAboveCents != null && Number.isSafeInteger(threshold)
      && threshold > 0 && subtotalCents >= threshold ? 0 : rate);
  }, 0);
  return { amountInCents, profileIds: [...used.keys()] };
}

export function filterWorkspaceForMarket(workspace, countryCode) {
  if (!Array.isArray(workspace.website?.markets)) return workspace;
  const market = countryCode ? resolveMarket(workspace.website, countryCode) : null;
  const products = (workspace.products || []).filter((item) => catalogAllowed(market, 'product', item.id))
    .map((item) => ({ ...item, variants: (item.variants || []).filter((variant) => catalogAllowed(market, 'product', item.id, variant.id)) }));
  return { ...workspace, products,
    services: (workspace.services || []).filter((item) => catalogAllowed(market, 'service', item.id)),
    website: { ...workspace.website, buyerCountryCode: countryCode,
      catalogAvailability: !countryCode ? 'country-required' : !market?.enabled ? 'country-disabled' : 'available' } };
}

/** Setup diagnostics only. Checkout continues to enforce shippingQuote on the server. */
export function marketReadiness(workspace, market) {
  const products = (workspace.products || []).filter((item) => item.active !== false
    && !['draft', 'archived'].includes(item.status) && catalogAllowed({ ...market, enabled: true }, 'product', item.id));
  const services = (workspace.services || []).filter((item) => item.active !== false
    && catalogAllowed({ ...market, enabled: true }, 'service', item.id));
  const profiles = (workspace.website?.shippingProfiles || []).filter((profile) =>
    profile.enabled !== false && (market.shippingProfileIds || []).includes(profile.id));
  const uncovered = products.filter((product) => {
    if (isEnquiryListing(product)) return false;
    const variants = (product.variants || []).filter((variant) => variant.available !== false
      && catalogAllowed({ ...market, enabled: true }, 'product', product.id, variant.id));
    const items = variants.length ? variants.map((variant) => ({ productId: product.id, variantId: variant.id })) : [{ productId: product.id }];
    return items.some((item) => {
      const matches = profiles.filter((profile) => profileApplies(profile, item));
      const specific = matches.filter((profile) => profile.productMode === 'selected');
      const candidates = specific.length ? specific : matches;
      return candidates.length !== 1 || !Number.isSafeInteger(Number(candidates[0].rateCents)) || Number(candidates[0].rateCents) < 0;
    });
  });
  return { productCount: products.length, serviceCount: services.length,
    emptyCatalog: products.length + services.length === 0, shippingIssues: uncovered.length };
}
