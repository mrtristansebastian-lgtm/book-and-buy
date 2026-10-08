import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { buildTestCheckoutResult } from '../src/utils/testCheckout.js';

// Exercise the public-data/action boundary independently of React and Firebase.
const source = readFileSync(new URL('../src/features/builder/builderCommerce.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export function /g, 'function ');
const { buildBuilderCommerceContext, resolveBuilderCommerceAction } = new Function('formatProductPrice', 'isProductPubliclyVisible', 'formatServicePrice', 'getServiceDurationMinutes', 'getPublicPaymentOptions', `${source};return{buildBuilderCommerceContext,resolveBuilderCommerceAction}`)(
  () => 'R 100', row => row.active !== false && row.status !== 'draft', () => 'R 200', () => 60,
  ws => ({ options: (ws.paymentGateways || []).filter(row => row.enabled) })
);
const workspace = { brandName: 'Test', products: [{ id: 'p1', name: 'Bread', cost: 999, internalNotes: 'secret' }, { id: 'draft', status: 'draft' }], services: [{ id: 's1', name: 'Class', cost: 555 }], clients: [{ email: 'private@example.com' }], bookings: [{ clientPhone: 'private' }], paymentGateways: [{ id: 'cash', name: 'Cash', enabled: true, secretKey: 'do-not-share' }] };

test('AI catalog context excludes private records, costs and payment credentials', () => {
  const context = buildBuilderCommerceContext(workspace);
  assert.equal(context.products.length, 1);
  assert.equal(context.services.length, 1);
  const json = JSON.stringify(context);
  for (const forbidden of ['999', '555', 'do-not-share', 'private@example.com', 'internalNotes', 'clientPhone', 'secretKey']) assert.equal(json.includes(forbidden), false, forbidden);
});

test('generated-site actions resolve real items and reject missing or hidden IDs', () => {
  assert.deepEqual(resolveBuilderCommerceAction(workspace, 'cart.add', { productId: 'p1', price: 1 }), { kind: 'product', id: 'p1' });
  assert.deepEqual(resolveBuilderCommerceAction(workspace, 'booking.create', { serviceId: 's1', time: 'invented' }), { kind: 'service', id: 's1' });
  assert.throws(() => resolveBuilderCommerceAction(workspace, 'cart.add', { productId: 'draft' }));
  assert.throws(() => resolveBuilderCommerceAction(workspace, 'cart.add', { productId: 'fake' }));
  assert.throws(() => resolveBuilderCommerceAction(workspace, 'payment.charge', { amount: 1 }));
});

test('builder checkout keeps variants and chosen times in a mixed test result', () => {
  const items = [{ kind: 'product', productId: 'p1', variantId: 'large', quantity: 2 }, { kind: 'service', serviceId: 's1', name: 'Class', variantId: 'afternoon', dateKey: '2026-10-10', time: '14:00' }];
  const result = buildTestCheckoutResult(items, { clientName: 'Tester' });
  assert.equal(result.order.items[0].variantId, 'large');
  assert.equal(result.bookings[0].variantId, 'afternoon');
  assert.equal(result.bookings[0].time, '14:00');
  assert.equal(result.test, true);
});

test('builder test submission exits before any order, booking or payment side effect', async () => {
  const text = readFileSync(new URL('../src/features/storefront/components/PublicCartCheckout.jsx', import.meta.url), 'utf8');
  const ast = ts.createSourceFile('checkout.jsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
  let submit; const visit = node => { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'submit') submit = node.initializer.getText(ast); ts.forEachChild(node, visit); }; visit(ast);
  let result, step, started = false;
  const run = new Function('lockedPreview', 'canSubmit', 'testMode', 'setResult', 'buildTestCheckoutResult', 'cart', 'details', 'setSubmitNote', 'setStep', 'setSubmitting', `return (${submit})`)(false, true, true, value => result = value, buildTestCheckoutResult, { items: [{ kind: 'product', productId: 'p1' }] }, { clientName: 'Tester' }, () => {}, value => step = value, () => started = true);
  await run(); assert.equal(started, false); assert.equal(result.test, true); assert.equal(step, 'success');
});
