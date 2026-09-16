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

export const isPublicPageEnabled = (pages = {}, pageId) => {
  if (E_BUSINESS_PREVIEW_ONLY_PAGES.has(pageId)) return true;
  if (pageId === 'buy') return pages.buy !== false && pages.shop !== false;
  return pages[pageId] !== false;
};

export const isEBusinessPreviewOnlyPage = (pageId) =>
  E_BUSINESS_PREVIEW_ONLY_PAGES.has(String(pageId || '').trim().toLowerCase());
