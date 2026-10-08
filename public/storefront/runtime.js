(() => {
  const siteId = new URLSearchParams(location.search).get('site') || '';
  const previewToken = new URLSearchParams(location.search).get('preview') || '';
  const frame = document.getElementById('website'), status = document.getElementById('status'), dialog = document.getElementById('commerce'), body = document.getElementById('commerceBody'), note = document.getElementById('commerceNote');
  let catalog, site, countryCode = sessionStorage.getItem('bookbuy-country:' + siteId) || '', cart = [];
  let runtimePort, catalogSignature = '', catalogLoading, lastCatalogRead = 0;
  const money = value => `${catalog?.currency || 'R'} ${(Number(value) / 100).toFixed(2)}`;
  const snapshot = () => ({ items: cart.map(row => ({ ...row })), count: cart.reduce((sum, row) => sum + row.quantity, 0), subtotalCents: cart.reduce((sum, row) => sum + row.quantity * row.unitPriceCents, 0), currency: catalog?.currency });
  async function server(action, payload = {}) {
    const response = await fetch('/api/website', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ siteId, previewToken, action, payload: { ...payload, countryCode: payload.countryCode || countryCode } }) });
    const result = await response.json(); if (!response.ok || result.error) throw new Error(result.error || 'The business could not complete this request.'); return result;
  }
  function reconcileCart() {
    for (const line of cart) {
      const item = catalog[line.kind === 'product' ? 'products' : 'services'].find(row => row.id === (line.productId || line.serviceId));
      const variant = line.variantId ? item?.variants?.find(row => row.id === line.variantId) : null;
      line.unavailable = !item || Boolean(line.variantId && !variant) || variant?.available === false;
      if (item && !line.unavailable) {
        line.name = item.name || item.title;
        line.unitPriceCents = productPrice(item, variant);
        const stock = variant?.stockAvailable ?? item.stockAvailable;
        if (line.kind === 'product' && stock != null && String(stock).trim() !== '' && line.quantity > Number(stock)) line.unavailable = true;
      }
    }
  }
  function announceCatalog() {
    runtimePort?.postMessage({ type: 'catalog-update', catalog });
    runtimePort?.postMessage({ type: 'cart-update', cart: snapshot() });
  }
  async function refreshCatalog({ force = false, payload = {} } = {}) {
    if (!force && catalog && Date.now() - lastCatalogRead < 15000) return catalog;
    if (catalogLoading) return catalogLoading;
    catalogLoading = server('catalog.get', payload).then(next => {
      lastCatalogRead = Date.now(); catalog = next;
      const signature = JSON.stringify(next);
      if (signature !== catalogSignature || force) { catalogSignature = signature; reconcileCart(); announceCatalog(); }
      return next;
    }).finally(() => { catalogLoading = null; });
    return catalogLoading;
  }
  function element(tag, text, attributes = {}) { const node = document.createElement(tag); if (text) node.textContent = text; Object.assign(node, attributes); return node; }
  function open(title) { document.getElementById('commerceTitle').textContent = title; body.replaceChildren(); note.textContent = ''; if (!dialog.open) dialog.showModal(); }
  function field(form, label, name, options) {
    const wrap = element('label', label), input = element(options ? 'select' : 'input', '', { name, required: true });
    if (options) for (const row of options) input.append(new Option(row.label, row.value));
    wrap.append(input); form.append(wrap); return input;
  }
  async function chooseCountry() {
    open('Choose your country');
    const form = element('form'), select = field(form, 'Country', 'country', catalog.markets.filter(row => row.enabled && row.countryCode !== '*').map(row => ({ label: row.countryCode, value: row.countryCode })));
    if (!select.options.length) { select.replaceWith(element('input', '', { name: 'country', required: true, maxLength: 2, placeholder: 'Country code, e.g. ZA' })); }
    form.append(element('button', 'Continue', { type: 'submit' })); body.append(form);
    return new Promise((resolve, reject) => {
      let confirmed = false;
      const closed = () => { if (!confirmed) reject(new Error('Choose a country to browse this business.')); };
      dialog.addEventListener('close', closed, { once: true });
      form.addEventListener('submit', async event => {
        event.preventDefault(); countryCode = String(new FormData(form).get('country')).toUpperCase();
        try { catalog = await refreshCatalog({ force: true }); if (catalog.catalogAvailability !== 'available') throw new Error('This business does not serve this country.'); sessionStorage.setItem('bookbuy-country:' + siteId, countryCode); cart = []; confirmed = true; announceCatalog(); dialog.close(); resolve(); }
        catch (error) { note.textContent = error.message; }
      });
    });
  }
  function productPrice(item, variant) { const raw = String(variant?.price ?? item.price ?? 0).replace(/^(?:R|ZAR|USD|EUR|GBP|\$|€|£)\s*/i, ''); return item.priceType === 'quote' || item.quoteBased ? 0 : variant?.priceInCents ?? item.priceInCents ?? (/^\d+(?:\.\d{1,2})?$/.test(raw) ? Math.round(Number(raw) * 100) : 0); }
  async function add(payload) {
    await refreshCatalog({ force: true });
    if (!catalog || catalog.catalogAvailability !== 'available') await chooseCountry();
    const product = catalog.products.find(row => row.id === payload.productId), service = catalog.services.find(row => row.id === payload.serviceId);
    const item = product || service; if (!item) throw new Error('This item is unavailable in your country.');
    if (product && (product.quoteBased || product.priceType === 'quote')) throw new Error('This product needs a quote from the business.');
    const variant = payload.variantId ? item.variants?.find(row => row.id === payload.variantId) : null;
    if (payload.variantId && !variant || product && item.variants?.length && !variant || variant?.available === false) throw new Error('Choose an available option.');
    const quantity = product ? Number(payload.quantity || 1) : 1;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999) throw new Error('Choose a valid quantity.');
    const key = `${product ? 'product' : 'service'}:${item.id}:${variant?.id || ''}`;
    const existing = cart.find(row => row.lineKey === key);
    if (product) {
      const stock = variant?.stockAvailable ?? item.stockAvailable;
      if (stock != null && String(stock).trim() && (existing?.quantity || 0) + quantity > Number(stock)) throw new Error('There is not enough stock.');
      if (existing) existing.quantity += quantity;
      else cart.push({ kind: 'product', lineKey: key, productId: item.id, variantId: variant?.id || '', name: item.name, quantity, unitPriceCents: productPrice(item, variant) });
    } else {
      const slots = await server('availability.get', payload);
      if (!slots.some(row => row.time === payload.time && (!payload.scheduleSessionId || row.scheduleSessionId === payload.scheduleSessionId))) throw new Error('Choose an available booking time.');
      const quote = await server('quote.get', { ...payload, kind: 'service' });
      const line = { kind: 'service', lineKey: key, serviceId: item.id, variantId: variant?.id || '', name: item.name, quantity: 1, unitPriceCents: quote.amountInCents, dateKey: payload.dateKey, time: payload.time, scheduleSessionId: payload.scheduleSessionId || '', staffId: payload.staffId || '', partySize: payload.partySize || 1 };
      if (existing) Object.assign(existing, line); else cart.push(line);
    }
    runtimePort?.postMessage({ type: 'cart-update', cart: snapshot() });
    return snapshot();
  }
  async function openItem(kind, payload) {
    await refreshCatalog({ force: true });
    if (catalog.catalogAvailability !== 'available') await chooseCountry();
    const item = catalog[kind === 'product' ? 'products' : 'services'].find(row => row.id === payload[kind + 'Id']);
    if (!item) throw new Error('This item is unavailable.');
    open(item.name || 'Choose options');
    const form = element('form'); if (item.description) form.append(element('p', item.description));
    let variant;
    if (item.variants?.length) variant = field(form, 'Option', 'variantId', item.variants.map(row => ({ value: row.id, label: row.title || row.name || Object.values(row.optionValues || {}).join(' / ') })));
    if (kind === 'product') { const input = field(form, 'Quantity', 'quantity'); input.type = 'number'; input.min = 1; input.max = 999; input.value = 1; }
    else {
      const date = field(form, 'Date', 'dateKey'); date.type = 'date'; const time = field(form, 'Available time', 'time', []);
      const refresh = async () => { time.replaceChildren(); try { const slots = await server('availability.get', { serviceId: item.id, variantId: variant?.value || '', dateKey: date.value }); for (const slot of slots) time.append(new Option(slot.time, JSON.stringify(slot))); if (!slots.length) note.textContent = 'No times available. Choose another date.'; else note.textContent = ''; } catch (error) { note.textContent = error.message; } };
      date.addEventListener('change', refresh); variant?.addEventListener('change', refresh);
    }
    form.append(element('button', 'Add to cart', { type: 'submit' }));
    form.addEventListener('submit', async event => { event.preventDefault(); const values = Object.fromEntries(new FormData(form)); try { const slot = kind === 'service' ? JSON.parse(values.time) : {}; await add({ ...values, ...slot, [kind + 'Id']: item.id }); openCart(); } catch (error) { note.textContent = error.message; } }); body.append(form); return { opened: true };
  }
  function openCart() {
    open('Your cart');
    if (!cart.length) { body.append(element('p', 'Your cart is empty.')); return { opened: true }; }
    for (const row of cart) { const card = element('article'); card.append(element('strong', row.name), element('p', `${row.quantity} × ${money(row.unitPriceCents)}${row.dateKey ? ' · ' + row.dateKey + ' ' + row.time : ''}${row.unavailable ? ' · unavailable, please remove' : ''}`)); const remove = element('button', 'Remove'); remove.addEventListener('click', () => { cart = cart.filter(item => item.lineKey !== row.lineKey); runtimePort?.postMessage({ type: 'cart-update', cart: snapshot() }); openCart(); }); card.append(remove); body.append(card); }
    body.append(element('p', 'Subtotal ' + money(snapshot().subtotalCents), { className: 'amount' })); const checkout = element('button', 'Continue to checkout', { className: 'primary' }); checkout.addEventListener('click', openCheckout); body.append(checkout); return { opened: true };
  }
  function openCheckout() {
    if (site?.preview) { open('Shared preview'); body.append(element('p', 'Browsing only. Orders, bookings and payments open after publication.')); return { opened: true }; }
    if (!cart.length) return openCart();
    open('Checkout'); const form = element('form');
    field(form, 'Your name', 'clientName'); const email = field(form, 'Email', 'clientEmail'); email.type = 'email';
    const country = field(form, 'Country code', 'country'); country.value = countryCode;
    const address = field(form, 'Delivery address', 'shippingAddress'); address.required = cart.some(row => row.kind === 'product');
    if (catalog.checkout?.collectClientPhone) field(form, 'Phone', 'clientPhone').type = 'tel';
    if (catalog.checkout?.collectClientNotes) { const notes = field(form, 'Notes', 'clientNote'); notes.required = false; }
    if (catalog.checkout?.birthday) field(form, 'Birthday', 'clientBirthday').type = 'date';
    const payment = field(form, 'Payment method', 'paymentMethod', catalog.paymentOptions.map(row => ({ label: row.name, value: row.gatewayType || row.id })));
    const submit = element('button', 'Review total', { type: 'submit' }); form.append(submit); body.append(form);
    const requestId = crypto.randomUUID(); let reviewed = false, reviewedSignature;
    form.addEventListener('submit', async event => {
      event.preventDefault(); submit.disabled = true;
      const details = Object.fromEntries(new FormData(form)); const client = { ...details, country: details.country.toUpperCase() };
      try {
        await refreshCatalog({ force: true });
        if (cart.some(row => row.unavailable)) throw new Error('An item in your cart changed or is unavailable. Review your cart before checkout.');
        const products = cart.filter(row => row.kind === 'product');
        const services = cart.filter(row => row.kind === 'service');
        if (['stripe', 'paypal', 'paystack'].includes(payment.value) && (products.length && services.length || services.length > 1)) throw new Error('Online payment supports one product order or one service booking at a time. Check out these selections separately.');
        let amount = 0;
        const productQuote = products.length ? await server('quote.get', { items: products, client, paymentMethod: payment.value, kind: 'product' }) : null;
        if (productQuote) amount += productQuote.amountInCents;
        const serviceQuotes = [];
        for (const service of services) { const quote = await server('quote.get', { ...service, kind: 'service', client }); serviceQuotes.push(quote); amount += quote.amountInCents; }
        const quoteSignature = JSON.stringify([amount, productQuote?.quoteRevision, serviceQuotes.map(quote => quote.quoteRevision)]);
        if (!reviewed || quoteSignature !== reviewedSignature) {
          note.textContent = 'Total ' + money(amount) + '. Confirm to place your order or booking.'; reviewed = true; submit.textContent = 'Confirm';
          reviewedSignature = quoteSignature;
          form.querySelectorAll('input,select').forEach(input => input.addEventListener('change', () => { reviewed = false; submit.textContent = 'Review total'; }, { once: true }));
        } else {
          const records = [];
          if (products.length) records.push({ kind: 'order', data: await server('checkout.create', { requestId: requestId + '-order', items: products, client, paymentMethod: payment.value, expectedQuoteRevision: productQuote.quoteRevision, expectedCatalogRevision: productQuote.revision }) });
          for (const [index, service] of services.entries()) records.push({ kind: 'booking', data: await server('booking.create', { ...service, requestId: requestId + '-booking-' + index, clientName: client.clientName, clientEmail: client.clientEmail, clientPhone: client.clientPhone || '', clientNote: client.clientNote || '', clientBirthday: client.clientBirthday || '', clientCountry: client.country, paymentMethod: payment.value, expectedQuoteRevision: serviceQuotes[index].quoteRevision, expectedCatalogRevision: serviceQuotes[index].revision }) });
          open('Request received');
          for (const row of records) {
            const reference = row.data.id || row.data.order?.id || row.data.booking?.id;
            body.append(element('p', `${row.kind === 'order' ? 'Order' : 'Booking'} reference: ${reference}`));
            if (['stripe', 'paypal', 'paystack'].includes(payment.value)) { const button = element('button', 'Pay securely'); button.addEventListener('click', async () => { button.disabled = true; try { const result = await server('payment.start', { requestId: requestId + '-payment-' + reference, gatewayType: payment.value, sourceType: row.kind, sourceId: reference }); const url = new URL(result.redirectUrl); if (url.protocol !== 'https:') throw new Error('Invalid payment URL.'); location.assign(url.href); } catch (error) { note.textContent = error.message; button.disabled = false; } }); body.append(button); }
          }
          cart = [];
        }
      } catch (error) { note.textContent = error.message; } finally { submit.disabled = false; }
    });
    return { opened: true };
  }
  async function execute(action, payload = {}) {
    window.BookBuyWebsiteContract.validateWebsiteRequest(action, payload);
    if (site?.preview && ['checkout.create', 'booking.create', 'payment.start', 'payment.confirm', 'checkout.status'].includes(action)) throw new Error('Shared preview · browsing only. Orders, bookings and payments open after publication.');
    if (action === 'catalog.get') {
      if (payload.countryCode && payload.countryCode !== countryCode) { countryCode = String(payload.countryCode).toUpperCase(); cart = []; sessionStorage.setItem('bookbuy-country:' + siteId, countryCode); }
      return refreshCatalog({ force: true, payload });
    }
    if (action === 'cart.get') return snapshot();
    if (action === 'cart.add') return add(payload);
    if (action === 'cart.remove') { cart = cart.filter(row => row.lineKey !== payload.lineKey); runtimePort?.postMessage({ type: 'cart-update', cart: snapshot() }); return snapshot(); }
    if (action === 'cart.updateQuantity') { const line = cart.find(row => row.lineKey === payload.lineKey); if (!line || line.kind !== 'product') throw new Error('Choose a product in your cart.'); const previous = line.quantity; line.quantity = 0; try { await add({ ...line, quantity: payload.quantity }); } catch (error) { line.quantity = previous; throw error; } return snapshot(); }
    if (action === 'product.open') return openItem('product', payload);
    if (['service.open', 'booking.select', 'booking.date', 'booking.slot'].includes(action)) return openItem('service', payload);
    if (action === 'cart.open') return openCart();
    if (action === 'cart.close') { dialog.close(); return { closed: true }; }
    if (action === 'checkout.create' && !payload.client) return openCheckout();
    if (['checkout.create', 'booking.create'].includes(action)) payload = { ...payload, requestId: payload.requestId || crypto.randomUUID() };
    return server(action, payload);
  }
  window.addEventListener('message', event => {
    if (event.source !== frame.contentWindow || event.data?.source !== 'bookbuy-preview' || event.data.type !== 'runtime-ready' || runtimePort) return;
    const channel = new MessageChannel(); runtimePort = channel.port1; let inflight = 0, count = 0, windowStart = Date.now();
    channel.port1.onmessage = async message => { const request = message.data || {}; let admitted = false; try { if (Date.now() - windowStart > 60000) { windowStart = Date.now(); count = 0; } if (inflight >= 4 || ++count > 120 || typeof request.id !== 'string' || request.id.length > 100) throw new Error('Too many website requests. Try again shortly.'); inflight++; admitted = true; channel.port1.postMessage({ id: request.id, result: await execute(request.action, request.payload || {}) }); } catch (error) { channel.port1.postMessage({ id: request.id, error: error.message }); } finally { if (admitted) inflight--; } }; channel.port1.start();
    frame.contentWindow.postMessage({ type: 'bookbuy-runtime-connect', version: 1 }, '*', [channel.port2]);
    announceCatalog();
  });
  document.getElementById('closeDialog').addEventListener('click', () => dialog.close());
  async function start() {
    const response = await fetch('/api/website?siteId=' + encodeURIComponent(siteId) + '&previewToken=' + encodeURIComponent(previewToken) + '&domain=' + encodeURIComponent(location.hostname)); site = await response.json(); if (!response.ok || site.error) throw new Error(site.error || 'Website unavailable.');
    catalog = await refreshCatalog({ force: true }); if (catalog.catalogAvailability !== 'available') await chooseCountry();
    const doc = new DOMParser().parseFromString(site.html, 'text/html'); doc.querySelectorAll('[data-bb-connected-runtime],base,meta[http-equiv]').forEach(node => node.remove());
    const runtime = doc.createElement('script'); runtime.dataset.bbConnectedRuntime = 'true'; runtime.textContent = `(${window.BookBuyRuntimeInstaller.toString()})();`; doc.head.prepend(runtime);
    document.title = doc.title || catalog.brandName || 'Book & Buy'; frame.srcdoc = '<!doctype html>\n' + doc.documentElement.outerHTML; frame.hidden = false; status.hidden = true;
    if (site.preview) { const banner = element('div', 'Shared preview · browsing only', { className: 'preview-banner' }); document.body.append(banner); }
    const params = new URLSearchParams(location.search); if (params.get('attemptId')) { const result = await server('payment.confirm', Object.fromEntries([...params].filter(([key]) => key !== 'site'))); open('Payment status'); body.append(element('p', result.paid ? 'Payment confirmed. Thank you.' : 'Your payment is awaiting confirmation.')); }
    setInterval(() => { if (!document.hidden) refreshCatalog({ force: true }).catch(() => {}); }, 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshCatalog({ force: true }).catch(() => {}); });
  }
  start().catch(error => { status.textContent = error.message; });
})();
