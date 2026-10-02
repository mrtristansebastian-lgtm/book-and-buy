/** Backward-compatible market settings. Country selection is explicit, never inferred from IP. */
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
    website: { ...workspace.website, buyerCountryCode: countryCode } };
}
