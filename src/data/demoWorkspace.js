import { collectServiceCategories, normalizeServiceList } from '../utils/services';
import { collectProductCategories, normalizeProductList } from '../utils/products';
import { addDays, toDateKey } from '../utils/dates';
import {
  createStaffAvailabilityForRoster,
  normalizeAvailabilityRules,
  normalizeStaffAvailabilityMap
} from '../utils/staffAvailability';

/** Bump when demo website shape gains required public Home fields. */
export const DEMO_WEBSITE_SCHEMA = 32;

/** Bump when demo social feed gains Posts / Videos / Text mix. */
export const DEMO_SOCIAL_SCHEMA = 11;

/** Bump when demo services collapse to Cooking/Baking with package variants. */
export const DEMO_SERVICES_SCHEMA = 12;

/** Bump when demo staff availability / closed-days / staff photos change. */
export const DEMO_AVAILABILITY_SCHEMA = 2;

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
    id: 'cooking',
    name: 'Cooking',
    category: 'Cooking',
    price: 2800,
    duration: 180,
    fixedDuration: true,
    scheduleType: 'appointment',
    capacity: 1,
    description:
      'Hands-on cooking at our Cape Town bench.\n\nPick a package length below — from a focused month to a full year of rotating kitchens: Italian, Cape Malay, East Asian, French bistro, and seasonal wild cards. We cook, we eat, you leave with notes that stick.',
    imageUrls: ['/example/flour-and-flame/services/ff-cover-cooking.png'],
    staffIds: ['jordan-lee', 'maya-patel', 'sofia-martins'],
    variants: [
      {
        id: 'cooking-1-month',
        name: '1 Month',
        description:
          'Four weeks. Four kitchens. Italian pasta, Cape Malay supper, Asian stir-fry, and a French bistro plate.',
        price: 2800,
        minDuration: 180,
        available: true
      },
      {
        id: 'cooking-6-month',
        name: '6 Months',
        description:
          'Twice a month for half a year — knife work, sauces, and plating that stop feeling like a fluke.',
        price: 8900,
        minDuration: 180,
        available: true
      },
      {
        id: 'cooking-1-year',
        name: '1 Year',
        description:
          'A full year through weeknight stir-fries, weekend Italian, Cape Malay feasts, and roast Sundays.',
        price: 15500,
        minDuration: 180,
        available: true
      }
    ]
  },
  {
    id: 'baking',
    name: 'Baking',
    category: 'Baking',
    price: 2950,
    duration: 210,
    fixedDuration: true,
    scheduleType: 'appointment',
    capacity: 1,
    description:
      'Flour, butter, and honest craft in the Woodstock studio.\n\nChoose how long you want to stay with the dough — from a one-month intro to a year of bread, lamination, and pastry. Take-home bakes. Real notes. No fluff.',
    imageUrls: ['/example/flour-and-flame/services/ff-cover-baking.png'],
    staffIds: ['thando-mokoena', 'maya-patel', 'jordan-lee', 'sofia-martins'],
    variants: [
      {
        id: 'baking-1-month',
        name: '1 Month',
        description:
          'Sourdough, laminated croissants, and a proper pastry finish — enough to make your home oven feel like a studio.',
        price: 2950,
        minDuration: 210,
        available: true
      },
      {
        id: 'baking-6-month',
        name: '6 Months',
        description:
          'Twice a month through bread, lamination, enriched doughs, focaccia, tarts, and celebration cakes.',
        price: 9800,
        minDuration: 210,
        available: true
      },
      {
        id: 'baking-1-year',
        name: '1 Year',
        description:
          'Country loaves, laminated mornings, pastry nights, and holiday sweets until shaping feels second nature.',
        price: 16800,
        minDuration: 210,
        available: true
      }
    ]
  }
]);

export const DEMO_STAFF = [
  {
    id: 'jordan-lee',
    name: 'Jordan Lee',
    role: 'Owner and Head Chef',
    accessRole: 'Owner',
    email: 'jordan@flourandflame.example',
    color: '#111827',
    photoURL:
      'https://images.unsplash.com/photo-1583394293214-28ded15ee548?w=256&h=256&fit=crop&crop=faces'
  },
  {
    id: 'thando-mokoena',
    name: 'Thando Mokoena',
    role: 'Bread and Pastry Instructor',
    accessRole: 'Admin',
    email: 'thando@flourandflame.example',
    color: '#0F766E',
    photoURL:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&h=256&fit=crop&crop=faces'
  },
  {
    id: 'maya-patel',
    name: 'Maya Patel',
    role: 'Culinary Instructor',
    accessRole: 'Staff',
    email: 'maya@flourandflame.example',
    color: '#B45309',
    photoURL:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=256&h=256&fit=crop&crop=faces'
  },
  {
    id: 'sofia-martins',
    name: 'Sofia Martins',
    role: 'Studio Host',
    accessRole: 'Staff',
    email: 'sofia@flourandflame.example',
    color: '#0369A1',
    photoURL:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=256&h=256&fit=crop&crop=faces'
  }
];

export const DEMO_CLIENTS = [
  {
    id: 'client-001',
    name: 'Aisha Naidoo',
    email: 'aisha.naidoo@example.com',
    phone: '+27 72 555 1001',
    country: 'South Africa',
    birthday: '1994-03-18'
  },
  {
    id: 'client-002',
    name: 'Daniel Botha',
    email: 'daniel.botha@example.com',
    phone: '+27 72 555 1002',
    country: 'South Africa',
    birthday: '1988-11-02'
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
    country: 'South Africa',
    birthday: '1999-07-09'
  },
  {
    id: 'client-005',
    name: 'Zara Hassan',
    email: 'zara.hassan@example.com',
    phone: '+971 4 555 1009',
    country: 'United Arab Emirates'
  }
];

export const DEMO_THREADS_SCHEMA = 4;
export const DEMO_ORDERS_SCHEMA = 3;
/** Bump when demo finance ledger sample bookings/orders change. */
export const DEMO_FINANCE_SCHEMA = 2;

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
        body: 'Absolutely. We will set the session around stacking and buttercream.',
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
    credentialSummary: {
      publicKeyLast4: '4242',
      secretKeyConfigured: true,
      webhookConfigured: true,
      demoConfigured: true
    }
  },
  {
    gatewayType: 'paypal',
    enabled: true,
    mode: 'test',
    configured: true,
    providerName: 'PayPal',
    credentialSummary: {
      publicKeyLast4: 'PP01',
      secretKeyConfigured: true,
      demoConfigured: true
    }
  },
  {
    gatewayType: 'paystack',
    enabled: true,
    mode: 'test',
    configured: true,
    providerName: 'Paystack',
    credentialSummary: {
      publicKeyLast4: '9911',
      secretKeyConfigured: true,
      webhookConfigured: true,
      demoConfigured: true
    }
  },
  {
    gatewayType: 'manual_eft',
    enabled: true,
    mode: 'live',
    configured: true,
    providerName: 'Manual EFT',
    credentialSummary: {
      accountHolder: 'Flame & Flour Studio',
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
    sku: 'BREAD-BOX',
    weight: 1.2,
    weightUnit: 'kg',
    length: 35,
    width: 25,
    height: 15,
    dimensionUnit: 'cm',
    description:
      'A mixed box of the day’s loaves, with sourdough, seeded bread, and a soft milk loaf.\n\nBaked the morning of collection so the crust stays lively and the crumb stays open. Best enjoyed within two days, or freeze slices for later.',
    imageUrls: [
      '/example/flour-and-flame/products/artisan-bread-box.png',
      '/example/flour-and-flame/venue/bread-ovens.webp'
    ]
  },
  {
    id: 'fresh-pasta-starter-set',
    name: 'Fresh Pasta Starter Set',
    category: 'Kits',
    price: 480,
    compareAtPrice: 540,
    stockAvailable: 8,
    productType: 'Kit',
    vendor: 'Flame & Flour',
    tags: ['pasta', 'weekend'],
    collections: ['Home kitchen'],
    sku: 'PASTA-KIT',
    weight: 950,
    weightUnit: 'g',
    length: 28,
    width: 18,
    height: 8,
    dimensionUnit: 'cm',
    description:
      'Flour blend, semolina, recipe cards, and a wooden paddle for home pasta nights.\n\nEverything you need for a first from-scratch batch, scaled for two generous plates.',
    imageUrls: [
      '/example/flour-and-flame/products/fresh-pasta-starter-set.png',
      '/example/flour-and-flame/venue/pastry-island.webp'
    ]
  },
  {
    id: 'studio-apron',
    name: 'Studio Apron Set',
    category: 'Merch',
    price: 420,
    compareAtPrice: 480,
    productType: 'Apparel',
    vendor: 'Flame & Flour',
    tags: ['apron', 'gift'],
    collections: ['Wear in the kitchen'],
    description:
      'Heavyweight cotton apron with cross-back straps and a deep tool pocket. The same cut we wear on bake days.\n\nPick your size and colour; each piece is finished in the studio.',
    imageUrls: [
      '/example/flour-and-flame/products/studio-apron.png',
      '/example/flour-and-flame/venue/teaching-kitchen.webp'
    ],
    options: [
      { id: 'opt-size', name: 'Size', values: ['S/M', 'L/XL'] },
      { id: 'opt-color', name: 'Color', values: ['Natural', 'Ink'] }
    ],
    variants: [
      {
        id: 'apron-sm-natural',
        optionValues: { Size: 'S/M', Color: 'Natural' },
        price: 420,
        compareAtPrice: 480,
        sku: 'APR-SM-NAT',
        stockAvailable: 6,
        weight: 380,
        weightUnit: 'g',
        length: 28,
        width: 22,
        height: 4,
        dimensionUnit: 'cm',
        available: true
      },
      {
        id: 'apron-sm-ink',
        optionValues: { Size: 'S/M', Color: 'Ink' },
        price: 420,
        compareAtPrice: 480,
        sku: 'APR-SM-INK',
        stockAvailable: 4,
        weight: 380,
        weightUnit: 'g',
        length: 28,
        width: 22,
        height: 4,
        dimensionUnit: 'cm',
        available: true
      },
      {
        id: 'apron-lx-natural',
        optionValues: { Size: 'L/XL', Color: 'Natural' },
        price: 440,
        compareAtPrice: 500,
        sku: 'APR-LX-NAT',
        stockAvailable: 5,
        weight: 420,
        weightUnit: 'g',
        length: 30,
        width: 24,
        height: 4,
        dimensionUnit: 'cm',
        available: true
      },
      {
        id: 'apron-lx-ink',
        optionValues: { Size: 'L/XL', Color: 'Ink' },
        price: 440,
        compareAtPrice: 500,
        sku: 'APR-LX-INK',
        stockAvailable: 3,
        weight: 420,
        weightUnit: 'g',
        length: 30,
        width: 24,
        height: 4,
        dimensionUnit: 'cm',
        available: true
      }
    ]
  },
  {
    id: 'kitchen-notes',
    name: 'Kitchen Notes',
    category: 'Books',
    price: 260,
    stockAvailable: 20,
    sku: 'BOOK-NOTES',
    weight: 320,
    weightUnit: 'g',
    length: 21,
    width: 14.8,
    height: 1.5,
    dimensionUnit: 'cm',
    productType: 'Book',
    vendor: 'Flame & Flour',
    tags: ['recipes'],
    collections: ['Studio shelf'],
    description:
      'Studio recipes, fermentation notes, and plating ideas from the Flame & Flour team.\n\nA compact studio companion for weeknight bakes and weekend projects.',
    imageUrls: [
      '/example/flour-and-flame/products/kitchen-notes.png',
      '/example/flour-and-flame/venue/studio-notes.png'
    ]
  },
  {
    id: 'chef-knife-set',
    name: 'Chef’s Knife Set',
    category: 'Tools',
    price: 890,
    compareAtPrice: 980,
    stockAvailable: 6,
    sku: 'KNIFE-SET',
    weight: 1.1,
    weightUnit: 'kg',
    length: 40,
    width: 12,
    height: 5,
    dimensionUnit: 'cm',
    productType: 'Tool',
    vendor: 'Flame & Flour',
    tags: ['knives', 'essentials'],
    collections: ['Home kitchen'],
    description:
      'A working trio with a chef’s knife, bread knife, and paring knife in a simple canvas roll.\n\nThe same everyday blades we reach for on class days. Balanced, sharp, and ready for home kitchens.',
    imageUrls: [
      '/example/flour-and-flame/products/chef-knife-set.png',
      '/example/flour-and-flame/venue/pastry-island.webp'
    ]
  },
  {
    id: 'ceramic-plate-set',
    name: 'Ceramic Plate Set',
    category: 'Tableware',
    price: 560,
    stockAvailable: 10,
    sku: 'PLATE-SET',
    weight: 2.4,
    weightUnit: 'kg',
    length: 28,
    width: 28,
    height: 8,
    dimensionUnit: 'cm',
    productType: 'Tableware',
    vendor: 'Flame & Flour',
    tags: ['plates', 'gift'],
    collections: ['Studio shelf'],
    description:
      'A set of four handmade ceramic dinner plates with a soft matte glaze.\n\nBuilt for tasting plates and weeknight meals. Sturdy enough for the dishwasher, quiet enough for the table.',
    imageUrls: [
      '/example/flour-and-flame/products/ceramic-plate-set.png',
      '/example/flour-and-flame/venue/tasting-room.webp'
    ]
  },
  {
    id: 'mixing-bowl-set',
    name: 'Mixing Bowl Set',
    category: 'Tools',
    price: 340,
    stockAvailable: 14,
    sku: 'BOWL-SET',
    weight: 1.6,
    weightUnit: 'kg',
    length: 30,
    width: 30,
    height: 16,
    dimensionUnit: 'cm',
    productType: 'Tool',
    vendor: 'Flame & Flour',
    tags: ['bowls', 'prep'],
    collections: ['Home kitchen'],
    description:
      'Three nested stainless mixing bowls for dough, batter, and mise en place.\n\nStable bases, deep sides, and the sizes we actually use when teaching.',
    imageUrls: [
      '/example/flour-and-flame/products/mixing-bowl-set.png',
      '/example/flour-and-flame/venue/teaching-kitchen.webp'
    ]
  },
  {
    id: 'wooden-rolling-pin',
    name: 'Wooden Rolling Pin',
    category: 'Tools',
    price: 185,
    stockAvailable: 18,
    sku: 'ROLL-PIN',
    weight: 480,
    weightUnit: 'g',
    length: 45,
    width: 6,
    height: 6,
    dimensionUnit: 'cm',
    productType: 'Tool',
    vendor: 'Flame & Flour',
    tags: ['pastry', 'wood'],
    collections: ['Home kitchen'],
    description:
      'A long French-style wooden rolling pin for pastry and pasta sheets.\n\nSmooth, balanced, and ready for flour. The pin we keep on every pastry island.',
    imageUrls: [
      '/example/flour-and-flame/products/wooden-rolling-pin.png',
      '/example/flour-and-flame/venue/pastry-island.webp'
    ]
  },
  {
    id: 'weekend-bake-kit',
    name: 'Weekend Bake Kit',
    category: 'Kits',
    price: 390,
    compareAtPrice: 450,
    stockAvailable: 9,
    sku: 'WEEKEND-KIT',
    weight: 1.1,
    weightUnit: 'kg',
    length: 30,
    width: 22,
    height: 10,
    dimensionUnit: 'cm',
    productType: 'Kit',
    vendor: 'Flame & Flour',
    tags: ['bread', 'weekend'],
    collections: ['Home kitchen'],
    description:
      'Flour blend, yeast, parchment, and a clear weekend schedule for one country loaf.\n\nDesigned for first-time bakers who want a calm Saturday bake without guesswork.',
    imageUrls: [
      '/example/flour-and-flame/products/weekend-bake-kit.png',
      '/example/flour-and-flame/venue/bread-ovens.webp'
    ]
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
    paidAt: Date.now() - 1000 * 60 * 60 * 5,
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
    paidAt: Date.now() - 1000 * 60 * 60 * 18,
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
    paidAt: Date.now() - 1000 * 60 * 60 * 26,
    status: 'fulfilled',
    source: 'public_shop',
    timestamp: Date.now() - 1000 * 60 * 60 * 26
  },
  {
    id: 'ord-5',
    requestType: 'product_order',
    orderType: 'product',
    clientName: 'Sam Nkosi',
    clientEmail: 'sam.nkosi@example.com',
    items: [
      {
        productId: 'artisan-bread-box',
        name: 'Artisan Bread Box',
        quantity: 1,
        unitPriceCents: 32000,
        lineTotalCents: 32000
      }
    ],
    amountInCents: 32000,
    currency: 'R',
    paymentMethod: 'paystack',
    paymentStatus: 'paid',
    paidAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
    status: 'fulfilled',
    source: 'public_shop',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 12
  },
  {
    id: 'ord-6',
    requestType: 'product_order',
    orderType: 'product',
    clientName: 'Priya Naidoo',
    clientEmail: 'priya.naidoo@example.com',
    items: [
      {
        productId: 'fresh-pasta-starter-set',
        name: 'Fresh Pasta Starter Set',
        quantity: 2,
        unitPriceCents: 48000,
        lineTotalCents: 96000
      }
    ],
    amountInCents: 96000,
    currency: 'R',
    paymentMethod: 'stripe',
    paymentStatus: 'paid',
    paidAt: Date.now() - 1000 * 60 * 60 * 24 * 28,
    status: 'fulfilled',
    source: 'public_shop',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 28
  },
  {
    id: 'ord-7',
    requestType: 'product_order',
    orderType: 'product',
    clientName: 'Chris Meyer',
    clientEmail: 'chris.meyer@example.com',
    items: [
      {
        productId: 'kitchen-notes',
        name: 'Kitchen Notes',
        quantity: 3,
        unitPriceCents: 26000,
        lineTotalCents: 78000
      }
    ],
    amountInCents: 78000,
    currency: 'R',
    paymentMethod: 'manual_eft',
    paymentStatus: 'unpaid',
    status: 'pending',
    source: 'public_shop',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 3
  }
];

const sampleBookings = [
  {
    id: 'bk-1',
    serviceId: 'baking',
    serviceName: 'Baking · 1 Month',
    variantId: 'baking-1-month',
    variantName: '1 Month',
    scheduleType: 'appointment',
    clientName: 'Aisha Naidoo',
    clientEmail: 'aisha.naidoo@example.com',
    clientPhone: '+27 72 555 1001',
    date: toDateKey(today),
    dateKey: toDateKey(today),
    time: '09:00',
    durationMinutes: 210,
    status: 'confirmed',
    paymentStatus: 'paid',
    paymentMethod: 'stripe',
    amountInCents: 295000,
    currency: 'R',
    paidAt: Date.now() - 1000 * 60 * 60 * 6,
    timestamp: Date.now() - 1000 * 60 * 60 * 48,
    staffId: 'thando-mokoena',
    staffName: 'Thando Mokoena',
    source: 'public'
  },
  {
    id: 'bk-2',
    serviceId: 'baking',
    serviceName: 'Baking · 6 Months',
    variantId: 'baking-6-month',
    variantName: '6 Months',
    scheduleType: 'appointment',
    clientName: 'Daniel Botha',
    clientEmail: 'daniel.botha@example.com',
    clientPhone: '+27 72 555 1002',
    date: toDateKey(today),
    dateKey: toDateKey(today),
    time: '14:00',
    durationMinutes: 210,
    status: 'pending',
    paymentStatus: 'unpaid',
    paymentMethod: 'manual_eft',
    amountInCents: 980000,
    currency: 'R',
    timestamp: Date.now() - 1000 * 60 * 60 * 8,
    staffId: 'sofia-martins',
    staffName: 'Sofia Martins',
    source: 'public'
  },
  {
    id: 'bk-3',
    serviceId: 'cooking',
    serviceName: 'Cooking · 1 Month',
    variantId: 'cooking-1-month',
    variantName: '1 Month',
    scheduleType: 'appointment',
    clientName: 'Lerato Dlamini',
    clientEmail: 'lerato.dlamini@example.com',
    clientPhone: '+27 72 555 1003',
    date: toDateKey(addDays(today, 1)),
    dateKey: toDateKey(addDays(today, 1)),
    time: '17:30',
    durationMinutes: 180,
    status: 'pending',
    paymentStatus: 'manual_pending',
    paymentMethod: 'manual_eft',
    amountInCents: 280000,
    currency: 'R',
    timestamp: Date.now() - 1000 * 60 * 60 * 20,
    staffId: 'jordan-lee',
    staffName: 'Jordan Lee',
    source: 'public'
  },
  {
    id: 'bk-4',
    serviceId: 'baking',
    serviceName: 'Baking · 1 Year',
    variantId: 'baking-1-year',
    variantName: '1 Year',
    scheduleType: 'appointment',
    clientName: 'Nandi Maseko',
    clientEmail: 'nandi.maseko@example.com',
    date: toDateKey(addDays(today, 2)),
    dateKey: toDateKey(addDays(today, 2)),
    time: '11:00',
    durationMinutes: 210,
    status: 'waitlist',
    paymentStatus: 'unpaid',
    amountInCents: 1680000,
    currency: 'R',
    timestamp: Date.now() - 1000 * 60 * 60 * 30,
    staffId: 'maya-patel',
    staffName: 'Maya Patel',
    source: 'public'
  },
  {
    id: 'bk-5',
    serviceId: 'cooking',
    serviceName: 'Cooking · 6 Months',
    variantId: 'cooking-6-month',
    variantName: '6 Months',
    scheduleType: 'appointment',
    clientName: 'Owen du Plessis',
    clientEmail: 'owen.duplessis@example.com',
    date: toDateKey(addDays(today, -7)),
    dateKey: toDateKey(addDays(today, -7)),
    time: '10:00',
    durationMinutes: 180,
    status: 'confirmed',
    paymentStatus: 'paid',
    paymentMethod: 'paystack',
    amountInCents: 890000,
    currency: 'R',
    paidAt: Date.now() - 1000 * 60 * 60 * 24 * 9,
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 10,
    staffId: 'jordan-lee',
    staffName: 'Jordan Lee',
    source: 'public'
  },
  {
    id: 'bk-6',
    serviceId: 'cooking',
    serviceName: 'Cooking · 1 Year',
    variantId: 'cooking-1-year',
    variantName: '1 Year',
    scheduleType: 'appointment',
    clientName: 'Fatima Abrahams',
    clientEmail: 'fatima.abrahams@example.com',
    date: toDateKey(addDays(today, -21)),
    dateKey: toDateKey(addDays(today, -21)),
    time: '09:00',
    durationMinutes: 180,
    status: 'confirmed',
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    amountInCents: 1550000,
    currency: 'R',
    paidAt: Date.now() - 1000 * 60 * 60 * 24 * 22,
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 23,
    staffId: 'thando-mokoena',
    staffName: 'Thando Mokoena',
    source: 'public'
  }
];

export function createDemoWorkspace() {
  return {
    slug: 'flameandflour',
    brandName: 'Flame & Flour',
    tagline: 'Baking studio in Cape Town',
    welcomeMessage: 'Reserve a class or take home something fresh.',
    email: 'hello@flourandflame.example',
    phone: '+27 21 555 0100',
    onboardingComplete: true,
    isDemo: true,
    currency: 'R',
    timezone: 'Africa/Johannesburg',
    planId: 'business',
    billingInterval: 'month',
    planStatus: 'active',
    trialEndsAt: null,
    policies: {
      cancellation: 'Cancel or reschedule at least 24 hours before your session.',
      terms: 'By booking or ordering you agree to studio house rules and payment terms.',
      privacy: 'We use your contact details only to confirm bookings, orders, and support.'
    },
    features: {
      waitlist: true,
      faqEnabled: true,
      collectClientName: true,
      collectClientPhone: true,
      collectClientEmail: true,
      collectClientNotes: true
    },
    websiteSchema: DEMO_WEBSITE_SCHEMA,
    socialSchema: DEMO_SOCIAL_SCHEMA,
    servicesSchema: DEMO_SERVICES_SCHEMA,
    threadsSchema: DEMO_THREADS_SCHEMA,
    ordersSchema: DEMO_ORDERS_SCHEMA,
    financeSchema: DEMO_FINANCE_SCHEMA,
    availabilitySchema: DEMO_AVAILABILITY_SCHEMA,
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
        gallery: true,
        reviews: true,
        map: true,
        faq: true,
        offerIntro: true,
        reasons: false,
        venue: true,
        offer: false,
        bookStrip: false
      },
      sectionOrder: ['offerIntro', 'about', 'gallery', 'reviews', 'faq', 'map'],
      headline: 'Cook Bold. Bake Beautifully.',
      subcopy:
        'Hands-on classes in a working Cape Town studio. Leave with skill, confidence, and something delicious.',
      ctaLabel: 'Book a class',
      buyCtaLabel: 'Buy',
      homeHeadline: 'Flame & Flour',
      homeSubtext:
        'Hands-on classes in a working Cape Town studio. Leave with skill, confidence, and something delicious.',
      profileCategory: 'Cooking Studio',
      profileLocation: 'Cape Town',
      heroImageUrl: '/example/flour-and-flame/hero.webp',
      logoUrl: '/example/flour-and-flame/logo-mark.jpg',
      socialBannerUrl: '/example/flour-and-flame/banner.png',
      bookHeadline: 'Book a package',
      bookSubtext: 'Choose a cooking or baking package, pick a time, and send your request.',
      buyHeadline: 'Take the kitchen home',
      buySubtext: 'Bread boxes, pasta kits, and studio notes ready to order.',
      socialHeadline: 'From the studio',
      socialSubtext: 'Posts, clips, and notes from Flame & Flour.',
      aboutTitle: 'About us',
      aboutEyebrow: 'About',
      aboutBody:
        'Flame & Flour is a Cape Town studio for hands-on classes, private lessons, and kitchen goods. We cook with you, then send you home with skills and something delicious.',
      aboutImageUrl: '/example/flour-and-flame/about/ff-about-team.jpg',
      visionTitle: 'Our vision',
      visionBody:
        'A city where more people cook with confidence, starting in a warm Woodstock kitchen, then carrying that craft into their own homes.',
      visionImageUrl: '/example/flour-and-flame/about/ff-about-vision.jpg',
      missionTitle: 'Our mission',
      missionBody:
        'Teach real kitchen skills in small groups, share honest recipes, and stock the tools that make practice feel possible after class.',
      missionImageUrl: '/example/flour-and-flame/about/ff-about-mission.jpg',
      aboutPages: [
        {
          id: 'about',
          title: 'About us',
          body: 'Flame & Flour is a Cape Town studio for hands-on classes, private lessons, and kitchen goods. We cook with you, then send you home with skills and something delicious.',
          imageUrl: '/example/flour-and-flame/about/ff-about-team.jpg',
          icon: 'info'
        },
        {
          id: 'mission',
          title: 'Our mission',
          body: 'Teach real kitchen skills in small groups, share honest recipes, and stock the tools that make practice feel possible after class.',
          imageUrl: '/example/flour-and-flame/about/ff-about-mission.jpg',
          icon: 'target'
        },
        {
          id: 'vision',
          title: 'Our vision',
          body: 'A city where more people cook with confidence, starting in a warm Woodstock kitchen, then carrying that craft into their own homes.',
          imageUrl: '/example/flour-and-flame/about/ff-about-vision.jpg',
          icon: 'eye'
        }
      ],
      reasonsTitle: 'What we offer',
      reasonsEyebrow: 'The craft',
      reasonsBody:
        'Small-group learning, professional tools, and thoughtful take-home goods, all built to keep the craft going.',
      reasonsMarkerStyle: 'icon',
      reasons: [
        {
          id: 'r1',
          icon: 'people',
          title: 'Small groups',
          body: 'Enough attention to learn, enough energy to enjoy the room.'
        },
        {
          id: 'r2',
          icon: 'craft',
          title: 'Real kitchen gear',
          body: 'Work on pro benches with the tools we actually use every day.'
        },
        {
          id: 'r3',
          icon: 'package',
          title: 'Take-home sets',
          body: 'Bread boxes, pasta kits, and notes so the craft continues at home.'
        }
      ],
      venueTitle: 'Photos',
      venueEyebrow: 'Photos',
      venueBody: 'A look inside the Woodstock studio, from the ovens and benches to the rooms where classes land.',
      venueIcon: 'camera',
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
      mapTitle: 'Visit',
      mapEyebrow: 'Find us',
      mapBody: 'Find us in Woodstock. Street parking nearby, and the studio door is marked with the copper flame.',
      mapIcon: 'location',
      mapEmbedUrl:
        'https://maps.google.com/maps?q=Woodstock%2C%20Cape%20Town&t=&z=14&ie=UTF8&iwloc=&output=embed',
      mapLinkUrl: 'https://maps.google.com/?q=Woodstock,+Cape+Town',
      reviewsTitle: 'Reviews',
      reviewsEyebrow: 'Reviews',
      reviewsIcon: 'star',
      reviewsBody: 'Honest notes from class and private sessions after a morning in the studio.',
      reviews: [
        {
          id: 'rev1',
          quote: 'Best Saturday I’ve spent in a kitchen. Left with a loaf and real confidence.',
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
      offerTitle: 'View what we offer',
      offerBookCta: 'Bookings',
      offerBuyCta: 'Products',
      bookStripTitle: 'Reserve a class',
      bookStripBody: 'See open times on the Book page and send a request in minutes.',
      bookStripCta: 'See availability',
      bookFaqTitle: 'FAQ',
      bookFaqIcon: 'question',
      bookFaqBody: 'Quick answers before you book, covering hours, what to bring, and how requests work.',
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
          a: 'Yes. Pick a cooking or baking package, or message us from Support.'
        }
      ]
    },
    socialPosts: [
      {
        id: 'post-5',
        type: 'image',
        title: 'Scored loaf',
        mediaUrl: '/example/flour-and-flame/social/ff-social-scored-loaf.png',
        caption: 'Sharp score, open crumb. Friday’s country loaf.',
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 8,
        order: 0
      },
      {
        id: 'post-6',
        type: 'image',
        title: 'Laminated dough',
        mediaUrl: '/example/flour-and-flame/social/ff-social-laminated-dough.png',
        caption: 'Butter locked in. Croissant dough resting.',
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 30,
        order: 1
      },
      {
        id: 'post-7',
        type: 'image',
        title: 'Fresh pasta',
        mediaUrl: '/example/flour-and-flame/social/ff-social-fresh-pasta.png',
        caption: 'Tagliatelle nests for this week’s pasta class.',
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 40,
        order: 2
      },
      {
        id: 'post-8',
        type: 'image',
        title: 'Plated dessert',
        mediaUrl: '/example/flour-and-flame/social/ff-social-plated-dessert.png',
        caption: 'End-of-class tasting plate.',
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 55,
        order: 3
      },
      {
        id: 'post-9',
        type: 'image',
        title: 'Croissants',
        mediaUrl: '/example/flour-and-flame/social/ff-social-croissants.png',
        caption: 'Straight from the oven. Still singing.',
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 70,
        order: 4
      },
      {
        id: 'post-10',
        type: 'image',
        title: 'Bench is set',
        mediaUrl: '/example/flour-and-flame/social/ff-social-class-hands.png',
        caption: 'Aprons out. Class starts in ten.',
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 82,
        order: 5
      },
      {
        id: 'post-11',
        type: 'image',
        title: 'Sunday lasagna',
        mediaUrl: '/example/flour-and-flame/social/ff-social-lasagna.png',
        caption: 'Layered, bubbled, and ready for the table.',
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 95,
        order: 6
      },
      {
        id: 'post-12',
        type: 'image',
        title: 'Chocolate tart',
        mediaUrl: '/example/flour-and-flame/social/ff-social-chocolate-tart.png',
        caption: 'Ganache set. Ready for the tasting room.',
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 110,
        order: 7
      },
      {
        id: 'post-13',
        type: 'image',
        title: 'Beef stir fry',
        mediaUrl: '/example/flour-and-flame/social/ff-social-beef-stir-fry.png',
        caption: 'Hot wok, glossy beef. Lunch special tonight.',
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 125,
        order: 8
      },
      {
        id: 'post-14',
        type: 'image',
        title: 'Fried chicken',
        mediaUrl: '/example/flour-and-flame/social/ff-social-fried-chicken.png',
        caption: 'Crispy, golden, and gone by dinner.',
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 140,
        order: 9
      },
      {
        id: 'post-15',
        type: 'image',
        title: 'Milkshake hour',
        mediaUrl: '/example/flour-and-flame/social/ff-social-milkshakes.png',
        caption: 'Thick shakes spinning up at the counter.',
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 155,
        order: 10
      },
      {
        id: 'post-16',
        type: 'image',
        title: 'Vanilla cake',
        mediaUrl: '/example/flour-and-flame/social/ff-social-vanilla-cake.jpg',
        caption: 'Soft crumb, vanilla buttercream. Tasting tomorrow.',
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 170,
        order: 11
      },
      {
        id: 'vid-1',
        type: 'video',
        mediaUrl: DEMO_SAMPLE_VIDEO_URL,
        posterUrl: '/example/flour-and-flame/films/ff-film-steak-sear.png',
        title: 'Steak sear',
        caption: 'Cast iron, hard sear, quiet studio kitchen.',
        duration: '0:18',
        viewCount: 12840,
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 12,
        order: 0
      },
      {
        id: 'vid-2',
        type: 'video',
        mediaUrl: DEMO_SAMPLE_VIDEO_URL,
        posterUrl: '/example/flour-and-flame/films/ff-film-pasta-boil.png',
        title: 'Pasta in the pot',
        caption: 'Fresh noodles hitting simmering water.',
        duration: '0:16',
        viewCount: 9320,
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 36,
        order: 1
      },
      {
        id: 'vid-3',
        type: 'video',
        mediaUrl: DEMO_SAMPLE_VIDEO_URL,
        posterUrl: '/example/flour-and-flame/films/ff-film-eggs-scramble.png',
        title: 'Soft scramble',
        caption: 'Slow eggs for a class breakfast demo.',
        duration: '0:14',
        viewCount: 21450,
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 72,
        order: 2
      },
      {
        id: 'vid-4',
        type: 'video',
        mediaUrl: DEMO_SAMPLE_VIDEO_URL,
        posterUrl: '/example/flour-and-flame/films/ff-film-citrus-salad.png',
        title: 'Citrus salad',
        caption: 'Bright herbs and citrus for a light tasting.',
        duration: '0:12',
        viewCount: 7640,
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 48,
        order: 3
      },
      {
        id: 'vid-5',
        type: 'video',
        mediaUrl: DEMO_SAMPLE_VIDEO_URL,
        posterUrl: '/example/flour-and-flame/films/ff-film-roast-veg.png',
        title: 'Roast veg tray',
        caption: 'Sheet-pan vegetables, blistered and ready.',
        duration: '0:15',
        viewCount: 11890,
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 60,
        order: 4
      },
      {
        id: 'vid-6',
        type: 'video',
        mediaUrl: DEMO_SAMPLE_VIDEO_URL,
        posterUrl: '/example/flour-and-flame/films/ff-film-espresso-pour.png',
        title: 'Studio espresso',
        caption: 'A quiet pour before the evening class.',
        duration: '0:11',
        viewCount: 15220,
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 84,
        order: 5
      },
      {
        id: 'vid-7',
        type: 'video',
        mediaUrl: DEMO_SAMPLE_VIDEO_URL,
        posterUrl: '/example/flour-and-flame/films/ff-film-chocolate-mousse.png',
        title: 'Chocolate mousse',
        caption: 'Tasting cups set for dessert night.',
        duration: '0:13',
        viewCount: 18950,
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 96,
        order: 6
      },
      {
        id: 'vert-1',
        type: 'vertical',
        mediaUrl: DEMO_SAMPLE_VIDEO_URL,
        posterUrl: '/example/flour-and-flame/verticals/ff-vertical-score-loaf.png',
        title: 'Cookie tray',
        caption: 'Chocolate chip, straight from the oven.',
        duration: '0:18',
        viewCount: 18420,
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 5,
        order: 0
      },
      {
        id: 'vert-2',
        type: 'vertical',
        mediaUrl: DEMO_SAMPLE_VIDEO_URL,
        posterUrl: '/example/flour-and-flame/verticals/ff-vertical-laminate.png',
        title: 'Laminate fold',
        caption: 'Butter locked. Croissant dough resting.',
        duration: '0:22',
        viewCount: 15680,
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 14,
        order: 1
      },
      {
        id: 'vert-3',
        type: 'vertical',
        mediaUrl: DEMO_SAMPLE_VIDEO_URL,
        posterUrl: '/example/flour-and-flame/verticals/ff-vertical-pasta-roll.png',
        title: 'Pasta through the machine',
        caption: 'Sheet by sheet for Saturday’s pasta class.',
        duration: '0:16',
        viewCount: 22140,
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 22,
        order: 2
      },
      {
        id: 'vert-4',
        type: 'vertical',
        mediaUrl: DEMO_SAMPLE_VIDEO_URL,
        posterUrl: '/example/flour-and-flame/verticals/ff-vertical-oven-pull.png',
        title: 'Croissant pull',
        caption: 'Straight from the deck. Still singing.',
        duration: '0:14',
        viewCount: 29810,
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 33,
        order: 3
      },
      {
        id: 'vert-5',
        type: 'vertical',
        mediaUrl: DEMO_SAMPLE_VIDEO_URL,
        posterUrl: '/example/flour-and-flame/verticals/ff-vertical-pipe-ganache.png',
        title: 'Steak in the pan',
        caption: 'Cast iron, butter, and a hard sear.',
        duration: '0:19',
        viewCount: 13250,
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 46,
        order: 4
      },
      {
        id: 'vert-6',
        type: 'vertical',
        mediaUrl: DEMO_SAMPLE_VIDEO_URL,
        posterUrl: '/example/flour-and-flame/verticals/ff-vertical-class-bench.png',
        title: 'Bench is set',
        caption: 'Aprons out. Class starts in ten.',
        duration: '0:12',
        viewCount: 9870,
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 58,
        order: 5
      },
      {
        id: 'vert-7',
        type: 'vertical',
        mediaUrl: DEMO_SAMPLE_VIDEO_URL,
        posterUrl: '/example/flour-and-flame/verticals/ff-vertical-tasting-plate.png',
        title: 'Tasting plate',
        caption: 'End-of-class dessert, plated quiet.',
        duration: '0:15',
        viewCount: 17440,
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 67,
        order: 6
      },
      {
        id: 'vert-8',
        type: 'vertical',
        mediaUrl: DEMO_SAMPLE_VIDEO_URL,
        posterUrl: '/example/flour-and-flame/verticals/ff-vertical-open-crumb.png',
        title: 'Open crumb',
        caption: 'The crumb we chase every bake.',
        duration: '0:11',
        viewCount: 25190,
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 79,
        order: 7
      },
      {
        id: 'text-1',
        type: 'text',
        title: 'Private lessons open for March',
        caption:
          'One-to-one baking sessions are booking now. Tell us whether you want laminated pastry, celebration cakes, or everyday bread, and we will build the class around you.',
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 6,
        order: 0
      },
      {
        id: 'text-2',
        type: 'text',
        title: 'This week’s pasta kits are ready',
        caption:
          'A fresh batch landed on Buy this morning. If you have been waiting for the fresh pasta starter set, this is the week to grab one before they go.',
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 20,
        order: 1
      },
      {
        id: 'text-3',
        type: 'text',
        title: 'Studio hours',
        caption:
          'We are open Tuesday through Saturday for classes and walk-in kitchen goods. Sunday is reserved for private bookings by request.',
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 48,
        order: 2
      },
      {
        id: 'text-4',
        type: 'text',
        title: 'A note from today’s class',
        caption:
          'Rest your dough longer than you think. Texture always tells the truth, and patience is the quiet ingredient that makes the bake.',
        published: true,
        createdAt: Date.now() - 1000 * 60 * 60 * 70,
        order: 3
      }
    ],
    availabilityRules: normalizeAvailabilityRules({
      businessOpenTime: '09:00',
      businessCloseTime: '17:00',
      scheduleMode: 'time_slots',
      openWeekdays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
      closedDates: [],
      maxAdvanceBookingDays: 90
    }),
    services: DEMO_SERVICES,
    serviceCategories: collectServiceCategories(DEMO_SERVICES, [
      'Cooking',
      'Baking'
    ]),
    staff: DEMO_STAFF,
    staffAvailability: createStaffAvailabilityForRoster(DEMO_STAFF, '09:00', '17:00', 8),
    bookings: sampleBookings,
    products: DEMO_PRODUCTS,
    productCategories: collectProductCategories(DEMO_PRODUCTS, [
      'Baked goods',
      'Kits',
      'Tools',
      'Tableware',
      'Merch',
      'Books'
    ]),
    orders: sampleOrders
  };
}

/**
 * Merge a cached demo workspace with the current Flame & Flour public Home content
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
    !stored.website.venueImages.length ||
    !Array.isArray(stored.products) ||
    stored.products.length !== 9 ||
    stored.products.some((product) =>
      ['bench-tools-set', 'linen-tea-towel', 'proofing-basket'].includes(product?.id)
    );

  const hasVideo = (stored.socialPosts || []).some((post) => post?.type === 'video');
  const hasText = (stored.socialPosts || []).some((post) => post?.type === 'text');
  const postsMissingTitles = (stored.socialPosts || []).some(
    (post) =>
      (post?.type === 'image' || post?.type === 'video' || post?.type === 'text') &&
      !String(post?.title || '').trim()
  );
  const imagePostCount = (stored.socialPosts || []).filter((post) => post?.type === 'image').length;
  const videoPostCount = (stored.socialPosts || []).filter((post) => post?.type === 'video').length;
  const verticalPostCount = (stored.socialPosts || []).filter(
    (post) => post?.type === 'vertical'
  ).length;
  const staleSocial =
    Number(stored.socialSchema || 0) < DEMO_SOCIAL_SCHEMA ||
    !Array.isArray(stored.socialPosts) ||
    stored.socialPosts.length < 6 ||
    imagePostCount < 12 ||
    videoPostCount < 7 ||
    verticalPostCount < 8 ||
    !hasVideo ||
    !hasText ||
    postsMissingTitles;

  const staleThreads =
    Number(stored.threadsSchema || 0) < DEMO_THREADS_SCHEMA ||
    !Array.isArray(stored.threads) ||
    stored.threads.length < 3 ||
    !stored.threads.some((thread) => thread?.presence);

  const staleOrders =
    Number(stored.ordersSchema || 0) < DEMO_ORDERS_SCHEMA ||
    !Array.isArray(stored.orders) ||
    stored.orders.length < 3;

  const staleFinance =
    Number(stored.financeSchema || 0) < DEMO_FINANCE_SCHEMA ||
    !Array.isArray(stored.bookings) ||
    stored.bookings.length < 5 ||
    !Array.isArray(stored.orders) ||
    stored.orders.length < 6;

  const spotServicesMissingSessions = (stored.services || []).some((service) => {
    if (String(service?.scheduleType || '') !== 'class_session') return false;
    return !(
      service?.sessionStartDate &&
      service?.sessionStartTime &&
      service?.sessionEndDate &&
      service?.sessionEndTime
    );
  });
  const staleServices =
    Number(stored.servicesSchema || 0) < DEMO_SERVICES_SCHEMA ||
    !Array.isArray(stored.services) ||
    stored.services.length < 6 ||
    spotServicesMissingSessions;

  const staleAvailability =
    Number(stored.availabilitySchema || 0) < DEMO_AVAILABILITY_SCHEMA ||
    !stored.staffAvailability ||
    typeof stored.staffAvailability !== 'object' ||
    !Object.keys(stored.staffAvailability).length ||
    !Array.isArray(stored.availabilityRules?.openWeekdays);

  const website = staleWebsite
    ? {
        ...fresh.website,
        ...(stored.website || {}),
        aboutTitle: fresh.website.aboutTitle,
        aboutEyebrow: fresh.website.aboutEyebrow,
        aboutBody: fresh.website.aboutBody,
        aboutImageUrl: fresh.website.aboutImageUrl,
        visionTitle: fresh.website.visionTitle,
        visionBody: fresh.website.visionBody,
        visionImageUrl: fresh.website.visionImageUrl,
        missionTitle: fresh.website.missionTitle,
        missionBody: fresh.website.missionBody,
        missionImageUrl: fresh.website.missionImageUrl,
        aboutPages: fresh.website.aboutPages,
        reasonsTitle: fresh.website.reasonsTitle,
        reasonsEyebrow: fresh.website.reasonsEyebrow,
        reasonsBody: fresh.website.reasonsBody,
        reasons: fresh.website.reasons,
        venueTitle: fresh.website.venueTitle,
        venueEyebrow: fresh.website.venueEyebrow,
        venueBody: fresh.website.venueBody,
        venueIcon: fresh.website.venueIcon,
        venueImages: fresh.website.venueImages,
        address: fresh.website.address,
        mapTitle: fresh.website.mapTitle,
        mapEyebrow: fresh.website.mapEyebrow,
        mapBody: fresh.website.mapBody,
        mapIcon: fresh.website.mapIcon,
        mapEmbedUrl: fresh.website.mapEmbedUrl,
        mapLinkUrl: fresh.website.mapLinkUrl,
        reviewsTitle: fresh.website.reviewsTitle,
        reviewsEyebrow: fresh.website.reviewsEyebrow,
        reviewsBody: fresh.website.reviewsBody,
        reviewsIcon: fresh.website.reviewsIcon,
        reviews: fresh.website.reviews,
        offerTitle: fresh.website.offerTitle,
        offerBookCta: fresh.website.offerBookCta,
        offerBuyCta: fresh.website.offerBuyCta,
        bookStripTitle: fresh.website.bookStripTitle,
        bookStripBody: fresh.website.bookStripBody,
        bookStripCta: fresh.website.bookStripCta,
        bookFaqTitle: fresh.website.bookFaqTitle,
        bookFaqBody: fresh.website.bookFaqBody,
        bookFaqIcon: fresh.website.bookFaqIcon,
        bookFaq: fresh.website.bookFaq,
        sections: {
          ...fresh.website.sections,
          about: true,
          offerIntro: true,
          reasons: false,
          offer: false,
          bookStrip: false
        },
        sectionOrder: fresh.website.sectionOrder,
        heroImageUrl: stored.website?.heroImageUrl || fresh.website.heroImageUrl,
        logoUrl: fresh.website.logoUrl,
        socialBannerUrl: fresh.website.socialBannerUrl,
        homeHeadline: fresh.website.homeHeadline,
        homeSubtext: fresh.website.homeSubtext,
        socialSubtext: fresh.website.socialSubtext,
        aboutBody: fresh.website.aboutBody,
        profileCategory: fresh.website.profileCategory,
        profileLocation: fresh.website.profileLocation,
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
    brandName: fresh.brandName,
    tagline: fresh.tagline,
    slug: staleWebsite ? fresh.slug : stored.slug || fresh.slug,
    websiteSchema: DEMO_WEBSITE_SCHEMA,
    socialSchema: DEMO_SOCIAL_SCHEMA,
    servicesSchema: DEMO_SERVICES_SCHEMA,
    threadsSchema: DEMO_THREADS_SCHEMA,
    ordersSchema: DEMO_ORDERS_SCHEMA,
    financeSchema: DEMO_FINANCE_SCHEMA,
    availabilitySchema: DEMO_AVAILABILITY_SCHEMA,
    website,
    staff: (Array.isArray(stored.staff) && stored.staff.length ? stored.staff : fresh.staff).map(
      (member) => {
        const demo = DEMO_STAFF.find((item) => item.id === member.id);
        if (!demo) return member;
        return {
          ...member,
          photoURL: member.photoURL || demo.photoURL,
          color: member.color || demo.color
        };
      }
    ),
    products: staleWebsite ? fresh.products : stored.products || fresh.products,
    services: staleWebsite || staleServices ? fresh.services : stored.services || fresh.services,
    availabilityRules: staleAvailability
      ? fresh.availabilityRules
      : normalizeAvailabilityRules(stored.availabilityRules || fresh.availabilityRules),
    staffAvailability: staleAvailability
      ? fresh.staffAvailability
      : normalizeStaffAvailabilityMap(
          stored.staffAvailability || {},
          stored.staff || fresh.staff,
          stored.availabilityRules?.businessOpenTime || '09:00',
          stored.availabilityRules?.businessCloseTime || '17:00'
        ),
    socialPosts: staleSocial ? fresh.socialPosts : stored.socialPosts,
    threads: staleThreads ? fresh.threads : stored.threads,
    orders: staleFinance || staleOrders ? fresh.orders : stored.orders,
    bookings: staleFinance ? fresh.bookings : stored.bookings || fresh.bookings
  };
}
