import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';

function timers() {
  let nextId = 0;
  const timeouts = new Map(), intervals = new Map();
  return {
    timeouts, intervals,
    setTimeout: callback => { const id = ++nextId; timeouts.set(id, callback); return id; },
    clearTimeout: id => timeouts.delete(id),
    setInterval: callback => { const id = ++nextId; intervals.set(id, callback); return id; },
    clearInterval: id => intervals.delete(id)
  };
}

function bridgeFixture() {
  const clock = timers(), messages = [], listeners = new Map();
  const location = { origin: 'https://owner.example', pathname: '/builder/index.html', search: '?embedded=1&workspace=owner' };
  const parent = { postMessage: (data, origin) => messages.push({ data, origin }) };
  const window = { addEventListener: (name, callback) => listeners.set(name, callback), dispatchEvent() {} };
  runInNewContext(readFileSync(new URL('../public/builder/commerce.js', import.meta.url), 'utf8'), {
    window, parent, location, crypto: webcrypto, ...clock, DOMException, Event,
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } }
  });
  return { clock, messages, location, parent, window, receive(data, overrides = {}) { listeners.get('message')({ source: parent, origin: location.origin, data: { source: 'bookbuy-workspace', ...data }, ...overrides }); } };
}

test('builder retries missed catalog handshakes and sends host requests only after the trusted host answers', async () => {
  const fixture = bridgeFixture();
  const pending = fixture.window.BookBuyCommerce.hostRequest('website.draft.load', { projectId: 'design' });
  assert.equal(fixture.messages.some(row => row.data.type === 'host-request'), false);
  assert.equal(fixture.clock.intervals.size, 1);
  [...fixture.clock.intervals.values()][0]();
  assert.equal(fixture.messages.filter(row => row.data.type === 'catalog-request').length, 3);
  fixture.receive({ type: 'catalog-context', context: { products: [], services: [] } }, { origin: 'https://attacker.example' });
  await Promise.resolve();
  assert.equal(fixture.messages.some(row => row.data.type === 'host-request'), false);
  fixture.receive({ type: 'catalog-context', context: { products: [], services: [] } });
  await new Promise(resolve => setImmediate(resolve));
  const request = fixture.messages.find(row => row.data.type === 'host-request');
  assert.equal(request.data.operation, 'website.draft.load');
  assert.equal(request.origin, fixture.location.origin);
  assert.equal(fixture.clock.intervals.size, 0);
  fixture.receive({ type: 'host-response', requestId: request.data.requestId, result: { project: null, revision: 0 } });
  assert.equal((await pending).revision, 0);
  assert.equal(fixture.clock.timeouts.size, 0);
});

test('readiness probes answer only after the editor initializes and reject untrusted probes', () => {
  const fixture = bridgeFixture();
  fixture.receive({ type: 'host-check-ready' });
  assert.equal(fixture.messages.some(row => row.data.type === 'builder-ready'), false);
  fixture.window.BookBuyBuilderReady = true;
  fixture.receive({ type: 'host-check-ready' }, { source: {} });
  fixture.receive({ type: 'host-check-ready' }, { origin: 'https://attacker.example' });
  assert.equal(fixture.messages.some(row => row.data.type === 'builder-ready'), false);
  fixture.receive({ type: 'host-check-ready' });
  assert.deepEqual(JSON.parse(JSON.stringify(fixture.messages.at(-1))), { data: { source: 'bookbuy-builder-host', type: 'builder-ready', url: fixture.location.pathname + fixture.location.search }, origin: fixture.location.origin });
});

const pageSource = readFileSync(new URL('../src/features/builder/pages/WebsiteBuilderPage.jsx', import.meta.url), 'utf8');
const page = ts.createSourceFile('WebsiteBuilderPage.jsx', pageSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
function findNode(predicate) {
  let found;
  function visit(node) { if (predicate(node)) { found = node; return; } if (!found) ts.forEachChild(node, visit); }
  visit(page);
  assert.ok(found, 'The actual builder callback must be found.');
  return found;
}
const receiveEffect = findNode(node => ts.isCallExpression(node) && node.expression.getText(page) === 'useEffect' && node.arguments[0]?.getText(page).includes("event.data.type === 'builder-ready'"));
const loadingEffect = findNode(node => ts.isCallExpression(node) && node.expression.getText(page) === 'useEffect' && node.arguments[0]?.getText(page).includes('isCurrentFrameReady'));
const onLoad = findNode(node => ts.isJsxAttribute(node) && node.name.getText(page) === 'onLoad');
function actualCallback(node, context) {
  const callback = ts.isCallExpression(node) ? node.arguments[0] : node.initializer.expression;
  return runInNewContext(ts.transpileModule(`(${callback.getText(page)})`, { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText, context);
}
function pageFixture() {
  const clock = timers(), messages = [], listeners = new Map(), states = [];
  const contentWindow = { postMessage: (data, origin) => messages.push({ data, origin }) };
  const window = { location: { origin: 'https://owner.example' }, ...clock, addEventListener: (name, callback) => listeners.set(name, callback), removeEventListener: name => listeners.delete(name) };
  const context = {
    window, frameUrl: '/builder/index.html?embedded=1&workspace=owner',
    frameRef: { current: { contentWindow } }, readyFrame: { current: null }, loadTimer: { current: null },
    commerceContext: { products: [], services: [] }, cart: { count: 0, subtotalCents: 0 },
    setLoadState: value => states.push(value), activeRequests: { current: new Map() }
  };
  context.finishLoading = state => { clock.clearTimeout(context.loadTimer.current); states.push(state); };
  actualCallback(receiveEffect, context)();
  return { clock, context, states, messages, receive(data, overrides = {}) { listeners.get('message')({ source: context.frameRef.current.contentWindow, origin: window.location.origin, data: { source: 'bookbuy-builder-host', ...data }, ...overrides }); }, load() { return actualCallback(loadingEffect, context)(); }, onLoad() { actualCallback(onLoad, context)(); } };
}

test('an early initialized-frame message survives the parent loading effect without a false slow warning', () => {
  const fixture = pageFixture();
  fixture.receive({ type: 'builder-ready', url: fixture.context.frameUrl });
  fixture.load();
  assert.deepEqual(fixture.states, ['ready', 'ready']);
  assert.equal(fixture.clock.timeouts.size, 0);
});

test('loaded documents and stale or forged messages cannot mark a dead or replacement editor ready', () => {
  const fixture = pageFixture();
  fixture.load(); fixture.onLoad();
  assert.deepEqual(fixture.states, ['loading']);
  assert.ok(fixture.messages.some(row => row.data.type === 'host-check-ready'));
  fixture.receive({ type: 'builder-ready', url: '/builder/index.html?workspace=other' });
  fixture.receive({ type: 'builder-ready', url: fixture.context.frameUrl }, { source: {} });
  fixture.receive({ type: 'builder-ready', url: fixture.context.frameUrl }, { origin: 'https://attacker.example' });
  [...fixture.clock.timeouts.values()][0]();
  assert.equal(fixture.states.at(-1), 'slow');
  fixture.receive({ type: 'builder-ready', url: fixture.context.frameUrl });
  assert.equal(fixture.states.at(-1), 'ready');
  fixture.context.frameRef.current.contentWindow = { postMessage() {} };
  fixture.load();
  assert.equal(fixture.states.at(-1), 'loading');
  [...fixture.clock.timeouts.values()][0]();
  assert.equal(fixture.states.at(-1), 'slow', 'A new iframe cannot inherit the previous iframe readiness.');
});
