import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import ts from 'typescript';

test('Home upcoming bookings follow Schedule dates, confirmed status, business clock and live updates', () => {
  const require = createRequire(import.meta.url);
  const previousWindow = globalThis.window, previousNow = Date.now;
  let now = Date.parse('2026-10-05T09:30:00Z'), refresh, focusRefresh;
  Date.now = () => now;
  globalThis.window = { setInterval(callback) { refresh = callback; return 1; }, clearInterval() {},
    addEventListener(event, callback) { if (event === 'focus') focusRefresh = callback; }, removeEventListener() {} };
  try {
    let cursor = 0;
    const state = [], effects = [], modules = new Map();
    const Stat = () => null, Period = () => null, Picker = () => null;
    const hooks = { ...React, useState(initial) { const index = cursor++; state[index] ??= typeof initial === 'function' ? initial() : initial;
      return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }]; },
      useMemo: factory => factory(), useEffect: callback => effects.push(callback) };
    const record = (id, extra = {}) => ({ id, status: 'confirmed', dateKey: '2026-10-05', time: '12:00', durationMinutes: 60, ...extra });
    let bookings = [record('next'), record('past', { time: '09:00' }), record('pending', { status: 'pending' }),
      record('waitlist', { status: 'waitlist' }), record('missing', { time: '' }), record('cancelled', { status: 'cancelled' }),
      record('later-week', { dateKey: '2026-10-06' }), record('next-month', { dateKey: '2026-11-01' })];
    const mocks = {
      '../../auth/AuthContext': { useAuth: () => ({ user: {} }) },
      '../../workspace/WorkspaceContext': { useWorkspace: () => ({ workspace: { isDemo: true, timezone: 'Africa/Johannesburg', currency: 'R' }, staff: [], services: [], orders: [], bookings }) },
      '../hooks/useWorkspaceBadges': { useWorkspaceBadges: () => ({ pendingRequests: 1, pendingOrders: 0, unreadSupport: 0 }) },
      '../../analytics/hooks/useLivePresence': { useLivePresence: () => ({ sessions: [], total: 0 }) },
      '../../analytics/components/AnalyticsLiveWorldMap': { AnalyticsLiveWorldMap: () => null },
      '../../../shared/ui/DashboardStat': { DashboardStat: Stat },
      '../../../shared/ui/PeriodSegmentedControl': { PeriodSegmentedControl: Period },
      '../../../shared/ui/PeriodCustomPicker': { PeriodCustomPicker: Picker }
    };
    function load(path) {
      const file = new URL(path, import.meta.url);
      if (modules.has(file.href)) return modules.get(file.href);
      const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
      const module = { exports: {} }; modules.set(file.href, module.exports);
      new Function('module', 'exports', 'require', outputText)(module, module.exports, id => {
        if (id === 'react') return hooks;
        if (id.endsWith('.css')) return {};
        if (mocks[id]) return mocks[id];
        if (!id.startsWith('.')) return require(id);
        const base = new URL(id, file);
        return load([base, ...['.js', '.jsx', '.ts'].map(extension => new URL(base.href + extension))].find(existsSync).href);
      });
      return module.exports;
    }
    const { OverviewPage } = load('../src/features/dashboard/pages/OverviewPage.jsx');
    const flatten = (tree, found = []) => { if (Array.isArray(tree)) tree.forEach(node => flatten(node, found));
      else if (React.isValidElement(tree)) { found.push(tree); flatten(tree.props.children, found); } return found; };
    const render = () => { cursor = 0; effects.length = 0; return flatten(OverviewPage()); };
    const count = nodes => nodes.find(node => node.type === Stat && node.props.label === 'Upcoming bookings').props.value;
    let nodes = render(); effects.forEach(effect => effect());
    assert.equal(count(nodes), 2, 'Week excludes past, pending, waitlisted, invalid and cancelled bookings');
    nodes.find(node => node.type === Period).props.onChange('day');
    assert.equal(count(render()), 1);
    now = Date.parse('2026-10-05T10:00:00Z'); refresh();
    assert.equal(count(render()), 0, 'A booking stops being upcoming at its real business start time');
    nodes = render(); nodes.find(node => node.type === Period).props.onChange('all');
    assert.equal(count(render()), 2, 'All time includes future confirmed bookings outside this month');
    nodes = render(); nodes.find(node => node.type === Picker).props.onApply({ from: '2026-10-06', to: '2026-10-06' });
    assert.equal(count(render()), 1);
    bookings = bookings.map(row => row.id === 'later-week' ? { ...row, status: 'cancelled', revision: 2 } : row);
    focusRefresh();
    assert.equal(count(render()), 0, 'An accepted cancellation updates Home immediately');
  } finally { Date.now = previousNow; if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow; }
});
