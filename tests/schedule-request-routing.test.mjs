import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function renderHeader(tree, Header) {
  if (Array.isArray(tree)) return React.Children.map(tree, node => renderHeader(node, Header));
  if (!React.isValidElement(tree)) return tree;
  if (tree.type === Header) return renderHeader(Header(tree.props), Header);
  return React.cloneElement(tree, undefined, renderHeader(tree.props.children, Header));
}
function elements(tree, predicate, found = []) {
  if (Array.isArray(tree)) tree.forEach(node => elements(node, predicate, found));
  else if (React.isValidElement(tree)) {
    if (predicate(tree)) found.push(tree);
    elements(tree.props.children, predicate, found);
  }
  return found;
}

test('Schedule booking links reveal the matching request after loading, preserve filters and handle missing dates', () => {
  const oldWindow = globalThis.window;
  const location = { hash: '#/demo/requests?booking=future', replace(value) { this.hash = value; } };
  globalThis.window = { location };
  try {
    let cursor = 0;
    let effects = [];
    const slots = [];
    let bookings = [];
    const hooks = { ...React,
      useState(initial) {
        const index = cursor++;
        slots[index] ??= { value: typeof initial === 'function' ? initial() : initial };
        return [slots[index].value, value => { slots[index].value = typeof value === 'function' ? value(slots[index].value) : value; }];
      },
      useRef(value) { return slots[cursor++] ??= { current: value }; },
      useMemo(factory) { return factory(); },
      useEffect(effect, dependencies) {
        const index = cursor++;
        if (!slots[index] || dependencies.some((value, i) => value !== slots[index].dependencies[i])) {
          slots[index] = { dependencies }; effects.push(effect);
        }
      }
    };
    const Period = () => null;
    const Tabs = () => null;
    const modules = new Map();
    function load(path) {
      const file = new URL(path, import.meta.url);
      if (modules.has(file.href)) return modules.get(file.href);
      const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022
      } });
      const module = { exports: {} }; modules.set(file.href, module.exports);
      new Function('module', 'exports', 'require', outputText)(module, module.exports, id => {
        if (id === 'react') return hooks;
        if (id.endsWith('.css')) return {};
        if (id === '../../workspace/WorkspaceContext') return { useWorkspace: () => ({ bookings, services: [], staff: [] }) };
        if (id === '../../../shared/ui/PeriodSegmentedControl') return { PeriodSegmentedControl: Period };
        if (id === '../../ops-desk/components/OpsDeskPrimitives') return new Proxy({ OpsDeskTabs: Tabs }, { get: (target, key) => target[key] || (() => null) });
        if (!id.startsWith('.')) return require(id);
        const base = new URL(id, file);
        const target = [base, ...['.js', '.jsx', '.ts'].map(extension => new URL(base.href + extension))].find(existsSync);
        return load(target.href);
      });
      return module.exports;
    }
    const { BookingRequestsDesk } = load('../src/features/bookings/components/BookingRequestsDesk.jsx');
    const { PeriodPageHeader } = load('../src/shared/ui/PeriodPageHeader.jsx');
    const render = () => { cursor = 0; effects = []; const tree = renderHeader(BookingRequestsDesk({}), PeriodPageHeader); effects.forEach(effect => effect()); return tree; };
    const articleIds = tree => elements(tree, node => node.type === 'article').map(node => node.props.id);
    const period = tree => elements(tree, node => node.type === Period)[0].props;
    const tabs = tree => elements(tree, node => node.type === Tabs)[0].props;
    render();
    bookings = [
      { id: 'future', dateKey: '2040-07-12', time: '10:00', clientName: 'Future client', status: 'pending' },
      { id: 'other', dateKey: '2040-07-13', time: '09:00', clientName: 'Other client', status: 'confirmed' },
      { id: 'missing', time: '', clientName: 'Needs details', status: 'confirmed' }
    ];
    render();
    let tree = render();
    assert.equal(period(tree).value, 'day');
    assert.equal(tabs(tree).value, 'all');
    assert.deepEqual(articleIds(tree), ['request-booking-future']);
    assert.match(elements(tree, node => node.type === 'article')[0].props.className, /is-focused-booking/);
    tabs(tree).onChange('confirmed');
    assert.equal(tabs(render()).value, 'confirmed', 'Live updates do not force the selected status back');
    location.hash = '#/demo/requests?booking=missing';
    render(); tree = render();
    assert.equal(period(tree).value, 'all');
    assert.ok(articleIds(tree).includes('request-booking-missing'), 'Missing dates stay manageable');
    const clear = elements(tree, node => node.props.action === 'clear')[0];
    clear.props.onClick();
    assert.equal(location.hash, '#/demo/requests');
    location.hash = '#/dashboard/requests?booking=other';
    render(); tree = render();
    assert.deepEqual(articleIds(tree), ['request-booking-other'], 'Back/forward navigation selects the new record');
  } finally {
    if (oldWindow === undefined) delete globalThis.window;
    else globalThis.window = oldWindow;
  }
});
