import { createDefaultCommunications } from './communicationsConfig';
import { createDefaultSettings } from './workspaceDefaults';

export const WORKSPACE_EXAMPLE_SLUG = 'your-business';

const DAY_MS = 86_400_000;
const TIME_SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '17:00'];

const SERVICES = [
  {
    id: 'pasta-from-scratch',
    name: 'Pasta From Scratch',
    category: 'Cooking',
    price: 850,
    duration: 180,
    description: 'Mix, roll, shape, and cook fresh pasta before sitting down to enjoy the finished dishes together.',
    image: '/example/flour-and-flame/services/pasta-from-scratch.webp',
    staffIds: ['jordan-lee', 'maya-patel']
  },
  {
    id: 'artisan-bread',
    name: 'Artisan Bread Workshop',
    category: 'Bread',
    price: 780,
    duration: 210,
    description: 'Learn fermentation, shaping, scoring, and baking while making your own naturally leavened loaf.',
    image: '/example/flour-and-flame/services/artisan-bread.webp',
    staffIds: ['thando-mokoena', 'maya-patel', 'sofia-martins']
  },
  {
    id: 'french-pastry',
    name: 'French Pastry Foundations',
    category: 'Pastry',
    price: 950,
    duration: 180,
    description: 'Build confidence with laminated dough, choux pastry, fillings, glazing, and elegant finishing.',
    image: '/example/flour-and-flame/services/french-pastry.webp',
    staffIds: ['jordan-lee', 'thando-mokoena']
  },
  {
    id: 'cape-malay-cooking',
    name: 'Cape Malay Cooking',
    category: 'Cape cuisine',
    price: 900,
    duration: 180,
    description: 'Cook a generous Cape Malay menu while learning how to balance aromatics, spice, sweetness, and heat.',
    image: '/example/flour-and-flame/services/cape-malay.webp',
    staffIds: ['jordan-lee', 'maya-patel', 'sofia-martins']
  },
  {
    id: 'private-baking',
    name: 'Private Baking Lesson',
    category: 'Private lessons',
    price: 1200,
    duration: 120,
    description: 'A focused one-to-one lesson shaped around your baking goals, from fundamentals to celebration cakes.',
    image: '/example/flour-and-flame/services/private-baking.webp',
    staffIds: ['thando-mokoena', 'sofia-martins']
  }
];

const STAFF = [
  {
    id: 'jordan-lee',
    name: 'Jordan Lee',
    role: 'Owner and Head Chef',
    color: '#111827',
    phone: '+27 21 555 0101',
    avatar: '/example/your-business/people/staff/jordan-lee.webp'
  },
  {
    id: 'thando-mokoena',
    name: 'Thando Mokoena',
    role: 'Bread and Pastry Instructor',
    color: '#0F766E',
    phone: '+27 21 555 0102',
    avatar: '/example/your-business/people/staff/thando-mokoena.webp'
  },
  {
    id: 'maya-patel',
    name: 'Maya Patel',
    role: 'Culinary Instructor',
    color: '#B45309',
    phone: '+27 21 555 0103',
    avatar: '/example/your-business/people/staff/maya-patel.webp'
  },
  {
    id: 'sofia-martins',
    name: 'Sofia Martins',
    role: 'Studio Host',
    color: '#0369A1',
    phone: '+27 21 555 0104',
    avatar: '/example/your-business/people/staff/sofia-martins.webp'
  }
];

const CLIENTS = [
  ['client-001', 'Aisha Naidoo', 'aisha.naidoo@example.com', '+27 72 555 1001', 'South Africa', 'ZA'],
  ['client-002', 'Daniel Botha', 'daniel.botha@example.com', '+27 72 555 1002', 'South Africa', 'ZA'],
  ['client-003', 'Lerato Dlamini', 'lerato.dlamini@example.com', '+27 72 555 1003', 'South Africa', 'ZA'],
  ['client-004', 'Ethan Williams', 'ethan.williams@example.com', '+27 72 555 1004', 'South Africa', 'ZA'],
  ['client-005', 'Nandi Maseko', 'nandi.maseko@example.com', '+27 72 555 1005', 'South Africa', 'ZA'],
  ['client-006', 'Oliver Smith', 'oliver.smith@example.com', '+44 20 7946 1006', 'United Kingdom', 'GB'],
  ['client-007', 'Amelia Fischer', 'amelia.fischer@example.com', '+49 30 9018 1007', 'Germany', 'DE'],
  ['client-008', 'Noah Johnson', 'noah.johnson@example.com', '+1 212 555 1008', 'United States', 'US'],
  ['client-009', 'Zara Hassan', 'zara.hassan@example.com', '+971 4 555 1009', 'United Arab Emirates', 'AE'],
  ['client-010', 'Lucas Pereira', 'lucas.pereira@example.com', '+55 11 5550 1010', 'Brazil', 'BR'],
  ['client-011', 'Grace Wanjiku', 'grace.wanjiku@example.com', '+254 20 555 1011', 'Kenya', 'KE'],
  ['client-012', 'Chinedu Okafor', 'chinedu.okafor@example.com', '+234 1 555 1012', 'Nigeria', 'NG']
];

const SERVICE_SEQUENCE = [
  'pasta-from-scratch', 'artisan-bread', 'cape-malay-cooking', 'french-pastry', 'artisan-bread',
  'private-baking', 'pasta-from-scratch', 'artisan-bread', 'cape-malay-cooking', 'french-pastry',
  'artisan-bread', 'private-baking', 'pasta-from-scratch', 'artisan-bread', 'cape-malay-cooking',
  'french-pastry', 'artisan-bread', 'private-baking', 'pasta-from-scratch', 'artisan-bread',
  'cape-malay-cooking', 'french-pastry', 'artisan-bread', 'private-baking', 'pasta-from-scratch',
  'artisan-bread', 'cape-malay-cooking', 'french-pastry', 'artisan-bread', 'cape-malay-cooking'
];

const DATE_OFFSETS = [
  -45, -38, -31, -26, -21, -18, -15, -12, -10, -8, -7, -6, -5, -4, -3, -2, -2, -1,
  0, 0, 0, 0, 1, 2, 3, 5, 7, 9, 11, 13
];

const STATUSES = [
  ...Array(16).fill('completed'),
  ...Array(2).fill('declined'),
  'confirmed', 'confirmed', 'pending', 'confirmed',
  'confirmed', 'pending', 'confirmed', 'waitlisted', 'confirmed', 'pending', 'confirmed', 'confirmed'
];

const PAYMENT_STATUSES = [
  ...Array(20).fill('paid'),
  ...Array(4).fill('manual_pending'),
  ...Array(6).fill('unpaid')
];

const CONVERSATIONS = [
  {
    subject: 'Reschedule request',
    messages: [
      "Could I move tomorrow's bread workshop to next Saturday?",
      'Of course. The next Saturday class starts at 09:00 and still has space.',
      'That works perfectly for me.',
      'Great, I have added the new date for your approval.'
    ],
    reschedule: true
  },
  {
    subject: 'Payment question',
    messages: [
      'Can I pay for the pasta class by card when I arrive?',
      'Yes. We accept card at the studio, or you can pay securely online before class.',
      'Perfect, I will pay at reception.',
      'No problem. Your place remains reserved.'
    ]
  },
  {
    subject: 'First cooking class',
    messages: [
      'This is my first cooking class. Do I need to bring any equipment?',
      'Everything is provided, including an apron. Please wear comfortable closed shoes.',
      'That sounds easy. I will arrive a little early.',
      'Perfect. Reception opens 15 minutes before class.'
    ]
  },
  {
    subject: 'Dietary requirements',
    messages: [
      'I have a nut allergy. Can the pastry class accommodate me?',
      'Yes. We can prepare a separate nut-free station, although the kitchen handles nuts at other times.',
      'Thank you. I am comfortable with that arrangement.',
      'Great. The allergy note is now attached to your booking.'
    ]
  },
  {
    subject: 'Group availability',
    messages: [
      "Is there room for two people in Saturday's Cape Malay class?",
      'Yes, there are three places available at the moment.',
      'Please keep my booking and add one guest.',
      'Both places are now reserved.'
    ]
  },
  {
    subject: 'Recipe question',
    messages: [
      'Will we receive the pasta recipes after class?',
      'Yes. Printed recipes are provided in the studio and a digital copy is emailed afterward.',
      'Wonderful. I would like to practise the sauces at home.',
      'Your instructor will also include storage and reheating notes.'
    ]
  },
  {
    subject: 'Taking food home',
    messages: [
      'Can I take my bread and pastries home after the workshop?',
      'Absolutely. We provide recyclable boxes and bags for everything you make.',
      'That is perfect, thank you.',
      'You are welcome. Please bring a reusable bag if you prefer.'
    ]
  },
  {
    subject: 'Parking and arrival',
    messages: [
      'Where is the easiest place to park near the studio?',
      'Secure visitor parking is available in the courtyard behind the building.',
      'Great. I will use the rear entrance.',
      'Perfect. The studio host will meet you at reception.'
    ]
  },
  {
    subject: 'Receipt request',
    messages: [
      'Can I receive a receipt with my full name after payment?',
      'Certainly. A detailed receipt will be emailed as soon as the payment is recorded.',
      'Please send it to the email on my booking.',
      'No problem. That email address is already selected for the receipt.'
    ]
  },
  {
    subject: 'Class preparation',
    messages: [
      'Should I prepare anything before the private baking lesson?',
      'Please send two photos of cakes you like so the instructor can tailor the lesson.',
      'I have added them to my booking notes.',
      'Excellent. Your instructor will prepare the right tools and decorations.'
    ]
  },
  {
    subject: 'Cancellation policy',
    messages: [
      'How much notice do I need to give if I cannot attend?',
      'Please let us know at least 48 hours before class so we can offer the place to another guest.',
      'Understood. My booking is still going ahead.',
      'Thanks for confirming. We look forward to cooking with you.'
    ]
  },
  {
    subject: 'Reminder preference',
    messages: [
      'Could I receive my class reminder by email rather than by phone?',
      'Yes, we can keep email as your preferred reminder channel.',
      'That is perfect for me.',
      'Updated. Your next class reminder will be sent by email.'
    ]
  }
];

const dateAt = (anchor, offset, hour = 9) => {
  const result = new Date(anchor);
  result.setHours(hour, 0, 0, 0);
  result.setDate(result.getDate() + offset);
  return result;
};

const dateKey = date => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function buildSettings() {
  const settings = createDefaultSettings();
  return {
    ...settings,
    slug: WORKSPACE_EXAMPLE_SLUG,
    brandName: 'Flame & Flour',
    businessName: 'Flame & Flour',
    businessType: 'classes',
    serviceIndustry: 'classes',
    email: 'hello@flourandflame.example',
    phone: '+27 21 555 0100',
    tagline: 'Cook boldly. Bake beautifully.',
    welcomeMessage: 'Choose a hands-on cooking or baking class and join us around the kitchen table.',
    locationMode: 'my_location',
    nativeAccent: true,
    serviceDisplayStyle: 'rail',
    serviceDropdownEnabled: false,
    logo: '/example/flour-and-flame/flame-and-flour-logo-clean.webp',
    logoDisplay: {
      ...(settings.logoDisplay || {}),
      visible: true,
      alignment: 'left',
      size: 176,
      placement: 'badge'
    },
    bannerImage: '/example/flour-and-flame/hero.webp',
    venuePhotos: [
      '/example/flour-and-flame/venue/teaching-kitchen.webp',
      '/example/flour-and-flame/venue/pastry-island.webp',
      '/example/flour-and-flame/venue/bread-ovens.webp',
      '/example/flour-and-flame/venue/ingredient-pantry.webp',
      '/example/flour-and-flame/venue/tasting-room.webp',
      '/example/flour-and-flame/venue/entrance.webp'
    ],
    venueTitle: 'Inside Flame & Flour',
    venueIntro: 'A warm, fully equipped teaching kitchen designed for learning, cooking, and sharing the table.',
    address: 'Woodstock, Cape Town, South Africa',
    mapPlace: null,
    socials: {},
    availableTimes: TIME_SLOTS,
    schedule: {
      monday: { enabled: true, slots: TIME_SLOTS },
      tuesday: { enabled: true, slots: TIME_SLOTS },
      wednesday: { enabled: true, slots: TIME_SLOTS },
      thursday: { enabled: true, slots: TIME_SLOTS },
      friday: { enabled: true, slots: TIME_SLOTS },
      saturday: { enabled: true, slots: ['09:00', '11:00', '14:00'] },
      sunday: { enabled: false, slots: [] }
    },
    googleCalendar: {
      mode: 'connected',
      connectedEmail: 'calendar@flourandflame.example',
      connectedAt: 1_745_000_000_000,
      lastSyncedAt: 1_751_000_000_000,
      lastSyncCount: 30
    },
    features: {
      ...settings.features,
      socialLinks: false,
      location: 'Woodstock, Cape Town, South Africa',
      collectClientNotes: true,
      faqs: [
        { id: 'faq-1', question: 'What should I bring?', answer: 'We provide ingredients, equipment, recipes, and an apron. Please wear comfortable closed shoes.' },
        { id: 'faq-2', question: 'Can you accommodate dietary requirements?', answer: 'Tell us about allergies or dietary needs when booking and we will confirm what can be safely accommodated.' },
        { id: 'faq-3', question: 'Can I take my food home?', answer: 'Yes. We provide recyclable containers for the bread, pastries, and dishes you make.' }
      ]
    },
    staffCalendars: Object.fromEntries(STAFF.map(staff => [staff.id, {
      staffId: staff.id,
      color: staff.color,
      connected: true,
      connectedEmail: `${staff.id}@flourandflame.example`,
      availableTimes: TIME_SLOTS,
      scheduleDefaults: { monday: { enabled: true }, saturday: { enabled: true } }
    }])),
    services: SERVICES.map((service, index) => ({
      ...service,
      title: service.name,
      currency: 'R',
      active: true,
      enabled: true,
      sortOrder: index,
      bookingNote: 'Ingredients, equipment, recipes, and an apron are included.',
      imageUrls: [service.image],
      locationType: 'business',
      meetingLink: '',
      autoGenerateMeeting: false,
      bookingType: 'class',
      serviceType: 'class'
    }))
  };
}

function buildClients(anchor) {
  return CLIENTS.map(([portraitId, name, email, phone, country, countryCode], index) => ({
    id: `phone-${phone.replace(/\D/g, '')}`,
    name,
    email,
    phone,
    country,
    countryCode,
    avatar: `/example/your-business/people/clients/${portraitId}.webp`,
    source: index < 2 ? 'public-booking' : 'booking-history',
    labels: index < 3 ? ['New'] : index < 7 ? ['Returning'] : [],
    autoLabels: index < 3 ? ['New'] : ['Returning'],
    notes: index % 4 === 0 ? 'Prefers class reminders and recipes by email.' : '',
    createdAt: dateAt(anchor, -90 + index * 4, 8).getTime(),
    updatedAt: dateAt(anchor, -(index % 6), 10).getTime()
  }));
}

function buildStaff() {
  return STAFF.map((staff, index) => ({
    ...staff,
    title: staff.role,
    photoURL: staff.avatar,
    status: 'connected',
    email: `${staff.id}@flourandflame.example`,
    serviceIds: SERVICES.filter(service => service.staffIds.includes(staff.id)).map(service => service.id),
    sortOrder: index,
    calendar: {
      connected: true,
      provider: 'Google Calendar',
      email: `${staff.id}@flourandflame.example`
    }
  }));
}

function buildBookings(anchor, clients, staffList) {
  const serviceById = new Map(SERVICES.map(service => [service.id, service]));
  const staffById = new Map(staffList.map(staff => [staff.id, staff]));
  const serviceStaffCursor = new Map();

  return SERVICE_SEQUENCE.map((serviceId, index) => {
    const service = serviceById.get(serviceId);
    const client = clients[index % clients.length];
    const staffCursor = serviceStaffCursor.get(serviceId) || 0;
    const staffId = service.staffIds[staffCursor % service.staffIds.length];
    serviceStaffCursor.set(serviceId, staffCursor + 1);
    const staff = staffById.get(staffId);
    const date = dateAt(anchor, DATE_OFFSETS[index], 9 + (index % 7));
    const paymentStatus = PAYMENT_STATUSES[index];
    const isReschedule = index === 23;

    return {
      id: `booking-${String(index + 1).padStart(3, '0')}`,
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      clientPhone: client.phone,
      clientCountry: client.country,
      clientAvatar: client.avatar,
      avatar: client.avatar,
      serviceId: service.id,
      serviceName: service.name,
      serviceDescription: service.description,
      serviceCategory: service.category,
      servicePrice: service.price,
      servicePriceType: 'fixed',
      serviceDuration: `${service.duration} min`,
      staffId: staff.id,
      staffName: staff.name,
      staffPhotoURL: staff.photoURL,
      amountInCents: service.price * 100,
      currency: 'ZAR',
      paymentMethod: paymentStatus === 'manual_pending' ? 'manual_eft' : paymentStatus === 'paid' ? 'stripe' : 'cash',
      paymentGateway: paymentStatus === 'manual_pending' ? 'manual_eft' : paymentStatus === 'paid' ? 'stripe' : 'cash',
      paymentStatus,
      status: STATUSES[index],
      clientNote: client.notes,
      date: date.toLocaleDateString('en-ZA', { weekday: 'short', month: 'short', day: 'numeric' }),
      dateKey: dateKey(date),
      time: TIME_SLOTS[index % TIME_SLOTS.length],
      source: index % 3 === 0 ? 'public-booking-page' : 'admin',
      createdAt: date.getTime() - DAY_MS * 3,
      updatedAt: date.getTime(),
      timestamp: date.getTime(),
      ...(isReschedule ? {
        rescheduleStatus: 'pending',
        reschedule: {
          status: 'pending',
          requestedDateKey: dateKey(dateAt(anchor, DATE_OFFSETS[index] + 2)),
          requestedTime: '15:00'
        }
      } : {})
    };
  });
}

function buildThreads(bookings, staffList, clients) {
  return clients.map((client, index) => {
    const conversation = CONVERSATIONS[index];
    const booking = bookings
      .filter(record => record.clientId === client.id)
      .sort((left, right) => right.timestamp - left.timestamp)[0];
    const staff = staffList.find(member => member.id === booking.staffId) || staffList[0];
    const requestedDate = booking.reschedule?.requestedDateKey || dateKey(dateAt(new Date(booking.timestamp), 2));
    const requestedTime = booking.reschedule?.requestedTime || '14:00';
    const messages = conversation.messages.map((text, messageIndex) => {
      const isClient = messageIndex % 2 === 0;
      return {
        id: `message-${index + 1}-${messageIndex + 1}`,
        senderRole: isClient ? 'client' : 'owner',
        senderName: isClient ? booking.clientName : staff.name,
        senderPhotoURL: isClient ? booking.clientAvatar : staff.photoURL,
        text,
        createdAtMs: booking.updatedAt - (4 - messageIndex) * 1_800_000,
        ...(conversation.reschedule && messageIndex === 3 ? {
          kind: 'reschedule-offer',
          rescheduleProposal: {
            id: 'proposal-1',
            bookingId: booking.id,
            date: requestedDate,
            time: requestedTime,
            requestedBy: 'client',
            source: 'request',
            status: 'pending',
            message: conversation.messages[0],
            createdAtMs: booking.updatedAt - 1_800_000
          }
        } : {})
      };
    });

    return {
      id: `thread-${String(index + 1).padStart(3, '0')}`,
      bookingId: booking.id,
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      clientCountry: client.country,
      clientAvatar: client.avatar,
      clientPhotoURL: client.avatar,
      serviceName: booking.serviceName,
      workspaceName: 'Flame & Flour',
      staffId: staff.id,
      staffName: staff.name,
      staffPhotoURL: staff.photoURL,
      subject: conversation.subject,
      status: conversation.reschedule ? 'needs_attention' : index % 2 === 0 ? 'awaiting_owner' : 'open',
      bookingStatus: booking.status,
      rescheduleStatus: conversation.reschedule ? 'requested' : '',
      proposedReschedule: conversation.reschedule ? messages[3].rescheduleProposal : null,
      isExample: true,
      ownerUnread: index < 3 ? 1 : 0,
      clientUnread: 0,
      updatedAtMs: booking.updatedAt + index * 60_000,
      lastMessage: conversation.messages[3],
      messages
    };
  });
}

function buildNotifications(threads, anchor) {
  return threads.slice(0, 6).map((thread, index) => ({
    id: `notification-${String(index + 1).padStart(3, '0')}`,
    read: index > 2,
    priority: index === 0 ? 'high' : 'normal',
    type: index === 0 ? 'reschedule_requested' : 'booking_update',
    title: index === 0 ? 'Reschedule needs a decision' : 'Client message received',
    body: `${thread.clientName} replied about ${thread.serviceName}.`,
    tab: index === 0 ? 'communications' : 'bookings',
    createdAtMs: dateAt(anchor, -(index % 3), 9 + index).getTime(),
    bookingId: thread.bookingId,
    threadId: thread.id
  }));
}

export function createWorkspaceExample({ anchorDate = new Date() } = {}) {
  const anchor = new Date(anchorDate);
  anchor.setHours(12, 0, 0, 0);
  const settings = buildSettings();
  const clientRecords = buildClients(anchor);
  const staffList = buildStaff();
  const bookings = buildBookings(anchor, clientRecords, staffList);
  const supportThreads = buildThreads(bookings, staffList, clientRecords);
  const notifications = buildNotifications(supportThreads, anchor);

  return {
    settings,
    bookings,
    staffList,
    clientRecords,
    communications: createDefaultCommunications(),
    supportThreads,
    notifications,
    manifest: {
      clients: clientRecords.length,
      staff: staffList.length,
      services: settings.services.length,
      bookings: bookings.length,
      historicalBookings: bookings.filter(booking => booking.dateKey < dateKey(anchor)).length,
      upcomingBookings: bookings.filter(booking => booking.dateKey >= dateKey(anchor)).length,
      paidRevenueCents: bookings.filter(booking => booking.paymentStatus === 'paid').reduce((sum, booking) => sum + booking.amountInCents, 0),
      pendingRevenueCents: bookings.filter(booking => booking.paymentStatus === 'manual_pending').reduce((sum, booking) => sum + booking.amountInCents, 0),
      totalRevenueCents: bookings.reduce((sum, booking) => sum + booking.amountInCents, 0)
    },
    gatewayStates: {
      stripe: { enabled: true, configured: true, mode: 'example', providerName: 'Stripe' },
      yoco: { enabled: false, configured: false, mode: 'example', providerName: 'Yoco' },
      manual_eft: { enabled: true, configured: true, mode: 'example', providerName: 'EFT' },
      cash: { enabled: true, configured: true, mode: 'example', providerName: 'Pay at studio' }
    }
  };
}
