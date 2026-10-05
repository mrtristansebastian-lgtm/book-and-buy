import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import postcss from 'postcss';

const require = createRequire(import.meta.url);
const src = new URL('../src/', import.meta.url);

// Run component hooks/effects against deterministic DOM measurements. This is
// not a browser renderer: layout, pointer hit areas and visual QA remain separate.
function componentRuntime() {
  let current;
  const modules = new Map();
  const hooks = {
    ...React,
    useRef(initial) {
      const index = current.cursor++;
      return current.slots[index] ??= { current: initial };
    },
    useState(initial) {
      const frame = current;
      const index = frame.cursor++;
      frame.slots[index] ??= { value: typeof initial === 'function' ? initial() : initial };
      return [frame.slots[index].value, (next) => {
        frame.slots[index].value = typeof next === 'function' ? next(frame.slots[index].value) : next;
      }];
    },
    useEffect(effect, dependencies) {
      const index = current.cursor++;
      const previous = current.slots[index];
      if (!previous || !dependencies || dependencies.some((value, i) => !Object.is(value, previous.dependencies?.[i]))) {
        current.pending.push({ index, effect, dependencies });
      }
    },
    useMemo(factory) { current.cursor++; return factory(); },
    useId() { return `test-${current.cursor++}`; }
  };
  function load(url) {
    if (modules.has(url.href)) return modules.get(url.href);
    const exposeChart = url.pathname.endsWith('/RevenueChart.jsx') ? '\nexports.__ChartSvg = ChartSvg;' : '';
    const source = readFileSync(url, 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    });
    const module = { exports: {} };
    modules.set(url.href, module.exports);
    const scopedRequire = (id) => {
      if (id === 'react') return hooks;
      if (!id.startsWith('.')) return require(id);
      const base = new URL(id, url);
      const resolved = [base, new URL(`${base.href}.jsx`), new URL(`${base.href}.js`)].find((candidate) => existsSync(candidate));
      if (!resolved) throw new Error(`Cannot resolve ${id} from ${url.pathname}`);
      return load(resolved);
    };
    new Function('module', 'exports', 'require', outputText + exposeChart)(module, module.exports, scopedRequire);
    return module.exports;
  }
  function frame() {
    return {
      cursor: 0, slots: [], pending: [],
      render(Component, props) {
        this.cursor = 0;
        this.pending = [];
        current = this;
        try { return Component(props); } finally { current = undefined; }
      },
      flushEffects() {
        for (const { index, effect, dependencies } of this.pending) {
          this.slots[index]?.cleanup?.();
          this.slots[index] = { dependencies, cleanup: effect() };
        }
        this.pending = [];
      },
      unmount() { for (const slot of this.slots) slot?.cleanup?.(); }
    };
  }
  return { load: (path) => load(new URL(path, src)), frame };
}

function elements(tree, predicate) {
  const found = [];
  function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!React.isValidElement(node)) return;
    if (predicate(node)) found.push(node);
    visit(node.props.children);
  }
  visit(tree);
  return found;
}
const first = (tree, predicate) => elements(tree, predicate)[0];
const classIs = (name) => (node) => node.props.className === name;

function withGlobals(values, run) {
  const previous = new Map(Object.keys(values).map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  for (const [name, value] of Object.entries(values)) Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  try { return run(); } finally {
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
}

const series = [
  { at: Date.UTC(2026, 9, 1), amountInCents: 25000, label: '1 Oct' },
  { at: Date.UTC(2026, 9, 2), amountInCents: 100000, label: '2 Oct' },
  { at: Date.UTC(2026, 9, 3), amountInCents: 50000, label: '3 Oct' }
];

test('finance chart observes its canvas and recalculates measured responsive geometry', () => {
  const runtime = componentRuntime();
  const { __ChartSvg: ChartSvg } = runtime.load('features/finance/components/RevenueChart.jsx');
  const frame = runtime.frame();
  const observers = [];
  let measuredWidth = 375.4;
  const canvas = { getBoundingClientRect: () => ({ width: measuredWidth }) };
  const svgNode = { getBoundingClientRect: () => ({ left: 10, width: measuredWidth }) };
  let hovered;
  const props = { series, currency: 'R', width: 640, height: 300, pad: { top: 18, right: 26, bottom: 40, left: 88 }, gradientId: 'test', onHover: (point) => { hovered = point; } };
  const render = () => {
    const tree = frame.render(ChartSvg, props);
    first(tree, classIs('bb-finance-chart-canvas')).ref.current = canvas;
    first(tree, (node) => node.type === 'svg').ref.current = svgNode;
    return tree;
  };
  withGlobals({ ResizeObserver: class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
  } }, () => {
    render();
    frame.flushEffects();
    assert.equal(observers[0].target, canvas);
    let tree = render();
    assert.equal(first(tree, (node) => node.type === 'svg').props.viewBox, '0 0 375 300');
    assert.equal(first(tree, classIs('bb-finance-chart-hit')).props.width, 261);
    measuredWidth = 320.8;
    observers[0].callback();
    tree = render();
    const svg = first(tree, (node) => node.type === 'svg');
    assert.equal(svg.props.viewBox, '0 0 321 300');
    assert.equal(svg.props.role, 'img');
    assert.equal(svg.props['aria-label'], 'Revenue over time');
    svg.props.onPointerMove({ clientX: 10 + measuredWidth });
    assert.equal(hovered.label, '3 Oct');
    const labels = elements(tree, (node) => node.type === 'text' && node.props.className?.endsWith('--x'));
    assert.equal(labels[0].props.textAnchor, 'start');
    assert.equal(labels.at(-1).props.textAnchor, 'end');
    measuredWidth = 0;
    observers[0].callback();
    assert.equal(first(render(), (node) => node.type === 'svg').props.viewBox, '0 0 321 300');
    measuredWidth = 120;
    observers[0].callback();
    assert.equal(first(render(), (node) => node.type === 'svg').props.viewBox, '0 0 160 300');
    frame.unmount();
    assert.equal(observers[0].disconnected, true);
  });
});

test('analytics chart fits its actual narrow container and keeps money and endpoint labels inside the plot', () => {
  const runtime = componentRuntime();
  const { AnalyticsSalesChart } = runtime.load('features/analytics/components/AnalyticsSalesChart.jsx');
  const frame = runtime.frame();
  const observers = [];
  const wrap = {};
  const props = { series, currency: 'R', metricId: 'revenue' };
  const render = () => {
    const tree = frame.render(AnalyticsSalesChart, props);
    first(tree, classIs('bb-analytics-chart')).ref.current = wrap;
    return tree;
  };
  withGlobals({ ResizeObserver: class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
  } }, () => {
    render();
    frame.flushEffects();
    assert.equal(observers[0].target, wrap);
    observers[0].callback([{ contentRect: { width: 264.9 } }]);
    let tree = render();
    assert.equal(first(tree, (node) => node.type === 'svg').props.viewBox, '0 0 264 220');
    const moneyTicks = elements(tree, (node) => node.type === 'text' && node.props.textAnchor === 'end' && node.props.y < 200);
    assert.equal(moneyTicks[0].props.x, 68, 'Money axis has a readable 76px gutter on narrow screens');
    let dates = elements(tree, (node) => node.type === 'text' && node.props.y > 200);
    assert.equal(dates[0].props.textAnchor, 'start');
    assert.equal(dates.at(-1).props.textAnchor, 'end');
    observers[0].callback([{ contentRect: { width: 1543.2 } }]);
    tree = render();
    assert.equal(first(tree, (node) => node.type === 'svg').props.viewBox, '0 0 1543 280');
    const desktopMoneyTicks = elements(tree, (node) => node.type === 'text' && node.props.textAnchor === 'end' && node.props.y < 240);
    assert.equal(desktopMoneyTicks[0].props.x, 80);
    observers[0].callback([{ contentRect: { width: 120 } }]);
    assert.equal(first(render(), (node) => node.type === 'svg').props.viewBox, '0 0 160 220');
    frame.unmount();
    assert.equal(observers[0].disconnected, true);
  });
});

test('expanded revenue chart is a labelled modal, traps focus and restores its trigger on Escape', () => {
  const runtime = componentRuntime();
  const { RevenueChart } = runtime.load('features/finance/components/RevenueChart.jsx');
  const frame = runtime.frame();
  const listeners = new Map();
  const document = { activeElement: null, body: { style: { overflow: 'auto' } } };
  function focusable() {
    return { isConnected: true, getClientRects: () => [{}], focus() { document.activeElement = this; } };
  }
  const trigger = focusable();
  const close = focusable();
  const panel = {
    ...focusable(), querySelectorAll: () => [close], contains: (item) => item === close,
    addEventListener: (type, handler) => listeners.set(type, handler),
    removeEventListener: (type) => listeners.delete(type)
  };
  document.activeElement = trigger;
  withGlobals({ document, requestAnimationFrame: (callback) => { callback(); return 1; }, cancelAnimationFrame: () => {}, window: { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) } }, () => {
    let tree = frame.render(RevenueChart, { series });
    const expandButton = first(tree, (node) => node.props['aria-label'] === 'Expand chart');
    expandButton.ref.current = trigger;
    frame.flushEffects();
    expandButton.props.onClick();
    tree = frame.render(RevenueChart, { series });
    const dialog = first(tree, (node) => node.props.role === 'dialog');
    assert.equal(dialog.props['aria-modal'], 'true');
    assert.equal(dialog.props['aria-label'], 'Revenue chart');
    assert.equal(dialog.props.tabIndex, -1);
    dialog.ref.current = panel;
    frame.flushEffects();
    assert.equal(document.activeElement, close);
    assert.equal(document.body.style.overflow, 'hidden');
    let prevented = false;
    listeners.get('keydown')({ key: 'Tab', preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(document.activeElement, close);
    prevented = false;
    let stopped = false;
    listeners.get('keydown')({ key: 'Escape', preventDefault() { prevented = true; }, stopPropagation() { stopped = true; } });
    assert.equal(prevented && stopped, true);
    tree = frame.render(RevenueChart, { series });
    first(tree, (node) => node.props['aria-label'] === 'Expand chart').ref.current = trigger;
    frame.flushEffects();
    assert.equal(first(tree, (node) => node.props.role === 'dialog'), undefined);
    assert.equal(document.activeElement, trigger);
    assert.equal(document.body.style.overflow, 'auto');
    assert.equal(listeners.has('keydown'), false);
    frame.unmount();
  });
});

test('empty revenue periods remain clear and accessible without drawing fabricated data', () => {
  const runtime = componentRuntime();
  const { RevenueChart } = runtime.load('features/finance/components/RevenueChart.jsx');
  const tree = runtime.frame().render(RevenueChart, { series: [] });
  assert.equal(first(tree, classIs('bb-finance-chart-empty')).props.children, 'No paid revenue in this period yet.');
  assert.equal(first(tree, classIs('bb-finance-chart-canvas')), undefined);
  assert.ok(first(tree, (node) => node.props['aria-label'] === 'Expand chart'));
});

test('finance ledger names every filter and forwards each change without altering values', () => {
  const runtime = componentRuntime();
  const { FinanceLedgerToolbar } = runtime.load('features/finance/components/FinanceLedgerToolbar.jsx');
  const changes = [];
  const props = { tab: 'orders', status: 'pending', query: 'Aisha', sort: 'oldest',
    onTabChange: (value) => changes.push(['tab', value]),
    onStatusChange: (value) => changes.push(['status', value]),
    onQueryChange: (value) => changes.push(['query', value]),
    onSortChange: (value) => changes.push(['sort', value]),
    onOpenSettings: () => changes.push(['settings']), onDownload: () => changes.push(['download']) };
  const tree = FinanceLedgerToolbar(props);
  const named = (label) => first(tree, (node) => node.props['aria-label'] === label);
  assert.equal(named('Search receipts and invoices').props.value, 'Aisha');
  assert.equal(named('Payment status filter').props.value, 'pending');
  assert.equal(named('Sort receipts and invoices').props.value, 'oldest');
  assert.equal(named('Record source').props.role, 'tablist');
  named('Search receipts and invoices').props.onChange({ target: { value: 'Owen' } });
  named('Payment status filter').props.onChange({ target: { value: 'refunded' } });
  named('Sort receipts and invoices').props.onChange({ target: { value: 'newest' } });
  named('Payment settings').props.onClick();
  named('Download CSV').props.onClick();
  const tabs = elements(tree, (node) => node.props.role === 'tab');
  tabs[0].props.onClick();
  assert.equal(tabs[0].props.selected, false);
  assert.equal(tabs[1].props.selected, true);
  assert.deepEqual(changes, [['query', 'Owen'], ['status', 'refunded'], ['sort', 'newest'], ['settings'], ['download'], ['tab', 'bookings']]);
  const html = renderToStaticMarkup(React.createElement(FinanceLedgerToolbar, props));
  assert.match(html, /role="tab"[^>]*aria-selected="true"/);
  assert.match(html, /Order records/);
  assert.doesNotMatch(html, /aria-pressed=/);
});

test('reporting section scale and expanded-dialog bounds stay scoped and responsive', () => {
  const css = postcss.parse(readFileSync(new URL('../src/design/launch-polish.css', import.meta.url), 'utf8'));
  const declarations = (rule) => Object.fromEntries(rule.nodes.filter((node) => node.type === 'decl').map((node) => [node.prop, node.value]));
  const rules = [];
  css.walkRules((rule) => rules.push(rule));
  const headingRules = rules.filter((rule) => rule.selector.includes('.bb-analytics-panel-title'));
  assert.equal(declarations(headingRules[0])['font-size'], '24px');
  assert.equal(declarations(headingRules[1])['font-size'], '21px');
  assert.equal(headingRules[1].parent.params, '(max-width: 700px)');
  const dialog = declarations(rules.find((rule) => rule.selector === '.bb-finance-chart-overlay > [role="dialog"]'));
  assert.equal(dialog['max-width'], '100%');
  assert.equal(dialog['max-height'], 'calc(100dvh - 32px)');
  assert.equal(dialog.overflow, 'auto');
  const mobile = css.nodes.find((node) => node.type === 'atrule' && node.params === '(max-width: 700px)');
  const metrics = declarations(mobile.nodes.find((node) => node.selector === '.bb-finance-metrics'));
  assert.equal(metrics['grid-template-columns'], 'repeat(2, minmax(0, 1fr))');
  assert.equal(metrics.gap, '8px');
  const hero = declarations(mobile.nodes.find((node) => node.selector === '.bb-finance-metric--hero'));
  assert.equal(hero['grid-column'], '1 / -1');
});

test('stacked Orders and Requests summaries wrap instead of concealing payment and item details', () => {
  const css = postcss.parse(readFileSync(new URL('../src/design/ops-desk.css', import.meta.url), 'utf8'));
  const rules = [];
  css.walkRules('.bb-ops-meta', (rule) => rules.push(rule));
  const mobile = rules.find((rule) => rule.parent.type === 'atrule' && rule.parent.params === '(max-width: 980px)');
  assert.ok(mobile, 'The stacked operation layout must explicitly allow full summaries');
  const values = Object.fromEntries(mobile.nodes.filter((node) => node.type === 'decl').map((node) => [node.prop, node.value]));
  assert.equal(values['white-space'], 'normal');
  assert.equal(values.overflow, 'visible');
  assert.equal(values['text-overflow'], 'clip');
  assert.equal(values['overflow-wrap'], 'anywhere');
});
