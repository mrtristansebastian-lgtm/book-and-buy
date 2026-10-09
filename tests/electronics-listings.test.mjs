import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import {
  ELECTRONICS_DEVICE_TYPES, ELECTRONICS_SCHEMA, VEHICLE_SCHEMA, EQUIPMENT_SCHEMA,
  getApplicableListingSchema, getListingSchema, hasListingSpecifications, isEnquiryListing,
  listingDetailsKey, listingFacts, listingSearchTerms, listingSpecificationGroups,
  normalizeListing, publicListingDetails, validateListing
} from '../functions/listingTypes.js';
import { applyWorkspaceChanges } from '../functions/workspaceDomain.js';
import { priceMarketOrder } from '../functions/marketOrders.js';

const laptop = {
  id: 'tech', name: 'Workhorse', listingType: 'electronics', transactionMode: 'enquiry',
  active: true, price: 8999.95, stockAvailable: 10,
  electronicsDetails: { deviceType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad T14', condition: 'New', processor: 'AMD Ryzen 7', ram: '16', storageCapacity: '512', displaySize: '14', displayResolution: '1920 × 1200' }
};
const flatFields = (schema) => schema.flatMap(group => group.fields);
const essentials = { brand: 'Example', model: 'Example model', condition: 'New' };

test('electronics use checkout with authoritative retail variant prices and stock', () => {
  const product = { ...laptop, options: [{ id: 'memory', name: 'Memory', values: ['16 GB', '32 GB'] }], variants: [
    { id: 'small', title: '16 GB', price: 8999.95, stockAvailable: 5, available: true },
    { id: 'large', title: '32 GB', price: 11999.95, stockAvailable: 2, available: true }
  ] };
  assert.equal(isEnquiryListing(product), false, 'Even a forged enquiry mode cannot change electronics retail policy');
  assert.equal(normalizeListing(product).transactionMode, 'checkout');
  assert.equal(validateListing(product), '');
  const saved = applyWorkspaceChanges({}, [{ section: 'products', expectedRevision: 0, patch: { products: [product] } }], { initial: true }).products[0];
  assert.equal(saved.transactionMode, 'checkout');
  assert.deepEqual(saved.variants.map(variant => variant.id), ['small', 'large']);
  const workspace = { slug: 'tech-shop', currency: 'R', products: [saved], website: {
    markets: [{ id: 'ZA', countryCode: 'ZA', enabled: true, catalogMode: 'all', shippingProfileIds: ['flat'] }],
    shippingProfiles: [{ id: 'flat', enabled: true, productMode: 'all', rateCents: 500 }]
  } };
  const request = { paymentMethod: 'cash', items: [{ productId: 'tech', variantId: 'large', quantity: 2, unitPriceCents: 1 }], client: { clientName: 'Buyer', clientEmail: 'buyer@example.com', country: 'ZA', shippingAddress: 'Example address' } };
  const order = priceMarketOrder(workspace, request);
  assert.equal(order.subtotalCents, 2399990);
  assert.equal(order.amountInCents, 2400490);
  assert.throws(() => priceMarketOrder(workspace, { ...request, items: [{ ...request.items[0], quantity: 3 }] }), /stock|available/i);
});

test('each device type accepts essentials and offers relevant typed optional specifications', () => {
  assert.equal(listingDetailsKey(laptop), 'electronicsDetails');
  assert.equal(hasListingSpecifications(laptop), true);
  assert.equal(hasListingSpecifications({ listingType: 'physical' }), true);
  for (const deviceType of ELECTRONICS_DEVICE_TYPES) {
    const product = { ...laptop, electronicsDetails: { ...essentials, deviceType } };
    assert.equal(validateListing(product), '', deviceType);
    const fields = flatFields(getApplicableListingSchema(product));
    assert.equal(fields.some(field => field.key === 'deviceType'), true);
    assert.equal(fields.every(field => !field.deviceTypes || field.deviceTypes.includes(deviceType)), true, deviceType);
    const details = { ...product.electronicsDetails };
    for (const field of fields.filter(field => !field.required)) details[field.key] = field.type === 'number' ? String(field.min || 1) : field.options ? field.options[0] : 'Declared specification';
    assert.equal(validateListing({ ...product, electronicsDetails: details }), '', deviceType);
  }
  const monitorFields = flatFields(getApplicableListingSchema({ ...laptop, electronicsDetails: { ...essentials, deviceType: 'Monitor' } })).map(field => field.key);
  assert.ok(monitorFields.includes('vesaMount'));
  assert.ok(monitorFields.includes('responseTime'));
  assert.equal(monitorFields.includes('mainCamera'), false);
  assert.equal(monitorFields.includes('consolePlatform'), false);
  const unknownFields = flatFields(getApplicableListingSchema({ ...laptop, electronicsDetails: {} }));
  assert.equal(unknownFields.some(field => field.deviceTypes), false);
});

test('device requirements and optional field types reject invalid values before saving', () => {
  for (const key of ['deviceType', 'brand', 'model', 'condition']) {
    assert.match(validateListing({ ...laptop, electronicsDetails: { ...laptop.electronicsDetails, [key]: '' } }), /Add /, key);
  }
  for (const invalid of [
    { deviceType: 'Unsupported device' }, { condition: 'Broken' }, { ram: '-1' }, { ram: 'sixteen' },
    { batteryHealth: '101' }, { processorCores: '8.5' }, { refreshRate: 'Infinity' },
    { wifi: { private: true } }, { ports: 'x'.repeat(801) }, { memoryType: 'Invented DDR' }
  ]) assert.ok(validateListing({ ...laptop, electronicsDetails: { ...laptop.electronicsDetails, ...invalid } }), JSON.stringify(invalid));
  assert.match(validateListing({ ...laptop, electronicsDetails: [] }), /valid listing specifications/);
  assert.match(validateListing({ ...laptop, electronicsDetails: { ...essentials, deviceType: 'Monitor', mainCamera: '-4' } }), /main camera/, 'Saved fields from a former device type are still validated');
});

test('component setup starts with component basics while computing devices keep processor and RAM essentials', () => {
  const componentFields = flatFields(getApplicableListingSchema({ listingType: 'electronics', electronicsDetails: { deviceType: 'Component' } }));
  assert.equal(componentFields.find(field => field.key === 'componentType').essential, true);
  for (const key of ['processor', 'ram']) {
    assert.equal(componentFields.find(field => field.key === key).essential, false, key);
    assert.equal(flatFields(getApplicableListingSchema(laptop)).find(field => field.key === key).essential, true, key);
  }
  const component = { ...laptop, electronicsDetails: { ...essentials, deviceType: 'Component', componentType: 'Graphics card', processor: 'Saved optional chip', ram: '16' } };
  assert.equal(validateListing(component), '');
  assert.equal(normalizeListing(component).electronicsDetails.processor, 'Saved optional chip');
  assert.equal(publicListingDetails(component).ram, '16');
});

test('changing device type preserves saved approved extras and selected empty optional fields', () => {
  const source = {
    ...laptop,
    electronicsDetails: { ...laptop.electronicsDetails, deviceType: 'Monitor', refreshRate: '144', imei: 'private', serialNumber: 'private', purchaseCost: 'secret' },
    listingSpecFields: ['ports', 'ports', 'ram', 'mainCamera', 'brand', 'imei', 'unknown', null]
  };
  const normalized = normalizeListing(source);
  assert.equal(normalized.electronicsDetails.processor, 'AMD Ryzen 7');
  assert.equal(normalized.electronicsDetails.ram, '16');
  assert.deepEqual(normalized.listingSpecFields, ['ports', 'ram', 'mainCamera']);
  for (const key of ['imei', 'serialNumber', 'purchaseCost']) assert.equal(normalized.electronicsDetails[key], undefined);
  const displayed = publicListingDetails(source);
  assert.equal(displayed.refreshRate, '144');
  assert.equal(displayed.processor, undefined);
  assert.equal(displayed.ram, undefined);
  const groups = listingSpecificationGroups({ ...source, listingSpecificationGroups: [{ label: 'Forged', fields: [{ label: 'Secret', value: 'private' }] }] });
  assert.equal(groups.some(group => group.label === 'Forged'), false);
  assert.equal(groups.flatMap(group => group.fields).some(field => field.key === 'imei'), false);
  assert.deepEqual(groups.flatMap(group => group.fields).find(field => field.key === 'refreshRate'), { key: 'refreshRate', label: 'Refresh rate', unit: 'Hz', value: '144' });
});

test('public specification catalogue excludes unique identifiers and includes meaningful category basics', () => {
  const keys = flatFields(ELECTRONICS_SCHEMA).map(field => field.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const forbidden of ['imei', 'serialNumber', 'vin', 'costPrice', 'internalNotes']) assert.equal(keys.includes(forbidden), false);
  for (const type of ELECTRONICS_DEVICE_TYPES.filter(type => type !== 'Other')) {
    const fields = flatFields(getApplicableListingSchema({ listingType: 'electronics', electronicsDetails: { deviceType: type } }));
    assert.ok(fields.some(field => field.essential && !field.required), type);
  }
  const vehicleEssentials = flatFields(VEHICLE_SCHEMA).filter(field => field.essential).map(field => field.key);
  for (const key of ['make', 'model', 'year', 'condition', 'location', 'mileage', 'transmission', 'fuel', 'body']) assert.ok(vehicleEssentials.includes(key), key);
  const equipmentEssentials = flatFields(EQUIPMENT_SCHEMA).filter(field => field.essential).map(field => field.key);
  for (const key of ['manufacturer', 'model', 'equipmentType', 'condition', 'location', 'year']) assert.ok(equipmentEssentials.includes(key), key);
  assert.equal(getListingSchema(laptop), ELECTRONICS_SCHEMA);
  assert.deepEqual(listingFacts(laptop), ['16 GB RAM', '512 GB', 'AMD Ryzen 7']);
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
const { searchPublicCatalog } = loadFrontend('../src/features/website/profileModel.js');
const { filterManagedCatalog } = loadFrontend('../src/utils/catalogSearch.js');
test('public and office search find approved electronics details but not private or irrelevant fields', () => {
  const products = [{ ...laptop, electronicsDetails: { ...laptop.electronicsDetails, imei: 'PRIVATE-IDENTIFIER', lensMount: 'INAPPLICABLE-LENS' } }];
  for (const search of [searchPublicCatalog, filterManagedCatalog]) {
    assert.deepEqual(search(products, 'Lenovo ThinkPad').map(product => product.id), ['tech']);
    assert.deepEqual(search(products, 'Ryzen 512').map(product => product.id), ['tech']);
    assert.deepEqual(search(products, 'PRIVATE-IDENTIFIER'), []);
    assert.deepEqual(search(products, 'INAPPLICABLE-LENS'), []);
  }
  assert.ok(listingSearchTerms(laptop).includes('512'));
});
