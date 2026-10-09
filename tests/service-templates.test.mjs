import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SERVICE_TEMPLATES, SERVICE_CATEGORY_TEMPLATES, getServiceCategoryTemplates, getServiceBookingFormat, getServiceTemplate, getServiceTemplates, getServiceConfigurationSchema,
  normalizeServiceConfiguration, validateServiceConfiguration, serviceConfigurationFields, serviceFacts
} from '../functions/serviceTemplates.js';

const offer = (templateId, details = {}) => {
  const template = getServiceTemplate(templateId);
  return { catalogTemplateId: template.id, exploreMainCategoryId: template.mainCategoryId,
    exploreSubcategoryId: template.subcategoryId, scheduleType: template.scheduleType, serviceDetails: details };
};

test('subcategory setups retain tailored fields and both supported booking formats without an exact service', () => {
  for (const template of SERVICE_CATEGORY_TEMPLATES) {
    const input = offer(template.id, { included: 'Equipment', privateSecret: 'hidden' });
    assert.equal(validateServiceConfiguration(input), '');
    assert.equal(normalizeServiceConfiguration(input).catalogTemplateId, template.id);
    assert.equal(normalizeServiceConfiguration(input).serviceDetails.included, 'Equipment');
    assert.equal(normalizeServiceConfiguration(input).serviceDetails.privateSecret, undefined);
    assert(getServiceConfigurationSchema(input).some(field => field.key === 'included'));
    const wrong = { ...input, scheduleType: template.scheduleType === 'appointment' ? 'class_session' : 'appointment' };
    assert.match(validateServiceConfiguration(wrong), /booking setup/i);
  }
  assert.deepEqual(getServiceCategoryTemplates('cooking_classes').map(item => getServiceBookingFormat(offer(item.id))), ['slot', 'spot', 'event']);
  assert.deepEqual(getServiceCategoryTemplates('kids_activities').filter(item => !item.event).map(item => item.scheduleType), ['class_session']);
  assert.equal(getServiceCategoryTemplates('medical').length, 0);
});

test('event identity, venue and ticket scheduling survive approved public normalization', () => {
  const input = offer('service_category_events_event', { venue: 'Studio Hall', venueAddress: '12 Main Road', organiser: 'Our team', privateSecret: 'hidden' });
  input.id = 'event-1';
  input.capacity = 80;
  const normalized = { ...input, ...normalizeServiceConfiguration(input) };
  assert.equal(getServiceBookingFormat(normalized), 'event');
  assert.equal(normalized.scheduleType, 'class_session');
  assert.equal(normalized.capacity, 80);
  assert.equal(normalized.serviceDetails.venue, 'Studio Hall');
  assert.equal(normalized.serviceDetails.privateSecret, undefined);
  assert(serviceConfigurationFields(normalized).some(field => field.key === 'venue'));
  assert.equal(getServiceBookingFormat({ ...offer('service_category_fitness_pt_appointment'), id: 'old', bookingFormat: 'event' }), 'slot');
});
test('exact service templates map consistently to supported booking formats and categories', () => {
  assert(SERVICE_TEMPLATES.length > 80);
  assert.equal(new Set(SERVICE_TEMPLATES.map((item) => item.id)).size, SERVICE_TEMPLATES.length);
  for (const template of SERVICE_TEMPLATES) {
    assert(['appointment', 'class_session'].includes(template.scheduleType));
    assert(getServiceTemplates(template.subcategoryId).includes(template));
    assert.equal(validateServiceConfiguration(offer(template.id)), '');
    const schema = getServiceConfigurationSchema(offer(template.id));
    assert.equal(new Set(schema.map((field) => field.key)).size, schema.length);
    assert(schema.some((field) => field.key === 'included'));
  }
});
test('appointments and classes have exact matching service choices without expanding rental or food checkout', () => {
  assert.equal(getServiceTemplate('service_yoga_private').scheduleType, 'appointment');
  assert.equal(getServiceTemplate('service_yoga_class').scheduleType, 'class_session');
  assert.equal(getServiceTemplates('catering').length, 0);
  assert.equal(getServiceTemplates('medical').length, 0);
  assert.equal(getServiceTemplates('financial_services').length, 0);
  assert.equal(getServiceTemplates('property_sales').length, 0);
  assert(getServiceTemplates('rentals').every((template) => /consultation|demonstration/i.test(template.label)));
});
test('configuration schemas follow the exact service family', () => {
  const haircut = getServiceConfigurationSchema(offer('service_haircut'));
  const yoga = getServiceConfigurationSchema(offer('service_yoga_class'));
  const shoot = getServiceConfigurationSchema(offer('service_portrait_shoot'));
  assert(haircut.some((field) => field.key === 'hairLength' && field.essential));
  assert(!haircut.some((field) => field.key === 'experienceLevel'));
  assert(yoga.some((field) => field.key === 'experienceLevel' && field.essential));
  assert(shoot.some((field) => field.key === 'deliverableCount' && field.type === 'number'));
});
test('only approved public details survive normalization, and selected blank extras survive editing', () => {
  const input = { ...offer('service_haircut', { hairLength: 'Short', technique: 'Fade', included: 'Cut & wash', salary: 'secret', customerEmail: 'private@example.com', style: { nested: 'payload' } }),
    serviceSpecFields: ['maintenance', 'maintenance', 'salary', 'hairLength'] };
  const normalized = normalizeServiceConfiguration(input);
  assert.deepEqual(normalized.serviceSpecFields, ['maintenance']);
  assert.deepEqual(normalized.serviceDetails, { hairLength: 'Short', technique: 'Fade', included: 'Cut & wash' });
  const publicFields = serviceConfigurationFields(input);
  assert(publicFields.some((field) => field.label === 'Hair length' && field.value === 'Short'));
  assert(!JSON.stringify(publicFields).includes('private@example.com'));
  assert.deepEqual(serviceFacts(input), ['Short']);
});
test('category or scheduling tampering cannot project an unrelated service schema', () => {
  const input = offer('service_yoga_class', { experienceLevel: 'Beginner' });
  assert.match(validateServiceConfiguration({ ...input, scheduleType: 'appointment' }), /booking setup/i);
  assert.match(validateServiceConfiguration({ ...input, exploreSubcategoryId: 'beauty_hair' }), /subcategory/i);
  assert.match(validateServiceConfiguration({ ...input, exploreMainCategoryId: 'beauty_body' }), /subcategory/i);
  assert.deepEqual(serviceConfigurationFields({ ...input, exploreSubcategoryId: 'beauty_hair' }), []);
  assert.deepEqual(normalizeServiceConfiguration({ ...input, catalogTemplateId: 'invented' }), { catalogTemplateId: '', serviceDetails: {}, serviceSpecFields: [] });
});
test('numeric and enumerated details reject malformed values before save', () => {
  assert.match(validateServiceConfiguration(offer('service_portrait_shoot', { deliverableCount: '1.5' })), /whole number/i);
  assert.match(validateServiceConfiguration(offer('service_portrait_shoot', { deliverableCount: '-1' })), /whole number/i);
  assert.match(validateServiceConfiguration(offer('service_portrait_shoot', { deliverableCount: [] })), /whole number/i);
  assert.equal(validateServiceConfiguration(offer('service_portrait_shoot', { deliverableCount: '20' })), '');
  assert.match(validateServiceConfiguration(offer('service_yoga_class', { experienceLevel: 'Invented' })), /valid experience level/i);
  assert.match(validateServiceConfiguration({ ...offer('service_haircut'), serviceDetails: [] }), /named fields/i);
  assert.match(validateServiceConfiguration({ catalogTemplateId: 0 }), /supported service type/i);
  assert.match(validateServiceConfiguration({ catalogTemplateId: false }), /supported service type/i);
});
test('legacy services keep working without a fabricated exact classification', () => {
  assert.equal(validateServiceConfiguration({ name: 'Legacy service', scheduleType: 'appointment' }), '');
  assert.deepEqual(serviceConfigurationFields({ name: 'Legacy service' }), []);
  assert.deepEqual(serviceFacts({ name: 'Legacy service' }), []);
});
