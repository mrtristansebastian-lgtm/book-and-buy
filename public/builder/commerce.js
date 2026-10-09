(() => {
  let context, cart = { count: 0, total: 0 };
  const requests = new Map();
  function hostRequest(operation, payload = {}, signal, onEvent) {
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const finish = (error, result) => { clearTimeout(timer); requests.delete(requestId); signal?.removeEventListener('abort', abort); error ? reject(error) : resolve(result); };
      const abort = () => { send('host-cancel', { requestId }); finish(new DOMException('Canceled', 'AbortError')); };
      const timer = setTimeout(() => finish(new Error('The Book & Buy connection timed out.')), 300000);
      requests.set(requestId, { finish, onEvent });
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) return abort();
      ready().then(() => { if (requests.has(requestId)) send('host-request', { requestId, operation, payload }); }).catch(error => finish(error));
    });
  }
  const waiters = new Set();
  const send = (type, payload = {}) => {
    if (parent === window) throw new Error('Open this builder from Book & Buy to connect the catalog.');
    parent.postMessage({ source: 'bookbuy-builder-host', type, ...payload }, location.origin);
  };
  window.addEventListener('message', event => {
    if (event.source !== parent || event.origin !== location.origin || event.data?.source !== 'bookbuy-workspace') return;
    if (event.data.type === 'host-check-ready') { if (window.BookBuyBuilderReady) send('builder-ready', { url: location.pathname + location.search }); return; }
    if (event.data.type === 'host-progress') { requests.get(event.data.requestId)?.onEvent?.(event.data.event); return; }
    if (event.data.type === 'host-response') { const error = event.data.error ? Object.assign(new Error(event.data.error), { code: event.data.errorCode || '', details: event.data.errorDetails || {} }) : null; requests.get(event.data.requestId)?.finish(error, event.data.result); return; }
    if (event.data.type === 'ai-connections-changed') { window.dispatchEvent(new Event('bookbuy-ai-connections-changed')); return; }
    if (event.data.type !== 'catalog-context') return;
    context = event.data.context; cart = event.data.cart || cart;
    for (const resolve of waiters) resolve(context); waiters.clear();
    window.dispatchEvent(new CustomEvent('bookbuy-catalog-ready', { detail: context }));
  });
  let readiness;
  async function ready() {
    if (context) return context;
    if (readiness) return readiness;
    send('catalog-request');
    readiness = new Promise((resolve, reject) => {
      const done = value => { clearTimeout(timer); clearInterval(retry); resolve(value); };
      const retry = setInterval(() => send('catalog-request'), 300);
      const timer = setTimeout(() => { clearInterval(retry); waiters.delete(done); reject(new Error('Book & Buy catalog is not ready. Reload the builder.')); }, 10000);
      waiters.add(done);
    }).finally(() => { readiness = null; });
    return readiness;
  }
  function previewRuntime() {
    const send = (action, payload) => parent.postMessage({ source: 'bookbuy-preview', type: 'commerce-action', action, payload }, '*');
    document.addEventListener('click', event => {
      const control = event.target.closest('[data-bb-product-id], [data-bb-service-id], [data-bb-action="cart.open"], [data-bb-action="checkout.create"]');
      if (!control) return;
      const product = control.closest('[data-bb-product-id]');
      const service = control.closest('[data-bb-service-id]');
      event.preventDefault(); event.stopImmediatePropagation();
      if (product) send('product.open', { productId: product.dataset.bbProductId });
      else if (service) send('service.open', { serviceId: service.dataset.bbServiceId });
      else send(control.dataset.bbAction, {});
    }, true);
    parent.postMessage({ source: 'bookbuy-preview', type: 'commerce-ready' }, '*');
  }
  function renderCards(doc, section, list, kind, preserveMissing = false) {
    if (section.querySelector(`[data-bb-${kind}-id]`)) {
      // Existing custom card markup is owned by the designer; refresh bindings only.
      for (const card of section.querySelectorAll(`[data-bb-${kind}-id]`)) {
        if (!preserveMissing && !list.some(item => item.id === card.getAttribute(`data-bb-${kind}-id`))) card.remove();
      }
      return;
    }
    section.replaceChildren();
    const heading = doc.createElement('h2'); heading.textContent = kind === 'product' ? list.some(item => item.transactionMode === 'enquiry') ? 'Explore our listings' : 'Shop our products' : 'Book a service'; section.append(heading);
    const grid = doc.createElement('div'); grid.className = 'bb-connected-grid';
    for (const item of list) {
      const card = doc.createElement('article'); card.className = 'bb-connected-card';
      card.setAttribute(`data-bb-${kind}-id`, item.id); card.dataset.bbLayer = 'commerce'; card.dataset.bbComponent = `${kind}-card`;
      card.dataset.bbId = `connected-${kind}-${item.id}`;
      if (/^(https?:|data:image\/)/i.test(item.image)) { const img = doc.createElement('img'); img.src = item.image; img.alt = item.name; img.loading = 'lazy'; card.append(img); }
      const title = doc.createElement('h3'); title.textContent = item.name;
      const price = doc.createElement('p'); price.textContent = item.price; price.dataset.bbBind = `${kind}.price`;
      const button = doc.createElement('button'); button.type = 'button'; button.textContent = kind === 'product' ? item.transactionMode === 'enquiry' ? 'View listing' : 'Choose options' : 'Choose a time';
      button.dataset.bbAction = kind === 'product' ? 'product.open' : 'service.open';
      card.append(title, price, button); grid.append(card);
    }
    section.append(grid);
  }
  function wireHtml(html, { newSite = false, allowRetired = false, draft = false } = {}) {
    if (!context) throw new Error('The catalog connection is not ready yet.');
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('base,meta[http-equiv]').forEach(node => node.remove());
    if (context.profileMode === 'presence') {
      // Remove connected commerce UI from old drafts when the business becomes a place card.
      doc.querySelectorAll('[data-bb-catalog], [data-bb-product-id], [data-bb-service-id], [data-bb-action], [data-bb-bind]').forEach(node => node.remove());
    }
    if (allowRetired && !draft) for (const kind of ['product', 'service']) {
      for (const element of doc.querySelectorAll(`[data-bb-${kind}-id]`)) if (!(context[`${kind}s`] || []).some(item => item.id === element.getAttribute(`data-bb-${kind}-id`))) element.remove();
    }
    try { window.BookBuyWebsiteContract.validateWebsiteBindings(doc.documentElement.outerHTML, context); }
    catch (error) { if (!draft) throw error; window.dispatchEvent(new CustomEvent('bookbuy-website-draft-issues', { detail: { message: error.message } })); }
    let links = 0;
    for (const kind of ['product', 'service']) {
      const list = context[`${kind}s`] || [];
      let sections = [...doc.querySelectorAll(`[data-bb-catalog="${kind}s"]`)];
      if (newSite && list.length && !sections.length && !doc.querySelector(`[data-bb-${kind}-id]`)) {
        const section = doc.createElement('section'); section.dataset.bbCatalog = `${kind}s`; section.className = 'bb-connected-section';
        (doc.querySelector('main') || doc.body).append(section); sections = [section];
      }
      for (const section of sections) renderCards(doc, section, list, kind, draft);
      for (const element of doc.querySelectorAll(`[data-bb-${kind}-id]`)) {
        const id = element.getAttribute(`data-bb-${kind}-id`);
        const item = list.find(row => row.id === id);
        if (!item) { if (draft) { element.dataset.bbUnavailable = 'true'; continue; } throw new Error(`The generated ${kind} “${id}” does not exist in Book & Buy. Choose an active item.`); }
        links++;
        element.dataset.bbLayer = 'commerce';
        for (const node of element.querySelectorAll(`[data-bb-bind="${kind}.price"], [data-bb-field="price"]`)) node.textContent = item.price;
        for (const node of element.querySelectorAll(`[data-bb-bind="${kind}.name"], [data-bb-field="name"]`)) node.textContent = item.name;
      }
    }
    if (links && !doc.querySelector('[data-bb-action="cart.open"], [data-bb-action="checkout.create"]')) {
      const button = doc.createElement('button'); button.className = 'bb-connected-cart'; button.textContent = 'Your cart'; button.dataset.bbAction = 'cart.open'; button.dataset.bbLayer = 'commerce'; doc.body.append(button);
    }
    if (!doc.getElementById('bb-connected-styles')) {
      const style = doc.createElement('style'); style.id = 'bb-connected-styles';
      style.textContent = '.bb-connected-section{padding:48px 5%;max-width:1200px;margin:auto}.bb-connected-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:24px}.bb-connected-card{padding:20px;border:1px solid #e8eaf0;border-radius:16px;background:white;color:#151b29;cursor:pointer}.bb-connected-card img{width:100%;height:180px;object-fit:cover;border-radius:10px}.bb-connected-card h3{font-size:18px;margin:16px 0 8px}.bb-connected-card p{margin:0 0 16px}.bb-connected-card button,.bb-connected-cart{font:inherit;padding:12px 18px;border:1px solid #dde1eb;border-radius:10px;background:white;color:#151b29;cursor:pointer}.bb-connected-cart{position:fixed;right:20px;bottom:20px;z-index:30;box-shadow:0 4px 20px #151b291a}'; doc.head.append(style);
    }
    doc.querySelectorAll('[data-bb-connected-runtime]').forEach(node => node.remove());
    // Install the trusted handler before AI scripts; arbitrary generated handlers
    // cannot skip the app's authoritative variant/slot/checkout flow.
    const runtime = doc.createElement('script'); runtime.dataset.bbConnectedRuntime = 'true'; runtime.textContent = `(${window.BookBuyRuntimeInstaller.toString()})();`;
    doc.head.prepend(runtime);
    return { html: `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`, links, products: context.products.length, services: context.services.length };
  }
  const commerce = {
    kind: 'bookbuy-workspace-commerce',
    async getState() { await ready(); return { cart, booking: {}, drawerOpen: false, notice: null }; },
    async execute({ action, payload = {} }) { await ready(); send('commerce-open', { action, payload }); return this.getState(); },
    async reset() { return this.getState(); }
  };
  window.BookBuyCommerce = { ready, wireHtml, commerce, hostRequest, get context() { return context; } };
  if (parent !== window) send('catalog-request');
})();
