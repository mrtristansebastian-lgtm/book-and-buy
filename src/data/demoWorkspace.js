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
  { id: 'jordan-lee', name: 'Jordan Lee', role: 'Owner and Head Chef', color: '#111827' },
  { id: 'thando-mokoena', name: 'Thando Mokoena', role: 'Bread and Pastry Instructor', color: '#0F766E' },
  { id: 'maya-patel', name: 'Maya Patel', role: 'Culinary Instructor', color: '#B45309' },
  { id: 'sofia-martins', name: 'Sofia Martins', role: 'Studio Host', color: '#0369A1' }
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
    nativeAccent: true,
    website: {
      pages: { home: true, book: true, shop: true, social: true },
      headline: 'Bake with us.',
      subcopy: 'Hands-on classes, private sessions, and kitchen goods.',
      ctaLabel: 'Book a class'
    },
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
