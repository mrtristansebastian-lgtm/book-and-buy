import { createDefaultCommunications } from './communicationsConfig';
import { createDefaultSettings } from './workspaceDefaults';

export const KINETIC_HOUSE_SLUG = 'kinetic-house-cape-town';

const DAY_MS = 86_400_000;
const COUNTRY_COUNTS = [
  ['South Africa', 'ZA', 140], ['United Kingdom', 'GB', 12], ['Germany', 'DE', 8],
  ['Netherlands', 'NL', 7], ['France', 'FR', 7], ['United States', 'US', 6],
  ['Australia', 'AU', 5], ['Nigeria', 'NG', 5], ['Kenya', 'KE', 4], ['United Arab Emirates', 'AE', 3], ['Brazil', 'BR', 3]
];
const CLIENT_BOOKING_COUNTS = [...Array(30).fill(1), ...Array(70).fill(2), ...Array(70).fill(4), ...Array(20).fill(8), ...Array(10).fill(9)];
const SERVICES = [
  ['power45', 'Power45', 280, 45, 160, 140, 9, 'High-output strength and conditioning built for real-life performance.'],
  ['reformer-strength', 'Reformer Strength', 360, 50, 120, 105, 7, 'Reformer work with athletic intent, control, and progressive strength.'],
  ['hyrox-engine', 'HYROX Engine', 320, 60, 110, 96, 6, 'Race-ready endurance, sled work, carries, and smart pacing.'],
  ['private-performance', 'Private Performance', 850, 60, 70, 61, 4, 'One-to-one coaching for a precise performance plan.'],
  ['recovery-reset', 'Recovery Reset', 300, 45, 90, 78, 5, 'Downshift, restore range, and leave ready for your next effort.'],
  ['athletic-assessment', 'Athletic Assessment', 950, 75, 45, 39, 3, 'A clear baseline, movement screen, and custom performance roadmap.'],
  ['boxing-conditioning', 'Boxing Conditioning', 300, 50, 70, 60, 4, 'Technique-led rounds with engine-building conditioning.'],
  ['international-drop-in', 'International Drop-in', 380, 60, 35, 29, 2, 'A Cape Town performance session for visitors who train seriously.']
];
const STAFF = [
  ['amara-jacobs', 'Amara Jacobs', 'Founder and performance coach', '#111827'],
  ['luca-meyer', 'Luca Meyer', 'Strength coach', '#0f766e'],
  ['zola-ndlovu', 'Zola Ndlovu', 'HYROX coach', '#7c3aed'],
  ['claire-van-der-merwe', 'Claire van der Merwe', 'Reformer coach', '#b45309'],
  ['noah-davis', 'Noah Davis', 'Boxing coach', '#be123c'],
  ['thandi-maseko', 'Thandi Maseko', 'Recovery specialist', '#0369a1'],
  ['samuel-king', 'Samuel King', 'Performance coach', '#15803d'],
  ['mia-rossi', 'Mia Rossi', 'Guest experience lead', '#9d174d']
];
const FIRST = ['Aiden', 'Amelia', 'Aria', 'Ayanda', 'Beau', 'Camille', 'Daniel', 'Ethan', 'Freya', 'Hana', 'Imani', 'Isla', 'Jules', 'Kaya', 'Leo', 'Liam', 'Lina', 'Maya', 'Nia', 'Noah', 'Olivia', 'Rafi', 'Sofia', 'Theo', 'Zara'];
const LAST = ['Adams', 'Baker', 'Botha', 'Campbell', 'Daniels', 'de Vries', 'Dlamini', 'Edwards', 'Fischer', 'Fourie', 'Green', 'Hassan', 'Jacobs', 'Johnson', 'Khan', 'Miller', 'Mokoena', 'Naidoo', 'Nel', 'Nkosi', 'Patel', 'Reed', 'Smith', 'van Wyk', 'Williams'];
const TIME_SLOTS = ['06:00', '07:00', '08:00', '09:00', '10:30', '12:00', '14:00', '15:30', '17:00', '18:00'];

const dateKey = (date) => date.toISOString().slice(0, 10);
const dateAt = (anchor, offset, hour = 9) => {
  const result = new Date(anchor);
  result.setHours(hour, 0, 0, 0);
  result.setDate(result.getDate() + offset);
  return result;
};
const makeId = (prefix, value) => `${prefix}-${String(value).padStart(3, '0')}`;

function buildSettings() {
  const settings = createDefaultSettings();
  return {
    ...settings,
    slug: KINETIC_HOUSE_SLUG,
    brandName: 'Kinetic House',
    email: 'hello@kinetichouse.example',
    phone: '+27 21 555 0145',
    tagline: 'Cape Town performance studio',
    welcomeMessage: 'Train with intent. Recover with purpose.',
    primaryColor: '#171A1F',
    headingColor: '#171A1F',
    bodyColor: '#46505B',
    backgroundColor: '#F6F3EE',
    slotBgColor: '#FFFCF7',
    slotTextColor: '#171A1F',
    dateActiveBgColor: '#171A1F',
    dateActiveTextColor: '#FFFFFF',
    buttonTextColor: '#FFFFFF',
    nativeAccent: true,
    serviceIndustry: 'fitness',
    address: '18 Green Point Main Road, Green Point, Cape Town, 8005, South Africa',
    mapPlace: { name: 'Kinetic House Cape Town', address: '18 Green Point Main Road, Green Point, Cape Town, 8005', latitude: -33.9066, longitude: 18.4107 },
    socials: { instagram: 'kinetichousect', tiktok: 'kinetichousect', facebook: 'kinetichousect', website: 'kinetichouse.example' },
    logo: '/example/kinetic-house/kinetic-house-mark.svg',
    bannerImage: '/example/kinetic-house/hero.svg',
    venuePhotos: Array.from({ length: 6 }, () => '/example/kinetic-house/studio.svg'),
    availableTimes: TIME_SLOTS,
    schedule: { monday: { enabled: true, slots: TIME_SLOTS }, tuesday: { enabled: true, slots: TIME_SLOTS }, wednesday: { enabled: true, slots: TIME_SLOTS }, thursday: { enabled: true, slots: TIME_SLOTS }, friday: { enabled: true, slots: TIME_SLOTS }, saturday: { enabled: true, slots: ['08:00', '09:00', '10:30', '12:00'] }, sunday: { enabled: false, slots: [] } },
    features: { ...settings.features, socialLinks: true, location: 'Green Point, Cape Town', collectClientNotes: true, faqs: [
      { id: 'faq-1', question: 'Is Kinetic House suitable for beginners?', answer: 'Yes. Every session is coached with options that meet you where you are.' },
      { id: 'faq-2', question: 'What should I bring?', answer: 'Training clothes, water, and a readiness to move. Towels and recovery tools are on site.' },
      { id: 'faq-3', question: 'Can I drop in while visiting Cape Town?', answer: 'Absolutely. International Drop-in is built for focused travellers.' }
    ] },
    services: SERVICES.map(([id, name, price, duration, bookings, paid, pending, description], index) => ({
      id, name, title: name, price, duration, bookingCount: bookings, active: true, enabled: true, sortOrder: index,
      description, category: 'Performance', staffIds: STAFF.slice(0, 7).filter((_, staffIndex) => staffIndex % 3 !== index % 3 || index === 0).map(([staffId]) => staffId),
      image: '/example/kinetic-house/training.svg', paidBookings: paid, pendingBookings: pending
    }))
  };
}

function buildClients(anchor) {
  let countryIndex = 0;
  let remainingInCountry = COUNTRY_COUNTS[0][2];
  return CLIENT_BOOKING_COUNTS.map((bookingCount, index) => {
    if (!remainingInCountry) { countryIndex += 1; remainingInCountry = COUNTRY_COUNTS[countryIndex][2]; }
    remainingInCountry -= 1;
    const [country, countryCode] = COUNTRY_COUNTS[countryIndex];
    const first = FIRST[(index * 7 + 3) % FIRST.length];
    const last = LAST[(index * 11 + 5) % LAST.length];
    const isNewToday = index < 3;
    return {
      id: `phone-2772${String(1000000 + index * 371).slice(-7)}`, name: `${first} ${last}`, email: `${first}.${last}.${index + 1}@example.com`.toLowerCase(),
      phone: `+27 72 ${String(1000000 + index * 371).slice(-7)}`, country, countryCode, avatar: '', source: isNewToday ? 'public-booking' : 'booking-history',
      bookingCount, labels: bookingCount >= 8 ? ['VIP', 'Returning'] : bookingCount >= 2 ? ['Returning'] : ['New'],
      autoLabels: bookingCount >= 2 ? ['Returning'] : ['New'],
      notes: index % 9 === 0 ? 'Prefers early sessions and recovery follow-up.' : '',
      createdAt: dateAt(anchor, isNewToday ? 0 : -30 - (index * 5), 8).getTime(),
      updatedAt: dateAt(anchor, -(index % 7), 10).getTime()
    };
  });
}

function buildStaff() {
  return STAFF.map(([id, name, role, color], index) => ({
    id, name, role, title: role, color, status: 'connected', email: `${id}@kinetichouse.example`,
    phone: `+27 21 555 01${String(40 + index)}`, avatar: '/example/kinetic-house/portrait.svg',
    photoURL: '/example/kinetic-house/portrait.svg',
    serviceIds: SERVICES.filter((_, serviceIndex) => serviceIndex % 4 !== index % 4).map(([serviceId]) => serviceId),
    calendar: { connected: true, provider: 'Google Calendar', email: `${id}@kinetichouse.example` }
  }));
}

function buildBookings(anchor, clients, staff) {
  const expandedClientIds = clients.flatMap((client) => Array.from({ length: client.bookingCount }, () => client.id));
  const todayClientIds = [
    ...clients.slice(0, 3),
    ...clients.slice(30, 39)
  ].map(client => client.id);
  const remainingClientIds = [...expandedClientIds];
  todayClientIds.forEach(clientId => {
    const occurrenceIndex = remainingClientIds.indexOf(clientId);
    if (occurrenceIndex >= 0) remainingClientIds.splice(occurrenceIndex, 1);
  });
  const arrangedClientIds = [
    ...remainingClientIds.slice(0, 620),
    ...todayClientIds,
    ...remainingClientIds.slice(620)
  ];
  const clientById = new Map(clients.map(client => [client.id, client]));
  const jobs = SERVICES.flatMap(([serviceId, serviceName, price, duration, count, paid, pending, description], serviceIndex) => (
    Array.from({ length: count }, (_, itemIndex) => ({ serviceId, serviceName, price, duration, description, serviceIndex, itemIndex, paid, pending }))
  ));
  const statusPool = [...Array(590).fill('completed'), ...Array(30).fill('declined'), ...Array(60).fill('confirmed'), ...Array(14).fill('pending'), ...Array(6).fill('waitlisted')];
  const paymentByService = new Map(SERVICES.map(([serviceId, , , , count, paid, pending]) => [serviceId, [...Array(paid).fill('paid'), ...Array(pending).fill('manual_pending'), ...Array(count - paid - pending).fill('unpaid')]]));
  const serviceCursor = new Map();
  const todayDate = dateKey(anchor);
  return jobs.map((job, index) => {
    const client = clientById.get(arrangedClientIds[index]);
    const cursor = serviceCursor.get(job.serviceId) || 0;
    serviceCursor.set(job.serviceId, cursor + 1);
    const paymentStatus = paymentByService.get(job.serviceId)[cursor];
    const isUpcoming = index >= 620;
    const isToday = index >= 620 && index < 632;
    const offset = isToday ? 0 : isUpcoming ? 1 + ((index - 632) % 28) : -1 - ((index * 7) % 168);
    const date = dateAt(anchor, offset, 6 + (index % 12));
    const staffMember = staff[index % 7];
    const status = statusPool[index];
    const reschedule = index >= 632 && index < 636;
    return {
      id: makeId('booking', index + 1), clientId: client.id, clientName: client.name, clientEmail: client.email, clientPhone: client.phone, clientCountry: client.country,
      serviceId: job.serviceId, serviceName: job.serviceName, serviceDescription: job.description, servicePrice: job.price, servicePriceType: 'fixed', serviceDuration: `${job.duration} min`,
      staffId: staffMember.id, staffName: staffMember.name, staffPhotoURL: staffMember.photoURL, amountInCents: job.price * 100, currency: 'ZAR',
      paymentMethod: paymentStatus === 'manual_pending' ? 'manual_eft' : paymentStatus === 'paid' ? 'stripe' : 'cash', paymentGateway: paymentStatus === 'manual_pending' ? 'manual_eft' : paymentStatus === 'paid' ? 'stripe' : 'cash', paymentStatus,
      status, date: date.toLocaleDateString('en-ZA', { weekday: 'short', month: 'short', day: 'numeric' }), dateKey: isToday ? todayDate : dateKey(date), time: TIME_SLOTS[index % TIME_SLOTS.length],
      source: index % 5 === 0 ? 'public-booking-page' : 'admin', createdAt: date.getTime() - DAY_MS * 3, updatedAt: date.getTime(), timestamp: date.getTime(),
      ...(reschedule ? { rescheduleStatus: 'pending', reschedule: { status: 'pending', requestedTime: TIME_SLOTS[(index + 2) % TIME_SLOTS.length], requestedDateKey: dateKey(dateAt(anchor, 2 + (index % 3))) } } : {})
    };
  });
}

function buildThreads(bookings) {
  return bookings.slice(632, 656).map((booking, index) => ({
    id: makeId('thread', index + 1), bookingId: booking.id, clientId: booking.clientId, clientName: booking.clientName, clientEmail: booking.clientEmail,
    clientCountry: booking.clientCountry, serviceName: booking.serviceName, status: index < 4 ? 'needs_attention' : 'open', updatedAtMs: booking.updatedAt + (index * 60_000),
    lastMessage: index < 4 ? `Could we move my ${booking.serviceName} session?` : `Looking forward to ${booking.serviceName}.`,
    messages: [
      { id: `message-${index}-1`, author: 'client', body: index < 4 ? `Hi Kinetic House, can I reschedule my session to another time this week?` : `Hi team, excited for my upcoming session.`, createdAtMs: booking.updatedAt - 7200000 },
      { id: `message-${index}-2`, author: 'staff', body: index < 4 ? 'Absolutely. We have held a suitable option while you review it.' : 'We are looking forward to having you in the studio.', createdAtMs: booking.updatedAt - 3600000 }
    ]
  }));
}

function buildNotifications(threads, anchor) {
  return Array.from({ length: 18 }, (_, index) => {
    const thread = threads[index % threads.length];
    return { id: makeId('notification', index + 1), read: index > 5, priority: index < 4 ? 'high' : 'normal', type: index < 4 ? 'reschedule_requested' : 'booking_update',
      title: index < 4 ? 'Reschedule needs a decision' : 'Client message received', body: index < 4 ? `${thread.clientName} requested a new time.` : `${thread.clientName} replied about ${thread.serviceName}.`,
      tab: index < 4 ? 'communications' : 'bookings', createdAtMs: dateAt(anchor, -(index % 4), 9 + index % 8).getTime(), bookingId: thread.bookingId, threadId: thread.id };
  });
}

export function createFitnessStudioExample({ anchorDate = new Date() } = {}) {
  const anchor = new Date(anchorDate);
  anchor.setHours(12, 0, 0, 0);
  const settings = buildSettings();
  const clients = buildClients(anchor);
  const staffList = buildStaff();
  const bookings = buildBookings(anchor, clients, staffList);
  const supportThreads = buildThreads(bookings);
  const notifications = buildNotifications(supportThreads, anchor);
  const manifest = {
    clients: clients.length, bookings: bookings.length, historicalBookings: bookings.filter(item => item.dateKey < dateKey(anchor)).length,
    upcomingBookings: bookings.filter(item => item.dateKey >= dateKey(anchor)).length, paidRevenueCents: bookings.filter(item => item.paymentStatus === 'paid').reduce((sum, item) => sum + item.amountInCents, 0),
    pendingRevenueCents: bookings.filter(item => item.paymentStatus === 'manual_pending').reduce((sum, item) => sum + item.amountInCents, 0), totalRevenueCents: bookings.reduce((sum, item) => sum + item.amountInCents, 0),
    statuses: Object.fromEntries(['completed', 'declined', 'confirmed', 'pending', 'waitlisted'].map(status => [status, bookings.filter(item => item.status === status).length])),
    payments: Object.fromEntries(['paid', 'manual_pending', 'unpaid'].map(status => [status, bookings.filter(item => item.paymentStatus === status).length]))
  };
  return {
    settings, bookings, financeImports: [], staffList, clientRecords: clients, communications: createDefaultCommunications(), supportThreads, notifications, manifest,
    gatewayStates: { stripe: { enabled: true, configured: true, mode: 'example', providerName: 'Stripe' }, yoco: { enabled: true, configured: true, mode: 'example', providerName: 'Yoco' }, manual_eft: { enabled: true, configured: true, mode: 'example', providerName: 'EFT' }, cash: { enabled: true, configured: true, mode: 'example', providerName: 'Pay on site' } }
  };
}
