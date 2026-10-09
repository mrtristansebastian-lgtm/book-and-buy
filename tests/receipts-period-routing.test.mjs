import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const modules = new Map();
function load(path) {
  const file = new URL(path, import.meta.url);
  if (modules.has(file.href)) return modules.get(file.href);
  const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  });
  const module = { exports: {} };
  modules.set(file.href, module.exports);
  new Function('module', 'exports', 'require', outputText)(module, module.exports, (id) => {
    if (!id.startsWith('.')) return require(id);
    const base = new URL(id, file);
    const target = [base, new URL(`${base.href}.js`)].find(existsSync);
    return load(target.href);
  });
  return module.exports;
}

const { createDemoWorkspace, hydrateDemoWorkspace } = load('../src/data/demoWorkspace.js');
const { buildFinanceLedger } = load('../src/features/finance/utils/financeLedger.js');

test('current demo service edits and team assignments survive rehydration with the two-service catalogue', () => {
  const current = createDemoWorkspace();
  assert.equal(current.services.length, 2);
  const staffId = 'new-team-member';
  const edited = { ...current, staff: [...current.staff, { id: staffId, name: 'New member', active: true }], services: current.services.map((service, index) => index ? service : { ...service, description: 'My edited service', staffIds: [...service.staffIds, staffId] }) };
  const hydrated = hydrateDemoWorkspace(edited);
  assert.equal(hydrated.services[0].description, 'My edited service');
  assert.ok(hydrated.services[0].staffIds.includes(staffId));
  assert.ok(hydrated.staff.some(member => member.id === staffId));
});

function elements(tree, predicate, result = []) {
  if (Array.isArray(tree)) tree.forEach((node) => elements(node, predicate, result));
  else if (React.isValidElement(tree)) {
    if (predicate(tree)) result.push(tree);
    elements(tree.props.children, predicate, result);
  }
  return result;
}

test('receipt links apply custom dates, keep demo paths and react to back/forward date changes', async () => {
  const previousWindow = globalThis.window;
  const location = { hash: '#/demo/finance?period=custom&from=2026-10-01&to=2026-10-02',
    replace(value) { this.hash = value; } };
  globalThis.window = { location };
  try {
    let cursor = 0;
    const slots = [];
    let pending = [];
    let paymentCalls = 0;
    let rejectPayment;
    let paymentFails = true;
    const hooks = { ...React,
      useState(initial) {
        const index = cursor++;
        slots[index] ??= { value: typeof initial === 'function' ? initial() : initial };
        return [slots[index].value, (value) => { slots[index].value = typeof value === 'function' ? value(slots[index].value) : value; }];
      },
      useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
      useMemo(factory) { return factory(); },
      useEffect(effect, dependencies) {
        const index = cursor++;
        if (!slots[index] || dependencies.some((value, i) => value !== slots[index].dependencies[i])) {
          slots[index] = { dependencies };
          pending.push(effect);
        }
      }
    };
    const Header = () => null;
    const Toolbar = () => null;
    const Receipt = () => null;
    const source = readFileSync(new URL('../src/features/finance/pages/FinancePage.jsx', import.meta.url), 'utf8');
    const { outputText } = ts.transpileModule(source, { compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022
    } });
    const module = { exports: {} };
    new Function('module', 'exports', 'require', outputText)(module, module.exports, (id) => {
      if (id === 'react') return hooks;
      if (id === '../../workspace/WorkspaceContext') return { useWorkspace: () => ({
        workspace: { isDemo: true, currency: 'R' }, bookings: [1, 3].map((day) => ({
          id: `booking-${day}`, timestamp: new Date(2026, 9, day, 12).getTime(),
          amountInCents: 10000, paymentStatus: 'unpaid', paymentMethod: 'cash'
        })), orders: [{ id: 'order-3', timestamp: new Date(2026, 9, 3, 12).getTime(), amountInCents: 20000, paymentStatus: 'unpaid', paymentMethod: 'manual_eft', items: [] }],
        markPaid: () => { paymentCalls++; return paymentFails ? new Promise((_, reject) => { rejectPayment = reject; }) : Promise.resolve({ paymentStatus: 'paid' }); },
        markOrderPaid: () => Promise.resolve(null)
      }) };
      if (id === '../components/RevenuePulseHeader') return { RevenuePulseHeader: Header };
      if (id === '../components/FinanceLedgerToolbar') return { FinanceLedgerToolbar: Toolbar };
      if (id === '../components/TransactionReceiptCard') return { TransactionReceiptCard: Receipt };
      if (id === '../../../app/routing') return load('../src/app/routing.js');
      if (id === '../utils/financeLedger') return load('../src/features/finance/utils/financeLedger.js');
      return require(id);
    });
    const render = () => {
      cursor = 0;
      pending = [];
      const tree = module.exports.FinancePage();
      pending.forEach((effect) => effect());
      return tree;
    };
    const header = (tree) => elements(tree, (node) => node.type === Header)[0].props;
    const toolbar = (tree) => elements(tree, (node) => node.type === Toolbar)[0].props;
    const rows = (tree) => elements(tree, (node) => node.type === Receipt).map((node) => node.props.row.sourceId);
    let tree = render();
    assert.equal(header(tree).periodId, 'custom');
    assert.deepEqual(rows(tree), ['booking-1']);
    header(tree).onCustomRangeChange({ from: '2026-10-03', to: '2026-10-03' });
    assert.equal(location.hash, '#/demo/finance?period=custom&tab=bookings&from=2026-10-03&to=2026-10-03');
    tree = render();
    assert.deepEqual(rows(tree), ['booking-3']);
    toolbar(tree).onTabChange('orders');
    assert.equal(location.hash, '#/demo/finance?period=custom&tab=orders&from=2026-10-03&to=2026-10-03');
    assert.deepEqual(rows(render()), ['order-3']);
    header(render()).onPeriodChange('all');
    assert.equal(location.hash, '#/demo/finance?period=all&tab=orders', 'Changing dates retains the linked order category');
    location.hash = '#/demo/finance?period=custom&from=2026-10-01&to=2026-10-02';
    render();
    assert.deepEqual(rows(render()), ['booking-1'], 'Back/forward query changes update the ledger');
    header(render()).onPeriodChange('all');
    assert.equal(location.hash, '#/demo/finance?period=all&tab=bookings');
    assert.equal(rows(render()).length, 2);
    const receipt = (tree) => elements(tree, (node) => node.type === Receipt)[0].props;
    const attempt = receipt(render()).onMarkPaid(receipt(render()).row);
    receipt(render()).onMarkPaid(receipt(render()).row);
    assert.equal(paymentCalls, 1, 'Repeated clicks cannot send duplicate payment confirmations');
    assert.equal(receipt(render()).markingPaid, true);
    rejectPayment(new Error('Payment confirmation failed. Please try again.'));
    await attempt;
    assert.equal(receipt(render()).markingPaid, false);
    assert.match(receipt(render()).paymentError, /Payment confirmation failed/);
    paymentFails = false;
    await receipt(render()).onMarkPaid(receipt(render()).row);
    assert.equal(paymentCalls, 2);
    assert.equal(receipt(render()).paymentError, '', 'A new attempt clears the previous error');
    toolbar(render()).onTabChange('orders');
    await receipt(render()).onMarkPaid(receipt(render()).row);
    assert.match(receipt(render()).paymentError, /Payment could not be confirmed/, 'Rejected order results show a local error');
    assert.equal(receipt(render()).markingPaid, false);
    location.hash = '#/dashboard/finance?period=invalid';
    render();
    assert.equal(header(render()).periodId, 'all', 'Unsupported periods safely default to all time');
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('demo financial reports use saved paid dates, amounts and coherent cost snapshots', () => {
  const demo = createDemoWorkspace();
  const ledger = buildFinanceLedger({ bookings: demo.bookings, orders: demo.orders, services: demo.services, currency: demo.currency });
  const paid = ledger.filter((row) => row.paymentStatus === 'paid');
  assert.ok(paid.length > 0);
  for (const row of paid) {
    assert.equal(row.paidAtAuthoritative, true, row.id);
    assert.equal(row.amountAuthoritative, true, row.id);
    assert.ok(Number.isFinite(row.costBasisInCents) && row.costBasisInCents >= 0, row.id);
  }
  for (const order of demo.orders) {
    assert.equal(order.subtotalCents, order.items.reduce((total, item) => total + item.lineTotalCents, 0));
    assert.equal(order.costBasisInCents, order.items.reduce((total, item) => total + item.lineCostInCents, 0));
    for (const item of order.items) assert.equal(item.lineCostInCents, item.unitCostInCents * item.quantity);
  }
});

test('current demo preserves added specialist listings, service assignments and website edits on reload', () => {
  const current = createDemoWorkspace();
  const listing = { id: 'qa-car', name: 'Toyota Corolla', listingType: 'vehicle', transactionMode: 'enquiry', exploreMainCategoryId: 'buy_vehicles', exploreSubcategoryId: 'vehicles_cars', vehicleDetails: { make: 'Toyota', model: 'Corolla' } };
  const changed = { ...current, products: [...current.products, listing], services: current.services.map(service => ({ ...service, staffIds: ['new-team-member'] })), website: { ...current.website, homeSubtext: 'Edited business introduction' } };
  const hydrated = hydrateDemoWorkspace(changed);
  assert.equal(hydrated.products.find(product => product.id === listing.id)?.transactionMode, 'enquiry');
  assert.deepEqual(hydrated.services[0].staffIds, ['new-team-member']);
  assert.equal(hydrated.website.homeSubtext, 'Edited business introduction');
  assert.equal(hydrateDemoWorkspace({ ...changed, products: changed.products.slice(1) }).products.length, changed.products.length - 1);
});

test('cached demos receive finance upgrades even when their website content is already current', () => {
  const current = createDemoWorkspace();
  const cached = { ...current, financeSchema: 2 };
  const upgraded = hydrateDemoWorkspace(cached);
  assert.equal(upgraded.websiteSchema, cached.websiteSchema);
  assert.equal(upgraded.financeSchema, 3);
  const source = readFileSync(new URL('../src/features/workspace/WorkspaceContext.jsx', import.meta.url), 'utf8');
  const file = ts.createSourceFile('WorkspaceContext.jsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
  let equalityCheck;
  const visit = (node) => {
    if (ts.isIfStatement(node) && node.expression.getText(file).includes('next.websiteSchema === prev.websiteSchema')) {
      equalityCheck = new Function('prev', 'next', `return (${node.expression.getText(file)});`);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  assert.equal(equalityCheck(cached, upgraded), false, 'The provider must keep the upgraded financial snapshots');
  assert.equal(equalityCheck(current, hydrateDemoWorkspace(current)), true, 'Current demo data avoids unnecessary updates');
});
