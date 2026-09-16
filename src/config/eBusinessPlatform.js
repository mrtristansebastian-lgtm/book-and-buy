/** Public Home / Book / Buy / Social surface — owner-facing product name. */
export const E_BUSINESS_PLATFORM_NAME = 'E-Business Platform';
export const E_BUSINESS_PLATFORM_SHORT = 'E-Business Platform';

/** Public page ids shown to customers (studio order matches profile rail). */
export const E_BUSINESS_PAGES = [
  { id: 'home', label: 'Home', path: '' },
  { id: 'social', label: 'Social', path: '/social' },
  { id: 'book', label: 'Book', path: '/book' },
  { id: 'buy', label: 'Buy', path: '/buy' },
  { id: 'cart', label: 'Cart', path: '/cart' },
  { id: 'checkout', label: 'Checkout', path: '/checkout' },
  { id: 'success', label: 'Success', path: '/success' }
];

/** Checkout mockup surfaces — studio preview only, not public rail tabs. */
export const E_BUSINESS_PREVIEW_ONLY_PAGES = new Set(['cart', 'checkout', 'success']);

/** Cart / Checkout / Success step tabs inside the Cart & checkout studio. */
export const E_BUSINESS_CHECKOUT_STUDIO_STEPS = [
  { id: 'cart', label: 'Cart' },
  { id: 'checkout', label: 'Checkout' },
  { id: 'success', label: 'Success' }
];

/** Home cannot be turned off — always part of the public surface. */
export const isHomePageAlwaysVisible = (pageId) =>
  String(pageId || '').trim().toLowerCase() === 'home';

/** Map profile-rail tab ids onto website.pages keys. */
export const railTabToPageId = (tabId) => {
  const id = String(tabId || 'home').trim().toLowerCase();
  if (id === 'content' || id === 'social') return 'social';
  if (id === 'book' || id === 'buy' || id === 'home') return id;
  return 'home';
};

export const isPublicPageEnabled = (pages = {}, pageId) => {
  const id = String(pageId || '').trim().toLowerCase();
  if (isHomePageAlwaysVisible(id)) return true;
  if (E_BUSINESS_PREVIEW_ONLY_PAGES.has(id)) return true;
  if (id === 'content') return pages.social !== false;
  if (id === 'buy' || id === 'shop') return pages.buy !== false && pages.shop !== false;
  return pages[id] !== false;
};

export const isEBusinessPreviewOnlyPage = (pageId) =>
  E_BUSINESS_PREVIEW_ONLY_PAGES.has(String(pageId || '').trim().toLowerCase());

/** Resolve a requested public page to a visible one (disabled → home). */
export const resolveVisiblePublicPage = (pages = {}, pageId = 'home') => {
  const id = String(pageId || 'home').trim().toLowerCase();
  if (isEBusinessPreviewOnlyPage(id)) return id;
  if (isPublicPageEnabled(pages, id)) return id === 'shop' ? 'buy' : id === 'content' ? 'social' : id;
  return 'home';
};
