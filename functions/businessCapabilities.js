/** Shared product-scope policy. A presence profile establishes a place without commerce. */
export const FOOD_PRESENCE_CATEGORY_IDS = Object.freeze([
  'catering', 'bakery_specialty', 'restaurants_takeaways',
  'food_bakery', 'food_pantry', 'food_prepared', 'buy_food', 'group:buy_food', 'food_drink', 'group:food_drink'
]);

const FOOD_CATEGORIES = new Set(FOOD_PRESENCE_CATEGORY_IDS);
const COMMERCE_PAGES = new Set(['book', 'buy', 'shop', 'cart', 'checkout', 'success']);
const SOCIAL_PLATFORMS = ['instagram', 'facebook', 'tiktok', 'youtube', 'linkedin', 'x'];

/** Publish only supported, usable social links; never spread arbitrary owner data. */
export function publicBusinessSocialLinks(value = {}) {
  const links = {};
  for (const platform of SOCIAL_PLATFORMS) {
    const raw = String(value?.[platform] || '').trim();
    if (!raw || raw.length > 2048) continue;
    try {
      const url = new URL(raw);
      if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) links[platform] = url.href;
    } catch { /* Incomplete draft links stay private until they are valid URLs. */ }
  }
  return links;
}

export function isFoodPresenceCategory(categoryId = '') {
  return FOOD_CATEGORIES.has(String(categoryId || '').trim().toLowerCase());
}

export function isPresenceOnlyBusiness(workspace = {}) {
  const website = workspace.website || {};
  return website.profileMode === 'presence' || workspace.profileMode === 'presence' ||
    isFoodPresenceCategory(website.categoryId || workspace.categoryId);
}

/** Preserve the owner's page choices; presence policy always takes precedence. */
export function effectivePublicPages(workspace = {}) {
  const pages = { ...(workspace.website?.pages || workspace.pages || {}) };
  return isPresenceOnlyBusiness(workspace)
    ? { ...pages, book: false, buy: false, shop: false, cart: false, checkout: false, success: false }
    : pages;
}

/** Also applies in editor previews: a direct URL must not reopen commerce. */
export function resolveBusinessPublicPage(workspace = {}, page = 'home') {
  const id = String(page || 'home').trim().toLowerCase();
  return isPresenceOnlyBusiness(workspace) && COMMERCE_PAGES.has(id) ? 'home' : id;
}

export function assertBusinessCommerceEnabled(workspace = {}) {
  if (!isPresenceOnlyBusiness(workspace)) return;
  const error = new Error('This business has a presence-only profile. Bookings, orders and payments are unavailable.');
  error.code = 'failed-precondition';
  throw error;
}
