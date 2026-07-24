import { createDefaultCommunications } from './communicationsConfig';
import { createDefaultSettings } from './workspaceDefaults';

export const KINETIC_HOUSE_SLUG = 'kinetic-house-cape-town';

const DAY_MS = 86_400_000;
const COUNTRY_COUNTS = [
  ['South Africa', 'ZA', 140], ['United Kingdom', 'GB', 12], ['Germany', 'DE', 8],
  ['Netherlands', 'NL', 7], ['France', 'FR', 7], ['United States', 'US', 6],
  ['Australia', 'AU', 5], ['Nigeria', 'NG', 5], ['Kenya', 'KE', 4], ['United Arab Emirates', 'AE', 3], ['Brazil', 'BR', 3]
];
const COUNTRY_DIAL_CODES = {
  ZA: '+27', GB: '+44', DE: '+49', NL: '+31', FR: '+33', US: '+1',
  AU: '+61', NG: '+234', KE: '+254', AE: '+971', BR: '+55'
};
const CLIENT_BOOKING_COUNTS = [...Array(30).fill(1), ...Array(70).fill(2), ...Array(70).fill(4), ...Array(20).fill(8), ...Array(10).fill(9)];
const SERVICES = [
  { id: 'strength-lab', name: 'Strength Lab', category: 'Strength', price: 280, duration: 45, count: 160, paid: 140, pending: 9, description: 'Progressive strength work for people who want to move better and perform with confidence.', bookingNote: 'Arrive 10 minutes early for a short readiness check.', image: '/example/kinetic-house/strength.svg', staffIds: ['amara-jacobs', 'samuel-king', 'luca-meyer'] },
  { id: 'reformer-flow', name: 'Reformer Flow', category: 'Pilates', price: 360, duration: 50, count: 120, paid: 105, pending: 7, description: 'Controlled reformer sequences that build core strength, balance, and body awareness.', bookingNote: 'Grip socks are recommended and available at reception.', image: '/example/kinetic-house/reformer.svg', staffIds: ['claire-van-der-merwe', 'amara-jacobs'] },
  { id: 'endurance-lab', name: 'Endurance Lab', category: 'Conditioning', price: 320, duration: 60, count: 110, paid: 96, pending: 6, description: 'Intervals, carries, and race-smart pacing for stronger engines without empty effort.', bookingNote: 'Bring water and tell the coach about your current training load.', image: '/example/kinetic-house/endurance.svg', staffIds: ['zola-ndlovu', 'samuel-king', 'luca-meyer'] },
  { id: 'private-performance', name: '1:1 Performance Coaching', category: 'Coaching', price: 850, duration: 60, count: 70, paid: 61, pending: 4, description: 'Personalised coaching for a specific goal, return-to-training plan, or performance block.', bookingNote: 'Your coach will send a short intake form before the first session.', image: '/example/kinetic-house/private.svg', staffIds: ['amara-jacobs', 'samuel-king'] },
  { id: 'mobility-recovery', name: 'Mobility + Recovery', category: 'Recovery', price: 300, duration: 45, count: 90, paid: 78, pending: 5, description: 'A considered reset for tight hips, tired shoulders, and the training week that caught up with you.', bookingNote: 'Wear comfortable clothing that allows a full range of movement.', image: '/example/kinetic-house/recovery.svg', staffIds: ['thandi-maseko', 'claire-van-der-merwe'] },
  { id: 'movement-screen', name: 'Movement Screen', category: 'Assessment', price: 950, duration: 75, count: 45, paid: 39, pending: 3, description: 'A practical movement assessment with clear findings and your next best training steps.', bookingNote: 'Please bring any recent training notes or injury history.', image: '/example/kinetic-house/assessment.svg', staffIds: ['amara-jacobs', 'thandi-maseko'] },
  { id: 'boxing-conditioning', name: 'Boxing Conditioning', category: 'Boxing', price: 300, duration: 50, count: 70, paid: 60, pending: 4, description: 'Technique-led rounds, footwork, and conditioning for a focused full-body session.', bookingNote: 'No experience is required. Gloves are supplied for first visits.', image: '/example/kinetic-house/boxing.svg', staffIds: ['noah-davis', 'zola-ndlovu'] },
  { id: 'cape-town-drop-in', name: 'Cape Town Drop-in', category: 'Visitors', price: 380, duration: 60, count: 35, paid: 29, pending: 2, description: 'A welcoming performance session for visitors who want to train while they are in Cape Town.', bookingNote: 'Bring your booking confirmation and a form of ID for your first visit.', image: '/example/kinetic-house/drop-in.svg', staffIds: ['mia-rossi', 'luca-meyer', 'amara-jacobs'] }
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
const CONVERSATION_SCENARIOS = [
  ['schedule change', 'I can no longer make my Tuesday morning session. Is there anything later this week?', 'We can move you to Thursday at 17:00 or Friday at 09:00. Which works better?', 'Thursday at 17:00 would be perfect, thank you.', 'Perfect. I have sent the Thursday option for your approval.'],
  ['parking', 'Hi, is there parking close to the studio for my first visit?', 'There is street parking on Main Road and a secure lot two minutes away on Somerset Road.', 'That is helpful. I will arrive a little early to find a space.', 'Great. Reception will be ready for you when you arrive.'],
  ['beginner question', 'I have never used a reformer before. Is the class still suitable for me?', 'Absolutely. Claire teaches the foundations slowly and gives every person a clear starting option.', 'That sounds reassuring. I would love to try it.', 'You are booked into a beginner-friendly session. We will see you soon.'],
  ['travel plans', 'I land in Cape Town on Wednesday and would like to train before the weekend.', 'Welcome. Our drop-in on Thursday at 10:30 has space and includes a full studio orientation.', 'Please hold that time for me. I am staying in Green Point.', 'Done. Your arrival notes are linked to the booking.'],
  ['training load', 'I have a race on Sunday. Should I keep the Endurance Lab booking or choose recovery?', 'With race day close, Mobility + Recovery would be the better choice. We can move your booking without losing the slot.', 'Yes, let us switch it to recovery.', 'All set. The coach will keep the session light and useful.'],
  ['late arrival', 'My flight is delayed and I may be 15 minutes late for the drop-in.', 'Thanks for letting us know. Mia can meet you at reception and get you settled quietly.', 'I appreciate that. I should arrive just after 18:00.', 'No problem. Travel safely and message us if the delay changes.'],
  ['membership', 'Do you offer packages for someone training three times a week?', 'We do not force a package online, but Amara can map out a three-session week after your assessment.', 'That is exactly what I need. Can we discuss it after Friday?', 'Absolutely. I have added a note for Amara to speak with you.'],
  ['shoulder modification', 'I have a sensitive shoulder at the moment. Can I still attend Strength Lab?', 'Yes, please tell the coach on arrival. We will adjust pressing and use pain-free ranges.', 'Thank you. It is improving, I just want to train carefully.', 'That is the right approach. We will keep the session controlled.'],
  ['invoice', 'Could you send an invoice for the Movement Screen to my work email?', 'Of course. I have confirmed the business details on your client file and will send it after the session.', 'The company name is Northline Design if you need it.', 'Thanks, I have added Northline Design to the note.'],
  ['first visit', 'What should I bring for my first 1:1 coaching session?', 'Comfortable training clothes, water, and any recent programme or assessment notes are ideal.', 'I have my old running plan. I will bring that along.', 'Excellent. That will give the coach a useful starting point.'],
  ['waitlist', 'Could you let me know if an earlier Reformer Flow slot opens up?', 'I have added you to the 08:00 waitlist and will message you if it becomes available.', 'Thank you, 08:00 would suit me much better.', 'You are first on that waitlist and we will keep an eye on it.'],
  ['recovery timing', 'Is Mobility + Recovery better before or after my long run?', 'Most clients prefer it after the long run or the next day, when the work can be restorative.', 'I will move it to Monday after my weekend run.', 'Monday is a good fit. Your booking is ready for review.'],
  ['boxing gloves', 'Do I need my own gloves for Boxing Conditioning?', 'No. We have clean loan gloves in several sizes and can help you choose a pair.', 'Great, I am travelling and did not pack mine.', 'No problem. We will have a pair set aside for you.'],
  ['coach preference', 'Can I book with Zola again? The last Endurance Lab was exactly what I needed.', 'Zola is coaching Wednesday at 18:00 and I have added that preference to your booking.', 'Wednesday works well for me.', 'Perfect. Zola will see your note before the session.'],
  ['reschedule request', 'I need to move my assessment because of a work trip. Could we try next week?', 'We can offer Tuesday at 14:00 or Wednesday at 09:00. I have sent both options in the thread.', 'Wednesday morning works best.', 'I have sent the Wednesday option for your approval.'],
  ['address', 'Is the studio entrance on Main Road or around the back?', 'The entrance is directly on 18 Green Point Main Road, next to the warm-stone wall. Look for the Kinetic House mark.', 'Found it on the map, thank you.', 'Brilliant. See you at reception.'],
  ['drop-in level', 'I train regularly but have never done HYROX-style work. Is Endurance Lab too advanced?', 'Not at all. The coach scales the loading and explains every station before the first round.', 'That sounds good. I would rather start conservatively.', 'We will make the first session useful, not punishing.'],
  ['booking confirmation', 'I just wanted to check that my booking went through for tomorrow.', 'It is confirmed for 09:00 with Luca. You will receive the arrival details by email as well.', 'Perfect, I will be there.', 'We look forward to having you in.'],
  ['payment method', 'Can I settle the session at reception when I arrive?', 'Yes, this booking is marked for pay-on-site. We accept card and cash at reception.', 'Great, thanks for clarifying.', 'You are all set.'],
  ['post-session', 'That session was excellent. Could you share the mobility sequence we used?', 'Absolutely. I have attached the four-movement sequence to your follow-up note.', 'Thank you, I will use it after my desk days.', 'Enjoy it and message us if any movement does not feel right.']
];

const dateKey = (date) => date.toISOString().slice(0, 10);
const formatExamplePhone = (countryCode, index) => {
  const tail = String(1000 + index * 17).slice(-4);
  const formats = {
    ZA: `+27 72 ${String(1000000 + index * 371).slice(-7)}`,
    GB: `+44 20 7946 ${tail}`,
    DE: `+49 30 9018 ${tail}`,
    NL: `+31 20 794 ${tail}`,
    FR: `+33 1 84 80 ${tail}`,
    US: `+1 212 555 ${tail}`,
    AU: `+61 2 5550 ${tail}`,
    NG: `+234 1 555 ${tail}`,
    KE: `+254 20 555 ${tail}`,
    AE: `+971 4 555 ${tail}`,
    BR: `+55 11 5550 ${tail}`
  };
  return formats[countryCode] || `${COUNTRY_DIAL_CODES[countryCode] || '+27'} ${tail}`;
};
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
    venuePhotos: [
      '/example/kinetic-house/studio.svg', '/example/kinetic-house/venue-entrance.svg',
      '/example/kinetic-house/venue-floor.svg', '/example/kinetic-house/venue-reformer.svg',
      '/example/kinetic-house/venue-recovery.svg', '/example/kinetic-house/venue-coach.svg'
    ],
    availableTimes: TIME_SLOTS,
    schedule: { monday: { enabled: true, slots: TIME_SLOTS }, tuesday: { enabled: true, slots: TIME_SLOTS }, wednesday: { enabled: true, slots: TIME_SLOTS }, thursday: { enabled: true, slots: TIME_SLOTS }, friday: { enabled: true, slots: TIME_SLOTS }, saturday: { enabled: true, slots: ['08:00', '09:00', '10:30', '12:00'] }, sunday: { enabled: false, slots: [] } },
    googleCalendar: { mode: 'connected', connectedEmail: 'calendar@kinetichouse.example', connectedAt: 1_745_000_000_000, lastSyncedAt: 1_751_000_000_000, lastSyncCount: 80 },
    features: { ...settings.features, socialLinks: true, location: 'Green Point, Cape Town', collectClientNotes: true, faqs: [
      { id: 'faq-1', question: 'Is Kinetic House suitable for beginners?', answer: 'Yes. Every session is coached with options that meet you where you are.' },
      { id: 'faq-2', question: 'What should I bring?', answer: 'Training clothes, water, and a readiness to move. Towels and recovery tools are on site.' },
      { id: 'faq-3', question: 'Can I drop in while visiting Cape Town?', answer: 'Absolutely. International Drop-in is built for focused travellers.' }
    ] },
    staffCalendars: Object.fromEntries(STAFF.map(([staffId, , , color], index) => [staffId, {
      staffId,
      color,
      connected: true,
      connectedEmail: `${staffId}@kinetichouse.example`,
      availableTimes: index % 2 ? TIME_SLOTS.slice(1) : TIME_SLOTS,
      scheduleDefaults: { monday: { enabled: true }, saturday: { enabled: index < 4 } }
    }])),
    services: SERVICES.map((service, index) => ({
      id: service.id, name: service.name, title: service.name, price: service.price, currency: 'R', duration: service.duration,
      bookingCount: service.count, active: true, enabled: true, sortOrder: index, description: service.description, category: service.category,
      bookingNote: service.bookingNote, staffIds: service.staffIds, imageUrls: [service.image], paidBookings: service.paid, pendingBookings: service.pending
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
      phone: formatExamplePhone(countryCode, index), country, countryCode, avatar: '', source: isNewToday ? 'public-booking' : 'booking-history',
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
    serviceIds: SERVICES.filter((_, serviceIndex) => serviceIndex % 4 !== index % 4).map(service => service.id),
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
  const jobs = [];
  const serviceQueue = SERVICES.map(service => ({ ...service, remaining: service.count, itemIndex: 0 }));
  const totalJobCount = serviceQueue.reduce((total, service) => total + service.count, 0);
  while (jobs.length < totalJobCount) {
    serviceQueue.forEach((service) => {
      if (!service.remaining) return;
      jobs.push({ ...service, serviceId: service.id, itemIndex: service.itemIndex });
      service.remaining -= 1;
      service.itemIndex += 1;
    });
  }
  const statusPool = [...Array(590).fill('completed'), ...Array(30).fill('declined'), ...Array(60).fill('confirmed'), ...Array(14).fill('pending'), ...Array(6).fill('waitlisted')];
  const statusByIndex = Array(jobs.length);
  statusPool.forEach((status, poolIndex) => {
    statusByIndex[(poolIndex * 37) % jobs.length] = status;
  });
  const paymentByService = new Map(SERVICES.map(service => [service.id, [
    ...Array(service.paid).fill('paid'),
    ...Array(service.pending).fill('manual_pending'),
    ...Array(service.count - service.paid - service.pending).fill('unpaid')
  ]]));
  const serviceCursor = new Map();
  const todayDate = dateKey(anchor);
  return jobs.map((job, index) => {
    const client = clientById.get(arrangedClientIds[index]);
    const cursor = serviceCursor.get(job.serviceId) || 0;
    serviceCursor.set(job.serviceId, cursor + 1);
    const paymentStatus = paymentByService.get(job.serviceId)[cursor];
    const isUpcoming = index >= 620;
    const isToday = index >= 620 && index < 632;
    const scheduleIndex = isToday ? index - 620 : isUpcoming ? index - 632 : index;
    const offset = isToday ? 0 : isUpcoming ? 1 + Math.floor(scheduleIndex / 20) : -1 - Math.floor(scheduleIndex / 20);
    const date = dateAt(anchor, offset, 6);
    const staffMember = staff[scheduleIndex % staff.length];
    const time = TIME_SLOTS[Math.floor((scheduleIndex % 20) / staff.length)];
    const status = statusByIndex[index];
    const reschedule = index >= 632 && index < 636;
    return {
      id: makeId('booking', index + 1), clientId: client.id, clientName: client.name, clientEmail: client.email, clientPhone: client.phone, clientCountry: client.country,
      serviceId: job.serviceId, serviceName: job.name, serviceDescription: job.description, serviceCategory: job.category, servicePrice: job.price, servicePriceType: 'fixed', serviceDuration: `${job.duration} min`,
      staffId: staffMember.id, staffName: staffMember.name, staffPhotoURL: staffMember.photoURL, amountInCents: job.price * 100, currency: 'ZAR',
      paymentMethod: paymentStatus === 'manual_pending' ? 'manual_eft' : paymentStatus === 'paid' ? 'stripe' : 'cash', paymentGateway: paymentStatus === 'manual_pending' ? 'manual_eft' : paymentStatus === 'paid' ? 'stripe' : 'cash', paymentStatus,
      status, clientBirthday: client.birthday, clientNote: client.notes, date: date.toLocaleDateString('en-ZA', { weekday: 'short', month: 'short', day: 'numeric' }), dateKey: isToday ? todayDate : dateKey(date), time,
      source: index % 5 === 0 ? 'public-booking-page' : 'admin', createdAt: date.getTime() - DAY_MS * 3, updatedAt: date.getTime(), timestamp: date.getTime(),
      ...(reschedule ? { rescheduleStatus: 'pending', reschedule: { status: 'pending', requestedTime: TIME_SLOTS[(index + 2) % TIME_SLOTS.length], requestedDateKey: dateKey(dateAt(anchor, 2 + (index % 3))) } } : {})
    };
  });
}

function buildThreads(bookings) {
  const rescheduleOpeners = [
    'I need to move my session because of a work trip. Could we try next week?',
    'Could we shift this booking to later in the week? My schedule changed unexpectedly.',
    'I cannot make the current time anymore. Do you have another option with the same coach?',
    'Would it be possible to move this session by a day? I would really appreciate the help.'
  ];
  return bookings.slice(632, 652).map((booking, index) => {
    const scenario = CONVERSATION_SCENARIOS[index % CONVERSATION_SCENARIOS.length];
    const isReschedule = index < 4;
    const copy = isReschedule
      ? [rescheduleOpeners[index], 'We can help. I have checked the calendar and sent two suitable options for you to review.', index === 0 ? 'Thursday at 17:00 works best for me.' : index === 1 ? 'Friday morning would be ideal.' : index === 2 ? 'The Wednesday option suits me, thank you.' : 'The later afternoon option would be perfect.', 'Great, I have added that option to the booking thread for your approval.']
      : scenario.slice(1);
    const staffMember = STAFF[(index + 1) % STAFF.length];
    const requestedDateKey = booking.reschedule?.requestedDateKey || booking.dateKey;
    const requestedTime = booking.reschedule?.requestedTime || booking.time;
    const rescheduleProposal = isReschedule ? {
      id: `proposal-${index + 1}`,
      bookingId: booking.id,
      date: requestedDateKey,
      time: requestedTime,
      requestedBy: 'client',
      source: 'request',
      status: 'pending',
      message: copy[0],
      createdAtMs: booking.updatedAt - 1_800_000
    } : null;
    const messages = [
      { id: `message-${index + 1}-1`, senderRole: 'client', senderName: booking.clientName, text: copy[0], createdAtMs: booking.updatedAt - 7_200_000 },
      { id: `message-${index + 1}-2`, senderRole: 'owner', senderName: staffMember[1], text: copy[1], createdAtMs: booking.updatedAt - 5_400_000 },
      { id: `message-${index + 1}-3`, senderRole: 'client', senderName: booking.clientName, text: copy[2], createdAtMs: booking.updatedAt - 3_600_000 },
      { id: `message-${index + 1}-4`, senderRole: 'owner', senderName: staffMember[1], text: copy[3], createdAtMs: booking.updatedAt - 1_800_000 }
    ];
    if (rescheduleProposal) {
      messages[3].kind = 'reschedule-offer';
      messages[3].rescheduleProposal = rescheduleProposal;
    }
    return {
      id: makeId('thread', index + 1), bookingId: booking.id, clientId: booking.clientId, clientName: booking.clientName, clientEmail: booking.clientEmail,
      clientCountry: booking.clientCountry, serviceName: booking.serviceName, workspaceName: 'Kinetic House', staffId: staffMember[0], staffName: staffMember[1],
      status: isReschedule ? 'needs_attention' : index % 3 === 0 ? 'awaiting_owner' : 'open', bookingStatus: booking.status,
      rescheduleStatus: isReschedule ? 'requested' : '', proposedReschedule: rescheduleProposal, isExample: true,
      ownerUnread: index < 12 ? 1 : 0, clientUnread: 0, updatedAtMs: booking.updatedAt + (index * 60_000),
      lastMessage: copy[3], messages
    };
  });
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
