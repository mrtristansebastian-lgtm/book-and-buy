import test from 'node:test';
import assert from 'node:assert/strict';
import { RETAIL_MAIN_CATEGORIES, RETAIL_CATEGORY_ADDITIONS } from '../functions/retailCategories.js';
import { RETAIL_DEMO_PRODUCTS } from '../src/data/demoRetailProducts.js';
import { PRODUCT_CATEGORY_GROUPS, getProductCategoryTemplate } from '../functions/catalogTemplates.js';
import { groupsForExploreMode, categoriesInGroup, searchCategoryGroups, expandExploreCategoryFilter } from '../src/config/businessCategories.js';
import { isFoodPresenceCategory } from '../functions/businessCapabilities.js';
import { getApplicableListingSchema, normalizeListing, validateListing, publicListingDetails, listingFacts } from '../functions/listingTypes.js';

test('all 23 retail departments have unique leaves and matching editor and Discovery classifications', () => {
  const groups = groupsForExploreMode('buy').filter(group => !isFoodPresenceCategory(group.id));
  assert.equal(groups.length, 23);
  assert.deepEqual(groups.map(group => group.label), RETAIL_MAIN_CATEGORIES.map(group => group.label));
  const leaves = [];
  for (const group of groups) {
    const categories = categoriesInGroup(group.id);
    assert.ok(categories.length, group.label);
    assert.deepEqual(new Set(categories.map(category => category.id)), new Set(PRODUCT_CATEGORY_GROUPS[group.id]));
    for (const category of categories) {
      leaves.push(category.id);
      assert.equal(getProductCategoryTemplate(category.id).mainCategoryId, group.id);
    }
  }
  assert.equal(new Set(leaves).size, leaves.length, 'Each subcategory belongs to one main department');
  assert.equal(leaves.length, 117);
  assert.equal(groups.some(group => /industrial|machinery/i.test(group.label)), false);
  assert.ok(searchCategoryGroups('air fryer').some(group => group.id === 'buy_appliances'));
  assert.deepEqual(new Set(expandExploreCategoryFilter(['group:buy_toys'])), new Set(PRODUCT_CATEGORY_GROUPS.buy_toys));
});

test('each new retail subcategory has a valid example with tailored fields, public facts and regular checkout', () => {
  assert.equal(RETAIL_DEMO_PRODUCTS.length, 40);
  assert.deepEqual(new Set(RETAIL_DEMO_PRODUCTS.map(row => row.leaf)), new Set(RETAIL_CATEGORY_ADDITIONS.map(category => category.id)));
  assert.equal(new Set(RETAIL_DEMO_PRODUCTS.map(row => row.name)).size, 40);
  for (const example of RETAIL_DEMO_PRODUCTS) {
    const template = getProductCategoryTemplate(example.leaf);
    const product = { name: example.name, price: example.price, listingType: 'physical', catalogTemplateId: template.id,
      exploreMainCategoryId: template.mainCategoryId, exploreSubcategoryId: example.leaf,
      physicalDetails: { brand: 'Example', condition: 'New', ...example.specifications, internalNotes: 'PRIVATE' } };
    assert.equal(validateListing(product), '', example.leaf);
    const normalized = { ...product, ...normalizeListing(product) };
    assert.equal(normalized.transactionMode, 'checkout', example.leaf);
    assert.equal(normalized.physicalDetails.internalNotes, undefined);
    assert.equal(publicListingDetails(normalized).internalNotes, undefined);
    assert.ok(listingFacts(normalized).length, example.leaf);
    const fields = getApplicableListingSchema(normalized).flatMap(group => group.fields);
    assert.equal(new Set(fields.map(field => field.key)).size, fields.length);
    for (const field of fields.filter(field => field.essential)) assert.ok(String(normalized.physicalDetails[field.key] ?? '').trim(), `${example.leaf}: ${field.key}`);
    assert.equal(fields.some(field => ['make', 'mileage', 'operatingHours', 'liftingCapacity'].includes(field.key)), false);
    const wrongGroup = { ...normalized, exploreMainCategoryId: template.mainCategoryId === 'buy_tools' ? 'buy_toys' : 'buy_tools' };
    assert.match(validateListing(wrongGroup), /matching product category/, example.leaf);
  }
});
