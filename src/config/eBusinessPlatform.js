/** Public Home / Book / Buy / Business Blog surface — owner-facing product name. */
export const E_BUSINESS_PLATFORM_NAME = 'Business Platforms';
export const E_BUSINESS_PLATFORM_SHORT = 'Business Platforms';

/** Public page ids shown to customers. */
export const E_BUSINESS_PAGES = [
  { id: 'home', label: 'Home', path: '' },
  { id: 'book', label: 'Book', path: '/book' },
  { id: 'buy', label: 'Buy', path: '/buy' },
  { id: 'social', label: 'Business Blog', path: '/social' }
];

export const isPublicPageEnabled = (pages = {}, pageId) => {
  if (pageId === 'buy') return pages.buy !== false && pages.shop !== false;
  return pages[pageId] !== false;
};
