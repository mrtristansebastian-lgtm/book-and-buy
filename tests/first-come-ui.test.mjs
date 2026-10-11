import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { serviceCommerceQuote } from '../functions/commerceRuntime.js';
const require = createRequire(import.meta.url);

function loader(overrides = {}) {
  const cache = new Map();
  function load(path) {
    const file = new URL(path, import.meta.url);
    if (cache.has(file.href)) return cache.get(file.href);
    const module = { exports: {} }; cache.set(file.href, module.exports);
    const source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    new Function('module','exports','require',source)(module,module.exports,id => {
      if (overrides[id]) return overrides[id];
      if (id.endsWith('.css')) return {};
      if (!id.startsWith('.')) return require(id);
      const base = new URL(id,file);
      return load([base,...['.js','.jsx','.ts'].map(ext => new URL(base.href+ext))].find(existsSync).href);
    });
    return module.exports;
  }
  return load;
}
function nodes(tree, predicate, found = []) {
  if (Array.isArray(tree)) tree.forEach(node => nodes(node,predicate,found));
  else if (React.isValidElement(tree)) { if (predicate(tree)) found.push(tree); nodes(tree.props.children,predicate,found); }
  return found;
}
function hooks() {
  let cursor = 0; const cells = [];
  return { reset: () => { cursor = 0; }, api: { ...React,
    useId: () => 'request',
    useMemo: factory => factory(),
    useEffect() {},
    useState(initial) { const i = cursor++; cells[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [cells[i].value, value => { cells[i].value = typeof value === 'function' ? value(cells[i].value) : value; }]; },
    useRef(initial) { const i = cursor++; return cells[i] ??= { current: initial }; }
  } };
}

test('service format picker exposes two formats and booking settings expose both intake modes', () => {
  const load = loader();
  const { ServiceEditorTypeStep } = load('../src/features/services/components/ServiceEditorTypeStep.jsx');
  const picker = ServiceEditorTypeStep({ draft: {}, patch() {} });
  assert.deepEqual(nodes(picker,node => node.type === 'button').map(node => node.props['aria-label']),['Slot','Spot']);
  const { BookingModeSettings } = load('../src/features/settings/components/BookingModeSettings.jsx');
  const markup = renderToStaticMarkup(React.createElement(BookingModeSettings,{ rules: { scheduleMode: 'first_come' } }));
  assert.match(markup,/First come, first served/); assert.match(markup,/No availability or staff shifts required/);
  assert.match(markup,/<input[^>]*checked=""[^>]*value="first_come"/);
});

test('public request form needs no date, availability lookup or payment and reuses its receipt on retry', async () => {
  const state = hooks(); let submissions = []; let quotes = 0;
  const workspace = { isDemo: false, currency: 'R', availabilityRules: { scheduleMode: 'first_come' }, website: { buyerCountryCode: 'ZA' }, services: [{ id: 's', name: 'Consultation', price: 350, duration: 60 }] };
  const load = loader({ react: state.api,
    '../../workspace/WorkspaceContext': { useWorkspace: () => ({ workspace }) },
    '../../../shared/firebase/callables': { firebaseCallables: {
      async quotePublicCommerce(input) { quotes++; return serviceCommerceQuote(workspace,input); },
      async createPublicBookingRequest(payload) { submissions.push(payload); if (submissions.length === 1) throw new Error('Response interrupted. Please retry.'); return { id: 'saved' }; }
    } }
  });
  const { FirstComeBookingRequest } = load('../src/features/booking/components/FirstComeBookingRequest.jsx');
  const render = () => { state.reset(); return FirstComeBookingRequest({ service: workspace.services[0], workspace, slug: 'shop', live: true }); };
  let tree = render();
  assert.equal(nodes(tree,node => node.type === 'input' && ['date','time'].includes(node.props.type)).length,0);
  for (const [id,value] of [['request-name','Jamie'],['request-email','JAMIE@example.test']]) {
    nodes(tree,node => node.type === 'input' && node.props.id === id)[0].props.onChange({ target: { value } }); tree = render();
  }
  await tree.props.onSubmit({ preventDefault() {} }); tree = render();
  assert.equal(submissions.length,1); assert.equal(quotes,1);
  await tree.props.onSubmit({ preventDefault() {} }); tree = render();
  assert.equal(submissions.length,2); assert.equal(quotes,1);
  assert.deepEqual(submissions[0],submissions[1]);
  assert.equal(submissions[0].bookingMode,'first_come'); assert.equal(submissions[0].dateKey,''); assert.equal(submissions[0].time,'');
  assert.equal(submissions[0].clientEmail,'jamie@example.test'); assert.equal(submissions[0].paymentStatus,'unpaid');
  assert.match(renderToStaticMarkup(tree),/Booking request received/);
});

test('public demo request stays local and a locked preview cannot submit', async () => {
  const state = hooks(); const saved = [];
  const workspace = { isDemo: true, availabilityRules: { scheduleMode: 'first_come' }, website: {} };
  const load = loader({ react: state.api,
    '../../workspace/WorkspaceContext': { useWorkspace: () => ({ workspace, addBooking: async payload => { saved.push(payload); return payload; } }) },
    '../../../shared/firebase/callables': { firebaseCallables: new Proxy({}, { get() { throw new Error('Demo must not call live functions'); } }) }
  });
  const { FirstComeBookingRequest } = load('../src/features/booking/components/FirstComeBookingRequest.jsx');
  const props = { service: { id: 's', name: 'Consultation', price: 100, duration: 60 }, workspace, slug: 'example' };
  const render = extra => { state.reset(); return FirstComeBookingRequest({ ...props,...extra }); };
  let tree = render({ preview: true });
  await tree.props.onSubmit({ preventDefault() {} }); assert.equal(saved.length,0);
  tree = render();
  for (const [id,value] of [['request-name','Jamie'],['request-email','jamie@example.test']]) {
    nodes(tree,node => node.type === 'input' && node.props.id === id)[0].props.onChange({ target: { value } }); tree = render();
  }
  await tree.props.onSubmit({ preventDefault() {} }); tree = render();
  assert.equal(saved.length,1); assert.equal(saved[0].bookingMode,'first_come');
  assert.match(renderToStaticMarkup(tree),/Demo booking request saved/);
});

test('owner queue shows older unscheduled requests in arrival order with accept and set-time actions', async () => {
  const state = hooks();
  const bookings = [
    { id: 'later', serviceId: 's', clientName: 'Later client', bookingMode: 'first_come', status: 'pending', dateKey: '', time: '', timestamp: 2000 },
    { id: 'earlier', serviceId: 's', clientName: 'Earlier client', bookingMode: 'first_come', status: 'pending', dateKey: '', time: '', timestamp: 1000 },
    { id: 'declined', serviceId: 's', bookingMode: 'first_come', status: 'declined', dateKey: '', time: '', timestamp: 500 }
  ];
  const context = { workspace: { isDemo: true, availabilityRules: { scheduleMode: 'first_come' } }, bookings, services: [], staff: [],
    async confirmBooking(id) { bookings.find(booking => booking.id === id).status = 'confirmed'; } };
  const load = loader({ react: state.api,
    '../../workspace/WorkspaceContext': { useWorkspace: () => context },
    '../../../shared/firebase/callables': { firebaseCallables: {} }
  });
  const { BookingRequestsDesk } = load('../src/features/bookings/components/BookingRequestsDesk.jsx');
  const render = () => { state.reset(); return BookingRequestsDesk({}); };
  let tree = render();
  const rows = nodes(tree,node => node.type === 'article');
  assert.deepEqual(rows.map(node => node.props.id),['request-booking-earlier','request-booking-later']);
  const setTimes = nodes(tree,node => node.props.action === 'reschedule');
  assert.equal(setTimes.length,2);
  const accept = nodes(tree,node => node.props.action === 'accept')[0];
  await accept.props.onClick(); tree = render();
  assert.equal(bookings[1].status,'confirmed'); assert.equal(bookings[1].time,'');
  setTimes[0].props.onClick(); tree = render();
  assert.equal(nodes(tree,node => node.type?.name === 'BookingTimeSheet')[0].props.booking.id,'earlier');
});

test('manual queue entry does not generate or require available times', async () => {
  const state = hooks(); const saved = [];
  const workspace = { isDemo: true, availabilityRules: { scheduleMode: 'first_come' }, staffAvailability: {} };
  const services = [{ id: 's', name: 'Consultation', price: 100, duration: 60 }];
  const previousDocument = globalThis.document;
  globalThis.document = { body: {} };
  try {
    const load = loader({ react: state.api, 'react-dom': { createPortal: node => node },
      '../../../shared/ui/useDialogFocus': { useDialogFocus() {} },
      '../../../utils/availability': { getDaySlots() { throw new Error('Queue entry must not generate slots'); } },
      '../../workspace/WorkspaceContext': { useWorkspace: () => ({ workspace, services, bookings: [], staff: [], async addBooking(payload) { saved.push(payload); return { ...payload,id: 'saved' }; } }) }
    });
    const { ManualBookingSheet } = load('../src/features/bookings/components/ManualBookingSheet.jsx');
    const render = () => { state.reset(); return ManualBookingSheet({ onClose() {} }); };
    let tree = render();
    nodes(tree,node => node.type === 'input' && node.props.placeholder === 'Client name')[0].props.onChange({ target: { value: 'Jamie' } }); tree = render();
    const save = nodes(tree,node => node.props.action === 'book')[0];
    assert.equal(save.props.disabled,false);
    await save.props.onClick();
    assert.equal(saved.length,1); assert.equal(saved[0].dateKey,''); assert.equal(saved[0].time,'');
  } finally { globalThis.document = previousDocument; }
});
