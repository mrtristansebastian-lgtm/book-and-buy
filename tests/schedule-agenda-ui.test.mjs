import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function componentLoader(react = React) {
  const modules = new Map();
  const load = path => {
    const file = new URL(path, import.meta.url);
    if (modules.has(file.href)) return modules.get(file.href);
    const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022
    } });
    const module = { exports: {} }; modules.set(file.href, module.exports);
    new Function('module', 'exports', 'require', outputText)(module, module.exports, id => {
      if (id === 'react') return react;
      if (!id.startsWith('.')) return require(id);
      const base = new URL(id, file);
      const target = [base, ...['.js', '.jsx', '.ts'].map(extension => new URL(base.href + extension))].find(existsSync);
      return load(target.href);
    });
    return module.exports;
  };
  return load;
}
function elements(tree, predicate, found = []) {
  if (Array.isArray(tree)) tree.forEach(node => elements(node, predicate, found));
  else if (React.isValidElement(tree)) {
    if (predicate(tree)) found.push(tree);
    elements(tree.props.children, predicate, found);
  }
  return found;
}
const row = (id, extra = {}) => ({ booking: { id, status: 'confirmed', paymentStatus: 'paid' },
  dateKey: '2026-10-05', time: '12:00', endDateKey: '2026-10-05', endTime: '13:00',
  startValid: true, endValid: true, durationMinutes: 60, phase: 'upcoming', kind: 'appointment',
  clientName: `Client ${id}`, serviceName: 'Consultation', staffName: 'Sam', staff: { name: 'Sam' }, ...extra });
const load = componentLoader();
const { ScheduleBookingRow } = load('../src/features/schedule/components/ScheduleBookingRow.jsx');
const { formatDisplayDate } = load('../src/utils/dates.js');
const renderRow = props => renderToStaticMarkup(React.createElement(ScheduleBookingRow, props));

test('multi-day classes display their real ending date and carryover start without calling it next day', () => {
  const html = renderRow({ row: row('class', { kind: 'class_session', carryover: true,
    endDateKey: '2026-10-12', endTime: '15:00', durationMinutes: 10260 }), isNext: true });
  assert.ok(html.includes(`${formatDisplayDate('2026-10-12')} · 15:00`));
  assert.ok(html.includes(`Started ${formatDisplayDate('2026-10-05')} at 12:00`));
  assert.match(html, /Class booking/);
  assert.match(html, /Next up/);
  assert.doesNotMatch(html, /Next day|10260 min/);
  assert.match(html, /aria-label="View booking for Client class"/);
});

test('unknown duration remains visible with friendly explanation and no invented end or raw payment key', () => {
  const html = renderRow({ row: row('unknown', { endValid: false, endTime: '', durationMinutes: null,
    phase: 'unknown', attentionReason: 'End time not recorded', booking: { id: 'unknown', status: 'confirmed', paymentStatus: 'provider_unrecognized_pending' } }), hasReschedule: true });
  assert.match(html, /End time not recorded/);
  assert.match(html, /Reschedule requested/);
  assert.doesNotMatch(html, /Until|provider_unrecognized_pending|Earlier/);
  const malformed = renderRow({ row: row('bad', { startValid: false, time: 'banana' }), conflict: { label: 'Booking time needs attention' } });
  assert.match(malformed, /Time to confirm/);
  assert.match(malformed, /Booking time needs attention/);
  assert.doesNotMatch(malformed, /banana/);
});

test('agenda pagination spans day groups, loads the remaining booking once and resets when the view changes', () => {
  let cursor = 0;
  let effects = [];
  const slots = [];
  const hooks = { ...React,
    useState(initial) {
      const index = cursor++;
      slots[index] ??= { value: typeof initial === 'function' ? initial() : initial };
      return [slots[index].value, value => { slots[index].value = typeof value === 'function' ? value(slots[index].value) : value; }];
    },
    useEffect(effect, dependencies) {
      const index = cursor++;
      if (!slots[index] || dependencies.some((value, i) => value !== slots[index].dependencies[i])) {
        slots[index] = { dependencies }; effects.push(effect);
      }
    }
  };
  const { ScheduleAgenda } = componentLoader(hooks)('../src/features/schedule/components/ScheduleAgenda.jsx');
  const groups = [{ dateKey: '2026-10-05', items: Array.from({ length: 23 }, (_, i) => row(`first-${i}`)) },
    { dateKey: '2026-10-06', items: Array.from({ length: 8 }, (_, i) => row(`second-${i}`, { dateKey: '2026-10-06' })) }];
  const render = resetKey => { cursor = 0; effects = []; const tree = ScheduleAgenda({ groups, todayKey: '2026-10-05', resetKey }); effects.forEach(effect => effect()); return tree; };
  const bookingIds = tree => elements(tree, node => node.props.row?.booking).map(node => node.props.row.booking.id);
  let tree = render('day-one');
  assert.equal(bookingIds(tree).length, 30);
  assert.match(renderToStaticMarkup(tree), /7 of 8 bookings/);
  elements(tree, node => node.props.children === 'Show more bookings')[0].props.onClick();
  tree = render('day-one');
  assert.equal(bookingIds(tree).length, 31);
  assert.equal(new Set(bookingIds(tree)).size, 31);
  assert.equal(elements(tree, node => node.props.children === 'Show more bookings').length, 0);
  render('day-two'); tree = render('day-two');
  assert.equal(bookingIds(tree).length, 30);
});

test('closed-day and ongoing headings preserve the bookings, while all-active empty copy stays clear', () => {
  // Server rendering uses the real hooks; it verifies the presented accessibility and copy.
  const { ScheduleAgenda } = load('../src/features/schedule/components/ScheduleAgenda.jsx');
  const html = renderToStaticMarkup(React.createElement(ScheduleAgenda, { groups: [{ dateKey: '2026-10-11', carryover: true,
    items: [row('closed', { dateKey: '2026-10-11', endDateKey: '2026-10-12', carryover: true })] }], todayKey: '2026-10-12' }));
  assert.ok(html.includes(`Started ${formatDisplayDate('2026-10-11')}`));
  assert.match(html, /Business closed/);
  assert.match(html, /Client closed/);
  assert.match(html, /aria-label="Booking agenda"/);
  const empty = renderToStaticMarkup(React.createElement(ScheduleAgenda, { groups: [], filter: 'active' }));
  assert.match(empty, /No bookings for these dates/);
  assert.doesNotMatch(empty, /Show all active bookings/);
});
