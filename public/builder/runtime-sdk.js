// Installed by the trusted host into each opaque-origin preview or published page.
function installBookBuyRuntime() {
  if (window.BookBuy?.version === 1) return;
  let port;
  let count = 0;
  const pending = new Map();
  const waiters = [];
  const connected = new Promise(resolve => waiters.push(resolve));
  window.addEventListener('message', event => {
    if (event.source !== parent || event.data?.type !== 'bookbuy-runtime-connect' || !event.ports[0] || port) return;
    port = event.ports[0];
    port.onmessage = event => {
      const data = event.data || {}, entry = pending.get(data.id);
      if (!entry) return;
      clearTimeout(entry.timer); pending.delete(data.id);
      data.error ? entry.reject(new Error(data.error)) : entry.resolve(data.result);
    };
    port.start(); waiters.forEach(resolve => resolve());
  });
  async function request(action, payload = {}) {
    await Promise.race([connected, new Promise((_, reject) => setTimeout(() => reject(new Error('Book & Buy connection is unavailable. Reload the website.')), 10000))]);
    const id = String(++count);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('Book & Buy did not respond. Please try again.')); }, 45000);
      pending.set(id, { resolve, reject, timer });
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
