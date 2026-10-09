import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { publicCommerceCatalog, serviceCommerceQuote } from '../functions/commerceRuntime.js';
import { publicProfile } from '../functions/workspaceCommands.js';
import { applyWorkspaceChanges } from '../functions/workspaceDomain.js';
import { normalizeListing } from '../functions/listingTypes.js';

const require = createRequire(import.meta.url);
const modules = new Map();
function loadFrontend(path) {
  const file = new URL(path, import.meta.url);
  if (modules.has(file.href)) return modules.get(file.href);
  const module = { exports: {} };
  modules.set(file.href, module.exports);
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
const { buildPublicWorkspaceSnapshot } = loadFrontend('../src/shared/firebase/publicSnapshot.ts');
const { buildBuilderCommerceContext } = loadFrontend('../src/features/builder/builderCommerce.js');

const shirt = {
  id: 'shirt', name: 'Studio shirt', listingType: 'physical', catalogTemplateId: 'apparel_tshirt', active: true,
  exploreMainCategoryId: 'buy_fashion', exploreSubcategoryId: 'fashion_mens', price: 350, stockAvailable: 4,
  physicalDetails: { brand: 'Studio', size: 'M', fit: 'Regular', material: 'Cotton', colour: 'Navy', internalNotes: 'private-product-note', purchaseCost: 'private-product-cost' },
  listingSpecFields: ['careInstructions', 'internalNotes'],
  listingSpecificationGroups: [{ label: 'private-forged-product-group', fields: [{ label: 'Internal', value: 'private-value' }] }],
  listingFacts: ['private-forged-product-fact'], cost: 101,
  variants: [{ id: 'large', title: 'Large', price: 400, stockAvailable: 2, available: true }]
};
const haircut = {
  id: 'haircut', name: 'Signature cut', active: true, catalogTemplateId: 'service_haircut',
  exploreMainCategoryId: 'beauty_body', exploreSubcategoryId: 'beauty_hair', scheduleType: 'appointment', duration: 45, price: 250, cost: 99,
  serviceDetails: { hairLength: 'Short', technique: 'Scissor cut', included: 'Wash, cut and finish', maintenance: 'Keep your next appointment.', internalNotes: 'private-service-note', staffEmail: 'private-staff-address' },
  serviceSpecFields: ['maintenance', 'internalNotes'],
  serviceConfigurationFields: [{ key: 'internalNotes', label: 'private-forged-service-label', value: 'private-forged-service-value' }],
  serviceFacts: ['private-forged-service-fact'], variants: [{ id: 'restyle', name: 'Restyle', minDuration: 60, price: 350, cost: 130, available: true }]
};
const workshop = {
  id: 'workshop', name: 'Cooking workshop', catalogTemplateId: 'service_cooking_class',
  exploreMainCategoryId: 'learn_create', exploreSubcategoryId: 'cooking_classes', scheduleType: 'class_session',
  capacity: 8, sessionStartDate: '2026-11-10', sessionStartTime: '10:00', sessionEndDate: '2026-11-10', sessionEndTime: '12:00', price: 500,
  variants: [{ id: 'premium', name: 'Apron included', price: 600, available: true }],
  serviceDetails: { cuisine: 'Italian', experienceLevel: 'Beginner', included: 'Ingredients and equipment' }
};

test('all public catalog boundaries retain exact category templates and approved physical/service details only', () => {
  const workspace = { ownerId: 'owner', slug: 'studio', brandName: 'Studio', currency: 'R', products: [shirt], services: [haircut] };
  const projections = [publicCommerceCatalog(workspace), publicProfile(workspace, 'owner'), buildPublicWorkspaceSnapshot(workspace), buildBuilderCommerceContext(workspace)];
  for (const projection of projections) {
    const product = projection.products[0], service = projection.services[0];
    assert.equal(product.catalogTemplateId, 'apparel_tshirt');
    assert.equal(product.exploreSubcategoryId, 'fashion_mens');
    assert.equal(product.physicalDetails.material, 'Cotton');
    assert.ok(product.listingSpecificationGroups.some(group => group.fields.some(field => field.key === 'fit' && field.value === 'Regular')));
    assert.deepEqual(product.listingFacts, ['M', 'Regular', 'Cotton']);
    assert.equal(product.variants[0].price, 400);
    assert.equal(service.catalogTemplateId, 'service_haircut');
    assert.equal(service.exploreMainCategoryId, 'beauty_body');
    assert.equal(service.exploreSubcategoryId, 'beauty_hair');
    assert.equal(service.serviceDetails.technique, 'Scissor cut');
    assert.ok(service.serviceConfigurationFields.some(field => field.key === 'included' && field.value === 'Wash, cut and finish'));
    assert.deepEqual(service.serviceFacts, ['Short']);
    assert.equal(service.variants[0].price, 350);
    const json = JSON.stringify(projection);
    assert.equal(json.includes('private-'), false);
    assert.equal(product.cost, undefined);
    assert.equal(service.cost, undefined);
    assert.equal(service.variants[0].cost, undefined);
  }
});

test('server preserves only approved template details and keeps existing services without templates compatible', () => {
  const { serviceConfigurationFields, serviceFacts, ...configured } = haircut;
  const initial = applyWorkspaceChanges({}, [{ section: 'services', expectedRevision: 0, patch: { services: [configured, workshop, { id: 'legacy', name: 'Existing service' }] } }], { initial: true });
  const saved = initial.services[0];
  assert.equal(saved.serviceDetails.technique, 'Scissor cut');
  assert.equal(saved.serviceDetails.internalNotes, undefined);
  assert.equal(saved.serviceDetails.staffEmail, undefined);
  assert.deepEqual(saved.serviceSpecFields, ['maintenance']);
  assert.deepEqual(initial.services[2], { id: 'legacy', name: 'Existing service' });
  assert.equal(serviceCommerceQuote({ currency: 'R', services: initial.services }, { serviceId: 'haircut', variantId: 'restyle' }).amountInCents, 35000);
  assert.equal(serviceCommerceQuote({ currency: 'R', services: initial.services }, { serviceId: 'workshop', variantId: 'premium' }).durationMinutes, 120);
});

test('switching templates preserves approved former specs privately while public projections show only applicable fields', () => {
  const apparel = { ...shirt, physicalDetails: { ...shirt.physicalDetails, author: 'former-book-author' } };
  const laptop = { id: 'laptop', name: 'Laptop', listingType: 'electronics', catalogTemplateId: 'electronics_laptop', price: 9000,
    exploreMainCategoryId: 'buy_electronics', exploreSubcategoryId: 'electronics_computers',
    electronicsDetails: { deviceType: 'Laptop', brand: 'Studio', model: 'Work', condition: 'New', ram: 16, mainCamera: 'former-phone-camera' } };
  assert.equal(normalizeListing(apparel).physicalDetails.author, 'former-book-author');
  assert.equal(normalizeListing(laptop).electronicsDetails.mainCamera, 'former-phone-camera');
  const workspace = { products: [apparel, laptop], services: [] };
  for (const projection of [publicCommerceCatalog(workspace), publicProfile(workspace, 'owner'), buildPublicWorkspaceSnapshot(workspace), buildBuilderCommerceContext(workspace)]) {
    assert.equal(projection.products[0].physicalDetails.author, undefined);
    assert.equal(projection.products[0].physicalDetails.fit, 'Regular');
    assert.equal(projection.products[1].electronicsDetails.mainCamera, undefined);
    assert.equal(projection.products[1].electronicsDetails.ram, '16');
    assert.equal(JSON.stringify(projection).includes('former-'), false);
  }
});

test('server rejects forged service taxonomy, malformed details and incompatible scheduling before persistence', () => {
  const save = service => applyWorkspaceChanges({}, [{ section: 'services', expectedRevision: 0, patch: { services: [service] } }], { initial: true });
  for (const patch of [{ catalogTemplateId: 'service_fake' }, { exploreMainCategoryId: 'learn_create' }, { exploreSubcategoryId: 'photography' }, { scheduleType: 'class_session' }, { serviceDetails: [] }, { serviceDetails: { hairLength: 'Invented length' } }, { duration: 'forty five' }, { duration: '45.5' }, { variants: [{ id: 'bad', name: 'Bad option', minDuration: 0 }] }]) assert.throws(() => save({ ...haircut, ...patch }), undefined, JSON.stringify(patch));
  for (const patch of [{ capacity: '8.5' }, { capacity: 0 }, { sessionStartDate: '2026-02-30' }, { sessionStartTime: '24:10' }, { sessionEndTime: '09:00' }]) assert.throws(() => save({ ...workshop, ...patch }), undefined, JSON.stringify(patch));
  const previous = { services: [haircut], sectionRevisions: { services: 0 } };
  assert.throws(() => applyWorkspaceChanges(previous, [{ section: 'services', expectedRevision: 0, patch: { services: [{ ...workshop, id: haircut.id }] } }]), /new service/);
});

test('public boundaries refuse mismatched service templates and suppress hidden services', () => {
  const workspace = { products: [], services: [{ ...haircut, exploreSubcategoryId: 'photography' }, { ...haircut, id: 'hidden', status: 'draft' }, { ...haircut, id: 'off', available: false }] };
  for (const projection of [publicCommerceCatalog(workspace), publicProfile(workspace, 'owner'), buildPublicWorkspaceSnapshot(workspace), buildBuilderCommerceContext(workspace)]) {
    assert.equal(projection.services.length, 1);
    assert.equal(projection.services[0].catalogTemplateId, '');
    assert.deepEqual(projection.services[0].serviceDetails, {});
    assert.deepEqual(projection.services[0].serviceConfigurationFields, []);
    assert.deepEqual(projection.services[0].serviceFacts, []);
  }
});
