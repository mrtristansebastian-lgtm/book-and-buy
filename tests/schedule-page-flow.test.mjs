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

function textContent(node) {
  if (Array.isArray(node)) return node.map(textContent).join('');
  if (React.isValidElement(node)) return textContent(node.props.children);
  return typeof node === 'string' || typeof node === 'number' ? String(node) : '';
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
    const workspace = { isDemo: true, timezone: 'Africa/Johannesburg', availabilityRules: {},
      staffAvailability: { team: { staffId: 'team', days: { '2026-10-06': { status: 'off' } } } } };
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
    const Chip = () => null, Period = () => null, Picker = () => null;
    const Calendar = () => null, Agenda = () => null, Details = () => null;
    const modules = new Map();
    const mocks = {
      '../../../shared/ui/FilterChip': { FilterChip: Chip },
      '../../../shared/ui/PeriodSegmentedControl': { PeriodSegmentedControl: Period },
      '../../../shared/ui/PeriodCustomPicker': { PeriodCustomPicker: Picker },
      '../components/AvailabilityMonthGrid': { AvailabilityMonthGrid: Calendar },
      '../components/ScheduleAgenda': { ScheduleAgenda: Agenda },
      '../components/ScheduleBookingDetails': { ScheduleBookingDetails: Details },
      '../hooks/useScheduleReschedules': { useScheduleReschedules: () => ({ pendingIds: new Set(['next']), proposalsByBooking: new Map(), loading: false, error: '', incomplete: false }) },
      '../../support/utils/supportFormat': { setSupportFocusThread: id => { focusedThread = id; } },
      '../../workspace/WorkspaceContext': { useWorkspace: () => ({ bookings, services: [], staff: [{ id: 'team', name: 'Team member' }],
        workspace }) }
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
    const { PeriodPageHeader } = load('../src/shared/ui/PeriodPageHeader.jsx');
    const render = () => { cursor = 0; effects = []; const tree = renderHeader(SchedulePage(), PeriodPageHeader); effects.forEach(effect => effect()); return tree; };
    const props = (tree, type) => elements(tree, node => node.type === type)[0]?.props;
    const agendaIds = tree => props(tree, Agenda).groups.flatMap(group => group.items.map(row => row.booking.id));
    const welcome = tree => textContent(elements(tree, node => node.type === 'section' && node.props.className === 'bb-agenda-welcome')[0]);
    let tree = render();
    assert.match(welcome(tree), /^You have 1 upcoming booking today\./);
    assert.equal(elements(tree, node => /bb-agenda-summary/.test(node.props.className || '')).length, 0, 'The welcome replaces dashboard stat cards');
    const main = elements(tree, node => node.props.className === 'bb-agenda-main')[0];
    const mainChildren = React.Children.toArray(main.props.children);
    assert.ok(mainChildren.findIndex(node => node.props.className === 'bb-agenda-controls') < mainChildren.findIndex(node => node.props.className === 'bb-agenda-welcome'), 'Period controls appear above the welcome');
    assert.match(elements(tree, node => node.props.className?.includes('bb-agenda-calendar ') )[0].props.className, /\bbb-schedule-avail\b/, 'The calendar inherits Availability Studio styling');
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
    props(tree, Period).onChange('week');
    tree = render();
    assert.equal(props(tree, Period).value, 'week');
    assert.match(welcome(tree), /^You have 2 upcoming bookings this week\./);
    assert.deepEqual(agendaIds(tree), ['earlier', 'next', 'class']);
    props(tree, Period).onChange('month');
    tree = render();
    assert.match(welcome(tree), /^You have 2 upcoming bookings this month\./);
    props(tree, Period).onChange('week');
    tree = render();
    elements(tree, node => node.type === Chip && node.props.children === 'Pending')[0].props.onClick();
    tree = render();
    assert.deepEqual(agendaIds(tree), ['request']);
    assert.match(welcome(tree), /^You have 2 upcoming bookings this week\./, 'Status filters do not change the confirmed upcoming welcome');
    props(tree, Picker).onApply({ from: '2026-10-06', to: '2026-10-06' });
    tree = render();
    assert.match(welcome(tree), /^You have 1 upcoming booking in this date range\./);
    props(render(), Period).onChange('day');
    elements(render(), node => node.type === Chip && node.props.children === 'Confirmed')[0].props.onClick();
    tree = render();
    assert.deepEqual(agendaIds(tree), ['class']);
    assert.match(welcome(tree), /^You have 1 upcoming booking on /);
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
    props(tree, Details).onClose();
    elements(render(), node => node.type === 'select' && node.props.id === 'schedule-mobile-staff')[0].props.onChange({ target: { value: 'team' } });
    tree = render();
    assert.match(welcome(tree), /Team member only\./);
    assert.equal(props(tree, Calendar).resolveStatus('2026-10-06'), 'off');
    workspace.staffAvailability = { team: { staffId: 'team', days: { '2026-10-06': { status: 'leave' } } } };
    tree = render();
    assert.equal(props(tree, Calendar).resolveStatus('2026-10-06'), 'leave', 'Availability edits update Schedule without a separate calendar copy');
    assert.equal(props(tree, Calendar).resolveStatus('2026-10-11'), 'business-closed');
    props(tree, Picker).onApply({ from: '2026-10-01', to: '2026-10-04' });
    tree = render();
    assert.match(welcome(tree), /^You have 0 upcoming bookings in this date range\./);
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
