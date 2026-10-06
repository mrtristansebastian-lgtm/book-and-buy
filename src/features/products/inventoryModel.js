const DEFAULT_LOW_STOCK_THRESHOLD = 3;
const MAX_SAFE_QUANTITY = BigInt(Number.MAX_SAFE_INTEGER);
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const cleanText = (value) => String(value ?? '').trim();
const searchText = (value) => cleanText(value).normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const emptyCounts = () => ({ out: 0, low: 0, healthy: 0, unset: 0 });

/** Stock is counted in whole units. Blank and invalid legacy values stay unknown. */
export function parseInventoryQuantity(value) {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0 ? value : null;
  if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) return null;
  const quantity = Number(value.trim());
  return Number.isSafeInteger(quantity) && quantity >= 0 ? quantity : null;
}

/** An unset variant threshold inherits its product's threshold. Zero is valid. */
export function getInventoryThreshold(source = {}, inherited = DEFAULT_LOW_STOCK_THRESHOLD) {
  return parseInventoryQuantity(source?.lowStockThreshold)
    ?? parseInventoryQuantity(inherited)
    ?? DEFAULT_LOW_STOCK_THRESHOLD;
}

export function getInventoryStockState(quantity, threshold = DEFAULT_LOW_STOCK_THRESHOLD) {
  const count = parseInventoryQuantity(quantity);
  if (count == null) return 'unset';
  if (count === 0) return 'out';
  return count <= getInventoryThreshold({}, threshold) ? 'low' : 'healthy';
}

function stockTotals(units) {
  const counts = emptyCounts();
  let knownTotal = 0n;
  let missingSkuCount = 0;
  for (const unit of units) {
    counts[unit.stockState] += 1;
    if (unit.quantity != null) knownTotal += BigInt(unit.quantity);
    if (!unit.sku) missingSkuCount += 1;
  }
  const quantityComplete = counts.unset === 0;
  const hasQuantityOverflow = knownTotal > MAX_SAFE_QUANTITY;
  const knownStockQty = hasQuantityOverflow ? null : Number(knownTotal);
  const knownStockText = knownTotal.toString();
  return {
    counts,
    unitCount: units.length,
    attentionCount: counts.out + counts.low,
    missingSkuCount,
    quantityComplete,
    hasQuantityOverflow,
    knownStockQty,
    knownStockText,
    totalStockQty: quantityComplete ? knownStockQty : null,
    totalStockText: quantityComplete ? knownStockText : null,
    // A single depleted option remains visible even when the product total is high.
    stockState: counts.out ? 'out' : counts.low ? 'low' : counts.unset ? 'unset' : 'healthy'
  };
}

export function buildInventoryRows(products = []) {
  return (Array.isArray(products) ? products : []).filter(Boolean).map((product, index) => {
    const id = cleanText(product.id) || `inventory-product-${index}`;
    const name = cleanText(product.name) || 'Untitled product';
    const category = cleanText(product.category || product.mainCategory);
    const sku = cleanText(product.sku);
    const rawStatus = cleanText(product.status).toLowerCase();
    const status = ['active', 'draft', 'archived'].includes(rawStatus)
      ? rawStatus : product.active === false ? 'draft' : 'active';
    const threshold = getInventoryThreshold(product);
    const variants = Array.isArray(product.variants) ? product.variants.filter(Boolean) : [];
    const hasVariants = variants.length > 0;
    const sources = hasVariants ? variants : [product];
    const units = sources.map((source, unitIndex) => {
      const quantity = parseInventoryQuantity(source.stockAvailable);
      const lowStockThreshold = hasVariants ? getInventoryThreshold(source, threshold) : threshold;
      const variantId = hasVariants ? cleanText(source.id) || null : null;
      const title = hasVariants
        ? cleanText(source.title) || Object.values(source.optionValues || {}).map(cleanText).filter(Boolean).join(' / ') || `Variant ${unitIndex + 1}`
        : name;
      return {
        id: hasVariants ? `${id}:${variantId || `variant-${unitIndex}`}` : `${id}:product`,
        productId: id,
        variantId,
        title,
        sku: cleanText(source.sku),
        quantity,
        lowStockThreshold,
        stockState: getInventoryStockState(quantity, lowStockThreshold),
        available: source.available !== false,
        source
      };
    });
    const haystack = searchText([
      name, sku, category, product.vendor, product.productType,
      ...(Array.isArray(product.tags) ? product.tags : []),
      ...units.flatMap((unit) => [unit.sku, unit.title])
    ].filter(Boolean).join(' '));
    return {
      id, name, category, sku, status, product, hasVariants, units,
      lowStockThreshold: threshold,
      searchText: haystack,
      sourceIndex: index,
      ...stockTotals(units)
    };
  });
}

/** Counts describe stock lines (each variant or plain product), not invented reservations. */
export function summarizeInventory(rows = []) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const totals = stockTotals(safeRows.flatMap((row) => row.units));
  return {
    ...totals,
    productCount: safeRows.length,
    attentionProducts: safeRows.filter((row) => row.attentionCount > 0).length,
    outProducts: safeRows.filter((row) => row.counts.out > 0).length,
    lowProducts: safeRows.filter((row) => row.counts.low > 0).length,
    unsetProducts: safeRows.filter((row) => row.counts.unset > 0).length,
    healthyProducts: safeRows.filter((row) => row.stockState === 'healthy').length
  };
}

/** One table row per SKU/variant makes large inventories individually actionable. */
export function flattenInventoryRows(rows = []) {
  return rows.flatMap((row) => row.units.map((unit, unitIndex) => ({
    ...unit,
    name: row.name,
    variantTitle: row.hasVariants ? unit.title : '',
    category: row.category,
    status: row.status,
    hasVariants: row.hasVariants,
    product: row.product,
    sourceIndex: row.sourceIndex,
    unitIndex,
    searchText: searchText([
      row.name, row.category, row.product.vendor, row.product.productType,
      ...(Array.isArray(row.product.tags) ? row.product.tags : []),
      unit.sku, row.hasVariants ? unit.title : ''
    ].filter(Boolean).join(' '))
  })));
}

export function matchesInventoryUnitFilter(unit, filterId = 'all') {
  if (filterId === 'attention') return unit.stockState === 'out' || unit.stockState === 'low';
  if (filterId === 'out' || filterId === 'low' || filterId === 'unset') return unit.stockState === filterId;
  if (filterId === 'healthy' || filterId === 'in') return unit.stockState === 'healthy';
  if (filterId === 'nosku') return !unit.sku;
  return true;
}

export function selectInventoryUnits(units = [], { query = '', filterId = 'all', category = '', sort = 'attention' } = {}) {
  const tokens = searchText(query).split(/\s+/).filter(Boolean);
  return units.filter((unit) => matchesInventoryUnitFilter(unit, filterId)
    && (!category || unit.category === category)
    && tokens.every((token) => unit.searchText.includes(token)))
    .sort((a, b) => {
      let order = 0;
      if (sort === 'attention') order = severity[a.stockState] - severity[b.stockState];
      else if (sort === 'quantity-low' || sort === 'quantity-high') {
        if (a.quantity == null && b.quantity != null) order = 1;
        else if (a.quantity != null && b.quantity == null) order = -1;
        else if (a.quantity != null && b.quantity != null) order = (a.quantity - b.quantity) * (sort === 'quantity-high' ? -1 : 1);
      } else if (sort === 'sku') {
        order = (!a.sku && b.sku ? 1 : a.sku && !b.sku ? -1 : 0) || collator.compare(a.sku, b.sku);
      }
      return order || collator.compare(a.name, b.name) || collator.compare(a.variantTitle, b.variantTitle)
        || collator.compare(a.id, b.id) || a.sourceIndex - b.sourceIndex || a.unitIndex - b.unitIndex;
    });
}

const csvCell = (value, textCell = true) => {
  let text = String(value ?? '');
  // Quote boundaries alone do not stop spreadsheet software executing a formula.
  if (textCell && (/^\s*[=+\-@]/u.test(text) || /^\s*[\t\r\n]/u.test(text))) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

export function inventoryCsv(units = []) {
  const labels = { out: 'Out of stock', low: 'Low stock', healthy: 'In stock', unset: 'Quantity unset' };
  const header = ['Product', 'Variant', 'SKU', 'Category', 'Product status', 'Quantity', 'Low-stock warning threshold', 'Stock status'];
  const lines = [header.map((cell) => csvCell(cell)).join(',')];
  for (const unit of units) {
    const quantity = parseInventoryQuantity(unit.quantity);
    const threshold = parseInventoryQuantity(unit.lowStockThreshold);
    lines.push([
      csvCell(unit.name), csvCell(unit.variantTitle), csvCell(unit.sku), csvCell(unit.category), csvCell(unit.status),
      csvCell(quantity == null ? '' : quantity, false),
      csvCell(threshold == null ? '' : threshold, false),
      csvCell(labels[unit.stockState] || 'Quantity unset')
    ].join(','));
  }
  return `${lines.join('\r\n')}\r\n`;
}

export function inventoryCategories(rows = []) {
  const categories = new Map();
  for (const row of rows) {
    const value = row.category;
    if (!value) continue;
    categories.set(value, (categories.get(value) || 0) + 1);
  }
  return [...categories].map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => collator.compare(a.label, b.label));
}

export function matchesInventoryFilter(row, filterId = 'all') {
  if (filterId === 'attention') return row.attentionCount > 0;
  if (filterId === 'out') return row.counts.out > 0;
  if (filterId === 'low') return row.counts.low > 0;
  if (filterId === 'healthy' || filterId === 'in') return row.stockState === 'healthy';
  if (filterId === 'unset') return row.counts.unset > 0;
  if (filterId === 'nosku') return row.missingSkuCount > 0;
  return true;
}

const severity = { out: 0, low: 1, unset: 2, healthy: 3 };
function compareQuantity(a, b, descending) {
  // Unknown quantities always follow known quantities, in either direction.
  if (!a.quantityComplete && b.quantityComplete) return 1;
  if (a.quantityComplete && !b.quantityComplete) return -1;
  const left = BigInt(a.knownStockText);
  const right = BigInt(b.knownStockText);
  return left === right ? 0 : (left < right ? -1 : 1) * (descending ? -1 : 1);
}

export function selectInventoryRows(rows = [], { query = '', filterId = 'all', category = '', sort = 'attention' } = {}) {
  const tokens = searchText(query).split(/\s+/).filter(Boolean);
  return rows.filter((row) => matchesInventoryFilter(row, filterId)
    && (!category || row.category === category)
    && tokens.every((token) => row.searchText.includes(token)))
    .sort((a, b) => {
      let order = 0;
      if (sort === 'attention') order = severity[a.stockState] - severity[b.stockState] || b.attentionCount - a.attentionCount;
      else if (sort === 'quantity-low') order = compareQuantity(a, b, false);
      else if (sort === 'quantity-high') order = compareQuantity(a, b, true);
      else if (sort === 'sku') order = collator.compare(a.sku || a.units.find((unit) => unit.sku)?.sku || '', b.sku || b.units.find((unit) => unit.sku)?.sku || '');
      return order || collator.compare(a.name, b.name) || collator.compare(a.id, b.id) || a.sourceIndex - b.sourceIndex;
    });
}

/** Only the current page is mounted, with a bounded page size for large catalogs. */
export function paginatedInventory(rows = [], { page = 1, pageSize = 25 } = {}) {
  const parsedSize = parseInventoryQuantity(pageSize);
  const size = Math.min(100, Math.max(1, parsedSize || 25));
  const pageCount = Math.max(1, Math.ceil(rows.length / size));
  const currentPage = Math.min(pageCount, Math.max(1, parseInventoryQuantity(page) || 1));
  const startIndex = (currentPage - 1) * size;
  const items = rows.slice(startIndex, startIndex + size);
  return {
    items, page: currentPage, pageSize: size, pageCount,
    total: rows.length,
    from: rows.length ? startIndex + 1 : 0,
    to: startIndex + items.length
  };
}
