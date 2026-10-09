import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { runInNewContext } from 'node:vm';
import { validateWebsiteBindings } from '../functions/websiteContract.js';
import {
  FOOD_PRESENCE_CATEGORY_IDS, assertBusinessCommerceEnabled, effectivePublicPages,
  isPresenceOnlyBusiness, publicBusinessSocialLinks, resolveBusinessPublicPage
} from '../functions/businessCapabilities.js';

const nativeRequire = createRequire(import.meta.url);
const cache = new Map();
function load(file) {
  const path = resolve(file);
  if (cache.has(path)) return cache.get(path);
  const module = { exports: {} };
  cache.set(path, module.exports);
  const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const require = id => {
    if (!id.startsWith('.')) return nativeRequire(id);
    const candidate = resolve(dirname(path), id);
    return load(existsSync(candidate) ? candidate : `${candidate}.js`);
  };
  new Function('module', 'exports', 'require', outputText)(module, module.exports, require);
  return module.exports;
}
const { profileCatalog, profileTabs, profileSectionTabs } = load('src/features/website/profileModel.js');
const { normalizeBiz, filterDiscoverBusinesses } = load('src/features/client-app/exploreDiscovery.js');
const { buildPublicWorkspaceSnapshot } = load('src/shared/firebase/publicSnapshot.ts');
const base = {
  slug: 'local-place', brandName: 'Local place',
  website: { pages: { book: true, buy: true }, aboutBody: 'Meet our team' },
  products: [{ id: 'p', name: 'Item', active: true }],
  services: [{ id: 's', name: 'Service', active: true }],
  profileCapabilities: { book: true, buy: true }
};
const food = categoryId => ({ ...base, website: { ...base.website, categoryId } });

test('food categories override saved commerce choices and stale capability flags', () => {
  for (const categoryId of FOOD_PRESENCE_CATEGORY_IDS) {
    const workspace = food(categoryId);
    assert.equal(isPresenceOnlyBusiness(workspace), true, categoryId);
    assert.deepEqual(profileCatalog(workspace), { services: [], products: [], book: false, buy: false });
    assert.deepEqual(profileTabs(workspace).map(tab => tab.id), ['home']);
    assert.ok(profileSectionTabs(workspace).some(tab => tab.id === 'contact'));
    assert.ok(profileSectionTabs(workspace).some(tab => tab.id === 'map'));
    assert.equal(workspace.website.pages.book, true, 'saved owner preferences remain unchanged');
  }
});

test('cooking education, pet supplies and ordinary retailers keep their existing commerce', () => {
  for (const categoryId of ['cooking_classes', 'pet_food', 'fashion', '', 'craft_workshops']) {
    const workspace = food(categoryId);
    assert.equal(isPresenceOnlyBusiness(workspace), false, categoryId);
    assert.deepEqual(profileTabs(workspace).map(tab => tab.id), ['home', 'book', 'buy']);
    assert.doesNotThrow(() => assertBusinessCommerceEnabled(workspace));
  }
});

test('explicit presence mode blocks commerce deep links including editor previews', () => {
  const workspace = { ...base, website: { ...base.website, profileMode: 'presence' } };
  for (const page of ['book', 'buy', 'shop', 'cart', 'checkout', 'success']) {
    assert.equal(resolveBusinessPublicPage(workspace, page), 'home');
    assert.equal(effectivePublicPages(workspace)[page], false);
  }
  for (const page of ['home', 'about', 'contact', 'map', 'gallery']) assert.equal(resolveBusinessPublicPage(workspace, page), page);
  assert.throws(() => assertBusinessCommerceEnabled(workspace), error => error.code === 'failed-precondition');
  assert.equal(isPresenceOnlyBusiness(food('restaurants_takeaways')), true);
  assert.equal(isPresenceOnlyBusiness({ ...food('restaurants_takeaways'), website: { categoryId: 'restaurants_takeaways', profileMode: 'commerce' } }), true);
});

test('discovery keeps food businesses as places without advertising Book or Buy', () => {
  const normalized = normalizeBiz(food('bakery_specialty'));
  assert.equal(normalized.brandName, base.brandName);
  assert.equal(normalized.categoryId, 'bakery_specialty');
  assert.equal(normalized.profileMode, 'presence');
  assert.equal(normalized.pages.book, false);
  assert.equal(normalized.pages.buy, false);
  assert.equal(normalizeBiz({ slug: 'place', profileMode: 'presence', pages: { buy: true } }).pages.buy, false);
  const place = { ...normalized, venueMode: 'physical', locationLat: -33.9, locationLng: 18.4 };
  const prefs = { clientLat: -33.9, clientLng: 18.4, maxKm: 10 };
  assert.equal(filterDiscoverBusinesses([place], prefs).length, 1);
  assert.equal(filterDiscoverBusinesses([place], { ...prefs, categoryIds: ['mode:buy'] }).length, 0);
});

test('public snapshots withhold food commerce while retaining the business card', () => {
  const workspace = { ...food('food_pantry'), email: 'hello@place.example', phone: '+27215550000', paymentGateways: [{ enabled: true, configured: true, gatewayType: 'cash' }] };
  const snapshot = buildPublicWorkspaceSnapshot(workspace);
  assert.equal(snapshot.email, workspace.email);
  assert.equal(snapshot.website.aboutBody, workspace.website.aboutBody);
  assert.equal(snapshot.website.profileMode, 'presence');
  assert.deepEqual(snapshot.products, []);
  assert.deepEqual(snapshot.services, []);
  assert.deepEqual(snapshot.paymentGateways, []);
  assert.equal(snapshot.website.pages.buy, false);
  assert.equal(workspace.products.length, 1);
});

test('business-card social links publish supported URLs without unsafe or private map values', () => {
  const links = { instagram: ' https://instagram.com/localplace ', facebook: 'javascript:alert(1)', tiktok: 'not a URL', youtube: 'https://user:password@youtube.com', privateNotes: 'private', x: 'https://x.com/localplace' };
  assert.deepEqual(publicBusinessSocialLinks(links), { instagram: 'https://instagram.com/localplace', x: 'https://x.com/localplace' });
  const snapshot = buildPublicWorkspaceSnapshot({ ...food('restaurants_takeaways'), website: { ...food('restaurants_takeaways').website, socialLinks: links } });
  assert.deepEqual(snapshot.website.socialLinks, { instagram: 'https://instagram.com/localplace', x: 'https://x.com/localplace' });
});

test('server and builder reject commerce bindings in presence-only published websites', () => {
  const sandbox = { window: {} };
  runInNewContext(readFileSync('public/builder/website-contract.js', 'utf8'), sandbox);
  const storefrontSandbox = { window: {} };
  runInNewContext(readFileSync('public/storefront/website-contract.js', 'utf8'), storefrontSandbox);
  for (const validate of [validateWebsiteBindings, sandbox.window.BookBuyWebsiteContract.validateWebsiteBindings, storefrontSandbox.window.BookBuyWebsiteContract.validateWebsiteBindings]) {
    const catalog = { profileMode: 'presence', products: [], services: [] };
    for (const html of ['<button data-bb-action="cart.open">Cart</button>', '<section data-bb-catalog="products"></section>', '<button data-bb-service-id="s">Book</button>', '<span data-bb-bind="cart.count"></span>']) {
      assert.throws(() => validate(html, catalog), /Presence-only/);
    }
    const manifest = validate('<main data-bb-id="place">Our place</main>', catalog, { preserve: true, previousHtml: '<button data-bb-action="cart.open">Cart</button>' });
    assert.equal(manifest.bindings.length, 0);
  }
});

test('published runtime hides stale commerce without changing business content or designer visibility', () => {
  class Node {
    constructor(attrs = {}, hidden = false) { this.attrs = { ...attrs }; this.hidden = hidden; this.dataset = {}; }
    hasAttribute(key) { return Object.hasOwn(this.attrs, key); }
    setAttribute(key, value) { this.attrs[key] = value; }
    removeAttribute(key) { delete this.attrs[key]; }
  }
  for (const file of ['public/builder/runtime-sdk.js', 'public/storefront/runtime-sdk.js']) {
    const card = new Node({ 'data-bb-product-id': 'p' });
    const cart = new Node({ 'data-bb-action': 'cart.open' });
    const hidden = new Node({ 'data-bb-action': 'checkout.create' }, true);
    const contact = new Node();
    const listeners = {}, port = { start() {} }, parent = { postMessage() {} };
    const window = { addEventListener(type, handler) { listeners[type] = handler; }, dispatchEvent() {} };
    const document = { addEventListener() {}, querySelectorAll(selector) { return selector.includes(', [data-bb-product-id]') ? [card, cart, hidden] : []; } };
    runInNewContext(readFileSync(file, 'utf8'), { window, document, parent, CustomEvent: class {}, setTimeout, clearTimeout });
    window.BookBuyRuntimeInstaller();
    listeners.message({ source: parent, data: { type: 'bookbuy-runtime-connect' }, ports: [port] });
    const update = profileMode => port.onmessage({ data: { type: 'catalog-update', catalog: { profileMode, products: [], services: [] } } });
    update('presence'); update('presence');
    for (const node of [card, cart, hidden]) assert.equal(node.hidden, true);
    assert.equal(contact.hidden, false);
    update('commerce');
    assert.equal(card.hidden, false);
    assert.equal(cart.hidden, false);
    assert.equal(hidden.hidden, true);
  }
});
