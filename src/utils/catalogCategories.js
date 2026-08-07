/**
 * Resolve the business-set category label for a catalog item.
 */
export function getCatalogCategory(item = {}, fallback = '') {
  const value = String(item.category || item.mainCategory || '').trim();
  return value || fallback;
}

/**
 * Unique category tabs for a catalog list. Always includes "All".
 */
export function buildCatalogCategoryTabs(items = []) {
  const seen = new Map();
  for (const item of items) {
    const label = getCatalogCategory(item);
    if (!label) continue;
    const key = label.toLowerCase();
    if (!seen.has(key)) seen.set(key, label);
  }

  const categories = [...seen.values()].sort((a, b) => a.localeCompare(b));
  return [
    { id: 'all', label: 'All' },
    ...categories.map((label) => ({ id: label.toLowerCase(), label }))
  ];
}

export function filterCatalogByCategory(items = [], categoryId = 'all') {
  if (!categoryId || categoryId === 'all') return items;
  const needle = String(categoryId).toLowerCase();
  return items.filter(
    (item) => getCatalogCategory(item).toLowerCase() === needle
  );
}
