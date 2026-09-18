import { isValidExploreCategoryPair } from '../config/businessCategories';

export const createProductId = () =>
  `product-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createVariantId = () =>
  `variant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const PRODUCT_STATUSES = new Set(['draft', 'active', 'archived']);

export const normalizeProductStatus = (product = {}) => {
  const raw = String(product.status || '').trim().toLowerCase();
  if (PRODUCT_STATUSES.has(raw)) return raw;
  if (product.active === false) return 'draft';
  return 'active';
};

const cleanStringList = (list = []) => {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(list) ? list : []) {
    const value = String(item || '').trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
};

export const normalizeProductOption = (option = {}, index = 0) => ({
  id: option.id || `option-${index + 1}`,
  name: String(option.name || `Option ${index + 1}`).trim() || `Option ${index + 1}`,
  values: cleanStringList(option.values)
});

export const variantOptionKey = (optionValues = {}) =>
  Object.keys(optionValues || {})
    .sort((a, b) => a.localeCompare(b))
    .map((key) => `${key}:${String(optionValues[key] || '').trim()}`)
    .join('|');

export const normalizeWeightUnit = (unit) => {
  const value = String(unit || 'g').toLowerCase();
  return value === 'kg' ? 'kg' : 'g';
};

export const normalizeDimensionUnit = (unit) => {
  const value = String(unit || 'cm').toLowerCase();
  if (value === 'mm' || value === 'in') return value;
  return 'cm';
};

const parseLegacySize = (size = '') => {
  const text = String(size || '').trim();
  const match = text.match(
    /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(cm|mm|in)?/i
  );
  if (!match) {
    return { length: '', width: '', height: '', dimensionUnit: 'cm' };
  }
  return {
    length: match[1],
    width: match[2],
    height: match[3],
    dimensionUnit: normalizeDimensionUnit(match[4] || 'cm')
  };
};

export const formatProductDimensions = (item = {}) => {
  const length = String(item.length ?? '').trim();
  const width = String(item.width ?? '').trim();
  const height = String(item.height ?? '').trim();
  const unit = normalizeDimensionUnit(item.dimensionUnit);
  if (length || width || height) {
    return `${[length || '—', width || '—', height || '—'].join('×')} ${unit}`;
  }
  return String(item.size || '').trim();
};

const normalizeDimensions = (source = {}) => {
  const legacy = parseLegacySize(source.size);
  const length = String(source.length ?? '').trim() || legacy.length;
  const width = String(source.width ?? '').trim() || legacy.width;
  const height = String(source.height ?? '').trim() || legacy.height;
  const dimensionUnit = normalizeDimensionUnit(
    source.dimensionUnit || legacy.dimensionUnit || 'cm'
  );
  const size =
    length || width || height
      ? `${[length || '0', width || '0', height || '0'].join('×')} ${dimensionUnit}`
      : String(source.size || '').trim();
  return { length, width, height, dimensionUnit, size };
};

export const normalizeProductVariant = (variant = {}, index = 0) => {
  const optionValues =
    variant.optionValues && typeof variant.optionValues === 'object'
      ? Object.fromEntries(
          Object.entries(variant.optionValues).map(([key, value]) => [
            String(key || '').trim(),
            String(value || '').trim()
          ])
        )
      : {};
  const dims = normalizeDimensions(variant);
  return {
    id: variant.id || createVariantId(),
    optionValues,
    price: variant.price ?? '',
    compareAtPrice: variant.compareAtPrice ?? '',
    cost: variant.cost ?? '',
    sku: String(variant.sku || '').trim(),
    stockAvailable: variant.stockAvailable ?? '',
    weight: variant.weight ?? '',
    weightUnit: normalizeWeightUnit(variant.weightUnit),
    ...dims,
    imageUrl: String(variant.imageUrl || '').trim(),
    available: variant.available !== false,
    title:
      String(variant.title || '').trim() ||
      Object.values(optionValues).filter(Boolean).join(' / ') ||
      `Variant ${index + 1}`
  };
};

const cartesian = (lists) => {
  if (!lists.length) return [[]];
  return lists.reduce(
    (acc, list) => acc.flatMap((prefix) => list.map((item) => [...prefix, item])),
    [[]]
  );
};

/**
 * Build / refresh the variant matrix from options, preserving existing
 * price / SKU / stock when option value combos still match.
 */
export const buildVariantMatrix = (
  options = [],
  existingVariants = [],
  defaults = {}
) => {
  const normalizedOptions = (Array.isArray(options) ? options : [])
    .map(normalizeProductOption)
    .filter((option) => option.name && option.values.length)
    .slice(0, 3);

  if (!normalizedOptions.length) return [];

  const existingByKey = new Map(
    (Array.isArray(existingVariants) ? existingVariants : []).map((variant) => {
      const normalized = normalizeProductVariant(variant);
      return [variantOptionKey(normalized.optionValues), normalized];
    })
  );

  const combos = cartesian(
    normalizedOptions.map((option) =>
      option.values.map((value) => ({ name: option.name, value }))
    )
  );

  return combos.map((combo, index) => {
    const optionValues = Object.fromEntries(
      combo.map((entry) => [entry.name, entry.value])
    );
    const key = variantOptionKey(optionValues);
    const prior = existingByKey.get(key);
    if (prior) {
      return {
        ...prior,
        optionValues,
        title: Object.values(optionValues).join(' / ')
      };
    }
    return normalizeProductVariant(
      {
        optionValues,
        price: defaults.price ?? '',
        compareAtPrice: defaults.compareAtPrice ?? '',
        sku: defaults.sku ?? '',
        stockAvailable: defaults.stockAvailable ?? '',
        weight: defaults.weight ?? '',
        weightUnit: defaults.weightUnit ?? 'g',
        length: defaults.length ?? '',
        width: defaults.width ?? '',
        height: defaults.height ?? '',
        dimensionUnit: defaults.dimensionUnit ?? 'cm',
        size: defaults.size ?? '',
        available: true
      },
      index
    );
  });
};

export const productHasVariants = (product = {}) =>
  Array.isArray(product.variants) && product.variants.length > 0;

export const getProductUnitPriceCents = (product = {}, variant = null) => {
  if (product.quoteBased || product.priceType === 'quote') return 0;
  const source = variant?.price ?? product.price;
  const digits = String(source ?? '').replace(/[^\d.]/g, '');
  const value = Number(digits);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
};

/** Unit cost in cents — set on Stock for profit analytics. */
export const getProductUnitCostCents = (product = {}, variant = null) => {
  const source = variant?.cost ?? product.cost;
  const digits = String(source ?? '').replace(/[^\d.]/g, '');
  const value = Number(digits);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
};

export const formatCents = (cents = 0, currency = 'R') =>
  `${currency}${(Number(cents || 0) / 100).toFixed(0)}`;

export const findVariantBySelections = (product = {}, selections = {}) => {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (!variants.length) return null;
  const options = (Array.isArray(product.options) ? product.options : []).map(
    normalizeProductOption
  );
  const needed = options.filter((option) => option.values.length);
  if (!needed.length) return normalizeProductVariant(variants[0]);

  return (
    variants
      .map(normalizeProductVariant)
      .find((variant) =>
        needed.every(
          (option) =>
            String(variant.optionValues?.[option.name] || '').trim() ===
            String(selections?.[option.name] || '').trim()
        )
      ) || null
  );
};

export const getProductPriceRangeCents = (product = {}) => {
  if (product.quoteBased || product.priceType === 'quote') {
    return { min: 0, max: 0, hasRange: false };
  }
  if (!productHasVariants(product)) {
    const cents = getProductUnitPriceCents(product);
    return { min: cents, max: cents, hasRange: false };
  }
  const amounts = product.variants
    .map((variant) => getProductUnitPriceCents(product, variant))
    .filter((cents) => cents > 0);
  if (!amounts.length) {
    const cents = getProductUnitPriceCents(product);
    return { min: cents, max: cents, hasRange: false };
  }
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  return { min, max, hasRange: min !== max };
};

export const normalizeProduct = (product = {}, index = 0) => {
  const status = normalizeProductStatus(product);
  const options = (Array.isArray(product.options) ? product.options : [])
    .map(normalizeProductOption)
    .filter((option) => option.name)
    .slice(0, 3);
  const hasOptionValues = options.some((option) => option.values.length);
  const variants = hasOptionValues
    ? buildVariantMatrix(options, product.variants || [], {
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        cost: product.cost,
        sku: product.sku,
        stockAvailable: product.stockAvailable,
        weight: product.weight,
        weightUnit: product.weightUnit,
        length: product.length,
        width: product.width,
        height: product.height,
        dimensionUnit: product.dimensionUnit,
        size: product.size
      })
    : [];

  const dims = normalizeDimensions(product);
  const exploreMainCategoryId = String(product.exploreMainCategoryId || '').trim();
  const exploreSubcategoryId = String(product.exploreSubcategoryId || '').trim();
  const hasExploreCategory = isValidExploreCategoryPair(
    exploreMainCategoryId,
    exploreSubcategoryId,
    'buy'
  );

  return {
    ...product,
    id: product.id || createProductId(),
    name: product.name || `Product ${index + 1}`,
    description: product.description || '',
    price: product.price ?? '',
    compareAtPrice: product.compareAtPrice ?? '',
    cost: product.cost ?? '',
    currency: product.currency || 'R',
    priceType: product.quoteBased ? 'quote' : product.priceType || 'fixed',
    quoteBased: Boolean(product.quoteBased || product.priceType === 'quote'),
    category: product.category || product.mainCategory || '',
    exploreMainCategoryId: hasExploreCategory ? exploreMainCategoryId : '',
    exploreSubcategoryId: hasExploreCategory ? exploreSubcategoryId : '',
    productType: String(product.productType || '').trim(),
    vendor: String(product.vendor || '').trim(),
    tags: cleanStringList(product.tags),
    collections: cleanStringList(product.collections),
    sku: String(product.sku || '').trim(),
    stockAvailable: product.stockAvailable ?? '',
    stockLabel: product.stockLabel || '',
    hideStockOnCard: Boolean(product.hideStockOnCard),
    weight: product.weight ?? '',
    weightUnit: normalizeWeightUnit(product.weightUnit),
    ...dims,
    imageUrls: Array.isArray(product.imageUrls)
      ? product.imageUrls.map((url) => String(url || '').trim()).filter(Boolean)
      : product.image
        ? [String(product.image).trim()].filter(Boolean)
        : [],
    options,
    variants,
    status,
    active: status === 'active'
  };
};

export const normalizeProductList = (products = []) =>
  (Array.isArray(products) ? products : [])
    .map(normalizeProduct)
    .filter((product) => product.name?.trim());

const formatMoney = (amount, currency = 'R') => {
  const priceText = String(amount ?? '').trim();
  if (!priceText) return '';
  if (/[^\d\s.,-]/.test(priceText)) return priceText;
  return `${currency || 'R'}${priceText}`;
};

export const formatProductPrice = (product = {}, variant = null) => {
  if (product.quoteBased || product.priceType === 'quote') return 'Quote on request';
  if (variant) {
    return formatMoney(variant.price ?? product.price, product.currency);
  }
  if (productHasVariants(product)) {
    const range = getProductPriceRangeCents(product);
    if (range.hasRange) {
      return `from ${formatCents(range.min, product.currency || 'R')}`;
    }
    if (range.min > 0) return formatCents(range.min, product.currency || 'R');
  }
  return formatMoney(product.price, product.currency);
};

export const formatCompareAtPrice = (product = {}, variant = null) => {
  if (product.quoteBased || product.priceType === 'quote') return '';
  const amount = variant?.compareAtPrice ?? product.compareAtPrice;
  return formatMoney(amount, product.currency);
};

export const formatStockNote = (product = {}, variant = null) => {
  if (product.hideStockOnCard) return '';
  if (variant) {
    if (variant.available === false) return 'Unavailable';
    const stock = String(variant.stockAvailable ?? '').trim();
    if (!stock) return '';
    return `${stock} available`;
  }
  if (product.stockLabel) return product.stockLabel;
  if (productHasVariants(product)) {
    const stocks = product.variants
      .filter((item) => item.available !== false)
      .map((item) => Number(String(item.stockAvailable ?? '').replace(/[^\d]/g, '')))
      .filter((n) => Number.isFinite(n));
    if (!stocks.length) return '';
    const total = stocks.reduce((sum, n) => sum + n, 0);
    return total ? `${total} available` : '';
  }
  const stock = String(product.stockAvailable ?? '').trim();
  if (!stock) return '';
  return `${stock} available`;
};

export const getLineStockQty = (item = {}) => {
  const raw = String(item.stockAvailable ?? '').trim();
  if (!raw) return null;
  const n = Number(raw.replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : null;
};

export const getProductTotalStockQty = (product = {}) => {
  if (productHasVariants(product)) {
    const qtys = (product.variants || [])
      .filter((variant) => variant.available !== false)
      .map(getLineStockQty)
      .filter((n) => n != null);
    if (!qtys.length) return null;
    return qtys.reduce((sum, n) => sum + n, 0);
  }
  return getLineStockQty(product);
};

export const productMissingSku = (product = {}) => {
  if (productHasVariants(product)) {
    return (product.variants || []).some(
      (variant) => !String(variant.sku || '').trim()
    );
  }
  return !String(product.sku || '').trim();
};

export const isProductPubliclyVisible = (product = {}) => {
  const status = normalizeProductStatus(product);
  return status === 'active' && product.active !== false;
};

export const isVariantPurchasable = (product = {}, variant = null) => {
  if (product.quoteBased || product.priceType === 'quote') return false;
  if (productHasVariants(product)) {
    if (!variant) return false;
    if (variant.available === false) return false;
    const stock = String(variant.stockAvailable ?? '').trim();
    if (stock !== '' && Number(stock) <= 0) return false;
    return true;
  }
  const stock = String(product.stockAvailable ?? '').trim();
  if (stock !== '' && Number(stock) <= 0) return false;
  return true;
};

const collectLabels = (products = [], existing = [], getter) => {
  const seen = new Set();
  const out = [];
  for (const label of [
    ...(Array.isArray(existing) ? existing : []),
    ...products.flatMap((product) => getter(product) || [])
  ]) {
    const value = String(label || '').trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
};

export const collectProductCategories = (products = [], existing = []) =>
  collectLabels(products, existing, (product) => [product.category]);

export const collectProductTags = (products = [], existing = []) =>
  collectLabels(products, existing, (product) => product.tags);

export const collectProductCollections = (products = [], existing = []) =>
  collectLabels(products, existing, (product) => product.collections);
