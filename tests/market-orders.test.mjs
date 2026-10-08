import test from 'node:test';
import assert from 'node:assert/strict';
import { priceMarketOrder } from '../functions/marketOrders.js';
const workspace = { slug: 'shop', currency: 'R', products: [{ id: 'p', name: 'Apron', price: 20, stockAvailable: 5, active: true }], website: {
  markets: [{ id: 'ZA', countryCode: 'ZA', enabled: true, catalogMode: 'all', shippingProfileIds: ['flat'] }],
  shippingProfiles: [{ id: 'flat', enabled: true, productMode: 'all', rateCents: 500 }]
} };
const data = { paymentMethod: 'cash', items: [{ productId: 'p', quantity: 2, unitPriceCents: 1 }], client: { clientName: 'Buyer', clientEmail: 'buyer@example.com', country: 'ZA', shippingAddress: 'Example address' } };
test('server catalog pricing includes shipping and ignores spoofed prices and client UID', () => {
  const order = priceMarketOrder(workspace, { ...data, client: { ...data.client, clientUid: 'spoofed' } });
  assert.equal(order.subtotalCents, 4000); assert.equal(order.amountInCents, 4500); assert.equal(order.clientUid, '');
});
test('disabled markets, missing shipping address and unavailable quantities are rejected', () => {
  assert.throws(() => priceMarketOrder(workspace, { ...data, client: { ...data.client, country: 'US' } }));
  assert.throws(() => priceMarketOrder(workspace, { ...data, client: { ...data.client, shippingAddress: '' } }));
  assert.throws(() => priceMarketOrder(workspace, { ...data, items: [{ productId: 'p', quantity: 6 }] }));
  assert.throws(() => priceMarketOrder(workspace, { ...data, items: [{ productId: 'p', quantity: 3 }, { productId: 'p', quantity: 3 }] }));
});
test('unselected and unknown variants cannot bypass market policy', () => {
  const configured = { ...workspace, products: [{ id: 'p', name: 'Apron', variants: [{ id: 'v', price: 30 }, { id: 'other', price: 10 }] }], website: { ...workspace.website, markets: [{ ...workspace.website.markets[0], catalogMode: 'selected', variantKeys: ['p:v'] }] } };
  assert.throws(() => priceMarketOrder(configured, data));
  assert.throws(() => priceMarketOrder(configured, { ...data, items: [{ productId: 'p', variantId: 'other', quantity: 1 }] }));
  assert.equal(priceMarketOrder(configured, { ...data, items: [{ productId: 'p', variantId: 'v', quantity: 1 }] }).amountInCents, 3500);
});
test('a disabled payment gateway cannot be submitted directly', () => {
  assert.throws(() => priceMarketOrder({ ...workspace, paymentGateways: [{ gatewayType: 'cash', enabled: false }] }, data), /not enabled/);
  assert.equal(priceMarketOrder({ ...workspace, paymentGateways: [{ gatewayType: 'cash', enabled: true }] }, data).paymentMethod, 'cash');
});

test('quotes calculate canonical totals before customer entry while order creation still requires identity and delivery address', () => {
  const preview = {...data,client:{country:'ZA'}};
  assert.equal(priceMarketOrder(workspace,preview,null,{requireCustomer:false}).amountInCents,4500);
  assert.throws(() => priceMarketOrder(workspace,preview),/name and a valid email/);
  assert.throws(() => priceMarketOrder(workspace,{...preview,client:{country:'US'}},null,{requireCustomer:false}),/does not sell/);
});
