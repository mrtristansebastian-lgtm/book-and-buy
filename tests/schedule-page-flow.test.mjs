import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function elements(tree, predicate, found = []) {
  if (Array.isArray(tree)) tree.forEach(node => elements(node, predicate, found));
  else if (React.isValidElement(tree)) {
    if (predicate(tree)) found.push(tree);
    elements(tree.props.children, predicate, found);
  }
  return found;
}

test('Schedule totals, period switches, filters and booking actions use the same live records', () => {
  const priorWindow = globalThis.window;
  const priorDocument = globalThis.document;
  const priorFrame = globalThis.requestAnimationFrame;
  const priorCancelFrame = globalThis.cancelAnimationFrame;
  const priorNow = Date.now;
  const instant = Date.parse('2026-10-05T09:30:00Z');
  Date.now = () => instant;
  const location = { hash: '#/demo/schedule', replace(value) { this.hash = value; } };
  const handlers = new Map();
  globalThis.window = { location, innerWidth: 390, setInterval: () => 1, clearInterval() {}, addEventListener() {}, removeEventListener() {} };
  globalThis.document = { addEventListener: (event, handler) => handlers.set(event, handler), removeEventListener: event => handlers.delete(event) };
  globalThis.requestAnimationFrame = callback => { callback(); return 1; };
  globalThis.cancelAnimationFrame = () => {};
  try {
    let cursor = 0;
    let effects = [];
    const slots = [];
    let focusedThread = '';
    const booking = (id, extra = {}) => ({ id, dateKey: '2026-10-05', time: '12:00', durationMinutes: 60,
      status: 'confirmed', serviceName: 'Consultation', clientName: id, staffId: 'team', ...extra });
    let bookings = [booking('next'), booking('earlier', { time: '09:00' }), booking('class', { dateKey: '2026-10-06', scheduleType: 'class_session' }),
      booking('request', { status: 'pending', time: '14:00' }), booking('missing', { dateKey: '', time: '' })];
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
    const Stat = () => null, Chip = () => null, Period = () => null, Picker = () => null;
    const Calendar = () => null, Agenda = () => null, Details = () => null;
    const modules = new Map();
    const mocks = {
      '../../../shared/ui/DashboardStat': { DashboardStat: Stat },
      '../../../shared/ui/FilterChip': { FilterChip: Chip },
      '../../../shared/ui/PeriodSegmentedControl': { PeriodSegmentedControl: Period },
      '../../../shared/ui/PeriodCustomPicker': { PeriodCustomPicker: Picker },
      '../components/AvailabilityMonthGrid': { AvailabilityMonthGrid: Calendar },
      '../components/ScheduleAgenda': { ScheduleAgenda: Agenda },
      '../components/ScheduleBookingDetails': { ScheduleBookingDetails: Details },
      '../hooks/useScheduleReschedules': { useScheduleReschedules: () => ({ pendingIds: new Set(['next']), proposalsByBooking: new Map(), loading: false, error: '', incomplete: false }) },
      '../../support/utils/supportFormat': { setSupportFocusThread: id => { focusedThread = id; } },
      '../../workspace/WorkspaceContext': { useWorkspace: () => ({ bookings, services: [], staff: [{ id: 'team', name: 'Team member' }],
        workspace: { isDemo: true, timezone: 'Africa/Johannesburg', availabilityRules: {} } }) }
    };
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
        if (mocks[id]) return mocks[id];
        if (!id.startsWith('.')) return require(id);
        const base = new URL(id, file);
        const target = [base, ...['.js', '.jsx', '.ts'].map(extension => new URL(base.href + extension))].find(existsSync);
        return load(target.href);
      });
      return module.exports;
    }
    const { SchedulePage } = load('../src/features/schedule/pages/SchedulePage.jsx');
    const render = () => { cursor = 0; effects = []; const tree = SchedulePage(); effects.forEach(effect => effect()); return tree; };
    const props = (tree, type) => elements(tree, node => node.type === type)[0]?.props;
    const agendaIds = tree => props(tree, Agenda).groups.flatMap(group => group.items.map(row => row.booking.id));
    let tree = render();
    assert.deepEqual(elements(tree, node => node.type === Stat).map(node => node.props.value), ['1', '2', '2']);
    assert.deepEqual(agendaIds(tree), ['earlier', 'next']);
    assert.equal(props(tree, Calendar).todayKey, '2026-10-05');
    let calendarFocused = 0, calendarRevealed = 0, triggerFocused = 0;
    const dateTrigger = elements(tree, node => node.type === 'button' && node.props['aria-controls'] === 'schedule-date-picker')[0];
    dateTrigger.ref.current = { focus: () => { triggerFocused++; }, contains: () => false };
    elements(tree, node => node.type === 'aside')[0].ref.current = {
      querySelector: () => ({ focus: () => { calendarFocused++; } }), scrollIntoView: () => { calendarRevealed++; }, contains: () => false
    };
    dateTrigger.props.onClick();
    tree = render();
    assert.equal(calendarFocused, 1, 'Opening the mobile calendar moves keyboard focus into the dates');
    assert.equal(calendarRevealed, 1, 'An expanded vertical calendar is brought into view');
    handlers.get('keydown')({ key: 'Escape' });
    tree = render();
    assert.equal(triggerFocused, 1, 'Escape returns focus to the date trigger');
    assert.doesNotMatch(elements(tree, node => node.type === 'aside')[0].props.className, /is-open/);
    elements(tree, node => node.type === Stat && node.props.label === 'This week')[0].props.onClick();
    tree = render();
    assert.equal(props(tree, Period).value, 'week');
    assert.deepEqual(agendaIds(tree), ['earlier', 'next', 'class']);
    elements(tree, node => node.type === Chip && node.props.children === 'Pending')[0].props.onClick();
    tree = render();
    assert.deepEqual(agendaIds(tree), ['request']);
    assert.deepEqual(elements(tree, node => node.type === Stat).map(node => node.props.value), ['1', '2', '2'], 'Status filters do not change the confirmed upcoming summaries');
    props(tree, Picker).onApply({ from: '2026-10-06', to: '2026-10-06' });
    props(render(), Period).onChange('day');
    elements(render(), node => node.type === Chip && node.props.children === 'Confirmed')[0].props.onClick();
    tree = render();
    assert.deepEqual(agendaIds(tree), ['class']);
    props(tree, Agenda).onView(props(tree, Agenda).groups[0].items[0]);
    tree = render();
    assert.equal(props(tree, Details).booking.id, 'class');
    bookings = bookings.map(record => record.id === 'class' ? { ...record, time: '15:00', revision: 2 } : record);
    tree = render();
    assert.equal(props(tree, Details).booking.time, '15:00', 'Open details follow accepted reschedules');
    bookings = bookings.map(record => record.id === 'class' ? { ...record, status: 'cancelled' } : record);
    assert.equal(props(render(), Details), undefined, 'An inactive booking closes its Schedule details');
    bookings = bookings.map(record => record.id === 'class' ? { ...record, status: 'confirmed' } : record);
    tree = render();
    assert.equal(props(tree, Details), undefined, 'Restoring a booking does not reopen a dismissed sheet');
    props(tree, Agenda).onView(props(tree, Agenda).groups[0].items[0]);
    tree = render();
    props(tree, Details).onViewRequests(props(tree, Details).booking);
    assert.equal(location.hash, '/demo/requests?booking=class');
    location.hash = '#/demo/schedule';
    props(tree, Details).onOpenConversation('existing-thread');
    assert.equal(focusedThread, 'existing-thread');
    assert.equal(location.hash, '/demo/communications');
  } finally {
    Date.now = priorNow;
    if (priorWindow === undefined) delete globalThis.window;
    else globalThis.window = priorWindow;
    if (priorDocument === undefined) delete globalThis.document;
    else globalThis.document = priorDocument;
    if (priorFrame === undefined) delete globalThis.requestAnimationFrame;
    else globalThis.requestAnimationFrame = priorFrame;
    if (priorCancelFrame === undefined) delete globalThis.cancelAnimationFrame;
    else globalThis.cancelAnimationFrame = priorCancelFrame;
  }
});
