export const createProductId = () =>
  `product-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const normalizeProduct = (product = {}, index = 0) => ({
  ...product,
  id: product.id || createProductId(),
  name: product.name || `Product ${index + 1}`,
  description: product.description || '',
  price: product.price ?? '',
  currency: product.currency || 'R',
  priceType: product.quoteBased ? 'quote' : product.priceType || 'fixed',
  quoteBased: Boolean(product.quoteBased || product.priceType === 'quote'),
  category: product.category || product.mainCategory || '',
  stockAvailable: product.stockAvailable ?? '',
  stockLabel: product.stockLabel || '',
  hideStockOnCard: Boolean(product.hideStockOnCard),
  imageUrls: Array.isArray(product.imageUrls)
    ? product.imageUrls
    : product.image
      ? [product.image]
      : [],
  active: product.active !== false
});

export const normalizeProductList = (products = []) =>
  (Array.isArray(products) ? products : [])
    .map(normalizeProduct)
    .filter((product) => product.name?.trim());

export const formatProductPrice = (product = {}) => {
  if (product.quoteBased || product.priceType === 'quote') return 'Quote on request';
  const priceText = String(product.price ?? '').trim();
  if (!priceText) return '';
  if (/[^\d\s.,-]/.test(priceText)) return priceText;
  return `${product.currency || 'R'}${priceText}`;
};

export const formatStockNote = (product = {}) => {
  if (product.hideStockOnCard) return '';
  if (product.stockLabel) return product.stockLabel;
  const stock = String(product.stockAvailable ?? '').trim();
  if (!stock) return '';
  return `${stock} available`;
};

export const getProductUnitPriceCents = (product = {}) => {
  if (product.quoteBased || product.priceType === 'quote') return 0;
  const digits = String(product.price ?? '').replace(/[^\d.]/g, '');
  const value = Number(digits);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
};

export const formatCents = (cents = 0, currency = 'R') =>
  `${currency}${(Number(cents || 0) / 100).toFixed(0)}`;
