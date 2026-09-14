/** Public Home / Book / Buy / Content surface — owner-facing product name. */
export const E_BUSINESS_PLATFORM_NAME = 'Business Platforms';
export const E_BUSINESS_PLATFORM_SHORT = 'Business Platforms';

/** Public page ids shown to customers (studio order matches profile rail). */
export const E_BUSINESS_PAGES = [
  { id: 'home', label: 'Home', path: '' },
  { id: 'social', label: 'Content', path: '/social' },
  { id: 'book', label: 'Book', path: '/book' },
  { id: 'buy', label: 'Buy', path: '/buy' }
];

export const isPublicPageEnabled = (pages = {}, pageId) => {
  if (pageId === 'buy') return pages.buy !== false && pages.shop !== false;
  return pages[pageId] !== false;
};
