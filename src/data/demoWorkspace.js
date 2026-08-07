import { normalizeServiceList } from '../utils/services';
import { normalizeProductList } from '../utils/products';
import { addDays, toDateKey } from '../utils/dates';

const today = startOfToday();

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export const DEMO_SERVICES = normalizeServiceList([
  {
    id: 'pasta-from-scratch',
    name: 'Pasta From Scratch',
    category: 'Cooking',
    price: 850,
    duration: 180,
    scheduleType: 'class_session',
    capacity: 8,
    description:
      'Mix, roll, shape, and cook fresh pasta before sitting down to enjoy the finished dishes together.',
    image: '/example/flour-and-flame/services/pasta-from-scratch.webp',
    staffIds: ['jordan-lee', 'maya-patel']
  },
  {
    id: 'artisan-bread',
    name: 'Artisan Bread Workshop',
    category: 'Bread',
    price: 780,
    duration: 210,
    scheduleType: 'class_session',
    capacity: 10,
    description:
      'Learn fermentation, shaping, scoring, and baking while making your own naturally leavened loaf.',
    image: '/example/flour-and-flame/services/artisan-bread.webp',
    staffIds: ['thando-mokoena', 'maya-patel']
  },
  {
    id: 'french-pastry',
    name: 'French Pastry Foundations',
    category: 'Pastry',
    price: 950,
    duration: 180,
    scheduleType: 'class_session',
    capacity: 8,
    description:
      'Build confidence with laminated dough, choux pastry, fillings, glazing, and elegant finishing.',
    image: '/example/flour-and-flame/services/french-pastry.webp',
    staffIds: ['jordan-lee', 'thando-mokoena']
  },
  {
    id: 'cape-malay-cooking',
    name: 'Cape Malay Cooking',
    category: 'Cape cuisine',
    price: 900,
    duration: 180,
    scheduleType: 'class_session',
    capacity: 8,
    description:
      'Cook a generous Cape Malay menu while learning how to balance aromatics, spice, sweetness, and heat.',
    image: '/example/flour-and-flame/services/cape-malay.webp',
    staffIds: ['jordan-lee', 'maya-patel']
  },
  {
    id: 'private-baking',
    name: 'Private Baking Lesson',
    category: 'Private lessons',
    price: 1200,
    duration: 120,
    scheduleType: 'appointment',
    capacity: 1,
    description:
      'A focused one-to-one lesson shaped around your baking goals, from fundamentals to celebration cakes.',
    image: '/example/flour-and-flame/services/private-baking.webp',
    staffIds: ['thando-mokoena', 'sofia-martins']
  }
]);

export const DEMO_STAFF = [
  {
    id: 'jordan-lee',
    name: 'Jordan Lee',
    role: 'Owner and Head Chef',
    accessRole: 'Owner',
    email: 'jordan@flourandflame.example',
    color: '#111827'
  },
  {
    id: 'thando-mokoena',
    name: 'Thando Mokoena',
    role: 'Bread and Pastry Instructor',
    accessRole: 'Admin',
    email: 'thando@flourandflame.example',
    color: '#0F766E'
  },
  {
    id: 'maya-patel',
    name: 'Maya Patel',
    role: 'Culinary Instructor',
    accessRole: 'Staff',
    email: 'maya@flourandflame.example',
    color: '#B45309'
  },
  {
    id: 'sofia-martins',
    name: 'Sofia Martins',
    role: 'Studio Host',
    accessRole: 'Staff',
    email: 'sofia@flourandflame.example',
    color: '#0369A1'
  }
];

export const DEMO_CLIENTS = [
  {
    id: 'client-001',
    name: 'Aisha Naidoo',
    email: 'aisha.naidoo@example.com',
    phone: '+27 72 555 1001',
    country: 'South Africa'
  },
  {
    id: 'client-002',
    name: 'Daniel Botha',
    email: 'daniel.botha@example.com',
    phone: '+27 72 555 1002',
    country: 'South Africa'
  },
  {
    id: 'client-003',
    name: 'Lerato Dlamini',
    email: 'lerato.dlamini@example.com',
    phone: '+27 72 555 1003',
    country: 'South Africa'
  },
  {
    id: 'client-004',
    name: 'Ethan Williams',
    email: 'ethan.williams@example.com',
    phone: '+27 72 555 1004',
    country: 'South Africa'
  },
  {
    id: 'client-005',
    name: 'Zara Hassan',
    email: 'zara.hassan@example.com',
    phone: '+971 4 555 1009',
    country: 'United Arab Emirates'
  }
];

export const DEMO_THREADS = [
  {
    id: 'thread-1',
    clientName: 'Aisha Naidoo',
    clientEmail: 'aisha.naidoo@example.com',
    subject: 'Reschedule request',
    unread: true,
    updatedAt: Date.now() - 1000 * 60 * 25,
    messages: [
      {
        id: 'm1',
        from: 'client',
        body: "Could I move tomorrow's bread workshop to next Saturday?",
        at: Date.now() - 1000 * 60 * 40
      },
      {
        id: 'm2',
        from: 'business',
        body: 'Of course. The next Saturday class starts at 09:00 and still has space.',
        at: Date.now() - 1000 * 60 * 30
      },
      {
        id: 'm3',
        from: 'client',
        body: 'That works perfectly for me.',
        at: Date.now() - 1000 * 60 * 25
      }
    ]
  },
  {
    id: 'thread-2',
    clientName: 'Daniel Botha',
    clientEmail: 'daniel.botha@example.com',
    subject: 'Private lesson focus',
    unread: false,
    updatedAt: Date.now() - 1000 * 60 * 180,
    messages: [
      {
        id: 'm4',
        from: 'client',
        body: 'For my private baking lesson, can we focus on celebration cakes?',
        at: Date.now() - 1000 * 60 * 200
      },
      {
        id: 'm5',
        from: 'business',
        body: 'Absolutely — we will set the session around stacking and buttercream.',
        at: Date.now() - 1000 * 60 * 180
      }
    ]
  }
];

export const DEMO_PAYMENT_GATEWAYS = [
  {
    gatewayType: 'stripe',
    enabled: true,
    mode: 'test',
    configured: true,
    providerName: 'Stripe',
    credentialSummary: { publicKeyLast4: '4242', webhookConfigured: true }
  },
  {
    gatewayType: 'paystack',
    enabled: true,
    mode: 'test',
    configured: true,
    providerName: 'Paystack',
    credentialSummary: { publicKeyLast4: '9911', webhookConfigured: true }
  },
  {
    gatewayType: 'manual_eft',
    enabled: true,
    mode: 'live',
    configured: true,
    providerName: 'Manual EFT',
    credentialSummary: {
      accountHolder: 'Flour & Flame Studio',
      bankName: 'Example Bank',
      accountNumber: '****4412',
      branchCode: '250655',
      instructions: 'Use your booking or order name as reference.'
    }
  },
  {
    gatewayType: 'cash',
    enabled: true,
    mode: 'live',
    configured: true,
    providerName: 'Cash',
    credentialSummary: { instructions: 'Pay in studio on the day.' }
  }
];

export const DEMO_PRODUCTS = normalizeProductList([
  {
    id: 'artisan-bread-box',
    name: 'Artisan Bread Box',
    category: 'Baked goods',
    price: 320,
    stockAvailable: 12,
    description: 'A mixed box of the day’s loaves — sourdough, seeded, and a soft milk loaf.',
    image: '/example/flour-and-flame/products/artisan-bread-box.png'
  },
  {
    id: 'fresh-pasta-starter-set',
    name: 'Fresh Pasta Starter Set',
    category: 'Kits',
    price: 480,
    stockAvailable: 8,
    description: 'Flour blend, semolina, recipe cards, and a wooden paddle for home pasta nights.',
    image: '/example/flour-and-flame/products/fresh-pasta-starter-set.png'
  },
  {
    id: 'kitchen-notes',
    name: 'Kitchen Notes',
    category: 'Books',
    price: 260,
    stockAvailable: 20,
    description: 'Studio recipes, fermentation notes, and plating ideas from the Flour & Flame team.',
    image: '/example/flour-and-flame/products/kitchen-notes.png'
  },
  {
    id: 'private-menu-consult',
    name: 'Private Menu Consult',
    category: 'Consulting',
    priceType: 'quote',
    quoteBased: true,
    stockLabel: 'By arrangement',
    description: 'Plan a custom menu or celebration bake with the kitchen — priced after a short consult.',
    image: '/example/flour-and-flame/venue/tasting-room.webp'
  }
]);

const sampleOrders = [
  {
    id: 'ord-1',
    requestType: 'product_order',
    orderType: 'product',
    clientName: 'Ethan Williams',
    clientEmail: 'ethan.williams@example.com',
    clientPhone: '+27 72 555 1004',
    items: [
      {
        productId: 'artisan-bread-box',
        name: 'Artisan Bread Box',
        quantity: 2,
        unitPriceCents: 32000,
        lineTotalCents: 64000
      }
    ],
    amountInCents: 64000,
    currency: 'R',
    paymentMethod: 'manual_eft',
    paymentStatus: 'manual_pending',
    status: 'pending',
    source: 'public_shop',
    timestamp: Date.now() - 1000 * 60 * 40
  },
  {
    id: 'ord-2',
    requestType: 'product_order',
    orderType: 'product',
    clientName: 'Zara Hassan',
    clientEmail: 'zara.hassan@example.com',
    items: [
      {
        productId: 'kitchen-notes',
        name: 'Kitchen Notes',
        quantity: 1,
        unitPriceCents: 26000,
        lineTotalCents: 26000
      },
      {
        productId: 'fresh-pasta-starter-set',
        name: 'Fresh Pasta Starter Set',
        quantity: 1,
        unitPriceCents: 48000,
        lineTotalCents: 48000
      }
    ],
    amountInCents: 74000,
    currency: 'R',
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    status: 'fulfilled',
    source: 'public_shop',
    timestamp: Date.now() - 1000 * 60 * 60 * 26
  }
];

const sampleBookings = [
  {
    id: 'bk-1',
    serviceId: 'artisan-bread',
    serviceName: 'Artisan Bread Workshop',
    scheduleType: 'class_session',
    clientName: 'Aisha Naidoo',
    clientEmail: 'aisha.naidoo@example.com',
    clientPhone: '+27 72 555 1001',
    date: toDateKey(today),
    dateKey: toDateKey(today),
    time: '09:00',
    status: 'confirmed',
    paymentStatus: 'paid',
    staffId: 'thando-mokoena',
    staffName: 'Thando Mokoena',
    source: 'public'
  },
  {
    id: 'bk-2',
    serviceId: 'private-baking',
    serviceName: 'Private Baking Lesson',
    scheduleType: 'appointment',
    clientName: 'Daniel Botha',
    clientEmail: 'daniel.botha@example.com',
    clientPhone: '+27 72 555 1002',
    date: toDateKey(today),
    dateKey: toDateKey(today),
    time: '14:00',
    status: 'pending',
    paymentStatus: 'unpaid',
    staffId: 'sofia-martins',
    staffName: 'Sofia Martins',
    source: 'public'
  },
  {
    id: 'bk-3',
    serviceId: 'pasta-from-scratch',
    serviceName: 'Pasta From Scratch',
    scheduleType: 'class_session',
    clientName: 'Lerato Dlamini',
    clientEmail: 'lerato.dlamini@example.com',
    clientPhone: '+27 72 555 1003',
    date: toDateKey(addDays(today, 1)),
    dateKey: toDateKey(addDays(today, 1)),
    time: '10:00',
    status: 'pending',
    paymentStatus: 'manual_pending',
    staffId: 'jordan-lee',
    staffName: 'Jordan Lee',
    source: 'public'
  },
  {
    id: 'bk-4',
    serviceId: 'french-pastry',
    serviceName: 'French Pastry Foundations',
    scheduleType: 'class_session',
    clientName: 'Nandi Maseko',
    clientEmail: 'nandi.maseko@example.com',
    date: toDateKey(addDays(today, 2)),
    dateKey: toDateKey(addDays(today, 2)),
    time: '11:00',
    status: 'waitlist',
    paymentStatus: 'unpaid',
    staffId: 'maya-patel',
    staffName: 'Maya Patel',
    source: 'public'
  }
];

export function createDemoWorkspace() {
  return {
    slug: 'flour-and-flame',
    brandName: 'Flour & Flame',
    tagline: 'Baking studio in Cape Town',
    welcomeMessage: 'Reserve a class or take home something fresh.',
    email: 'hello@flourandflame.example',
    phone: '+27 21 555 0100',
    onboardingComplete: true,
    isDemo: true,
    nativeAccent: true,
    notifications: {
      emailBookingRequests: true,
      emailProductOrders: true,
      emailSupportMessages: true
    },
    paymentGateways: DEMO_PAYMENT_GATEWAYS,
    clients: DEMO_CLIENTS,
    threads: DEMO_THREADS,
    website: {
      pages: { home: true, book: true, buy: true, social: true },
      sections: {
        about: true,
        reasons: true,
        venue: true,
        map: true,
        reviews: true,
        bookStrip: true
      },
      sectionOrder: ['about', 'reasons', 'venue', 'map', 'reviews', 'bookStrip'],
      headline: 'Bake with us.',
      subcopy: 'Hands-on classes, private sessions, and kitchen goods.',
      ctaLabel: 'Book a class',
      buyCtaLabel: 'Buy',
      homeHeadline: 'Bake with us.',
      homeSubtext: 'Hands-on classes, private sessions, and kitchen goods.',
      heroImageUrl: '/example/flour-and-flame/hero.webp',
      logoUrl: '/example/flour-and-flame/flame-and-flour-logo.webp',
      bookHeadline: 'Book a class or private lesson',
      bookSubtext: 'Pick a service, choose a time, and send your request.',
      buyHeadline: 'Take the kitchen home',
      buySubtext: 'Bread boxes, pasta kits, and studio notes ready to order.',
      socialHeadline: 'From the studio',
      socialSubtext: 'Posts, clips, and notes from Flour & Flame.',
      aboutTitle: 'A working teaching kitchen',
      aboutBody:
        'Flour & Flame is a Cape Town studio for hands-on classes, private lessons, and kitchen goods. We cook with you — then send you home with skills (and something delicious).',
      aboutImageUrl: '/example/flour-and-flame/venue/teaching-kitchen.webp',
      reasonsTitle: 'Why cook with us',
      reasons: [
        {
          id: 'r1',
          title: 'Small groups',
          body: 'Enough attention to learn, enough energy to enjoy the room.'
        },
        {
          id: 'r2',
          title: 'Real kitchen gear',
          body: 'Work on pro benches with the tools we actually use every day.'
        },
        {
          id: 'r3',
          title: 'Take-home sets',
          body: 'Bread boxes, pasta kits, and notes so the craft continues at home.'
        }
      ],
      venueTitle: 'Inside the studio',
      venueImages: [
        {
          id: 'v1',
          url: '/example/flour-and-flame/venue/bread-ovens.webp',
          caption: 'Bread ovens'
        },
        {
          id: 'v2',
          url: '/example/flour-and-flame/venue/pastry-island.webp',
          caption: 'Pastry island'
        },
        {
          id: 'v3',
          url: '/example/flour-and-flame/venue/tasting-room.webp',
          caption: 'Tasting room'
        },
        {
          id: 'v4',
          url: '/example/flour-and-flame/venue/entrance.webp',
          caption: 'Entrance'
        }
      ],
      address: '12 Woodstock Kitchen Lane, Cape Town',
      mapEmbedUrl:
        'https://maps.google.com/maps?q=Woodstock%2C%20Cape%20Town&t=&z=14&ie=UTF8&iwloc=&output=embed',
      mapLinkUrl: 'https://maps.google.com/?q=Woodstock,+Cape+Town',
      reviewsTitle: 'From the table',
      reviews: [
        {
          id: 'rev1',
          quote: 'Best Saturday I’ve spent in a kitchen — left with a loaf and real confidence.',
          name: 'Aisha N.',
          rating: 5
        },
        {
          id: 'rev2',
          quote: 'Private lesson was tailored perfectly. Calm, clear, and delicious.',
          name: 'Daniel K.',
          rating: 5
        },
        {
          id: 'rev3',
          quote: 'The pasta kit was a hit at home. Packaging and notes are beautiful.',
          name: 'Lebo M.',
          rating: 5
        }
      ],
      bookStripTitle: 'Reserve a class',
      bookStripBody: 'See open times on the Book page and send a request in minutes.',
      bookStripCta: 'See availability',
      bookFaqTitle: 'What to expect',
      bookFaq: [
        {
          id: 'f1',
          q: 'How do booking requests work?',
          a: 'Choose a service and time, send your details, and we confirm by email.'
        },
        {
          id: 'f2',
          q: 'What should I bring?',
          a: 'Closed shoes and an appetite. Aprons and ingredients are provided for classes.'
        },
        {
          id: 'f3',
          q: 'Can I book privately?',
          a: 'Yes — pick Private Baking Lesson or message us from Support.'
        }
      ],
      featuredProductId: 'artisan-bread-box'
    },
    socialPosts: [
      {
        id: 'post-1',
        type: 'image',
        mediaUrl: '/example/flour-and-flame/venue/bread-ovens.webp',
        caption: 'Morning bake — loaves cooling on the rack.',
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 8,
        order: 0
      },
      {
        id: 'post-2',
        type: 'image',
        mediaUrl: '/example/flour-and-flame/venue/pastry-island.webp',
        caption: 'Pastry island prep for Saturday’s French foundations class.',
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 30,
        order: 1
      },
      {
        id: 'post-3',
        type: 'text',
        title: 'Studio note',
        caption: 'Private baking lessons are open for March — tell us what you want to master.',
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 50,
        order: 2
      }
    ],
    availabilityRules: {
      businessOpenTime: '09:00',
      businessCloseTime: '17:00',
      scheduleMode: 'time_slots'
    },
    services: DEMO_SERVICES,
    staff: DEMO_STAFF,
    bookings: sampleBookings,
    products: DEMO_PRODUCTS,
    orders: sampleOrders
  };
}
