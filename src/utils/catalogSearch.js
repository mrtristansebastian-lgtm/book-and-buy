export function filterManagedCatalog(items, query = '', status = 'all') {
  const words = String(query).trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    const active = item.active !== false && (!item.status || item.status === 'active');
    if (status === 'active' && !active || status === 'hidden' && active) return false;
    const text = [item.name, item.category, item.sku, item.vendor, ...(item.tags || []), ...(item.variants || []).flatMap((variant) => [variant.title, variant.name, variant.sku])].filter(Boolean).join(' ').toLocaleLowerCase();
    return words.every((word) => text.includes(word));
  });
}
