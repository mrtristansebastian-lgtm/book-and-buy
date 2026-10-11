import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { normalizeListing, validateListing, publicListingDetails, isEnquiryListing } from '../functions/listingTypes.js';
import { priceMarketOrder } from '../functions/marketOrders.js';
import { publicCommerceCatalog, serviceCommerceQuote } from '../functions/commerceRuntime.js';
import { canonicalPayment } from '../functions/payments/paymentPolicy.js';
import { validateBookingSlot } from '../functions/bookingDomain.js';
import { applyWorkspaceChanges, readinessIssues } from '../functions/workspaceDomain.js';
import { marketReadiness } from '../functions/marketPolicy.js';
import { defaultListingLocation, listingLocationOptions } from '../functions/listingLocation.js';

test('listing locations default from the business and offer enabled branches without changing existing addresses', () => {
  const workspace = { website: { address: 'Main business address', branches: [
    { id: 'a', name: 'North showroom', address: 'North branch address', enabled: true, showOnWebsite: false },
    { id: 'b', name: 'Closed showroom', address: 'Closed branch address', enabled: false }
  ] } };
  for (const [listingType, key] of [['vehicle', 'vehicleDetails'], ['equipment', 'equipmentDetails']]) {
    assert.deepEqual(defaultListingLocation({ listingType, [key]: { model: 'Model' } }, workspace), { [key]: { model: 'Model', location: workspace.website.address } });
    assert.equal(defaultListingLocation({ listingType, [key]: { location: 'Custom existing address' } }, workspace), null);
  }
  assert.deepEqual(listingLocationOptions(workspace).map(row => row.value), ['Main business address', 'North branch address']);
  assert.equal(listingLocationOptions(workspace, 'Custom existing address').at(-1).value, 'Custom existing address');
  assert.equal(defaultListingLocation({ listingType: 'vehicle' }, {}), null);
  assert.equal(defaultListingLocation({ listingType: 'physical' }, workspace), null);
});

const require = createRequire(import.meta.url);
const frontendModules = new Map();
function loadFrontend(path) {
  const file = new URL(path, import.meta.url);
  if (frontendModules.has(file.href)) return frontendModules.get(file.href);
  const module = { exports: {} };
  frontendModules.set(file.href, module.exports);
  const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  new Function('module', 'exports', 'require', outputText)(module, module.exports, id => {
    if (!id.startsWith('.')) return require(id);
    const base = new URL(id, file);
    const target = [base, new URL(`${base.href}.js`)].find(existsSync);
    if (!target) throw new Error(`Cannot resolve ${id} from ${file.href}`);
    return loadFrontend(target.href);
  });
  return module.exports;
}
const { searchPublicCatalog, sortPublicCatalog } = loadFrontend('../src/features/website/profileModel.js');
const { filterManagedCatalog } = loadFrontend('../src/utils/catalogSearch.js');

const car = { id: 'car', name: 'Toyota Corolla', listingType: 'vehicle', transactionMode: 'checkout', active: true, price: '249900', vehicleDetails: { make: 'Toyota', model: 'Corolla', year: '2022', condition: 'Used', mileage: '34000', transmission: 'Automatic', fuel: 'Petrol', location: 'Cape Town', vin: 'private', costPrice: 'secret' } };
const workspace = { slug: 'dealer', currency: 'R', products: [car], services: [{ id: 's', price: '100', duration: 60 }], staff: [{ id: 'staff', active: false }], paymentGateways: [{ gatewayType: 'stripe', enabled: true, configured: true }] };
const order = { items: [{ productId: 'car', quantity: 1 }], paymentMethod: 'stripe', client: { clientName: 'Buyer', clientEmail: 'buyer@example.com' } };

test('enquiry listings remain discoverable in markets without requiring shipping setup', () => {
  const market = { id:'ZA',countryCode:'ZA',enabled:true,catalogMode:'all',shippingProfileIds:[] };
  assert.deepEqual(marketReadiness(workspace,market),{productCount:1,serviceCount:1,emptyCatalog:false,shippingIssues:0});
  assert.equal(marketReadiness({...workspace,products:[...workspace.products,{id:'accessory',active:true}]},market).shippingIssues,1);
});

test('vehicle and equipment types force enquiries despite a forged checkout mode', () => {
  for (const listingType of ['vehicle', 'equipment']) {
    const product = { ...car, listingType };
    assert.equal(normalizeListing(product).transactionMode, 'enquiry');
    assert.equal(isEnquiryListing(product), true);
    assert.throws(() => priceMarketOrder({ ...workspace, products: [product] }, order), /enquiries only/);
  }
  assert.equal(normalizeListing({ id: 'old-product' }).transactionMode, 'checkout');
});

test('specialist specifications validate required, numeric and enum fields and reject variants', () => {
  assert.equal(validateListing(car), '');
  assert.equal(validateListing({ ...car, price: '' }), '');
  for (const vehicleDetails of [{ ...car.vehicleDetails, make: '' }, { ...car.vehicleDetails, year: '2022.5' }, { ...car.vehicleDetails, mileage: '-1' }, { ...car.vehicleDetails, transmission: 'Unknown automatic' }]) assert.ok(validateListing({ ...car, vehicleDetails }));
  assert.match(validateListing({ ...car, price: '1.001' }), /asking price/);
  assert.match(validateListing({ ...car, variants: [{ id: 'v' }] }), /without product variants/);
  assert.match(validateListing({ ...car, listingType: 'property' }), /supported listing type/);
});

test('public specialist projection retains approved facts and excludes private arbitrary attributes', () => {
  const details = publicListingDetails(car);
  assert.equal(details.make, 'Toyota');
  assert.equal(details.vin, undefined);
  assert.equal(details.costPrice, undefined);
  const product = publicCommerceCatalog(workspace).products[0];
  assert.deepEqual(product.vehicleDetails, details);
  assert.equal(product.transactionMode, 'enquiry');
  assert.equal(product.equipmentDetails.vin, undefined);
});

test('a saved checkout cannot start a payment after its product becomes an enquiry listing', () => {
  const source = { items: [{ productId: 'car' }], amountInCents: 24990000, paymentMethod: 'stripe', paymentStatus: 'unpaid', status: 'pending' };
  assert.throws(() => canonicalPayment(source, workspace, { sourceType: 'order', gatewayType: 'stripe' }), /enquiries only/);
});

test('food place profiles reject orders, quotes, bookings and new payments on the server', () => {
  const place = { ...workspace, website: { categoryId: 'restaurants_takeaways' } };
  assert.deepEqual(publicCommerceCatalog(place).products, []);
  assert.deepEqual(publicCommerceCatalog(place).services, []);
  assert.equal(publicCommerceCatalog(place).profileMode, 'presence');
  assert.throws(() => priceMarketOrder(place, order), /profile/);
  assert.throws(() => serviceCommerceQuote(place, { serviceId: 's' }), /profile/);
  assert.throws(() => validateBookingSlot(place, {}, {}), /profile/);
  assert.throws(() => canonicalPayment({}, place, { sourceType: 'order' }), /profile/);
  assert.deepEqual(readinessIssues({ ...place, features: { emailUpdates: true }, website: { ...place.website, taxEnabled: true }, availabilityRules: { scheduleMode: 'first_come' } }), []);
});

test('deactivated team members cannot receive new bookings while their roster record remains', () => {
  assert.throws(() => validateBookingSlot(workspace, { staffId: 'staff' }, {}), /team member/);
  assert.equal(workspace.staff.length, 1);
});

test('existing product listing type cannot change and failed conversions preserve original stock and variant identities', () => {
  const physical = { id: 'physical', name: 'Shirt', active: true, stockAvailable: 8, options: [{ id: 'size', name: 'Size', values: ['M'] }], variants: [{ id: 'medium', title: 'M', available: true, price: 100, stockAvailable: 3 }] };
  const previous = { products: [physical], sectionRevisions: { products: 4 } };
  const snapshot = JSON.stringify(previous);
  assert.throws(() => applyWorkspaceChanges(previous, [{ section: 'products', expectedRevision: 4, patch: { products: [{ ...car, id: physical.id, options: [], variants: [] }] } }]), /new listing|listing type/i);
  assert.equal(JSON.stringify(previous), snapshot, 'Rejected conversions must not mutate stored inventory');
  assert.throws(() => applyWorkspaceChanges({ products: [car], sectionRevisions: {} }, [{ section: 'products', expectedRevision: 0, patch: { products: [{ ...physical, id: car.id }] } }]), /new listing|listing type/i);
  const updated = applyWorkspaceChanges(previous, [{ section: 'products', expectedRevision: 4, patch: { products: [{ ...physical, description: 'New description', stockAvailable: 999, variants: [{ ...physical.variants[0], price: 120, stockAvailable: 999 }] }] } }]);
  assert.equal(updated.products[0].stockAvailable, 8);
  assert.equal(updated.products[0].variants[0].id, 'medium');
  assert.equal(updated.products[0].variants[0].stockAvailable, 3);
  assert.equal(updated.products[0].variants[0].price, 120);
});

test('public and office catalogue search finds approved vehicle and equipment facts without needing them in the title', () => {
  const stock = [
    { ...car, name: 'Latest arrival', description: '', vehicleDetails: { ...car.vehicleDetails, reference: 'STK-018', derivative: 'XS Auto', location: 'Woodstock' } },
    { id: 'equipment', name: 'Workshop special', listingType: 'equipment', equipmentDetails: { manufacturer: 'Makita', model: 'M2300', condition: 'Used', equipmentType: 'Mitre saw', location: 'Durban', reference: 'EQ-029' } }
  ];
  for (const search of [searchPublicCatalog, filterManagedCatalog]) {
    for (const query of ['Toyota Corolla', 'STK-018', 'XS Auto', 'Woodstock']) assert.deepEqual(search(stock, query).map(item => item.id), ['car'], query);
    for (const query of ['Makita M2300', 'EQ-029', 'Durban']) assert.deepEqual(search(stock, query).map(item => item.id), ['equipment'], query);
    assert.deepEqual(search(stock, 'not-in-the-catalogue'), []);
  }
});

test('specialist price sort uses asking prices and keeps unknown prices last in either direction', () => {
  const cheap = { ...car, id: 'cheap', price: '100000', variants: [{ id: 'legacy-high', available: false, price: 999999 }] };
  const expensive = { ...car, id: 'expensive', price: '250000', variants: [{ id: 'legacy-low', available: false, price: 1 }] };
  const unknown = { ...car, id: 'unknown', price: '', variants: [{ id: 'legacy-priced', available: false, price: 5 }] };
  const unknownEquipment = { id: 'unknown-equipment', listingType: 'equipment', price: null };
  const input = [unknown, expensive, unknownEquipment, cheap];
  assert.deepEqual(sortPublicCatalog(input, 'price-asc').map(item => item.id), ['cheap', 'expensive', 'unknown', 'unknown-equipment']);
  assert.deepEqual(sortPublicCatalog(input, 'price-desc').map(item => item.id), ['expensive', 'cheap', 'unknown', 'unknown-equipment']);
  assert.deepEqual(input.map(item => item.id), ['unknown', 'expensive', 'unknown-equipment', 'cheap'], 'Sorting leaves the source catalogue order intact');
});
