export const DEFAULT_HOME_SECTION_ORDER = [
  'about',
  'reasons',
  'venue',
  'map',
  'reviews',
  'bookStrip'
];

export const createDefaultHomeSections = () => ({
  about: true,
  reasons: true,
  venue: true,
  map: true,
  reviews: true,
  bookStrip: true
});

export const createDefaultHomeSectionOrder = () => [...DEFAULT_HOME_SECTION_ORDER];

export const createDefaultSettings = () => ({
  slug: 'your-business',
  brandName: 'Your Business',
  email: '',
  phone: '',
  welcomeMessage: 'Reserve your session.',
  tagline: 'Book services. Buy products.',
  primaryColor: '#050505',
  headingColor: '#000000',
  bodyColor: '#666666',
  backgroundColor: '#ffffff',
  fontFamily: 'figtree',
  nativeAccent: true,
  headingFontFamily: 'plus-jakarta',
  bodyFontFamily: 'figtree',
  buttonFontFamily: 'inter',
  brandNameFontFamily: 'plus-jakarta',
  interfaceStyleDirection: 'native-precision',
  website: {
    pages: {
      home: true,
      book: true,
      buy: true,
      social: true
    },
    sections: createDefaultHomeSections(),
    sectionOrder: createDefaultHomeSectionOrder(),
    headline: 'Welcome in.',
    subcopy: 'Book a service or buy products from one place.',
    ctaLabel: 'Book now',
    buyCtaLabel: 'Buy',
    homeHeadline: 'Welcome in.',
    homeSubtext: 'Book a service or buy products from one place.',
    heroImageUrl: '',
    logoUrl: '',
    bookHeadline: 'Book',
    bookSubtext: 'Choose a service and request a time.',
    buyHeadline: 'Buy',
    buySubtext: 'Order products from this business.',
    socialHeadline: 'Social',
    socialSubtext: 'Updates from the business.',
    aboutTitle: 'About us',
    aboutBody: 'Tell clients who you are and what makes your business special.',
    aboutImageUrl: '',
    reasonsTitle: 'Why choose us',
    reasons: [
      { id: 'r1', title: 'Expert team', body: 'Skilled people who care about the result.' },
      { id: 'r2', title: 'Easy booking', body: 'Reserve online in a few taps.' },
      { id: 'r3', title: 'Quality products', body: 'Take home what you love.' }
    ],
    venueTitle: 'Our space',
    venueImages: [],
    address: '',
    mapEmbedUrl: '',
    mapLinkUrl: '',
    reviewsTitle: 'What clients say',
    reviews: [],
    bookStripTitle: 'Ready to book?',
    bookStripBody: 'Pick a service and request a time that works for you.',
    bookStripCta: 'See availability',
    bookFaqTitle: 'What to expect',
    bookFaq: [
      { id: 'f1', q: 'How do requests work?', a: 'Send a request and we confirm by email.' },
      { id: 'f2', q: 'Can I reschedule?', a: 'Yes — message us from Support or reply to your confirmation.' }
    ],
    featuredProductId: ''
  },
  socialPosts: [],
  services: [],
  products: [],
  features: {
    waitlist: true,
    faq: true
  }
});

export { createDemoWorkspace as createDemoWorkspaceSettings } from '../data/demoWorkspace';
