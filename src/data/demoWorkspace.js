import { normalizeServiceList } from '../utils/services';
import { normalizeProductList } from '../utils/products';
import { addDays, toDateKey } from '../utils/dates';

/** Bump when demo website shape gains required public Home fields. */
export const DEMO_WEBSITE_SCHEMA = 9;

/** Bump when demo social feed gains Posts / Videos / Text mix. */
export const DEMO_SOCIAL_SCHEMA = 2;

/** Stable sample MP4 for demo video player (no local video assets required). */
export const DEMO_SAMPLE_VIDEO_URL =
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4';

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

export const DEMO_THREADS_SCHEMA = 3;
export const DEMO_ORDERS_SCHEMA = 2;

export const DEMO_THREADS = [
  {
    id: 'thread-1',
    clientName: 'Aisha Naidoo',
    clientEmail: 'aisha.naidoo@example.com',
    clientId: 'client-001',
    subject: 'Reschedule request',
    bookingId: 'bk-1',
    unread: true,
    updatedAt: Date.now() - 1000 * 60 * 25,
    presence: { status: 'online', lastSeenAt: Date.now() - 1000 * 60 * 2 },
    messages: [
      {
        id: 'm1',
        type: 'text',
        from: 'client',
        body: "Could I move tomorrow's bread workshop to next Saturday?",
        at: Date.now() - 1000 * 60 * 40
      },
      {
        id: 'm2',
        type: 'text',
        from: 'business',
        body: 'Of course. The next Saturday class starts at 09:00 and still has space.',
        at: Date.now() - 1000 * 60 * 30
      },
      {
        id: 'm2b',
        type: 'image',
        from: 'business',
        body: 'Here is the studio setup for that class.',
        at: Date.now() - 1000 * 60 * 28,
        attachments: [
          {
            id: 'att-kitchen',
            kind: 'image',
            name: 'teaching-kitchen.webp',
            mime: 'image/webp',
            size: 180000,
            url: '/example/flour-and-flame/products/artisan-bread-box.png'
          }
        ]
      },
      {
        id: 'm3',
        type: 'text',
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
    clientId: 'client-002',
    subject: 'Private lesson focus',
    bookingId: 'bk-2',
    unread: false,
    updatedAt: Date.now() - 1000 * 60 * 180,
    presence: { status: 'away', lastSeenAt: Date.now() - 1000 * 60 * 45 },
    messages: [
      {
        id: 'm4',
        type: 'text',
        from: 'client',
        body: 'For my private baking lesson, can we focus on celebration cakes?',
        at: Date.now() - 1000 * 60 * 200
      },
      {
        id: 'm5',
        type: 'text',
        from: 'business',
        body: 'Absolutely — we will set the session around stacking and buttercream.',
        at: Date.now() - 1000 * 60 * 180
      },
      {
        id: 'm5b',
        type: 'voice',
        from: 'client',
        body: '',
        at: Date.now() - 1000 * 60 * 175,
        attachments: [
          {
            id: 'att-voice-1',
            kind: 'voice',
            name: 'voice-note.wav',
            mime: 'audio/wav',
            size: 42000,
            url: '',
            durationMs: 2400,
            demoTone: true
          }
        ]
      }
    ]
  },
  {
    id: 'thread-3',
    clientName: 'Zara Hassan',
    clientEmail: 'zara.hassan@example.com',
    clientId: 'client-005',
    subject: 'Order · Kitchen Notes',
    orderId: 'ord-2',
    unread: false,
    updatedAt: Date.now() - 1000 * 60 * 90,
    presence: { status: 'offline', lastSeenAt: Date.now() - 1000 * 60 * 60 * 8 },
    messages: [
      {
        id: 'm6',
        type: 'system',
        from: 'business',
        body: 'Order linked · Kitchen Notes + Fresh Pasta Starter Set',
        at: Date.now() - 1000 * 60 * 95
      },
      {
        id: 'm7',
        type: 'text',
        from: 'client',
        body: 'Can you hold the pasta kit for collection on Friday?',
        at: Date.now() - 1000 * 60 * 92
      },
      {
        id: 'm8',
        type: 'file',
        from: 'business',
        body: 'Collection slip attached.',
        at: Date.now() - 1000 * 60 * 90,
        attachments: [
          {
            id: 'att-file-1',
            kind: 'file',
            name: 'collection-slip.pdf',
            mime: 'application/pdf',
            size: 82000,
            url: ''
          }
        ]
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
    id: 'ord-3',
    requestType: 'product_order',
    orderType: 'product',
    clientName: 'Mia Jacobs',
    clientEmail: 'mia.jacobs@example.com',
    items: [
      {
        productId: 'fresh-pasta-starter-set',
        name: 'Fresh Pasta Starter Set',
        quantity: 1,
        unitPriceCents: 48000,
        lineTotalCents: 48000
      }
    ],
    amountInCents: 48000,
    currency: 'R',
    paymentMethod: 'card',
    paymentStatus: 'paid',
    status: 'accepted',
    source: 'public_shop',
    timestamp: Date.now() - 1000 * 60 * 60 * 5
  },
  {
    id: 'ord-4',
    requestType: 'product_order',
    orderType: 'product',
    clientName: 'Kai Petersen',
    clientEmail: 'kai.petersen@example.com',
    items: [
      {
        productId: 'kitchen-notes',
        name: 'Kitchen Notes',
        quantity: 2,
        unitPriceCents: 26000,
        lineTotalCents: 52000
      }
    ],
    amountInCents: 52000,
    currency: 'R',
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    status: 'shipped',
    source: 'public_shop',
    timestamp: Date.now() - 1000 * 60 * 60 * 18
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
    websiteSchema: DEMO_WEBSITE_SCHEMA,
    socialSchema: DEMO_SOCIAL_SCHEMA,
    threadsSchema: DEMO_THREADS_SCHEMA,
    ordersSchema: DEMO_ORDERS_SCHEMA,
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
        bookStrip: false
      },
      sectionOrder: ['about', 'reasons', 'venue', 'map', 'reviews'],
      headline: 'Cook Bold. Bake Beautifully.',
      subcopy:
        'Hands-on classes in a working Cape Town studio — leave with skill, confidence, and something delicious.',
      ctaLabel: 'Book a class',
      buyCtaLabel: 'Buy',
      homeHeadline: 'Cook Bold. Bake Beautifully.',
      homeSubtext:
        'Hands-on classes in a working Cape Town studio — leave with skill, confidence, and something delicious.',
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
        id: 'post-4',
        type: 'image',
        mediaUrl: '/example/flour-and-flame/venue/tasting-room.webp',
        caption: 'Tasting room set for the evening class.',
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 40,
        order: 2
      },
      {
        id: 'post-5',
        type: 'image',
        mediaUrl: '/example/flour-and-flame/venue/teaching-kitchen.webp',
        caption: 'Benches ready. Aprons out.',
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 55,
        order: 3
      },
      {
        id: 'vid-1',
        type: 'video',
        mediaUrl: DEMO_SAMPLE_VIDEO_URL,
        posterUrl: '/example/flour-and-flame/venue/pastry-island.webp',
        title: 'Rolling dough on pastry island',
        caption: 'A quiet look at how we start laminated pastry mornings.',
        duration: '0:15',
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 12,
        order: 0
      },
      {
        id: 'vid-2',
        type: 'video',
        mediaUrl: DEMO_SAMPLE_VIDEO_URL,
        posterUrl: '/example/flour-and-flame/venue/bread-ovens.webp',
        title: 'Loaves into the oven',
        caption: 'Steam, score, bake — the Friday rhythm.',
        duration: '0:15',
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 36,
        order: 1
      },
      {
        id: 'vid-3',
        type: 'video',
        mediaUrl: DEMO_SAMPLE_VIDEO_URL,
        posterUrl: '/example/flour-and-flame/venue/teaching-kitchen.webp',
        title: 'Class walkthrough',
        caption: 'What to expect when you book a hands-on session.',
        duration: '0:15',
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 72,
        order: 2
      },
      {
        id: 'text-1',
        type: 'text',
        title: 'Studio note',
        caption: 'Private baking lessons are open for March — tell us what you want to master.',
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 6,
        order: 0
      },
      {
        id: 'text-2',
        type: 'text',
        caption: 'Sold a few pasta kits this morning. If you’ve been waiting, this week’s batch is ready on Buy.',
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 20,
        order: 1
      },
      {
        id: 'text-3',
        type: 'text',
        title: 'Hours',
        caption: 'Studio open Tue–Sat. Sunday private bookings by request.',
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 48,
        order: 2
      },
      {
        id: 'text-4',
        type: 'text',
        caption: 'Tip from today’s class: rest your dough longer than you think. Texture always tells.',
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 70,
        order: 3
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

/**
 * Merge a cached demo workspace with the current Flour & Flame public Home content
 * when the stored copy predates rich sections (about/venue/map/reviews).
 */
export function hydrateDemoWorkspace(stored) {
  const fresh = createDemoWorkspace();
  if (!stored || typeof stored !== 'object') return fresh;

  const staleWebsite =
    Number(stored.websiteSchema || 0) < DEMO_WEBSITE_SCHEMA ||
    !stored.website?.aboutBody ||
    !Array.isArray(stored.website?.reasons) ||
    !stored.website.reasons.length ||
    !Array.isArray(stored.website?.venueImages) ||
    !stored.website.venueImages.length;

  const hasVideo = (stored.socialPosts || []).some((post) => post?.type === 'video');
  const hasText = (stored.socialPosts || []).some((post) => post?.type === 'text');
  const staleSocial =
    Number(stored.socialSchema || 0) < DEMO_SOCIAL_SCHEMA ||
    !Array.isArray(stored.socialPosts) ||
    stored.socialPosts.length < 6 ||
    !hasVideo ||
    !hasText;

  const staleThreads =
    Number(stored.threadsSchema || 0) < DEMO_THREADS_SCHEMA ||
    !Array.isArray(stored.threads) ||
    stored.threads.length < 3 ||
    !stored.threads.some((thread) => thread?.presence);

  const staleOrders =
    Number(stored.ordersSchema || 0) < DEMO_ORDERS_SCHEMA ||
    !Array.isArray(stored.orders) ||
    stored.orders.length < 3;

  const website = staleWebsite
    ? {
        ...fresh.website,
        ...(stored.website || {}),
        aboutTitle: fresh.website.aboutTitle,
        aboutBody: fresh.website.aboutBody,
        aboutImageUrl: fresh.website.aboutImageUrl,
        reasonsTitle: fresh.website.reasonsTitle,
        reasons: fresh.website.reasons,
        venueTitle: fresh.website.venueTitle,
        venueImages: fresh.website.venueImages,
        address: fresh.website.address,
        mapEmbedUrl: fresh.website.mapEmbedUrl,
        mapLinkUrl: fresh.website.mapLinkUrl,
        reviewsTitle: fresh.website.reviewsTitle,
        reviews: fresh.website.reviews,
        bookStripTitle: fresh.website.bookStripTitle,
        bookStripBody: fresh.website.bookStripBody,
        bookStripCta: fresh.website.bookStripCta,
        bookFaqTitle: fresh.website.bookFaqTitle,
        bookFaq: fresh.website.bookFaq,
        sections: {
          ...fresh.website.sections,
          bookStrip: false
        },
        sectionOrder: fresh.website.sectionOrder,
        featuredProductId: fresh.website.featuredProductId,
        heroImageUrl: stored.website?.heroImageUrl || fresh.website.heroImageUrl,
        homeHeadline: fresh.website.homeHeadline,
        homeSubtext: fresh.website.homeSubtext,
        headline: fresh.website.headline,
        subcopy: fresh.website.subcopy,
        ctaLabel: stored.website?.ctaLabel || fresh.website.ctaLabel,
        buyCtaLabel: stored.website?.buyCtaLabel || fresh.website.buyCtaLabel
      }
    : (() => {
        const {
          sectionLayouts: _sectionLayouts,
          homeLayoutId: _homeLayoutId,
          homeLayoutTemplates: _homeLayoutTemplates,
          ...storedWebsite
        } = stored.website || {};
        return {
          ...fresh.website,
          ...storedWebsite
        };
      })();

  return {
    ...fresh,
    ...stored,
    isDemo: true,
    websiteSchema: DEMO_WEBSITE_SCHEMA,
    socialSchema: DEMO_SOCIAL_SCHEMA,
    threadsSchema: DEMO_THREADS_SCHEMA,
    ordersSchema: DEMO_ORDERS_SCHEMA,
    website,
    socialPosts: staleSocial ? fresh.socialPosts : stored.socialPosts,
    threads: staleThreads ? fresh.threads : stored.threads,
    orders: staleOrders ? fresh.orders : stored.orders
  };
}
