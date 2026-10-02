import test from 'node:test';
import assert from 'node:assert/strict';
import { getMarkets, resolveMarket, catalogAllowed, shippingQuote, filterWorkspaceForMarket, marketPatch, marketReadiness } from '../functions/marketPolicy.js';
const market = { id: 'ZA', countryCode: 'ZA', enabled: true, catalogMode: 'all', shippingProfileIds: ['default', 'special'] };
const website = { markets: [market], shippingProfiles: [
  { id: 'default', enabled: true, productMode: 'all', rateCents: 5000 },
  { id: 'special', enabled: true, productMode: 'selected', variantKeys: ['p:v'], rateCents: 2500, freeAboveCents: 10000 }
] };
test('legacy countries migrate without altering settings and disabled exact markets beat worldwide', () => {
  assert.equal(getMarkets({ servesCountries: ['ZA', '*'] }).length, 2);
  assert.equal(resolveMarket({ markets: [{ countryCode: '*', enabled: true }, { countryCode: 'ZA', enabled: false }] }, 'ZA').enabled, false);
  assert.deepEqual(marketPatch([{ countryCode: 'ZA', enabled: false }]).servesCountries, []);
});
test('selected products, variants and services remain isolated', () => {
  const selected = { enabled: true, catalogMode: 'selected', variantKeys: ['p:v'], serviceIds: ['s'] };
  assert.equal(catalogAllowed(selected, 'product', 'p'), true);
  assert.equal(catalogAllowed(selected, 'product', 'p', 'other'), false);
  assert.equal(catalogAllowed(selected, 'service', 's'), true);
  assert.equal(catalogAllowed(selected, 'service', 'p'), false);
  const result = filterWorkspaceForMarket({ website: { markets: [{ ...selected, countryCode: 'ZA' }] }, products: [{ id: 'p', variants: [{ id: 'v' }, { id: 'other' }] }], services: [{ id: 's' }, { id: 'other' }] }, 'ZA');
  assert.deepEqual(result.products[0].variants, [{ id: 'v' }]);
  assert.equal(result.services.length, 1);
});
test('shipping charges a profile once, specific overrides default, and thresholds are inclusive', () => {
  assert.equal(shippingQuote(website, 'ZA', [{ productId: 'p', variantId: 'v' }, { productId: 'p', variantId: 'v' }, { productId: 'other' }], 9999).amountInCents, 7500);
  assert.equal(shippingQuote(website, 'ZA', [{ productId: 'p', variantId: 'v' }], 10000).amountInCents, 0);
});
test('missing, disabled, overlapping and malformed profiles fail closed', () => {
  assert.throws(() => shippingQuote(website, 'GB', [{ productId: 'p' }]));
  assert.throws(() => shippingQuote(website, '', []));
  assert.throws(() => shippingQuote({ ...website, shippingProfiles: [] }, 'ZA', [{ productId: 'p' }]));
  assert.throws(() => shippingQuote({ ...website, shippingProfiles: [{ ...website.shippingProfiles[0], rateCents: NaN }] }, 'ZA', [{ productId: 'p' }]));
  assert.throws(() => shippingQuote({ ...website, shippingProfiles: [...website.shippingProfiles, { ...website.shippingProfiles[1], id: 'duplicate' }], markets: [{ ...market, shippingProfileIds: ['special', 'duplicate'] }] }, 'ZA', [{ productId: 'p', variantId: 'v' }]));
});

test('catalog state distinguishes country selection, unsupported destinations and configured empty catalogs', () => {
  const workspace = { website, products: [{ id: 'p' }], services: [{ id: 's' }] };
  assert.equal(filterWorkspaceForMarket(workspace, '').website.catalogAvailability, 'country-required');
  assert.deepEqual(filterWorkspaceForMarket(workspace, '').products, []);
  assert.equal(filterWorkspaceForMarket(workspace, 'GB').website.catalogAvailability, 'country-disabled');
  assert.equal(filterWorkspaceForMarket(workspace, 'ZA').products.length, 1);
  assert.equal(filterWorkspaceForMarket(workspace, 'ZA').website.catalogAvailability, 'available');
  assert.equal(filterWorkspaceForMarket({ products: [{ id: 'p' }] }, '' ).products.length, 1);
});

test('readiness counts visible catalog and flags missing or overlapping delivery profiles', () => {
  const workspace = { website, products: [{ id: 'p', variants: [{ id: 'v' }] }, { id: 'draft', status: 'draft' }], services: [{ id: 's' }, { id: 'hidden', active: false }] };
  assert.deepEqual(marketReadiness(workspace, market), { productCount: 1, serviceCount: 1, emptyCatalog: false, shippingIssues: 0 });
  assert.equal(marketReadiness(workspace, { ...market, shippingProfileIds: [] }).shippingIssues, 1);
  assert.equal(marketReadiness(workspace, { ...market, catalogMode: 'selected', productIds: [], variantKeys: [], serviceIds: [] }).emptyCatalog, true);
  assert.equal(marketReadiness(workspace, { ...market, enabled: false }).productCount, 1);
});
