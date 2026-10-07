import { isPublicPageEnabled } from '../../config/eBusinessPlatform.js';
import { isProductPubliclyVisible } from '../../utils/products.js';

/** Capability is determined before market filtering; a country picker must remain reachable. */
export function profileCatalog(workspace = {}) {
  const services = (workspace.services || []).filter((item) => item && item.active !== false);
  const products = (workspace.products || []).filter((item) => item && isProductPubliclyVisible(item));
  const available = workspace.profileCapabilities || { book: services.length > 0, buy: products.length > 0 };
  return {
    services, products,
    book: isPublicPageEnabled(workspace.website?.pages, 'book') && available.book,
    buy: isPublicPageEnabled(workspace.website?.pages, 'buy') && available.buy
  };
}

export function profileTabs(workspace) {
  const catalog = profileCatalog(workspace);
  return [{ id: 'home', label: 'Home' },
    ...(catalog.book ? [{ id: 'book', label: 'Book' }] : []),
    ...(catalog.buy ? [{ id: 'buy', label: 'Buy' }] : [])];
}

export function searchPublicCatalog(items, query = '') {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    const text = [item.name, item.category, item.description, ...(item.tags || [])].filter(Boolean).join(' ').toLocaleLowerCase();
    return words.every((word) => text.includes(word));
  });
}

export function sortPublicCatalog(items, order = 'featured') {
  const price = item => {
    const options = item.variants?.filter(variant => variant.active !== false) || item.packages?.filter(option => option.active !== false) || [];
    const values = options.length ? options.map(option => Number(option.price)) : [Number(item.price)];
    return Math.min(...values.filter(Number.isFinite));
  };
  if (order === 'name') return [...items].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  if (order === 'price-asc' || order === 'price-desc') return [...items].sort((a, b) => (price(a) - price(b)) * (order === 'price-desc' ? -1 : 1));
  return items;
}
