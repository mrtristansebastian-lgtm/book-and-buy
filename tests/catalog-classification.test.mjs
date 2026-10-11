import test from 'node:test';
import assert from 'node:assert/strict';
import { groupsForExploreMode, categoriesInGroup, isValidExploreCategoryPair } from '../src/config/businessCategories.js';
import { isFoodPresenceCategory } from '../functions/businessCapabilities.js';
import { PRODUCT_TEMPLATES, PRODUCT_CATEGORY_TEMPLATES, getProductCategoryTemplate, getProductTemplate, getProductTemplates } from '../functions/catalogTemplates.js';
import { getApplicableListingSchema, isEnquiryListing, normalizeListing, publicListingDetails, validateListing } from '../functions/listingTypes.js';
import { SERVICE_TEMPLATES, getServiceTemplates } from '../functions/serviceTemplates.js';

test('every template belongs to an existing discovery category in the right mode', () => {
  const productLeaves = new Set(groupsForExploreMode('buy').flatMap(group => categoriesInGroup(group.id).map(item => item.id)));
  for (const template of [...PRODUCT_TEMPLATES, ...PRODUCT_CATEGORY_TEMPLATES]) {
    assert(template.categoryIds.length > 0, template.id);
    for (const id of template.categoryIds) {
      assert(productLeaves.has(id), `${template.id} has an unknown product category ${id}`);
      assert.equal(isFoodPresenceCategory(id), false, `${template.id} must not enable food commerce`);
    }
  }
  for (const template of SERVICE_TEMPLATES) {
    assert(isValidExploreCategoryPair(template.mainCategoryId, template.subcategoryId, 'book'), template.id);
    assert.equal(isFoodPresenceCategory(template.subcategoryId), false, template.id);
    assert(['appointment', 'class_session'].includes(template.scheduleType), template.id);
  }
});

test('every supported category has concrete choices and presence-only food has none', () => {
  for (const mode of ['buy', 'book']) {
    const getTemplates = mode === 'buy' ? getProductTemplates : getServiceTemplates;
    for (const group of groupsForExploreMode(mode)) for (const leaf of categoriesInGroup(group.id)) {
      assert.equal(getTemplates(leaf.id).length > 0, !isFoodPresenceCategory(leaf.id), `${mode}: ${leaf.id}`);
    }
  }
});

test('narrow electronics categories offer the corresponding device setups', () => {
  const categories = { electronics_computers: ['Laptop', 'Desktop'], electronics_displays: ['Monitor', 'TV'], electronics_cameras: ['Camera'], electronics_gaming: ['Console'], electronics_networking: ['Networking'], electronics_components: ['Component', 'Storage'], electronics_smart_home: ['Smart home'] };
  for (const [category, devices] of Object.entries(categories)) {
    const templates = getProductTemplates(category);
    assert(templates.length > 0, category);
    assert(templates.every(template => devices.includes(template.deviceType)), category);
  }
});

test('every commerce subcategory supplies a complete category setup without an exact product choice', () => {
  assert.equal(new Set(PRODUCT_CATEGORY_TEMPLATES.map(template => template.id)).size, PRODUCT_CATEGORY_TEMPLATES.length);
  for (const group of groupsForExploreMode('buy')) for (const leaf of categoriesInGroup(group.id)) {
    const setup = getProductCategoryTemplate(leaf.id);
    if (isFoodPresenceCategory(leaf.id)) { assert.equal(setup, null); continue; }
    assert.ok(setup, leaf.id);
    assert.equal(setup.mainCategoryId, group.id);
    assert.deepEqual(setup.categoryIds, [leaf.id]);
    assert.equal(getProductTemplate(setup.id), setup);
    assert.ok(getApplicableListingSchema({ catalogTemplateId: setup.id }).length, leaf.id);
  }
  for (const excluded of ['property', 'medical', 'financial_services', 'food_prepared', 'unknown']) assert.equal(getProductCategoryTemplate(excluded), null);
});

test('category setups tailor ordinary goods and survive saving without an exact type', () => {
  const setup = getProductCategoryTemplate('home_furniture');
  const item = { id: 'chair', name: 'Studio chair', exploreMainCategoryId: setup.mainCategoryId, exploreSubcategoryId: 'home_furniture', catalogTemplateId: setup.id, listingType: setup.listingType, physicalDetails: { material: 'Oak', furnitureSize: '80 × 50 × 50 cm', assembly: 'Fully assembled', author: 'Old approved field', internalNotes: 'PRIVATE' } };
  assert.equal(validateListing(item), '');
  const saved = { ...item, ...normalizeListing(item) };
  assert.equal(saved.catalogTemplateId, 'category_home_furniture');
  assert.equal(saved.physicalDetails.furnitureSize, item.physicalDetails.furnitureSize);
  assert.equal(saved.physicalDetails.internalNotes, undefined);
  const fields = getApplicableListingSchema(saved).flatMap(group => group.fields);
  assert.ok(fields.some(field => field.key === 'assembly'));
  assert.equal(fields.some(field => field.key === 'isbn'), false);
  assert.equal(publicListingDetails(saved).author, undefined);
});

test('broader category extras keep the primary family essentials intact', () => {
  const essentials = {
    pet_supplies: ['animal', 'size'], jewelry: ['size', 'metal'], fashion: ['size'],
    sports_gear: ['sport', 'size'], vintage_home: ['size']
  };
  for (const [category, keys] of Object.entries(essentials)) {
    const fields = getApplicableListingSchema({ catalogTemplateId: getProductCategoryTemplate(category).id }).flatMap(group => group.fields);
    assert.equal(new Set(fields.map(field => field.key)).size, fields.length, category);
    for (const key of keys) assert.equal(fields.find(field => field.key === key)?.essential, true, `${category}: ${key}`);
  }
});

test('broad computer categories do not assume a laptop and restrict device choice to the category', () => {
  const setup = getProductCategoryTemplate('electronics_computers');
  assert.equal(setup.deviceType, undefined);
  assert.deepEqual(setup.allowedDeviceTypes, ['Laptop', 'Desktop']);
  const item = { catalogTemplateId: setup.id, exploreMainCategoryId: setup.mainCategoryId, exploreSubcategoryId: 'electronics_computers', electronicsDetails: { brand: 'Example', model: 'Computer', condition: 'New' } };
  const types = getApplicableListingSchema(item).flatMap(group => group.fields).find(field => field.key === 'deviceType');
  assert.deepEqual(types.options, ['Laptop', 'Desktop']);
  assert.equal(types.templateFixed, undefined);
  assert.match(validateListing(item), /device type/);
  assert.match(validateListing({ ...item, electronicsDetails: { ...item.electronicsDetails, deviceType: 'Phone' } }), /device type in this subcategory/);
  const desktop = { ...item, electronicsDetails: { ...item.electronicsDetails, deviceType: 'Desktop', ram: '16', storageCapacity: '512' } };
  assert.equal(validateListing(desktop), '');
  assert.ok(getApplicableListingSchema(desktop).flatMap(group => group.fields).some(field => field.key === 'processor'));
  assert.equal(getApplicableListingSchema(desktop).flatMap(group => group.fields).some(field => field.key === 'rearCamera'), false);
  assert.equal(normalizeListing(desktop).electronicsDetails.deviceType, 'Desktop');
});

test('vehicles keep enquiries while tools use ordinary retail checkout and machinery is absent', () => {
  const car = getProductCategoryTemplate('vehicles_cars');
  assert.equal(isEnquiryListing({ catalogTemplateId: car.id, transactionMode: 'checkout' }), true);
  assert.equal(normalizeListing({ catalogTemplateId: car.id }).transactionMode, 'enquiry');
  const tools = getProductCategoryTemplate('equipment_tools');
  const item = { catalogTemplateId: tools.id, exploreMainCategoryId: tools.mainCategoryId, exploreSubcategoryId: 'equipment_tools', physicalDetails: { brand: 'Example', material: 'Steel', colour: 'Black', size: '165 mm' } };
  assert.equal(validateListing(item), '');
  assert.equal(tools.mainCategoryId, 'buy_tools');
  assert.equal(normalizeListing(item).listingType, 'physical');
  assert.equal(isEnquiryListing(item), false);
  for (const leaf of ['equipment_machinery', 'equipment_construction', 'equipment_agricultural', 'equipment_workshop', 'equipment_generators', 'equipment_commercial']) {
    assert.equal(getProductCategoryTemplate(leaf), null);
    assert.equal(groupsForExploreMode('buy').some(group => categoriesInGroup(group.id).some(category => category.id === leaf)), false);
  }
});
