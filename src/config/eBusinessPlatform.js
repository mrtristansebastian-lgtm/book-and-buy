/** Public Home / Book / Buy / Social surface — owner-facing product name. */
export const E_BUSINESS_PLATFORM_NAME = 'E-Business Platform';
export const E_BUSINESS_PLATFORM_SHORT = 'E-Business';

/** Public page ids shown to customers. */
export const E_BUSINESS_PAGES = [
  { id: 'home', label: 'Home', path: '' },
  { id: 'book', label: 'Book', path: '/book' },
  { id: 'buy', label: 'Buy', path: '/buy' },
  { id: 'social', label: 'Social', path: '/social' }
];

export const isPublicPageEnabled = (pages = {}, pageId) => {
  if (pageId === 'buy') return pages.buy !== false && pages.shop !== false;
  return pages[pageId] !== false;
};
