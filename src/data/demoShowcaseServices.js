import { SERVICE_CATEGORY_TEMPLATES, getServiceConfigurationSchema } from '../../functions/serviceTemplates.js';
import { businessClock } from '../../functions/bookingDomain.js';

const ZONE = 'Africa/Johannesburg';
const MEDIA = '/example/book-and-buy-showcase/services/';
const PROFILE = '/assets/placeholders/profile-avatar.svg';
// One offer for each category/booking-format pair currently exposed by the editor.
const categories = [
  ['beauty_hair', 'Hair & grooming', 'Hair stylist', 'Amina Jacobs', ['Precision Haircut & Blow-dry']],
  ['nails_brows', 'Nails, brows & lashes', 'Nail technician', 'Lerato Nkosi', ['Gel Manicure']],
  ['spa_wellness', 'Spa & wellness', 'Massage practitioner', 'Daniel Williams', ['Deep Tissue Massage']],
  ['body_art', 'Body art', 'Tattoo artist', 'Kai Daniels', ['Fine-line Tattoo Design Consultation']],
  ['fitness_pt', 'Fitness & training', 'Personal trainer', 'Thabo Mokoena', ['Private Strength Coaching', 'Small-group Circuit Training']],
  ['yoga_pilates', 'Yoga & pilates', 'Yoga and pilates instructor', 'Priya Naidoo', ['Private Pilates Assessment', 'Sunrise Flow Yoga']],
  ['dance', 'Dance', 'Dance instructor', 'Sofia Martins', ['Private Ballroom Lesson', 'Beginner Salsa Class']],
  ['martial_arts', 'Martial arts', 'Martial arts coach', 'Sipho Dlamini', ['One-to-one Boxing Coaching', 'Fundamentals Karate Class']],
  ['sports_coaching', 'Sports coaching', 'Sports coach', 'Ben Jacobs', ['Tennis Technique Coaching', 'Junior Tennis Clinic']],
  ['tutoring', 'Tutoring', 'Learning tutor', 'Mei Chen', ['Online Maths Tutoring', 'Exam Preparation Study Group']],
  ['music_lessons', 'Music', 'Music instructor', 'Ethan Meyer', ['Beginner Piano Lesson', 'Harmony Singing Group']],
  ['cooking_classes', 'Cooking classes', 'Culinary instructor', 'Nomsa Khumalo', ['Private Knife Skills Lesson', 'Pasta from Scratch Workshop']],
  ['craft_workshops', 'Craft workshops', 'Craft instructor', 'Elena Petrova', ['Private Sewing Lesson', 'Pottery Wheel Workshop']],
  ['photography', 'Photography', 'Photographer', 'Aisha Davids', ['Personal Branding Portrait Shoot', null]],
  ['home_cleaning', 'Cleaning & organising', 'Cleaning specialist', 'Zanele Maseko', ['Home Deep Clean']],
  ['home_services', 'Home services', 'Assembly specialist', 'Luca Romano', ['Flat-pack Furniture Assembly']],
  ['pet_grooming', 'Pet grooming', 'Pet groomer', 'Chantal Roux', ['Full Dog Groom']],
  ['auto_detail', 'Vehicle detailing', 'Vehicle detailer', 'Yusuf Adams', ['SUV Interior Detail']],
  ['events', 'Events', 'Event organiser', 'Camila Costa', ['Event Planning Consultation', 'Celebration Planning Masterclass']],
  ['wedding_vendors', 'Wedding services', 'Wedding coordinator', 'Nadia Khan', ['Wedding Planning Consultation', null]],
  ['rentals', 'Equipment demonstrations', 'Equipment specialist', 'Tinashe Moyo', ['Party Equipment Demonstration', null]],
  ['studios_spaces', 'Studios & spaces', 'Studio producer', 'Jordan Lee', ['Podcast Recording Session', null]],
  ['tours_experiences', 'Tours & experiences', 'Experience guide', 'Sam Taylor', ['Private Heritage Walk', 'Botanical Garden Guided Walk']],
  ['kids_activities', 'Kids activities', 'Activity facilitator', 'Maya Patel', [null, 'Saturday Science Club']]
];
const formatOf = template => template.scheduleType === 'class_session' ? 'spot' : 'slot';
const serviceId = (leaf, format) => `showcase-service-${leaf}-${format}`;
const staffId = leaf => `showcase-staff-${leaf}`;
const entries = categories.flatMap(([leaf, category, role, person, names]) =>
  SERVICE_CATEGORY_TEMPLATES.filter(template => template.subcategoryId === leaf).map(template => {
    const format = formatOf(template);
    return { leaf, category, role, person, template, format, id: serviceId(leaf, format), name: names[['slot', 'spot'].indexOf(format)] };
  }));
const timingOverrides = {
  [serviceId('wedding_vendors', 'slot')]: 'arranged',
  [serviceId('body_art', 'slot')]: 'to_be_announced',
  [serviceId('events', 'spot')]: 'arranged',
  [serviceId('craft_workshops', 'spot')]: 'to_be_announced'
};
const capacities = {
  [serviceId('yoga_pilates', 'spot')]: 6,
  [serviceId('fitness_pt', 'spot')]: 4,
  [serviceId('sports_coaching', 'spot')]: 6,
  [serviceId('dance', 'spot')]: 8,
  [serviceId('martial_arts', 'spot')]: 12,
  [serviceId('cooking_classes', 'spot')]: 12,
  [serviceId('tutoring', 'spot')]: 6
};
const defaultDetails = {
  hair: { hairLength: 'Medium', technique: 'Precision layering', hairTexture: 'Straight or wavy', finish: 'Natural blow-dry', maintenance: 'Use heat protection before styling.' },
  nails: { treatment: 'Gel polish', style: 'Rounded shape', removal: 'Existing gel removal included', maintenance: 'Moisturise cuticles daily.' },
  wellness: { focus: 'Back and shoulder tension', technique: 'Deep tissue and trigger-point work', intensity: 'Firm', preparation: 'Mention injuries or sensitivities before your session.' },
  bodyart: { style: 'Fine-line botanical design', placement: 'Forearm', size: 'Design up to 8 cm', maintenance: 'Aftercare guidance provided at consultation.' },
  fitness: { experienceLevel: 'Beginner', focus: 'Movement confidence', equipment: 'Equipment provided', audience: 'Adults', accessibility: 'Tell the instructor about access or movement needs.' },
  lesson: { subject: 'Practical skills', experienceLevel: 'Beginner', outcomes: 'Build confidence through guided practice.', materials: 'Practice materials provided', language: 'English' },
  cooking: { cuisine: 'Italian', experienceLevel: 'Beginner', outcomes: 'Prepare fresh pasta and a simple seasonal sauce.', materials: 'Ingredients, aprons and kitchen equipment provided', dietaryNotes: 'Contains wheat and eggs. Discuss allergies before booking.' },
  photo: { shootStyle: 'Studio portraits', deliverableCount: 3, deliveryTime: 'Five working days', usage: 'Personal and professional profile use', editing: 'Colour correction and light retouching', fileFormat: 'High-resolution JPEG' },
  cleaning: { cleaningType: 'Deep cleaning', scope: 'Kitchen, bathroom and two living areas', equipment: 'Cleaning supplies and equipment provided', exclusions: 'Exterior windows and hazardous waste', access: 'Arrange property access before the appointment.' },
  home: { task: 'Flat-pack furniture assembly', scope: 'One bed or desk, including packaging tidy-up', materials: 'Assembly tools provided', exclusions: 'Wall mounting and electrical work', access: 'Furniture and instructions should be ready in the room.' },
  pet: { petType: 'Dog', petSize: 'Medium', coatType: 'Short or medium coat', treatment: 'Bath, brush, nail trim and tidy', requirements: 'Vaccinations current; mention handling sensitivities.' },
  auto: { vehicleSize: 'SUV', treatment: 'Interior steam clean', scope: 'Seats, carpets, trim and interior glass', productsUsed: 'Fabric-safe cleaning products', exclusions: 'Paint correction and exterior detailing' },
  event: { occasion: 'Celebration planning', scope: 'A guided session with practical ideas and questions', equipment: 'Presentation equipment included', deliverables: 'A useful planning checklist' },
  space: { space: 'Equipped demonstration space', guestLimit: 4, equipment: 'Equipment and operator guidance', facilities: 'Accessible entrance and seating', access: 'Check in at reception.', rules: 'Follow the equipment safety guidance.' },
  experience: { theme: 'Local discovery', intensity: 'Easy', audience: 'Adults and families', meetingPoint: 'Meet at the marked entrance.', weather: 'Weather changes are discussed in advance.', accessibility: 'Ask about route access before booking.' }
};
const leafDetails = {
  fitness_pt: { focus: 'Strength and everyday movement', style: 'Coached strength circuits' },
  yoga_pilates: { focus: 'Mobility and balance', style: 'Gentle flow and controlled movement', equipment: 'Mats and props provided', experienceLevel: 'All levels' },
  dance: { focus: 'Rhythm and partner movement', style: 'Salsa and ballroom' },
  martial_arts: { focus: 'Footwork and controlled technique', style: 'Boxing and karate fundamentals' },
  sports_coaching: { focus: 'Tennis serves and forehands', equipment: 'Rackets and balls provided' },
  tutoring: { subject: 'Mathematics', experienceLevel: 'Intermediate', outcomes: 'Practise algebra, problem-solving and exam technique.' },
  music_lessons: { subject: 'Piano', outcomes: 'Read simple music and practise rhythm and chords.' },
  cooking_classes: { cuisine: 'Italian and seasonal cooking' },
  craft_workshops: { subject: 'Sewing', outcomes: 'Learn basic stitching and finish a small fabric project.' },
  photography: { shootStyle: 'Professional studio headshots' },
  events: { occasion: 'Planning a celebration', scope: 'Planning ideas, a practical checklist and questions' },
  wedding_vendors: { occasion: 'Weddings', scope: 'Venue, budget and styling ideas', deliverables: 'A wedding planning checklist' },
  rentals: { space: 'PA and projection equipment', guestLimit: 12, equipment: 'Compact PA system, microphone and projector', rules: 'This offer covers a demonstration, not equipment hire.' },
  studios_spaces: { space: 'Podcast recording booth', guestLimit: 4, equipment: 'Two microphones, headphones and recording support', facilities: 'Sound-treated booth and seating' },
  tours_experiences: { theme: 'Local history and gardens', intensity: 'Easy', meetingPoint: 'The information desk at the main entrance' },
  kids_activities: { theme: 'Hands-on science and discovery', intensity: 'Relaxed', audience: 'Children aged 8–12 with a responsible adult', requirements: 'An adult must remain on site.' }
};
function detailsFor(entry) {
  const { leaf, format, name, template } = entry;
  const details = { ...defaultDetails[template.family], ...leafDetails[leaf], included: `Guided ${name.toLowerCase()}, the listed equipment and time for questions.`,
    locationNotes: 'This is a sample service at the Showcase Studio. Check your confirmation for meeting instructions.' };
  if (leaf === 'tutoring' && format === 'slot') details.locationNotes = 'Online session. A joining link is shared after confirmation; no travel is needed.';
  if (['home_cleaning', 'home_services'].includes(leaf)) details.locationNotes = 'At the client’s property. Confirm the address and access instructions in the booking conversation.';
  if (leaf === 'sports_coaching' && format === 'spot') details.audience = 'Children aged 10–16';
  if (leaf === 'craft_workshops' && format === 'spot') Object.assign(details, { subject: 'Wheel-thrown pottery', outcomes: 'Centre clay and shape a small bowl.', materials: 'Clay, tools and firing included' });
  if (leaf === 'music_lessons' && format === 'spot') Object.assign(details, { subject: 'Group singing', outcomes: 'Practise pitch, breathing and simple harmonies.' });
  if (leaf === 'cooking_classes' && format === 'slot') Object.assign(details, { cuisine: 'Kitchen fundamentals', outcomes: 'Practise safe knife handling and three useful preparation cuts.' });
  if (leaf === 'tours_experiences' && format === 'spot') details.theme = 'Botanical gardens and local plants';
  return details;
}
const addDate = (dateKey, days) => new Date(Date.parse(`${dateKey}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
const nextOpenDate = dateKey => new Date(`${dateKey}T12:00:00Z`).getUTCDay() === 0 ? addDate(dateKey, 1) : dateKey;
function windowAt(start, minutes) {
  const from = businessClock(ZONE, start); const to = businessClock(ZONE, start + minutes * 60000);
  return { sessionStartDate: from.dateKey, sessionStartTime: from.time, sessionEndDate: to.dateKey, sessionEndTime: to.time };
}

export function createShowcaseStaff() {
  return [{ id: 'showcase-staff-owner', name: 'Alex Morgan', role: 'Showcase owner', accessRole: 'Owner', email: 'owner@showcase.example', color: '#111827', active: true, photoURL: PROFILE },
    ...categories.map(([leaf, , role, name], index) => ({ id: staffId(leaf), name, role, accessRole: 'Staff', email: `${leaf}@showcase.example`,
      color: ['#617A72', '#8B7390', '#A07854', '#56758C'][index % 4], active: true, photoURL: PROFILE }))];
}

/** Explicit sample offers; the calling demo workspace owns isolation and reset policy. */
export function createShowcaseServices(now = Date.now()) {
  const today = businessClock(ZONE, now).dateKey;
  return entries.map((entry, index) => {
    const { id, leaf, format, template, name, category } = entry;
    const timingMode = timingOverrides[id] || (format === 'slot' ? 'availability' : 'fixed');
    const duration = ['cooking_classes', 'craft_workshops', 'home_cleaning', 'home_services'].includes(leaf) ? 120 : 60;
    const details = detailsFor(entry);
    const schema = getServiceConfigurationSchema({ catalogTemplateId: template.id });
    const service = { id, name, category, catalogTemplateId: template.id, exploreMainCategoryId: template.mainCategoryId, exploreSubcategoryId: leaf,
      scheduleType: template.scheduleType, timingMode, timingNotes: timingMode === 'arranged' ? 'Message us to agree the date and plan together. Booking opens once a schedule is set.'
        : timingMode === 'to_be_announced' ? 'The next dates are not set yet. Message us to hear about the next opening.' : '',
      description: `${name} with a specialist from our sample team. ${details.included} This example shows how ${category.toLowerCase()} offers appear in Book & Buy.`,
      price: format === 'spot' ? 220 + (index % 5) * 70 : 350 + (index % 5) * 90,
      priceType: 'fixed', currency: 'R', cost: format === 'spot' ? 90 : 140,
      duration, fixedDuration: true, minDuration: '', capacity: format === 'slot' ? 1 : capacities[id] || 6,
      active: true, staffIds: [staffId(leaf)], serviceDetails: details,
      serviceSpecFields: schema.filter(field => !field.essential && Object.hasOwn(details, field.key)).map(field => field.key),
      imageUrls: [`${MEDIA}${id}.webp`], variants: [] };
    if (timingMode === 'fixed') {
      const date = nextOpenDate(addDate(today, 2 + index));
      Object.assign(service, { sessionStartDate: date, sessionStartTime: '10:00', sessionEndDate: date,
        sessionEndTime: duration === 120 ? '12:00' : '11:00' });
      if (id === serviceId('dance', 'spot')) Object.assign(service, windowAt(Math.floor(now / 60000) * 60000 - 30 * 60000, 90));
      if (id === serviceId('martial_arts', 'spot')) Object.assign(service, { sessionStartDate: addDate(today, -7), sessionStartTime: '13:00', sessionEndDate: addDate(today, -7), sessionEndTime: '14:00' });
    }
    if (leaf === 'beauty_hair') {
      service.price = 320; service.cost = 120; service.duration = 45;
      service.variants = [{ id: `${id}-cut`, name: 'Cut only', description: 'Wash and precision cut.', price: 320, cost: 120, minDuration: 45, available: true },
        { id: `${id}-finish`, name: 'Cut & blow-dry', description: 'Wash, cut and a styled finish.', price: 520, cost: 180, minDuration: 75, available: true }];
    }
    if (leaf === 'home_cleaning') { service.fixedDuration = false; service.minDuration = 120; }
    if (id === serviceId('cooking_classes', 'spot')) {
      service.variants = [{ id: `${id}-standard`, name: 'Workshop', description: 'Ingredients, equipment and guided cooking.', price: service.price, cost: 90, minDuration: '', available: true },
        { id: `${id}-kit`, name: 'Workshop & tool kit', description: 'The same session with a take-home pasta tool kit.', price: service.price + 160, cost: 150, minDuration: '', available: true }];
    }
    if (id === serviceId('craft_workshops', 'spot')) service.imageUrls.push(`${MEDIA}${id}-gallery.webp`);
    return service;
  });
}

export const serviceGuideManifest = Object.fromEntries(entries.map(entry => {
  const timing = timingOverrides[entry.id] || (entry.format === 'slot' ? 'availability' : 'fixed');
  return [entry.id, { format: entry.format, category: entry.category,
    whatShows: `${entry.category} specifications and the ${entry.format === 'slot' ? 'individual appointment' : 'shared session'} booking format.`,
    tryThis: timing === 'arranged' ? 'Open When to see how a client can arrange the schedule in messages.'
      : timing === 'to_be_announced' ? 'Open When to see how an offer can collect interest before dates are announced.'
      : entry.leaf === 'beauty_hair' ? 'Compare the two options to see different prices and appointment lengths.'
      : entry.leaf === 'home_cleaning' ? 'Open Duration to see the minimum time used for a flexible-length appointment.'
      : entry.id === serviceId('cooking_classes', 'spot') ? 'Compare workshop options. Both use the same session dates and total capacity.'
      : entry.format === 'slot' ? 'Open the service details, then inspect the assigned specialist and available time slots.'
      : 'Inspect the shared dates, capacity and remaining places, then open a linked booking in Schedule.' }];
}));

const photoPrompt = entry => {
  const scene = { hair: 'a stylist cutting and blow-drying medium-length hair in a bright salon', nails: 'a nail technician carefully applying gel polish to rounded nails',
    wellness: 'a professional shoulder massage in a calm spa, client appropriately covered', bodyart: 'a tattoo artist sketching a fine-line botanical design with a client',
    fitness: `a real ${entry.name.toLowerCase()} with an instructor and appropriate training equipment`, lesson: `people taking part in ${entry.name.toLowerCase()} with a skilled teacher`,
    cooking: `a chef guiding ${entry.name.toLowerCase()} in a bright teaching kitchen`, photo: `a photographer running ${entry.name.toLowerCase()} with studio lighting`,
    cleaning: 'a cleaner carefully deep-cleaning a contemporary home kitchen', home: 'an assembly specialist fitting a flat-pack wooden desk with hand tools',
    pet: 'a groomer brushing a medium-sized dog in a clean grooming salon', auto: 'a detailer steam-cleaning the interior of an SUV',
    event: `a welcoming ${entry.name.toLowerCase()} with a small believable audience`, space: `a clear scene of ${entry.name.toLowerCase()}, showing the equipment in use`,
    experience: `people participating in ${entry.name.toLowerCase()} in an appropriate safe setting` }[entry.template.family];
  return `Photorealistic editorial service photograph for ${entry.name}. Show ${scene}. This is ${entry.format === 'slot' ? 'a one-to-one appointment' : 'a small shared class or session'}. Diverse South African adults where appropriate; children only for the clearly named junior or kids activities, supervised by an adult. Natural daylight, honest materials, clean realistic venue, warm welcoming mood, distinctive composition specific to this service. Landscape 4:3 composition with the main action centred and enough room for square thumbnail cropping. No text, logos, watermarks, collage, panels, celebrity faces or promotional graphics.`;
};
export const serviceMediaJobs = [...entries.map(entry => ({ id: entry.id, kind: 'service', path: `${MEDIA}${entry.id}.webp`, subject: entry.name, prompt: photoPrompt(entry) })),
  { id: `${serviceId('craft_workshops', 'spot')}-gallery`, kind: 'service', path: `${MEDIA}${serviceId('craft_workshops', 'spot')}-gallery.webp`, subject: 'Pottery Wheel Workshop — materials and finished bowl',
    prompt: 'Photorealistic editorial detail photograph of wet clay on a pottery wheel, clay-covered hands carefully shaping a bowl, a few wooden pottery tools and a finished ceramic bowl in the background. Warm natural studio light, realistic textures, one coherent landscape 4:3 image suitable for a service gallery. No text, logos, collage, watermarks or promotional graphics.' }];
