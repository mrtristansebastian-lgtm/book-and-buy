/** Service templates describe offers; booking still uses the two supported scheduling modes. */
const text = (key, label, options = {}) => ({ key, label, type: 'text', maxLength: 180, ...options });
const select = (key, label, values, options = {}) => ({ key, label, type: 'select', options: values, ...options });
const number = (key, label, options = {}) => ({ key, label, type: 'number', min: 0, max: 100000, ...options });
const level = select('experienceLevel', 'Experience level', ['All levels', 'Beginner', 'Intermediate', 'Advanced'], { essential: true });
const common = [
  text('included', 'What is included', { essential: true, maxLength: 600, multiline: true }),
  text('preparation', 'How to prepare', { maxLength: 600, multiline: true }),
  text('bring', 'What to bring', { maxLength: 400, multiline: true }),
  text('requirements', 'Entry requirements', { maxLength: 400, multiline: true }),
  text('locationNotes', 'Meeting or venue instructions', { maxLength: 400, multiline: true })
];
const families = {
  hair: [select('hairLength', 'Hair length', ['Any length', 'Short', 'Medium', 'Long', 'Extra long'], { essential: true }), text('technique', 'Technique or style', { essential: true }), text('hairTexture', 'Suitable hair textures'), text('finish', 'Finish'), text('productsUsed', 'Products used'), text('maintenance', 'Aftercare advice', { maxLength: 400, multiline: true })],
  nails: [text('treatment', 'Treatment or finish', { essential: true }), text('style', 'Shape or style', { essential: true }), text('productsUsed', 'Products used'), text('removal', 'Removal included'), text('maintenance', 'Aftercare advice', { maxLength: 400, multiline: true })],
  wellness: [text('focus', 'Treatment focus', { essential: true }), text('technique', 'Technique', { essential: true }), select('intensity', 'Intensity', ['Gentle', 'Medium', 'Firm', 'Tailored to the client']), text('productsUsed', 'Products used'), text('preparation', 'How to prepare', { maxLength: 600, multiline: true })],
  bodyart: [text('style', 'Style or design', { essential: true }), text('placement', 'Placement'), text('size', 'Size or scope'), text('preparation', 'How to prepare', { maxLength: 600, multiline: true }), text('maintenance', 'Aftercare advice', { maxLength: 400, multiline: true })],
  fitness: [level, text('focus', 'Training focus', { essential: true }), text('style', 'Training style'), text('equipment', 'Equipment provided'), text('audience', 'Who it is for'), text('accessibility', 'Accessibility notes', { maxLength: 400, multiline: true })],
  lesson: [text('subject', 'Subject or discipline', { essential: true }), level, text('outcomes', 'What clients will learn', { essential: true, maxLength: 600, multiline: true }), text('materials', 'Materials or equipment provided'), text('audience', 'Who it is for'), text('language', 'Teaching language'), text('homework', 'Practice between sessions', { maxLength: 400, multiline: true })],
  cooking: [text('cuisine', 'Cuisine or theme', { essential: true }), level, text('outcomes', 'What clients will learn', { essential: true, maxLength: 600, multiline: true }), text('materials', 'Ingredients and equipment provided'), text('dietaryNotes', 'Dietary and allergen information', { maxLength: 600, multiline: true }), text('audience', 'Who it is for'), text('language', 'Teaching language')],
  photo: [text('shootStyle', 'Shoot style', { essential: true }), number('deliverableCount', 'Edited photos or clips', { essential: true, max: 10000 }), text('deliveryTime', 'Delivery turnaround', { essential: true }), text('usage', 'Usage rights', { maxLength: 400, multiline: true }), text('outfits', 'Outfits or looks'), text('editing', 'Editing included'), text('fileFormat', 'File format')],
  cleaning: [text('cleaningType', 'Cleaning or organising focus', { essential: true }), text('scope', 'Rooms or areas covered', { essential: true, maxLength: 400, multiline: true }), text('equipment', 'Equipment and supplies provided'), text('exclusions', 'What is not included', { maxLength: 400, multiline: true }), text('access', 'Access instructions', { maxLength: 400, multiline: true })],
  home: [text('task', 'Task or job type', { essential: true }), text('scope', 'Work included', { essential: true, maxLength: 400, multiline: true }), text('materials', 'Materials provided'), text('exclusions', 'What is not included', { maxLength: 400, multiline: true }), text('access', 'Access instructions', { maxLength: 400, multiline: true })],
  auto: [select('vehicleSize', 'Vehicle size', ['Any size', 'Small car', 'Sedan', 'SUV', 'Bakkie / van', 'Large vehicle'], { essential: true }), text('treatment', 'Treatment or finish', { essential: true }), text('productsUsed', 'Products used'), text('scope', 'Areas covered', { maxLength: 400, multiline: true }), text('exclusions', 'What is not included', { maxLength: 400, multiline: true })],
  pet: [select('petType', 'Pet type', ['Dog', 'Cat', 'Dog or cat', 'Other'], { essential: true }), select('petSize', 'Pet size', ['Any size', 'Small', 'Medium', 'Large', 'Extra large'], { essential: true }), text('coatType', 'Coat type'), text('treatment', 'Grooming treatment'), text('requirements', 'Entry requirements', { maxLength: 400, multiline: true })],
  event: [text('occasion', 'Occasion or event style', { essential: true }), text('scope', 'Package coverage', { essential: true, maxLength: 400, multiline: true }), text('equipment', 'Equipment provided'), text('deliverables', 'Deliverables'), text('exclusions', 'What is not included', { maxLength: 400, multiline: true })],
  experience: [text('theme', 'Experience or activity', { essential: true }), select('intensity', 'Activity level', ['Relaxed', 'Easy', 'Moderate', 'Active'], { essential: true }), text('audience', 'Who it is for'), text('meetingPoint', 'Meeting point'), text('accessibility', 'Accessibility notes', { maxLength: 400, multiline: true }), text('weather', 'Weather arrangements', { maxLength: 400, multiline: true })],
  space: [text('space', 'Space or equipment', { essential: true }), number('guestLimit', 'People the space accommodates', { essential: true, max: 10000 }), text('equipment', 'Equipment included'), text('facilities', 'Facilities'), text('access', 'Access instructions', { maxLength: 400, multiline: true }), text('rules', 'House rules', { maxLength: 600, multiline: true })]
};

const parentGroups = {
  beauty_hair: 'beauty_body', nails_brows: 'beauty_body', spa_wellness: 'beauty_body', body_art: 'beauty_body',
  fitness_pt: 'fitness_movement', yoga_pilates: 'fitness_movement', dance: 'fitness_movement', martial_arts: 'fitness_movement', sports_coaching: 'fitness_movement',
  tutoring: 'learn_create', music_lessons: 'learn_create', cooking_classes: 'learn_create', craft_workshops: 'learn_create', photography: 'learn_create',
  home_cleaning: 'home_property', home_services: 'home_property', pet_grooming: 'pets', auto_detail: 'auto',
  events: 'events_celebrate', wedding_vendors: 'events_celebrate', rentals: 'events_celebrate',
  studios_spaces: 'experiences_kids', tours_experiences: 'experiences_kids', kids_activities: 'experiences_kids'
};
const templates = [];
const add = (subcategoryId, family, entries) => {
  for (const [key, label, scheduleType = 'appointment', duration = 60] of entries) {
    templates.push(Object.freeze({ id: `service_${key}`, label, subcategoryId, mainCategoryId: parentGroups[subcategoryId], family, scheduleType, duration,
      description: scheduleType === 'class_session' ? 'A scheduled session with a shared start time and bookable spots.' : 'A client chooses an available time with your team.' }));
  }
};
add('beauty_hair', 'hair', [['haircut', 'Haircut', 'appointment', 45], ['hair_colour', 'Hair colouring', 'appointment', 120], ['hair_styling', 'Blow-dry & styling', 'appointment', 45], ['braids', 'Braids & protective styling', 'appointment', 120], ['beard', 'Beard trim & grooming', 'appointment', 30], ['hair_consultation', 'Hair consultation', 'appointment', 30]]);
add('nails_brows', 'nails', [['manicure', 'Manicure', 'appointment', 45], ['pedicure', 'Pedicure', 'appointment', 60], ['nail_extensions', 'Nail extensions', 'appointment', 90], ['brow_styling', 'Brow shaping & tinting', 'appointment', 30], ['lash_extensions', 'Lash extensions', 'appointment', 90], ['lash_lift', 'Lash lift', 'appointment', 60]]);
add('spa_wellness', 'wellness', [['massage', 'Relaxation massage', 'appointment', 60], ['spa_treatment', 'Spa treatment', 'appointment', 60], ['sauna', 'Sauna session', 'appointment', 30]]);
add('body_art', 'bodyart', [['tattoo_consultation', 'Tattoo design consultation', 'appointment', 30], ['tattoo', 'Tattoo session', 'appointment', 120], ['piercing', 'Piercing appointment', 'appointment', 30]]);
add('fitness_pt', 'fitness', [['personal_training', 'Personal training', 'appointment', 60], ['fitness_class', 'Group fitness class', 'class_session'], ['fitness_intro', 'Fitness introduction', 'appointment', 45]]);
add('yoga_pilates', 'fitness', [['yoga_private', 'Private yoga session'], ['yoga_class', 'Yoga class', 'class_session'], ['pilates_private', 'Private pilates session'], ['pilates_class', 'Pilates class', 'class_session']]);
add('dance', 'fitness', [['dance_private', 'Private dance lesson'], ['dance_class', 'Dance class', 'class_session'], ['dance_workshop', 'Dance workshop', 'class_session', 120]]);
add('martial_arts', 'fitness', [['martial_private', 'Private martial arts training'], ['martial_class', 'Martial arts class', 'class_session'], ['boxing', 'Boxing coaching']]);
add('sports_coaching', 'fitness', [['sports_private', 'Private sports coaching'], ['sports_group', 'Group sports coaching', 'class_session'], ['sports_clinic', 'Sports clinic', 'class_session', 120]]);
add('tutoring', 'lesson', [['tutoring', 'Private tutoring'], ['language_lesson', 'Language lesson'], ['study_group', 'Group lesson', 'class_session'], ['exam_prep', 'Exam preparation']]);
add('music_lessons', 'lesson', [['instrument_lesson', 'Instrument lesson', 'appointment', 45], ['singing_lesson', 'Singing lesson', 'appointment', 45], ['music_class', 'Group music lesson', 'class_session'], ['music_rehearsal', 'Guided rehearsal']]);
add('cooking_classes', 'cooking', [['cooking_private', 'Private cooking lesson', 'appointment', 120], ['cooking_class', 'Cooking class', 'class_session', 120], ['baking_class', 'Baking class', 'class_session', 120], ['culinary_workshop', 'Culinary workshop', 'class_session', 180]]);
add('craft_workshops', 'lesson', [['craft_private', 'Private craft lesson'], ['craft_workshop', 'Craft workshop', 'class_session', 120], ['pottery_class', 'Pottery class', 'class_session', 120], ['art_class', 'Art class', 'class_session', 120], ['maker_workshop', 'Maker workshop', 'class_session', 120]]);
add('photography', 'photo', [['portrait_shoot', 'Portrait photo shoot'], ['product_shoot', 'Product photo shoot', 'appointment', 120], ['family_shoot', 'Family photo shoot'], ['video_shoot', 'Video shoot', 'appointment', 120], ['headshots', 'Professional headshots', 'appointment', 30]]);
add('home_cleaning', 'cleaning', [['home_clean', 'Standard home clean', 'appointment', 120], ['deep_clean', 'Deep clean', 'appointment', 180], ['move_clean', 'Move-in / move-out clean', 'appointment', 180], ['organising', 'Home organising', 'appointment', 120], ['upholstery_clean', 'Upholstery clean', 'appointment', 90]]);
add('home_services', 'home', [['handyman', 'Handyman appointment'], ['furniture_assembly', 'Furniture assembly', 'appointment', 120], ['home_repair_consultation', 'Home repair consultation', 'appointment', 45], ['garden_maintenance', 'Garden maintenance', 'appointment', 120]]);
add('auto_detail', 'auto', [['car_wash', 'Car wash', 'appointment', 45], ['interior_detail', 'Interior detailing', 'appointment', 120], ['full_detail', 'Full vehicle detailing', 'appointment', 180], ['paint_polish', 'Paint polishing', 'appointment', 180]]);
add('pet_grooming', 'pet', [['pet_grooming', 'Full pet groom', 'appointment', 90], ['pet_bath', 'Pet bath & brush', 'appointment', 60], ['pet_nails', 'Pet nail trim', 'appointment', 30], ['pet_groom_consultation', 'Grooming consultation', 'appointment', 30]]);
add('events', 'event', [['event_consultation', 'Event planning consultation'], ['party_host', 'Party host session', 'appointment', 120], ['event_workshop', 'Event workshop', 'class_session', 120]]);
add('wedding_vendors', 'event', [['wedding_consultation', 'Wedding planning consultation'], ['wedding_makeup', 'Wedding makeup appointment', 'appointment', 90], ['floral_consultation', 'Wedding floral consultation'], ['dj_consultation', 'DJ & entertainment consultation']]);
// These consultations do not add multi-day hire inventory, deposits, or rental checkout.
add('rentals', 'space', [['equipment_consultation', 'Equipment hire consultation', 'appointment', 30], ['equipment_demo', 'Equipment demonstration', 'appointment', 45]]);
add('studios_spaces', 'space', [['studio_session', 'Studio session'], ['podcast_session', 'Podcast recording session'], ['meeting_room', 'Meeting room session'], ['rehearsal_space', 'Rehearsal space session']]);
add('tours_experiences', 'experience', [['private_tour', 'Private guided experience', 'appointment', 120], ['guided_tour', 'Scheduled guided experience', 'class_session', 120], ['outdoor_workshop', 'Outdoor workshop', 'class_session', 120]]);
add('kids_activities', 'experience', [['kids_class', 'Kids activity class', 'class_session'], ['kids_workshop', 'Kids workshop', 'class_session', 120], ['play_session', 'Scheduled play session', 'class_session']]);

export const SERVICE_TEMPLATES = Object.freeze(templates);
const categoryLabels = { beauty_hair: 'Hair & grooming', nails_brows: 'Nails, brows & lashes', spa_wellness: 'Spa & wellness', body_art: 'Body art', fitness_pt: 'Fitness & personal training', yoga_pilates: 'Yoga & pilates', dance: 'Dance', martial_arts: 'Martial arts', sports_coaching: 'Sports coaching', tutoring: 'Tutoring', music_lessons: 'Music lessons', cooking_classes: 'Cooking classes', craft_workshops: 'Craft workshops', photography: 'Photography', home_cleaning: 'Cleaning & organising', home_services: 'Home services', pet_grooming: 'Pet grooming', auto_detail: 'Vehicle detailing', events: 'Events', wedding_vendors: 'Wedding services', rentals: 'Equipment hire consultations', studios_spaces: 'Studios & spaces', tours_experiences: 'Tours & experiences', kids_activities: 'Kids activities' };
export const SERVICE_CATEGORY_TEMPLATES = Object.freeze(Object.keys(parentGroups).flatMap(subcategoryId => {
  const existing = SERVICE_TEMPLATES.filter(template => template.subcategoryId === subcategoryId);
  const standard = ['appointment', 'class_session'].filter(mode => existing.some(template => template.scheduleType === mode)).map(scheduleType => Object.freeze({
    id: `service_category_${subcategoryId}_${scheduleType}`, label: categoryLabels[subcategoryId], subcategoryId,
    mainCategoryId: parentGroups[subcategoryId], family: existing[0].family, scheduleType, duration: 60, categorySetup: true
  }));
  const eventFamilies = ['fitness', 'lesson', 'cooking', 'photo', 'event', 'experience', 'space'];
  return eventFamilies.includes(existing[0].family) ? [...standard, Object.freeze({
    id: `service_category_${subcategoryId}_event`, label: categoryLabels[subcategoryId], subcategoryId,
    mainCategoryId: parentGroups[subcategoryId], family: existing[0].family, scheduleType: 'class_session', duration: 60, categorySetup: true, event: true
  })] : standard;
}));
export const getServiceCategoryTemplates = subcategoryId => SERVICE_CATEGORY_TEMPLATES.filter(template => template.subcategoryId === subcategoryId);
const byId = new Map([...SERVICE_TEMPLATES, ...SERVICE_CATEGORY_TEMPLATES].map((template) => [template.id, template]));
export const getServiceTemplate = (id) => byId.get(String(id || '')) || null;
export const getServiceBookingFormat = (service = {}) => {
  const template = getServiceTemplate(service.catalogTemplateId);
  if (template) return template.event ? 'event' : template.scheduleType === 'class_session' ? 'spot' : 'slot';
  if (!service.id && ['slot', 'spot', 'event'].includes(service.bookingFormat)) return service.bookingFormat;
  return ['class_session', 'class', 'classes', 'event', 'group', 'workshop', 'session'].includes(service.scheduleType || service.bookingType || service.serviceType) ? 'spot' : 'slot';
};
export const getServiceTemplates = (subcategoryId) => SERVICE_TEMPLATES.filter((template) => template.subcategoryId === subcategoryId);
export function getServiceConfigurationSchema(service = {}) {
  const template = getServiceTemplate(service.catalogTemplateId);
  if (!template) return [];
  const eventFields = template.event ? [text('venue', 'Event venue', { essential: true }), text('venueAddress', 'Venue address', { essential: true, maxLength: 400 }), text('organiser', 'Event organiser'), text('admission', 'Admission and age requirements', { maxLength: 400, multiline: true }), text('accessibility', 'Accessibility information', { maxLength: 400, multiline: true })] : [];
  const fields = [...eventFields, ...(families[template.family] || []), ...common];
  return fields.filter((field, index) => fields.findIndex((item) => item.key === field.key) === index);
}
export function normalizeServiceConfiguration(service = {}) {
  const template = getServiceTemplate(service.catalogTemplateId);
  if (!template || template.subcategoryId !== service.exploreSubcategoryId || template.mainCategoryId !== service.exploreMainCategoryId) return { catalogTemplateId: '', serviceDetails: {}, serviceSpecFields: [] };
  const schema = getServiceConfigurationSchema(service);
  const source = service.serviceDetails && typeof service.serviceDetails === 'object' && !Array.isArray(service.serviceDetails) ? service.serviceDetails : {};
  const serviceDetails = {};
  for (const field of schema) {
    const raw = source[field.key];
    if (raw == null || raw === '') continue;
    if (field.type === 'number') {
      const value = Number(raw);
      if (['number', 'string'].includes(typeof raw) && Number.isFinite(value) && value >= field.min && value <= field.max && Number.isInteger(value)) serviceDetails[field.key] = value;
    } else if (typeof raw === 'string') {
      const value = raw.trim();
      if (value && (field.type !== 'select' || field.options.includes(value))) serviceDetails[field.key] = value.slice(0, field.maxLength || 180);
    }
  }
  const optional = new Set(schema.filter((field) => !field.essential).map((field) => field.key));
  return { catalogTemplateId: template.id, serviceDetails,
    serviceSpecFields: [...new Set((Array.isArray(service.serviceSpecFields) ? service.serviceSpecFields : []).filter((key) => optional.has(key)))] };
}
/** Only approved, populated details can be projected to a public page. */
export function serviceConfigurationFields(service = {}) {
  const normalized = normalizeServiceConfiguration(service);
  return getServiceConfigurationSchema(service).flatMap((field) => Object.hasOwn(normalized.serviceDetails, field.key)
    ? [{ key: field.key, label: field.label, value: String(normalized.serviceDetails[field.key]) }] : []);
}
export function serviceFacts(service = {}) {
  const template = getServiceTemplate(service.catalogTemplateId);
  if (!template) return [];
  const fields = serviceConfigurationFields(service);
  const keys = ['experienceLevel', 'subject', 'cuisine', 'hairLength', 'treatment', 'vehicleSize', 'petType', 'shootStyle', 'theme'];
  return fields.filter((field) => keys.includes(field.key)).slice(0, 3).map((field) => field.value);
}
export function validateServiceConfiguration(service = {}) {
  if (service.catalogTemplateId != null && service.catalogTemplateId !== '' && typeof service.catalogTemplateId !== 'string') return 'Choose a supported service type.';
  if (!service.catalogTemplateId) return '';
  const template = getServiceTemplate(service.catalogTemplateId);
  if (!template || template.subcategoryId !== service.exploreSubcategoryId || template.mainCategoryId !== service.exploreMainCategoryId) return 'Choose a service type from the selected subcategory.';
  if (service.scheduleType !== template.scheduleType) return 'The booking setup does not match the selected service type.';
  if (service.serviceDetails != null && (typeof service.serviceDetails !== 'object' || Array.isArray(service.serviceDetails))) return 'Service details must be a set of named fields.';
  const schema = getServiceConfigurationSchema(service);
  const details = service.serviceDetails || {};
  for (const field of schema) {
    const value = details[field.key];
    if (value == null || value === '') continue;
    if (field.type === 'number' && (!['number', 'string'].includes(typeof value) || !/^\d+$/.test(String(value)) || Number(value) < field.min || Number(value) > field.max)) return `Enter a whole number from ${field.min} to ${field.max} for ${field.label.toLowerCase()}.`;
    if (field.type !== 'number' && (typeof value !== 'string' || value.length > (field.maxLength || 180))) return `Shorten ${field.label.toLowerCase()} to ${field.maxLength || 180} characters.`;
    if (field.type === 'select' && !field.options.includes(value)) return `Choose a valid ${field.label.toLowerCase()}.`;
  }
  return '';
}
