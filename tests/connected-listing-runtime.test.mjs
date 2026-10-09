import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { randomUUID } from 'node:crypto';
import { validateWebsiteRequest, WEBSITE_ACTIONS } from '../functions/websiteContract.js';

const input = { productId: 'car', requestId: 'test-request', customerName: 'Buyer', email: 'buyer@example.test', phone: '', message: '', intent: 'enquiry' };
const specialist = { id: 'car', name: 'Toyota Corolla', price: '', listingType: 'vehicle', transactionMode: 'checkout', listingAvailability: 'available', vehicleDetails: { year: 2024, mileage: 12000, fuel: 'Petrol', transmission: 'Automatic' } };

test('all website contract companions accept bounded enquiries and reject invented scope, prices and finance fields', () => {
  const contracts = [validateWebsiteRequest];
  for (const path of ['public/builder/website-contract.js', 'public/storefront/website-contract.js']) {
    const sandbox = { window: {} }; runInNewContext(readFileSync(path, 'utf8'), sandbox);
    contracts.push(sandbox.window.BookBuyWebsiteContract.validateWebsiteRequest);
    assert.deepEqual([...sandbox.window.BookBuyWebsiteContract.WEBSITE_ACTIONS], [...WEBSITE_ACTIONS]);
  }
  for (const validate of contracts) {
    assert.equal(validate('enquiry.create', input).productId, 'car');
    for (const patch of [{ ownerId: 'fake' }, { slug: 'another' }, { askingPrice: '1' }, { clientUid: 'fake' }, { finance: true }, { message: 'x'.repeat(3001) }, { email: 'bad' }, { productId: '../car' }, { intent: 'finance' }]) assert.throws(() => validate('enquiry.create', { ...input, ...patch }));
  }
});

class Node {
  constructor(tag = 'div', attrs = {}) { this.tagName = tag.toUpperCase(); this.children = []; this.textContent = ''; this.dataset = {}; this.attributes = { ...attrs }; this.listeners = {}; this.hidden = false; this.value = ''; this.style = {}; this.open = false; }
  append(...nodes) { this.children.push(...nodes); nodes.forEach(node => { node.parentElement = this; }); }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  getAttribute(key) { return this.attributes[key] ?? null; }
  setAttribute(key, value) { this.attributes[key] = value; }
  hasAttribute(key) { return Object.hasOwn(this.attributes, key); }
  removeAttribute(key) { delete this.attributes[key]; }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  querySelectorAll(selector) { const keys = selector === '[data-bb-bind]' ? ['data-bb-bind'] : selector === '[data-bb-action="cart.add"]' ? ['data-bb-action'] : null; return this.descendants().filter(node => keys ? keys.some(key => node.hasAttribute(key)) && (selector !== '[data-bb-action="cart.add"]' || node.getAttribute('data-bb-action') === 'cart.add') : ['INPUT', 'SELECT', 'TEXTAREA'].includes(node.tagName)); }
  descendants() { return this.children.flatMap(node => [node, ...node.descendants()]); }
  showModal() { this.open = true; }
  close() { this.open = false; }
}

function host({ item = specialist, kind = 'product', preview = false, failOnce = false, invalidResult = false } = {}) {
  const ids = Object.fromEntries(['website', 'status', 'commerce', 'commerceBody', 'commerceNote', 'commerceTitle', 'closeDialog'].map(id => [id, new Node()]));
  const catalog = { products: kind === 'product' ? [item] : [], services: kind === 'service' ? [item] : [], currency: 'R', catalogAvailability: 'available', markets: [] };
  const calls = [];
  const sandbox = {
    location: { search: '?site=test', hostname: 'storefront.test' }, sessionStorage: { getItem: () => '', setItem() {} },
    document: { getElementById: id => ids[id], createElement: tag => new Node(tag) },
    window: { addEventListener() {}, BookBuyWebsiteContract: { validateWebsiteRequest } },
    URLSearchParams, crypto: { randomUUID }, Option: class extends Node { constructor(label, value) { super('option'); this.textContent = label; this.value = value; } },
    FormData: class { constructor(form) { this.rows = form.descendants().filter(node => ['INPUT', 'SELECT', 'TEXTAREA'].includes(node.tagName)).map(node => [node.name, node.value || node.children[0]?.value || '']); } [Symbol.iterator]() { return this.rows[Symbol.iterator](); } },
    fetch: async (_url, options) => {
      const request = JSON.parse(options.body); calls.push(request);
      if (request.action === 'catalog.get') return { ok: true, json: async () => catalog };
      if (request.action === 'enquiry.create') {
        if (failOnce) { failOnce = false; return { ok: false, json: async () => ({ error: 'Connection interrupted' }) }; }
        return { ok: true, json: async () => invalidResult ? {} : ({ ok: true, id: 'saved-enquiry' }) };
      }
      throw new Error('Unexpected server action ' + request.action);
    }
  };
  const source = readFileSync('public/storefront/runtime.js', 'utf8').replace("  start().catch(error => { status.textContent = error.message; });", `  site = { preview: ${JSON.stringify(preview)} }; globalThis.testRuntime = { execute, snapshot };`);
  runInNewContext(source, sandbox);
  return { ...sandbox.testRuntime, ids, calls, catalog };
}

test('custom specialist modal offers enquiries, never quantities/cart; retries preserve idempotency and show success only after persistence', async () => {
  const runtime = host({ failOnce: true });
  await runtime.execute('product.open', { productId: 'car' });
  const all = runtime.ids.commerceBody.descendants();
  assert.equal(all.some(node => node.textContent === 'Add to cart'), false);
  assert.equal(all.some(node => node.name === 'quantity'), false);
  assert.equal(all.some(node => node.textContent === 'Price on enquiry'), true);
  const form = all.find(node => node.tagName === 'FORM');
  const fields = form.descendants().filter(node => ['INPUT', 'SELECT', 'TEXTAREA'].includes(node.tagName));
  for (const node of fields) { if (node.name === 'customerName') node.value = 'Buyer'; if (node.name === 'email') node.value = 'buyer@example.test'; if (node.name === 'intent') node.value = 'viewing'; }
  await form.listeners.submit({ preventDefault() {} });
  assert.equal(runtime.ids.commerceNote.textContent, 'Connection interrupted');
  assert.notEqual(runtime.ids.commerceTitle.textContent, 'Enquiry sent');
  await form.listeners.submit({ preventDefault() {} });
  const requests = runtime.calls.filter(row => row.action === 'enquiry.create');
  assert.equal(requests.length, 2); assert.equal(requests[0].payload.requestId, requests[1].payload.requestId);
  assert.equal(requests[0].payload.productId, 'car'); assert.equal(requests[0].payload.intent, 'viewing');
  assert.equal(runtime.ids.commerceTitle.textContent, 'Enquiry sent');
  assert.match(runtime.ids.commerceBody.children[0].textContent, /business’s Inbox/);
  await assert.rejects(runtime.execute('cart.add', { productId: 'car' }), /enquiries only/);
  assert.equal(runtime.snapshot().count, 0);
});

test('custom previews and sold/reserved listings offer no submission form, while ordinary stock keeps checkout', async () => {
  for (const config of [{ preview: true }, { item: { ...specialist, listingAvailability: 'reserved' } }, { item: { ...specialist, listingAvailability: 'sold' } }]) {
    const runtime = host(config); await runtime.execute('product.open', { productId: 'car' });
    assert.equal(runtime.ids.commerceBody.descendants().some(node => node.tagName === 'FORM'), false);
    assert.equal(runtime.calls.some(row => row.action === 'enquiry.create'), false);
  }
  const preview = host({ preview: true }); await preview.execute('catalog.get');
  await assert.rejects(preview.execute('enquiry.create', input), /browsing only/);
  const retail = host({ item: { id: 'shirt', name: 'Shirt', price: 100 } }); await retail.execute('product.open', { productId: 'shirt' });
  assert.equal(retail.ids.commerceBody.descendants().some(node => node.textContent === 'Add to cart'), true);
});

test('custom electronics details show approved specification groups and keep variant price, quantity and cart selection', async () => {
  const runtime = host({ item: { id: 'laptop', name: 'Studio laptop', listingType: 'electronics', transactionMode: 'checkout', price: 12000, stockAvailable: 3,
    listingFacts: ['Laptop', '16 GB RAM'], listingSpecificationGroups: [{ label: 'Performance', fields: [{ key: 'memory', label: 'Memory', value: '16', unit: 'GB' }, { key: 'processor', label: 'Processor', value: 'Intel Core Ultra 7', unit: '' }] }],
    variants: [{ id: '512gb', title: '512 GB', price: 12000, stockAvailable: 2, available: true }, { id: '1tb', title: '1 TB', price: 13500, stockAvailable: 1, available: true }] } });
  await runtime.execute('product.open', { productId: 'laptop' });
  const nodes = runtime.ids.commerceBody.descendants();
  assert.ok(nodes.some(node => node.tagName === 'SUMMARY' && node.textContent === 'Performance'));
  assert.ok(nodes.some(node => node.tagName === 'DD' && node.textContent === '16 GB'));
  assert.ok(nodes.some(node => node.textContent === 'Intel Core Ultra 7'));
  assert.equal(nodes.some(node => node.textContent === 'Send enquiry'), false);
  const form = nodes.find(node => node.tagName === 'FORM');
  const variant = form.descendants().find(node => node.name === 'variantId');
  variant.value = '1tb'; variant.listeners.change();
  assert.ok(runtime.ids.commerceBody.descendants().some(node => node.textContent === 'R 13500.00'));
  await form.listeners.submit({ preventDefault() {} });
  assert.equal(runtime.snapshot().count, 1);
  assert.equal(runtime.snapshot().items[0].variantId, '1tb');
  assert.equal(runtime.snapshot().subtotalCents, 1350000);
  await assert.rejects(runtime.execute('cart.add', { productId: 'laptop', variantId: '1tb', quantity: 1 }), /not enough stock/);
  assert.equal(runtime.calls.some(row => row.action === 'enquiry.create'), false);
});

test('custom ordinary products show their tailored specifications and retain retail cart behavior', async () => {
  const runtime = host({ item: { id: 'shirt', name: 'Studio shirt', listingType: 'physical', catalogTemplateId: 'apparel_tshirt', price: 350, stockAvailable: 4,
    listingFacts: ['M', 'Regular', 'Cotton'], listingSpecificationGroups: [{ label: 'T-shirt details', fields: [{ key: 'fit', label: 'Fit', value: 'Regular' }, { key: 'size', label: 'Size', value: 'M' }] }] } });
  await runtime.execute('product.open', { productId: 'shirt' });
  const nodes = runtime.ids.commerceBody.descendants();
  assert.ok(nodes.some(node => node.tagName === 'SUMMARY' && node.textContent === 'T-shirt details'));
  assert.ok(nodes.some(node => node.tagName === 'DD' && node.textContent === 'Regular'));
  assert.ok(nodes.some(node => node.textContent === 'R 350.00'));
  const form = nodes.find(node => node.tagName === 'FORM');
  await form.listeners.submit({ preventDefault() {} });
  assert.equal(runtime.snapshot().items[0].productId, 'shirt');
  assert.equal(runtime.snapshot().subtotalCents, 35000);
  assert.equal(runtime.calls.some(row => row.action === 'enquiry.create'), false);
});

test('custom service details show the safe template fields beside the existing booking choices', async () => {
  const runtime = host({ kind: 'service', item: { id: 'cut', name: 'Signature cut', catalogTemplateId: 'service_haircut', price: 250,
    serviceFacts: ['Short'], serviceConfigurationFields: [{ key: 'technique', label: 'Technique or style', value: 'Scissor cut' }, { key: 'included', label: 'What is included', value: 'Wash and finish' }] } });
  await runtime.execute('service.open', { serviceId: 'cut' });
  const nodes = runtime.ids.commerceBody.descendants();
  assert.ok(nodes.some(node => node.tagName === 'SUMMARY' && node.textContent === 'Service details'));
  assert.ok(nodes.some(node => node.tagName === 'DD' && node.textContent === 'Scissor cut'));
  assert.ok(nodes.some(node => node.name === 'dateKey'));
  assert.ok(nodes.some(node => node.name === 'time'));
  assert.equal(nodes.some(node => node.name === 'quantity'), false);
  assert.equal(nodes.some(node => node.textContent === 'Send enquiry'), false);
});

test('runtime SDK preserves specialist asking price/availability and conceals cart controls only for enquiry-only catalogues', () => {
  assert.equal(readFileSync('public/storefront/runtime-sdk.js', 'utf8'), readFileSync('public/builder/runtime-sdk.js', 'utf8'));
  const price = new Node('p', { 'data-bb-bind': 'product.price' });
  const availability = new Node('p', { 'data-bb-bind': 'product.available' });
  const button = new Node('button', { 'data-bb-action': 'cart.add' }); button.textContent = 'Add to cart';
  const card = new Node('article', { 'data-bb-product-id': 'car' }); card.append(price, availability, button);
  const cart = new Node('button', { 'data-bb-action': 'cart.open' });
  const listeners = {}, port = { start() {} }, parent = { postMessage() {} };
  const window = { addEventListener: (key, callback) => listeners[key] = callback, dispatchEvent() {} };
  const document = { addEventListener() {}, querySelectorAll: selector => selector === '[data-bb-action]' ? [button, cart] : selector === '[data-bb-product-id]' ? [card] : [] };
  runInNewContext(readFileSync('public/storefront/runtime-sdk.js', 'utf8'), { window, document, parent, CustomEvent: class {}, setTimeout, clearTimeout });
  window.BookBuyRuntimeInstaller(); listeners.message({ source: parent, data: { type: 'bookbuy-runtime-connect' }, ports: [port] });
  const update = (products, services = []) => port.onmessage({ data: { type: 'catalog-update', catalog: { products, services, currency: 'R' } } });
  update([specialist]);
  assert.equal(price.textContent, 'Price on enquiry'); assert.equal(button.textContent, 'View listing'); assert.equal(cart.hidden, true); assert.equal(availability.textContent, 'Available');
  update([{ ...specialist, price: 250000, listingAvailability: 'reserved' }]);
  assert.equal(price.textContent, 'R 250000.00'); assert.equal(availability.textContent, 'Reserved');
  update([{ ...specialist, listingAvailability: 'sold' }]); assert.equal(availability.textContent, 'Sold');
  update([{ id: 'car', price: 20, listingType: 'physical' }]);
  assert.equal(button.textContent, 'Add to cart'); assert.equal(cart.hidden, false);
});
