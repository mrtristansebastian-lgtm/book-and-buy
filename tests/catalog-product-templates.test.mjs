import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRODUCT_TEMPLATES, PRODUCT_CATEGORY_GROUPS, PHYSICAL_SCHEMA,
  getProductTemplates, getProductTemplate, productTemplateSchema
} from '../functions/catalogTemplates.js';
import {
  getApplicableListingSchema, getListingType, hasListingSpecifications, listingDetailsKey,
  listingFacts, listingSearchTerms, listingSpecificationGroups, normalizeListing,
  publicListingDetails, validateListing, isEnquiryListing
} from '../functions/listingTypes.js';
import { applyWorkspaceChanges } from '../functions/workspaceDomain.js';

const fields = schema => schema.flatMap(group => group.fields);
const shirt = {
  id: 'shirt', name: 'Linen shirt', listingType: 'physical', catalogTemplateId: 'apparel_shirt',
  exploreMainCategoryId: 'buy_fashion', exploreSubcategoryId: 'fashion_mens',
  physicalDetails: { brand: 'Studio', colour: 'White', material: 'Linen', size: 'M', fit: 'Relaxed', fabricComposition: '100% linen' }
};
const laptop = {
  id: 'laptop', listingType: 'electronics', catalogTemplateId: 'electronics_laptop',
  exploreMainCategoryId: 'buy_electronics', exploreSubcategoryId: 'electronics_computers',
  electronicsDetails: { brand: 'Example', model: 'Notebook', condition: 'New', ram: '16', storageCapacity: '512' }
};

test('every supported product subcategory has stable exact choices while food has none', () => {
  assert.equal(new Set(PRODUCT_TEMPLATES.map(template => template.id)).size, PRODUCT_TEMPLATES.length);
  for (const category of Object.values(PRODUCT_CATEGORY_GROUPS).flat()) {
    const choices = getProductTemplates(category);
    assert.ok(choices.length, category);
    for (const choice of choices) assert.equal(getProductTemplate(choice.id), choice);
  }
  for (const excluded of ['restaurants_takeaways', 'food_prepared', 'food_pantry', 'food_bakery', 'bakery_specialty', 'property', 'medical', 'financial_services']) assert.deepEqual(getProductTemplates(excluded), [], excluded);
  assert.deepEqual(getProductTemplates('not-a-category'), []);
  assert.equal(getProductTemplate('not-a-template'), null);
  assert.ok(getProductTemplates('electronics_computers').every(template => ['Laptop', 'Desktop'].includes(template.deviceType)));
  assert.ok(getProductTemplates('electronics_displays').every(template => ['Monitor', 'TV'].includes(template.deviceType)));
});

test('ordinary product specifications are tailored and optional without breaking legacy records', () => {
  assert.equal(hasListingSpecifications(shirt), true);
  assert.equal(listingDetailsKey(shirt), 'physicalDetails');
  assert.equal(validateListing(shirt), '');
  assert.equal(validateListing({ name: 'Legacy item' }), '');
  assert.equal(validateListing({ ...shirt, physicalDetails: {} }), '', 'Ordinary goods do not require an unnecessary checklist');
  const shirtKeys = fields(getApplicableListingSchema(shirt)).map(field => field.key);
  assert.ok(shirtKeys.includes('fit'));
  assert.equal(shirtKeys.includes('author'), false);
  const book = { ...shirt, catalogTemplateId: 'book_fiction', exploreMainCategoryId: 'buy_books', exploreSubcategoryId: 'books_reading', physicalDetails: { author: 'Jane Example', format: 'Paperback', language: 'English' } };
  assert.equal(validateListing(book), '');
  const bookKeys = fields(productTemplateSchema(book)).map(field => field.key);
  assert.ok(bookKeys.includes('isbn'));
  assert.equal(bookKeys.includes('fit'), false);
  assert.deepEqual(listingFacts(book), ['Jane Example', 'Paperback', 'English']);
  assert.deepEqual(listingFacts(shirt), ['M', 'Relaxed', 'Linen']);
});

test('physical specifications keep approved owner data but only expose the chosen template fields', () => {
  const source = { ...shirt, physicalDetails: { ...shirt.physicalDetails, author: 'Former book field', costPrice: 'PRIVATE', internalNotes: 'PRIVATE', serialNumber: 'PRIVATE' }, listingSpecFields: ['sizeGuide', 'sizeGuide', 'author', 'internalNotes', 'madeUp'] };
  const normalized = normalizeListing(source);
  assert.equal(normalized.catalogTemplateId, shirt.catalogTemplateId);
  assert.equal(normalized.physicalDetails.author, 'Former book field');
  assert.deepEqual(normalized.listingSpecFields, ['sizeGuide', 'author']);
  const publicDetails = publicListingDetails(source);
  assert.equal(publicDetails.fabricComposition, '100% linen');
  assert.equal(publicDetails.author, undefined);
  for (const key of ['costPrice', 'internalNotes', 'serialNumber']) assert.equal(normalized.physicalDetails[key], undefined);
  assert.equal(listingSearchTerms(source).includes('PRIVATE'), false);
  assert.equal(listingSearchTerms(source).includes('Former book field'), false);
  assert.equal(listingSpecificationGroups(source).flatMap(group => group.fields).some(field => field.key === 'author'), false);
  assert.deepEqual(normalized.vehicleDetails, {});
  assert.deepEqual(normalized.equipmentDetails, {});
  assert.deepEqual(normalized.electronicsDetails, {});
});

test('template identity is enforced against category, family and device spoofing', () => {
  assert.equal(validateListing(laptop), '');
  assert.equal(normalizeListing(laptop).electronicsDetails.deviceType, 'Laptop');
  assert.equal(getListingType({ ...laptop, listingType: 'physical' }), 'electronics');
  assert.match(validateListing({ ...laptop, listingType: 'physical' }), /matches this listing/);
  assert.match(validateListing({ ...laptop, electronicsDetails: { ...laptop.electronicsDetails, deviceType: 'Phone' } }), /must match/);
  assert.match(validateListing({ ...laptop, exploreSubcategoryId: 'fashion_mens' }), /subcategory/);
  assert.match(validateListing({ ...laptop, exploreMainCategoryId: 'buy_fashion' }), /matching product category/);
  for (const catalogTemplateId of ['not-real', ['electronics_laptop'], { id: 'electronics_laptop' }]) assert.match(validateListing({ ...laptop, catalogTemplateId }), /supported product type/);
  const keyboard = { ...laptop, catalogTemplateId: 'electronics_keyboard', exploreSubcategoryId: 'electronics_acc' };
  assert.equal(validateListing(keyboard), '');
  assert.equal(normalizeListing(keyboard).electronicsDetails.accessoryType, 'Keyboard');
  const keyboardFields = fields(getApplicableListingSchema(keyboard));
  assert.equal(keyboardFields.find(field => field.key === 'deviceType').templateFixed, true);
  assert.equal(keyboardFields.find(field => field.key === 'accessoryType').templateFixed, true);
  assert.ok(keyboardFields.some(field => field.key === 'keyboardLayout'));
  assert.equal(keyboardFields.some(field => field.key === 'mouseSensitivity'), false);
  assert.equal(keyboardFields.some(field => field.key === 'lensMount'), false);
});

test('template selection cannot bypass enquiry policy or convert an existing listing family', () => {
  const vehicle = { catalogTemplateId: 'vehicle_suv', transactionMode: 'checkout', vehicleDetails: { make: 'Example', model: 'SUV', year: '2024', condition: 'New', location: 'Cape Town' } };
  assert.equal(isEnquiryListing(vehicle), true);
  assert.equal(validateListing(vehicle), '');
  assert.equal(normalizeListing(vehicle).transactionMode, 'enquiry');
  assert.equal(normalizeListing(vehicle).vehicleDetails.body, 'SUV');
  const previous = { products: [shirt], sectionRevisions: { products: 1 } };
  assert.throws(() => applyWorkspaceChanges(previous, [{ section: 'products', expectedRevision: 1, patch: { products: [{ ...vehicle, id: shirt.id }] } }]), /new listing|listing type/i);
  const updated = applyWorkspaceChanges(previous, [{ section: 'products', expectedRevision: 1, patch: { products: [{ ...shirt, catalogTemplateId: 'apparel_tshirt' }] } }]);
  assert.equal(updated.products[0].catalogTemplateId, 'apparel_tshirt');
  assert.equal(updated.products[0].physicalDetails.material, 'Linen');
});

test('equipment templates add relevant output details without exposing unrelated machine specifications', () => {
  const generator = { listingType: 'equipment', catalogTemplateId: 'equipment_generator', equipmentDetails: { manufacturer: 'Example', model: 'G5', condition: 'New', location: 'Cape Town', ratedPower: '5', fuel: 'Diesel', liftingCapacity: '1000' } };
  assert.equal(validateListing(generator), '');
  const generatorFields = fields(getApplicableListingSchema(generator));
  assert.equal(generatorFields.find(field => field.key === 'ratedPower').essential, true);
  assert.ok(generatorFields.some(field => field.key === 'phase'));
  assert.equal(generatorFields.some(field => field.key === 'liftingCapacity'), false);
  assert.equal(publicListingDetails(generator).liftingCapacity, undefined);
  assert.equal(normalizeListing(generator).equipmentDetails.liftingCapacity, '1000', 'Approved owner data remains available after changing template');
  assert.deepEqual(listingFacts(generator), ['New', '5 kW', 'Diesel']);
});

test('all optional physical specifications validate their type and public allowlists are unique', () => {
  const schemaFields = fields(PHYSICAL_SCHEMA);
  assert.equal(new Set(schemaFields.map(field => field.key)).size, schemaFields.length);
  for (const template of PRODUCT_TEMPLATES.filter(template => template.listingType === 'physical')) {
    const product = { listingType: 'physical', catalogTemplateId: template.id, physicalDetails: {} };
    for (const field of fields(getApplicableListingSchema(product))) product.physicalDetails[field.key] = field.type === 'number' ? String(Math.max(field.min, 1)) : field.options?.[0] || 'Example';
    assert.equal(validateListing(product), '', template.id);
  }
  assert.match(validateListing({ ...shirt, physicalDetails: { weight: '-1' } }), /valid weight/);
  assert.match(validateListing({ ...shirt, physicalDetails: { packQuantity: '1.5' } }), /valid items in pack/);
  assert.match(validateListing({ ...shirt, physicalDetails: { fit: 'Nonsense' } }), /valid fit/);
  assert.match(validateListing({ ...shirt, physicalDetails: [] }), /valid listing specifications/);
  assert.match(validateListing({ ...shirt, physicalDetails: 0 }), /valid listing specifications/);
});


test('clothing categories tailor garment measurements and preserve public clothing details', () => {
  const garment = { ...shirt, catalogTemplateId: 'category_clothing_bottoms', exploreSubcategoryId: 'clothing_bottoms', physicalDetails: { size: '32', fit: 'Slim', clothingSizeSystem: 'SA / UK', waistRise: 'High rise', inseam: '80 cm', stretch: 'Slight stretch', costPrice: 'private' } };
  assert.equal(validateListing(garment), '');
  const keys = fields(productTemplateSchema(garment)).map(field => field.key);
  assert.ok(keys.includes('waistRise'));
  assert.ok(keys.includes('inseam'));
  assert.equal(keys.includes('sleeveLength'), false);
  const tops = fields(productTemplateSchema({ ...garment, catalogTemplateId: 'category_clothing_tops' })).map(field => field.key);
  assert.ok(tops.includes('sleeveLength'));
  assert.equal(tops.includes('inseam'), false);
  const publicDetails = publicListingDetails(normalizeListing(garment));
  assert.equal(publicDetails.clothingSizeSystem, 'SA / UK');
  assert.equal(publicDetails.inseam, '80 cm');
  assert.equal(publicDetails.costPrice, undefined);
});
