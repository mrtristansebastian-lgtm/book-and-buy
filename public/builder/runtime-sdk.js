// Installed by the trusted host into each opaque-origin preview or published page.
function installBookBuyRuntime() {
  if (window.BookBuy?.version === 1) return;
  let port;
  let count = 0;
  const pending = new Map();
  const waiters = [];
  const priceCents = (item, variant) => {
    const configured = variant?.priceInCents ?? item.priceInCents;
    if (Number.isSafeInteger(configured)) return configured;
    const raw = String(variant?.price ?? item.price ?? 0).replace(/^(?:R|ZAR|USD|EUR|GBP|\$|€|£)\s*/i, '');
    return /^\d+(?:\.\d{1,2})?$/.test(raw) ? Math.round(Number(raw) * 100) : null;
  };
  function applyCatalog(catalog) {
    for (const kind of ['product', 'service']) {
      const items = catalog[kind + 's'] || [];
      for (const section of document.querySelectorAll(`[data-bb-catalog="${kind}s"]`)) {
        const template = section.querySelector('template[data-bb-template]');
        if (!template?.content.firstElementChild) continue;
        const parent = section.querySelector('[data-bb-catalog-items]') || template.parentElement;
        for (const item of items) {
          if ([...section.querySelectorAll(`[data-bb-${kind}-id]`)].some(node => node.getAttribute(`data-bb-${kind}-id`) === String(item.id))) continue;
          const card = template.content.firstElementChild.cloneNode(true);
          // Templates retain their owner's layout; only item identity and bound values change.
          card.setAttribute(`data-bb-${kind}-id`, String(item.id));
          for (const node of card.querySelectorAll(`[data-bb-${kind}-id]`)) node.setAttribute(`data-bb-${kind}-id`, String(item.id));
          const identities = new Map();
          for (const node of [card, ...card.querySelectorAll('[id]')]) if (node.id) { const previous = node.id; node.id = `${previous}-${kind}-${item.id}`; identities.set(previous, node.id); }
          for (const node of [card, ...card.querySelectorAll('[for],[aria-labelledby],[aria-describedby]')]) for (const attr of ['for', 'aria-labelledby', 'aria-describedby']) if (node.hasAttribute(attr)) node.setAttribute(attr, node.getAttribute(attr).split(/\s+/).map(value => identities.get(value) || value).join(' '));
          parent.append(card);
        }
      }
      for (const node of document.querySelectorAll(`[data-bb-${kind}-id]`)) {
        const item = items.find(row => String(row.id) === node.getAttribute(`data-bb-${kind}-id`));
        if (!item && !node.hasAttribute('data-bb-unavailable')) { node.dataset.bbRuntimeWasHidden = String(node.hidden); node.hidden = true; node.setAttribute('data-bb-unavailable', ''); }
        if (item && node.hasAttribute('data-bb-unavailable')) { node.hidden = node.dataset.bbRuntimeWasHidden === 'true'; node.removeAttribute('data-bb-unavailable'); delete node.dataset.bbRuntimeWasHidden; }
        if (!item) continue;
        const available = item.available !== false && (item.stockAvailable == null || String(item.stockAvailable).trim() === '' || Number(item.stockAvailable) > 0 || item.variants?.some(variant => variant.available !== false && Number(variant.stockAvailable) > 0));
        const cents = priceCents(item);
        const values = { name: item.name || item.title || '', description: item.description || '', price: item.quoteBased || item.priceType === 'quote' ? 'Quote after consultation' : cents == null ? 'Choose an option' : `${catalog.currency || 'R'} ${(cents / 100).toFixed(2)}`, duration: item.durationMinutes || item.minDuration || item.duration || '', available: available ? 'Available' : 'Unavailable' };
        const fields = [...node.querySelectorAll('[data-bb-bind]')];
        if (node.hasAttribute('data-bb-bind')) fields.unshift(node);
        for (const field of fields) {
          const key = field.getAttribute('data-bb-bind');
          if (key === kind + '.image') { const url = item.imageUrls?.[0] || item.image || item.photoURL || ''; if (/^(https:\/\/|data:image\/)/i.test(url) && field.tagName === 'IMG') { field.src = url; field.alt = values.name; } }
          else if (key?.startsWith(kind + '.') && Object.hasOwn(values, key.slice(kind.length + 1))) { const value = String(values[key.slice(kind.length + 1)]); if (field.textContent !== value) field.textContent = value; }
        }
      }
    }
    window.dispatchEvent(new CustomEvent('bookbuy:catalog', { detail: catalog }));
  }
  function applyCart(cart) {
    for (const node of document.querySelectorAll('[data-bb-bind="cart.count"]')) node.textContent = String(cart.count || 0);
    for (const node of document.querySelectorAll('[data-bb-bind="cart.total"]')) node.textContent = `${cart.currency || 'R'} ${(Number(cart.subtotalCents || 0) / 100).toFixed(2)}`;
    window.dispatchEvent(new CustomEvent('bookbuy:cart', { detail: cart }));
  }
  const connected = new Promise(resolve => waiters.push(resolve));
  window.addEventListener('message', event => {
    if (event.source !== parent || event.data?.type !== 'bookbuy-runtime-connect' || !event.ports[0] || port) return;
    port = event.ports[0];
    port.onmessage = event => {
      const data = event.data || {};
      if (data.type === 'catalog-update') { applyCatalog(data.catalog); return; }
      if (data.type === 'cart-update') { applyCart(data.cart); return; }
      const entry = pending.get(data.id);
      if (!entry) return;
      clearTimeout(entry.timer); pending.delete(data.id);
      if (!data.error && entry.action === 'catalog.get') applyCatalog(data.result);
      if (!data.error && entry.action.startsWith('cart.') && data.result?.items) applyCart(data.result);
      data.error ? entry.reject(new Error(data.error)) : entry.resolve(data.result);
    };
    port.start(); waiters.forEach(resolve => resolve());
  });
  async function request(action, payload = {}) {
    await Promise.race([connected, new Promise((_, reject) => setTimeout(() => reject(new Error('Book & Buy connection is unavailable. Reload the website.')), 10000))]);
    const id = String(++count);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('Book & Buy did not respond. Please try again.')); }, 45000);
      pending.set(id, { action, resolve, reject, timer });
      port.postMessage({ id, action, payload });
    });
  }
  const api = Object.freeze({ version: 1, request,
    catalog: Object.freeze({ get: payload => request('catalog.get', payload) }),
    quote: payload => request('quote.get', payload),
    availability: payload => request('availability.get', payload),
    cart: Object.freeze({ get: () => request('cart.get'), add: payload => request('cart.add', payload), remove: payload => request('cart.remove', payload), updateQuantity: payload => request('cart.updateQuantity', payload), open: () => request('cart.open') }),
    booking: Object.freeze({ create: payload => request('booking.create', payload), select: payload => request('booking.select', payload) }),
    checkout: Object.freeze({ create: payload => request('checkout.create', payload), status: payload => request('checkout.status', payload) }),
    payment: Object.freeze({ start: payload => request('payment.start', payload), confirm: payload => request('payment.confirm', payload) })
  });
  Object.defineProperty(window, 'BookBuy', { value: api, writable: false, configurable: false });
  document.addEventListener('click', event => {
    if (event.target.closest('input,select,textarea,label,[data-bb-custom]')) return;
    const control = event.target.closest('[data-bb-action], [data-bb-product-id], [data-bb-service-id]');
    if (!control) return;
    const product = control.closest('[data-bb-product-id]'), service = control.closest('[data-bb-service-id]');
    const action = control.dataset.bbAction || (product ? 'product.open' : service ? 'service.open' : '');
    if (!action) return;
    event.preventDefault();
    const payload = product ? { productId: product.dataset.bbProductId } : service ? { serviceId: service.dataset.bbServiceId } : {};
    // Annotated buttons open authoritative selection unless a custom form calls the SDK.
    const resolvedAction = action === 'cart.add' ? 'product.open' : ['booking.create', 'booking.date', 'booking.slot'].includes(action) ? 'service.open' : action;
    request(resolvedAction, payload).catch(error => {
      window.dispatchEvent(new CustomEvent('bookbuy:error', { detail: { action, message: error.message } }));
    });
  }, true);
  parent.postMessage({ source: 'bookbuy-preview', type: 'runtime-ready', version: 1 }, '*');
}
window.BookBuyRuntimeInstaller = installBookBuyRuntime;
