import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import ts from 'typescript';
import { demoScheduleReschedules, mapScheduleReschedules, scheduleBookingThreadId } from '../src/features/schedule/utils/scheduleReschedules.js';
import { scheduleDetailsDateLabel, scheduleDetailsDuration, scheduleDetailsPayment, scheduleDetailsTimeLabel, scheduleDetailsWindowLabel } from '../src/features/schedule/utils/scheduleBookingDetails.js';
import { buildScheduleAgenda } from '../src/features/schedule/utils/scheduleAgenda.js';
const require = createRequire(import.meta.url);

test('pending reschedules preserve trusted booking/conversation context and report bounded coverage', () => {
  const records = [
    { id: 'booking-a', data: { bookingId: 'booking-a', ownerId: 'owner', status: 'pending', threadId: 'conversation-a', revision: 3 } },
    { id: 'booking-b', data: { bookingId: 'booking-b', ownerId: 'other', status: 'pending' } },
    { id: 'mismatch', data: { bookingId: 'booking-c', ownerId: 'owner', status: 'pending' } },
    { id: 'booking-d', data: { status: 'accepted' } },
    { id: 'booking-e', data: { status: 'pending', threadId: '../invalid' } }
  ];
  const result = mapScheduleReschedules(records, 'owner');
  assert.deepEqual([...result.pendingIds], ['booking-a', 'booking-e']);
  assert.equal(result.proposalsByBooking.get('booking-a').threadId, 'conversation-a');
  assert.equal(result.proposalsByBooking.get('booking-a').revision, 3);
  assert.equal(result.proposalsByBooking.get('booking-e').threadId, null);
  assert.equal(mapScheduleReschedules(records, 'owner', 1).incomplete, true);
  assert.equal(scheduleBookingThreadId({ id: 'booking-a' }, result.proposalsByBooking.get('booking-a')), 'conversation-a');
  assert.equal(scheduleBookingThreadId({ id: 'other' }, result.proposalsByBooking.get('booking-a')), null);
  assert.equal(scheduleBookingThreadId({ id: 'other' }, null, [{ id: 'existing', bookingId: 'other' }]), 'existing');
});

test('demo reschedule state follows the latest proposal while preserving its actual thread', () => {
  const result = demoScheduleReschedules([
    { id: 'thread-a', bookingId: 'a', messages: [{ type: 'reschedule', proposal: { status: 'pending' } }, { type: 'reschedule', proposal: { status: 'accepted' } }] },
    { id: 'thread-b', bookingId: 'b', messages: [{ type: 'reschedule', proposal: { status: 'pending', proposed: { dateKey: '2026-10-06', time: '13:00' } } }] }
  ]);
  assert.deepEqual([...result.pendingIds], ['b']);
  assert.equal(result.proposalsByBooking.get('b').threadId, 'thread-b');
});

function hookRunner() {
  const slots = []; let cursor = 0; let effects = [];
  const hooks = { ...React,
    useState(initial) { const index = cursor++; if (!slots[index]) slots[index] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[index].value, value => { slots[index].value = typeof value === 'function' ? value(slots[index].value) : value; }]; },
    useRef(initial) { const index = cursor++; if (!slots[index]) slots[index] = { current: initial }; return slots[index]; },
    useMemo(factory) { cursor++; return factory(); },
    useEffect(effect, dependencies) { const index = cursor++; const prior = slots[index];
      if (!prior || dependencies.some((dependency, i) => dependency !== prior.dependencies[i])) {
        prior?.cleanup?.(); const slot = { dependencies, cleanup: null }; slots[index] = slot;
        effects.push(() => { slot.cleanup = effect(); });
      } }
  };
  return { hooks, render(callback) { cursor = 0; const result = callback(); const pending = effects; effects = []; pending.forEach(effect => effect()); return result; } };
}
function compile(file, dependencies) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', 'require', output)(module, module.exports, id => id in dependencies ? dependencies[id] : require(id));
  return module.exports;
}

test('schedule listener resets on workspace changes, ignores stale callbacks and never subscribes in demo', () => {
  const runner = hookRunner(); const listeners = [];
  let workspace = { ownerId: 'owner-a', isDemo: false, threads: [] };
  const { useScheduleReschedules } = compile('../src/features/schedule/hooks/useScheduleReschedules.js', {
    react: runner.hooks, 'firebase/firestore': { collection: (_db, ...parts) => parts.join('/'), where: (...parts) => parts,
      limit: size => size, query: (...parts) => parts, onSnapshot: (query, success, failure) => { const listener = { query, success, failure, stopped: false }; listeners.push(listener); return () => { listener.stopped = true; }; } },
    '../../../config/appConfig': { APP_ID: 'test-app' }, '../../../shared/firebase/client': { getFirebase: () => ({ db: {} }) },
    '../../workspace/WorkspaceContext': { useWorkspace: () => ({ workspace }) },
    '../utils/scheduleReschedules': { demoScheduleReschedules, mapScheduleReschedules }
  });
  const render = () => runner.render(useScheduleReschedules);
  render(); assert.equal(render().loading, true);
  assert.match(listeners[0].query[0], /users\/owner-a\/rescheduleProposals/);
  assert.equal(listeners[0].query.at(-1), 201);
  const snapshot = id => ({ docs: [{ id, data: () => ({ bookingId: id, status: 'pending', threadId: 'thread' }) }] });
  listeners[0].success(snapshot('booking-a')); assert.deepEqual([...render().pendingIds], ['booking-a']);
  workspace = { ...workspace, ownerId: 'owner-b' }; assert.equal(render().pendingIds.size, 0);
  assert.equal(listeners[0].stopped, true); listeners[0].success(snapshot('stale')); assert.equal(render().pendingIds.size, 0);
  listeners[1].failure(); assert.match(render().error, /could not load/); assert.equal(render().loading, false);
  workspace = { ownerId: '', isDemo: true, threads: [{ id: 'demo-thread', bookingId: 'demo-booking', messages: [{ type: 'reschedule', proposal: { status: 'pending' } }] }] };
  assert.deepEqual([...render().pendingIds], ['demo-booking']); assert.equal(listeners.length, 2); assert.equal(listeners[1].stopped, true);
});

test('Communications retains requested conversation focus through asynchronous owner thread hydration', () => {
  const runner = hookRunner(); let remoteSuccess; let focusReads = 0;
  const workspace = { ownerId: 'owner', isDemo: false, brandName: 'Business' };
  const context = { workspace, threads: [{ id: 'local', updatedAt: 1 }], bookings: [], orders: [], clients: [],
    markThreadRead() {}, setThreadPresence() {} };
  const { useSupportInbox } = compile('../src/features/support/hooks/useSupportInbox.js', {
    react: runner.hooks, '../../workspace/WorkspaceContext': { useWorkspace: () => context },
    '../utils/supportFormat': { takeSupportFocusThread: () => ++focusReads === 1 ? 'requested-remote' : '' },
    'firebase/firestore': { collection: (...parts) => parts, doc: (...parts) => ({ parts }), query: (...parts) => parts, where: (...parts) => parts, limit: size => size,
      onSnapshot: (reference, callback) => { if (Array.isArray(reference)) remoteSuccess = callback; return () => {}; } },
    '../../../shared/firebase/client': { getFirebase: () => ({ db: {} }) }, '../../../config/appConfig': { APP_ID: 'test-app' },
    '../../client-app/clientThreadsApi': { subscribeThreadMessages: () => () => {} }
  });
  const render = () => runner.render(useSupportInbox);
  render(); render();
  remoteSuccess({ docs: [{ id: 'requested-remote', data: () => ({ ownerId: 'owner', updatedAt: 2 }) }] });
  render(); const focused = render();
  assert.equal(focused.activeId, 'requested-remote'); assert.equal(focused.mobileShowChat, true); assert.equal(focusReads, 1);
  focused.selectThread('local'); render();
  remoteSuccess({ docs: [{ id: 'requested-remote', data: () => ({ ownerId: 'owner', updatedAt: 3 }) }] });
  assert.equal(render().activeId, 'local', 'Later snapshots do not steal the user’s explicit selection');
});

test('Communications opens an existing owner conversation outside the inbox limit without creating content', () => {
  const runner = hookRunner(); const listeners = []; const messageSubscriptions = []; let writes = 0;
  const context = { workspace: { ownerId: 'owner-a', isDemo: false }, threads: [], bookings: [], orders: [], clients: [],
    markThreadRead() {}, setThreadPresence() {}, updateThread() { writes++; }, sendThreadMessage() { writes++; } };
  const { useSupportInbox } = compile('../src/features/support/hooks/useSupportInbox.js', {
    react: runner.hooks, '../../workspace/WorkspaceContext': { useWorkspace: () => context },
    '../utils/supportFormat': { takeSupportFocusThread: () => 'older-thread' },
    'firebase/firestore': { collection: (...parts) => parts, doc: (...parts) => ({ kind: 'document', id: parts.at(-1) }),
      query: (...parts) => ({ kind: 'query', parts }), where: (...parts) => parts, limit: size => size,
      onSnapshot: (reference, success, failure) => { const listener = { ...reference, success, failure, stopped: false }; listeners.push(listener); return () => { listener.stopped = true; }; },
      updateDoc: () => { writes++; }, writeBatch: () => { writes++; throw new Error('Navigation must not create a message'); } },
    '../../../shared/firebase/client': { getFirebase: () => ({ db: {} }) }, '../../../config/appConfig': { APP_ID: 'test-app' },
    '../../client-app/clientThreadsApi': { subscribeThreadMessages: (id, success) => { const subscription = { id, success, stopped: false }; messageSubscriptions.push(subscription); return () => { subscription.stopped = true; }; } }
  });
  const render = () => runner.render(useSupportInbox);
  render(); render();
  const query = listeners.find(item => item.kind === 'query');
  const focused = listeners.find(item => item.id === 'older-thread');
  assert.equal(query.parts.at(-1), 60);
  query.success({ docs: Array.from({ length: 60 }, (_, index) => ({ id: `recent-${index}`, data: () => ({ ownerId: 'owner-a', updatedAt: 100 + index }) })) });
  const document = (ownerId, exists = true) => ({ exists: () => exists, data: () => ({ ownerId, updatedAt: 1 }) });
  focused.success(document('foreign-owner'));
  assert.equal(render().sorted.some(thread => thread.id === 'older-thread'), false);
  assert.equal(messageSubscriptions.some(item => item.id === 'older-thread'), false);
  focused.success(document('owner-a', false));
  assert.equal(render().sorted.length, 60, 'Unknown documents do not create a conversation');
  focused.success(document('owner-a'));
  render(); const selected = render();
  assert.equal(selected.activeId, 'older-thread');
  assert.equal(selected.sorted.length, 61, 'The supplemental conversation preserves every inbox query row');
  assert.equal(selected.mobileShowChat, true);
  assert.equal(messageSubscriptions.some(item => item.id === 'older-thread'), true);
  assert.equal(writes, 0);

  context.workspace = { ownerId: 'owner-b', isDemo: false };
  const changed = render();
  assert.equal(changed.activeId, '');
  assert.equal(changed.sorted.length, 0, 'Previous-owner conversations disappear immediately');
  assert.equal(query.stopped, true); assert.equal(focused.stopped, true);
  focused.success(document('owner-a')); query.success({ docs: [{ id: 'stale', data: () => ({ ownerId: 'owner-a' }) }] });
  assert.equal(render().sorted.length, 0, 'Old owner callbacks cannot restore a stale conversation');
  const current = render();
  current.selectThread('../foreign'); render();
  assert.equal(listeners.some(item => item.id === '../foreign'), false, 'Invalid IDs never become a document path');
  assert.equal(writes, 0);
});

test('booking details distinguish full totals and partial payment and use recorded price/currency snapshots', () => {
  assert.deepEqual(scheduleDetailsPayment({ amountInCents: 10000, amountPaidInCents: 2500, currency: 'USD' }, { currency: 'ZAR' }),
    { total: 10000, paid: 2500, quote: false, currency: 'USD' });
  assert.deepEqual(scheduleDetailsPayment({ amountPaidInCents: 2500 }, { currency: 'ZAR' }),
    { total: null, paid: 2500, quote: false, currency: 'ZAR' });
  assert.equal(scheduleDetailsPayment({ amountInCents: 0, servicePriceType: 'quote' }).quote, true);
  assert.equal(scheduleDetailsPayment({ amountInCents: 0 }).quote, false, 'A current service price cannot relabel an older free booking');
  assert.equal(scheduleDetailsPayment({ amountInCents: '1000', amountPaidInCents: -1 }).total, null);
});

test('booking details validate calendar dates and times before producing an end time', () => {
  assert.equal(scheduleDetailsDateLabel('2026-02-30'), 'Date needs review');
  assert.equal(scheduleDetailsDateLabel('2026-13-01'), 'Date needs review');
  assert.equal(scheduleDetailsDateLabel(''), 'Date not recorded');
  assert.notEqual(scheduleDetailsDateLabel('2028-02-29'), 'Date needs review');
  assert.equal(scheduleDetailsTimeLabel('', 60), 'Time not recorded');
  assert.equal(scheduleDetailsTimeLabel('25:00', 60), 'Time needs review');
  assert.equal(scheduleDetailsTimeLabel('10:99', 60), 'Time needs review');
  assert.equal(scheduleDetailsTimeLabel('09:00', Infinity), '09:00');
  assert.equal(scheduleDetailsTimeLabel('09:00', -60), '09:00');
  assert.equal(scheduleDetailsTimeLabel('09:00', 60), '09:00–10:00');
  assert.equal(scheduleDetailsTimeLabel('23:30', 90), '23:30–01:00 (+1 day)');
  assert.equal(scheduleDetailsDuration(''), null);
  assert.equal(scheduleDetailsDuration('60'), 60);
});

test('booking detail times follow timezone-resolved agenda ends across DST and unknown start times', () => {
  const bookings = [
    { id: 'spring', dateKey: '2026-03-08', time: '01:30', durationMinutes: 120, status: 'confirmed' },
    { id: 'fall', dateKey: '2026-11-01', time: '01:30', durationMinutes: 120, status: 'confirmed' },
    { id: 'missing-hour', dateKey: '2026-03-08', time: '02:30', durationMinutes: 60, status: 'confirmed' },
    { id: 'overnight', dateKey: '2026-10-05', time: '23:30', durationMinutes: 120, status: 'confirmed' }
  ];
  const { rows } = buildScheduleAgenda({ bookings, timezone: 'America/New_York', period: 'all', now: Date.parse('2026-10-05T12:00:00Z') });
  const byId = id => rows.find(row => row.booking.id === id);
  const spring = byId('spring');
  assert.equal(spring.endTime, '04:30');
  assert.equal(scheduleDetailsWindowLabel(spring.booking, spring), '01:30–04:30');
  assert.equal(scheduleDetailsWindowLabel(byId('fall').booking, byId('fall')), '01:30 · End time not recorded');
  assert.equal(scheduleDetailsWindowLabel(byId('missing-hour').booking, byId('missing-hour')), 'Time needs review');
  const overnight = byId('overnight');
  assert.equal(overnight.endDateKey, '2026-10-06');
  assert.equal(scheduleDetailsWindowLabel(overnight.booking, overnight), `23:30–01:30 (${scheduleDetailsDateLabel('2026-10-06')})`);
});
