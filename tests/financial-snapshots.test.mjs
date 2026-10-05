import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { catalogUnitCostCents, paymentConfirmationSnapshot } from '../functions/financialSnapshots.js';
import { priceMarketOrder } from '../functions/marketOrders.js';
import { markSourcePaid } from '../functions/payments/store.js';

test('cost snapshots distinguish unknown costs, valid zero, variant overrides and invalid catalog values', () => {
  for (const cost of [undefined, null, '', '  ', 'garbage', -1, Infinity]) assert.equal(catalogUnitCostCents({ cost }), null);
  assert.equal(catalogUnitCostCents({ cost: 0 }), 0);
  assert.equal(catalogUnitCostCents({ cost: '12.50' }), 1250);
  assert.equal(catalogUnitCostCents({ cost: 12 }, { cost: '' }), 1200);
  assert.equal(catalogUnitCostCents({ cost: 12 }, { cost: 0 }), 0);
  assert.equal(catalogUnitCostCents({ cost: 12 }, { cost: 'invalid' }), null);
  const workspace = { slug: 'shop', products: [{ id: 'p', name: 'Product', price: 20, cost: 5 }, { id: 'unknown', name: 'Unknown', price: 10 }] };
  const data = { paymentMethod: 'cash', client: { clientName: 'Client', clientEmail: 'client@example.test' } };
  const complete = priceMarketOrder(workspace, { ...data, items: [{ productId: 'p', quantity: 3, unitCostInCents: 0 }] });
  assert.equal(complete.costBasisInCents, 1500);
  const partial = priceMarketOrder(workspace, { ...data, costBasisInCents: 0, items: [{ productId: 'p', quantity: 1 }, { productId: 'unknown', quantity: 1 }] });
  assert.equal(partial.costBasisInCents, undefined, 'Unknown lines must not become zero-cost items');
});

test('manual and provider payment confirmation keep their first recorded date and amount', async () => {
  assert.deepEqual(paymentConfirmationSnapshot({ paymentStatus: 'unpaid', amountInCents: 4200 }, 1000), { paymentStatus: 'paid', paidAt: 1000, amountPaidInCents: 4200 });
  assert.deepEqual(paymentConfirmationSnapshot({ paymentStatus: 'paid', paidAt: 900, amountInCents: 4200 }, 1000), { paymentStatus: 'paid', paidAt: 900 });
  assert.deepEqual(paymentConfirmationSnapshot({ paymentStatus: 'paid', amountInCents: 4200 }, 1000), { paymentStatus: 'paid' }, 'A legacy missing date must remain unknown');
  assert.deepEqual(paymentConfirmationSnapshot({ paymentStatus: 'refunded', paidAt: 900 }, 1000), { paymentStatus: 'refunded', paidAt: 900 }, 'Duplicate provider confirmations cannot undo a refund');
  let settings = { orders: [{ id: 'order', paymentStatus: 'unpaid', amountInCents: 4200, discoverySurface: 'buy', costBasisInCents: 1000 }] };
  const db = { doc: path => ({ path }), runTransaction: async action => action({ get: async () => ({ exists: true, data: () => settings }),
    set: (_ref, data) => { settings = data; } }) };
  const input = { appId: 'test', ownerId: 'owner', sourceType: 'order', sourceId: 'order', providerPaymentId: 'confirmed', gatewayType: 'stripe' };
  await markSourcePaid(input, db);
  const first = settings.orders[0];
  assert.ok(first.paidAt > 0);
  assert.equal(first.amountPaidInCents, 4200);
  settings.orders[0].amountInCents = 9000;
  await markSourcePaid(input, db);
  assert.equal(settings.orders[0].paidAt, first.paidAt);
  assert.equal(settings.orders[0].amountPaidInCents, 4200);
  assert.equal(settings.orders[0].discoverySurface, 'buy');
  assert.equal(settings.orders[0].costBasisInCents, 1000);
});

const require = createRequire(import.meta.url);
const moduleCache = new Map();
function load(path) {
  const file = new URL(path, import.meta.url);
  if (moduleCache.has(file.href)) return moduleCache.get(file.href);
  const source = readFileSync(file, 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  moduleCache.set(file.href, module.exports);
  const scopedRequire = id => !id.startsWith('.') ? require(id) : load(new URL(`${id}.js`, file).href);
  new Function('require', 'module', 'exports', compiled)(scopedRequire, module, module.exports);
  moduleCache.set(file.href, module.exports);
  return module.exports;
}
const { buildFinanceLedger } = load('../src/features/finance/utils/financeLedger.js');
const { demoPaymentSnapshot, demoBookingSnapshot, demoOrderCostSnapshot } = load('../src/features/workspace/demoFinancialSnapshots.js');

test('financial ledger exposes original dates and durable channels without inventing old payment history', () => {
  const rows = buildFinanceLedger({ bookings: [{ id: 'legacy', date: '2026-10-15', paymentStatus: 'paid', serviceId: 's', amountInCents: 1000 }],
    orders: [ { id: 'paid', timestamp: 1000, paidAt: 2000, paymentStatus: 'refunded', amountInCents: 9999, amountPaidInCents: 4000, refundedAt: 3000, refundedAmountInCents: 1000,
      analyticsSource: 'places', analyticsSessionId: 'visit-id', discoverySurface: 'buy', subtotalCents: 4000, costBasisInCents: 500 },
    { id: 'undated', paymentStatus: 'paid', amountInCents: 1000 },
    { id: 'untracked', timestamp: 1000, paymentStatus: 'paid', amountInCents: 1000, analyticsSource: 'places' },
    { id: 'direct', timestamp: 1000, paymentStatus: 'paid', amountInCents: 1000, analyticsSource: 'direct', discoverySurface: 'buy' } ] });
  const paid = rows.find(row => row.sourceId === 'paid');
  assert.equal(paid.actualCreatedAt, 1000);
  assert.equal(paid.actualPaidAt, 2000);
  assert.equal(paid.paidAtAuthoritative, true);
  assert.equal(paid.amountInCents, 4000);
  assert.equal(paid.refundedAt, 3000);
  assert.equal(paid.refundIsFull, false);
  assert.equal(paid.analyticsSessionId, 'visit-id');
  assert.equal(paid.discoverySurface, 'buy');
  const legacy = rows.find(row => row.sourceId === 'legacy');
  assert.equal(legacy.createdAtAuthoritative, false);
  assert.equal(legacy.actualCreatedAt, null);
  assert.equal(legacy.paidAtAuthoritative, false);
  assert.equal(legacy.actualPaidAt, null);
  assert.equal(legacy.costBasisInCents, null);
  assert.equal(rows.find(row => row.sourceId === 'undated').createdAt, null);
  assert.equal(rows.find(row => row.sourceId === 'untracked').discoverySurface, null);
  assert.equal(rows.find(row => row.sourceId === 'direct').discoverySurface, null);
});

test('receipts offer manual payment actions only where the backend supports them', () => {
  const records = [{ id: 'cash', paymentStatus: 'unpaid', paymentMethod: 'cash' }, { id: 'eft', paymentStatus: 'manual_pending', paymentMethod: 'manual_eft' },
    { id: 'online', paymentStatus: 'unpaid', paymentMethod: 'stripe' }, { id: 'legacy', paymentStatus: 'unpaid' }, { id: 'refund', paymentStatus: 'refunded', paymentMethod: 'cash' }];
  const rows = buildFinanceLedger({ orders: records, bookings: records });
  assert.equal(rows.find(row => row.id === 'order:cash').canMarkPaid, true);
  assert.equal(rows.find(row => row.id === 'order:eft').canMarkPaid, true);
  assert.equal(rows.find(row => row.id === 'order:online').canMarkPaid, false);
  assert.equal(rows.find(row => row.id === 'order:legacy').canMarkPaid, false);
  assert.equal(rows.find(row => row.id === 'booking:legacy').canMarkPaid, true);
  assert.equal(rows.find(row => row.id === 'booking:online').canMarkPaid, false);
  assert.equal(rows.find(row => row.id === 'order:refund').canMarkPaid, false);
});

test('demo manual bookings and orders keep configured receipt costs and first payment dates', () => {
  const workspace = { currency: 'R', services: [{ id: 's', name: 'Service', price: 50, cost: 12, variants: [{ id: 'v', price: 70, cost: 18 }] }] };
  const booking = demoBookingSnapshot({ id: 'b', serviceId: 's', variantId: 'v', paymentStatus: 'unpaid', costBasisInCents: 1 }, workspace);
  assert.equal(booking.costBasisInCents, 1800);
  assert.equal(booking.amountInCents, 7000);
  const payment = demoPaymentSnapshot(booking, { paymentStatus: 'paid' }, 1000);
  assert.equal(payment.paidAt, 1000);
  assert.equal(payment.amountPaidInCents, 7000);
  assert.deepEqual(demoPaymentSnapshot({ ...booking, ...payment, paymentStatus: 'paid' }, { paymentStatus: 'paid' }, 2000), {});
  assert.deepEqual(demoPaymentSnapshot({ ...booking, paymentStatus: 'refunded' }, { paymentStatus: 'paid' }, 2000), { paymentStatus: 'refunded' });
  const order = demoOrderCostSnapshot({ items: [{ productId: 'p', quantity: 3 }] }, [{ id: 'p', cost: 5 }]);
  assert.equal(order.costBasisInCents, 1500);
  assert.equal(demoOrderCostSnapshot({ items: [{ productId: 'unknown', quantity: 1 }] }, []).costBasisInCents, undefined);
  assert.equal(demoBookingSnapshot({ serviceId: 'unknown' }, workspace).costBasisInCents, undefined);
});
