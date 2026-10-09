import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { buildTestCheckoutResult } from '../src/utils/testCheckout.js';
import { assertBusinessCommerceEnabled, isPresenceOnlyBusiness } from '../functions/businessCapabilities.js';
import { normalizeListing, listingDetailsKey, publicListingDetails, isEnquiryListing, listingSpecificationGroups, listingFacts } from '../functions/listingTypes.js';
import { normalizeServiceConfiguration, serviceConfigurationFields, serviceFacts } from '../functions/serviceTemplates.js';
import { publicCommerceCatalog } from '../functions/commerceRuntime.js';

// Exercise the public-data/action boundary independently of React and Firebase.
const source = readFileSync(new URL('../src/features/builder/builderCommerce.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export function /g, 'function ');
const { buildBuilderCommerceContext, resolveBuilderCommerceAction } = new Function('formatProductPrice', 'isProductPubliclyVisible', 'formatServicePrice', 'getServiceDurationMinutes', 'getPublicPaymentOptions', 'assertBusinessCommerceEnabled', 'isPresenceOnlyBusiness', 'normalizeListing', 'listingDetailsKey', 'publicListingDetails', 'isEnquiryListing', 'listingSpecificationGroups', 'listingFacts', 'normalizeServiceConfiguration', 'serviceConfigurationFields', 'serviceFacts', `${source};return{buildBuilderCommerceContext,resolveBuilderCommerceAction}`)(
  () => 'R 100', row => row.active !== false && row.status !== 'draft', () => 'R 200', () => 60,
  ws => ({ options: (ws.paymentGateways || []).filter(row => row.enabled) }), assertBusinessCommerceEnabled, isPresenceOnlyBusiness, normalizeListing, listingDetailsKey, publicListingDetails, isEnquiryListing, listingSpecificationGroups, listingFacts, normalizeServiceConfiguration, serviceConfigurationFields, serviceFacts
);
const workspace = { brandName: 'Test', products: [{ id: 'p1', name: 'Bread', cost: 999, internalNotes: 'secret' }, { id: 'draft', status: 'draft' }], services: [{ id: 's1', name: 'Class', cost: 555 }, { id: 'draft-service', status: 'draft' }, { id: 'unavailable-service', available: false }], clients: [{ email: 'private@example.com' }], bookings: [{ clientPhone: 'private' }], paymentGateways: [{ id: 'cash', name: 'Cash', enabled: true, secretKey: 'do-not-share' }] };

test('connected builder receives safe specialist details and opens enquiry listings without adding to cart', () => {
  const dealer = { ...workspace, products: [{ id:'car', listingType:'vehicle', price:'249900', vehicleDetails:{ make:'Toyota', model:'Corolla', vin:'private-vin', privateNotes:'secret' } }] };
  const product = buildBuilderCommerceContext(dealer).products[0];
  assert.equal(product.transactionMode,'enquiry');
  assert.equal(product.vehicleDetails.make,'Toyota');
  assert.equal(product.vehicleDetails.vin,undefined);
  assert.equal(product.vehicleDetails.privateNotes,undefined);
  assert.deepEqual(resolveBuilderCommerceAction(dealer,'product.open',{productId:'car'}),{kind:'product',id:'car'});
  assert.throws(() => resolveBuilderCommerceAction(dealer,'cart.add',{productId:'car'}),/enquiries only/);
});

test('retail electronics keep variants and stock while trusted projections expose only applicable approved specifications', () => {
  const laptop = { id: 'laptop', name: 'Studio laptop', active: true, listingType: 'electronics', transactionMode: 'checkout', price: 12000, stockAvailable: 3,
    electronicsDetails: { brand: 'Lenovo', model: 'ThinkPad T14', deviceType: 'Laptop', condition: 'New', processor: 'AMD Ryzen 7', ram: 16, storageCapacity: 512, displaySize: 14, serialNumber: 'private-serial', internalPassword: 'private-secret' },
    listingSpecFields: ['processor', 'ram', 'storageCapacity', 'displaySize'], listingSpecificationGroups: [{ label: 'Forged group', fields: [{ key: 'private', label: 'Private secret', value: 'private-secret' }] }],
    variants: [{ id: '512gb', title: '512 GB', price: 12000, stockAvailable: 2, available: true }, { id: '1tb', title: '1 TB', price: 13500, stockAvailable: 1, available: true }] };
  const retailer = { ...workspace, products: [laptop] };
  for (const product of [publicCommerceCatalog(retailer).products[0], buildBuilderCommerceContext(retailer).products[0]]) {
    assert.equal(product.transactionMode, 'checkout');
    assert.equal(product.electronicsDetails.brand, 'Lenovo');
    assert.equal(product.electronicsDetails.ram, '16');
    assert.equal(product.variants.length, 2);
    assert.equal(product.variants[1].stockAvailable, 1);
    assert.ok(product.listingSpecificationGroups.some(group => group.fields.some(field => field.key === 'ram' && field.value === '16')));
    assert.ok(product.listingFacts.length);
    const json = JSON.stringify(product);
    for (const forbidden of ['private-serial', 'private-secret', 'Forged group', 'internalPassword']) assert.equal(json.includes(forbidden), false, forbidden);
  }
  assert.deepEqual(resolveBuilderCommerceAction(retailer, 'cart.add', { productId: 'laptop' }), { kind: 'product', id: 'laptop' });
});

test('AI catalog context excludes private records, costs and payment credentials', () => {
  const context = buildBuilderCommerceContext(workspace);
  assert.equal(context.products.length, 1);
  assert.equal(context.services.length, 1);
  const json = JSON.stringify(context);
  for (const forbidden of ['999', '555', 'do-not-share', 'private@example.com', 'internalNotes', 'clientPhone', 'secretKey']) assert.equal(json.includes(forbidden), false, forbidden);
});

test('presence-only businesses expose no builder commerce and reject generated shopping actions', () => {
  const presence = { ...workspace, website: { categoryId: 'restaurants_takeaways' } };
  const context = buildBuilderCommerceContext(presence);
  assert.equal(context.profileMode, 'presence');
  for (const key of ['products', 'services', 'payments']) assert.deepEqual(context[key], []);
  for (const action of ['checkout.create', 'cart.open', 'product.open', 'service.open']) {
    assert.throws(() => resolveBuilderCommerceAction(presence, action, { productId: 'p1', serviceId: 's1' }), /presence-only/);
  }
  assert.deepEqual(resolveBuilderCommerceAction(presence, 'cart.close'), { kind: 'close' });
});

test('generated-site actions resolve real items and reject missing or hidden IDs', () => {
  assert.deepEqual(resolveBuilderCommerceAction(workspace, 'cart.add', { productId: 'p1', price: 1 }), { kind: 'product', id: 'p1' });
  assert.deepEqual(resolveBuilderCommerceAction(workspace, 'booking.create', { serviceId: 's1', time: 'invented' }), { kind: 'service', id: 's1' });
  assert.throws(() => resolveBuilderCommerceAction(workspace, 'cart.add', { productId: 'draft' }));
  assert.throws(() => resolveBuilderCommerceAction(workspace, 'cart.add', { productId: 'fake' }));
  assert.throws(() => resolveBuilderCommerceAction(workspace, 'service.open', { serviceId: 'draft-service' }));
  assert.throws(() => resolveBuilderCommerceAction(workspace, 'service.open', { serviceId: 'unavailable-service' }));
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
