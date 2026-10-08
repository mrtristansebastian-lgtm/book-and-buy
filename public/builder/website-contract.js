// Website contract v1. Keep the browser companion in public/builder in sync.
const WEBSITE_CONTRACT_VERSION = 1;
const WEBSITE_ACTIONS = Object.freeze(['catalog.get', 'quote.get', 'availability.get', 'cart.get', 'cart.add', 'cart.remove', 'cart.updateQuantity', 'cart.open', 'cart.close', 'product.open', 'service.open', 'booking.select', 'booking.date', 'booking.slot', 'booking.create', 'checkout.create', 'checkout.status', 'payment.start', 'payment.confirm']);
const bindings = new Set(['product.name', 'product.price', 'product.image', 'product.description', 'product.available', 'service.name', 'service.price', 'service.image', 'service.description', 'service.duration', 'cart.count', 'cart.total']);
const decode = value => String(value).replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

function readWebsiteBindings(html) {
  if (typeof html !== 'string' || html.length > 2_000_000) throw new Error('Website source is missing or too large.');
  // Skip raw text and comments before reading tags so scripts cannot invent bindings.
  const source = html.replace(/<!--[\s\S]*?-->|<(script|style|textarea)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  const records = [];
  for (const match of source.matchAll(/<([a-z][\w:-]*)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi)) {
    const attrs = {};
    for (const attribute of match[2].matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s'"=<>`]+)))?/g)) {
      const key = attribute[1].toLowerCase();
      if (Object.hasOwn(attrs, key) && key.startsWith('data-bb-')) throw new Error('Duplicate Book & Buy binding attributes are not allowed.');
      attrs[key] = decode(attribute[2] ?? attribute[3] ?? attribute[4] ?? '');
    }
    const commerce = Object.fromEntries(Object.entries(attrs).filter(([key]) => ['data-bb-product-id', 'data-bb-service-id', 'data-bb-action', 'data-bb-bind', 'data-bb-catalog'].includes(key)));
    if (Object.keys(commerce).length) records.push({ id: attrs['data-bb-id'] || '', ...commerce });
  }
  return records;
}

function validateWebsiteBindings(html, catalog, { previousHtml = '', preserve = false } = {}) {
  const records = readWebsiteBindings(html);
  const products = new Set((catalog?.products || []).map(item => String(item.id)));
  const services = new Set((catalog?.services || []).map(item => String(item.id)));
  for (const row of records) {
    if (row['data-bb-product-id'] && !products.has(row['data-bb-product-id'])) throw new Error('Connect an active Book & Buy product: ' + row['data-bb-product-id']);
    if (row['data-bb-service-id'] && !services.has(row['data-bb-service-id'])) throw new Error('Connect an active Book & Buy service: ' + row['data-bb-service-id']);
    if (row['data-bb-action'] && !WEBSITE_ACTIONS.includes(row['data-bb-action'])) throw new Error('Unsupported Book & Buy action: ' + row['data-bb-action']);
    if (row['data-bb-bind'] && !bindings.has(row['data-bb-bind'])) throw new Error('Unsupported Book & Buy value binding: ' + row['data-bb-bind']);
    if (row['data-bb-catalog'] && !['products', 'services'].includes(row['data-bb-catalog'])) throw new Error('Connect a products or services catalog.');
  }
  if (preserve && previousHtml) {
    const next = new Set(records.map(row => JSON.stringify(Object.fromEntries(Object.entries(row).sort()))));
    for (const row of readWebsiteBindings(previousHtml)) {
      // Retired catalog items may disappear; active bindings retain their identity/behavior.
      if (row['data-bb-product-id'] && !products.has(row['data-bb-product-id']) || row['data-bb-service-id'] && !services.has(row['data-bb-service-id'])) continue;
      if (!next.has(JSON.stringify(Object.fromEntries(Object.entries(row).sort())))) throw new Error('This edit removes or changes a Book & Buy connection. Keep its item ID, action and value bindings; its layout and styling can change freely.');
    }
  }
  return { version: WEBSITE_CONTRACT_VERSION, bindings: records, products: [...new Set(records.map(row => row['data-bb-product-id']).filter(Boolean))], services: [...new Set(records.map(row => row['data-bb-service-id']).filter(Boolean))] };
}

function validateWebsiteRequest(action, payload = {}) {
  if (!WEBSITE_ACTIONS.includes(action)) throw new Error('Unsupported website action.');
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || JSON.stringify(payload).length > 40_000) throw new Error('Invalid website request.');
  // Scope is always supplied by the trusted host, never by generated website code.
  if (['ownerId', 'businessId', 'workspaceId', 'slug', 'publicSlug', 'appId'].some(key => Object.hasOwn(payload, key))) throw new Error('Website requests cannot choose a business account.');
  return payload;
}

window.BookBuyWebsiteContract = { WEBSITE_CONTRACT_VERSION, WEBSITE_ACTIONS, readWebsiteBindings, validateWebsiteBindings, validateWebsiteRequest };

