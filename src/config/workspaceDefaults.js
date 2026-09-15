export const DEFAULT_HOME_SECTION_ORDER = [
  'offerIntro',
  'about',
  'gallery',
  'reviews',
  'faq',
  'map'
];

export const createDefaultHomeSections = () => ({
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
    headline: '',
    subcopy: 'Book a service or buy products from one place.',
    ctaLabel: 'Book',
    buyCtaLabel: 'Buy',
    homeHeadline: '',
    homeSubtext: 'Book a service or buy products from one place.',
    profileCategory: '',
    profileLocation: '',
    heroImageUrl: '',
    logoUrl: '',
    bookHeadline: 'Book',
    bookSubtext: 'Choose a service and request a time.',
    buyHeadline: 'Buy',
    buySubtext: 'Order products from this business.',
    socialHeadline: 'Social',
    socialSubtext: 'Updates from the business.',
    socialBannerUrl: '',
    aboutTitle: 'About us',
    aboutEyebrow: 'About',
    aboutBody: 'Tell clients who you are and what makes your business special.',
    aboutImageUrl: '',
    visionTitle: 'Our vision',
    visionBody: 'Share where you are headed and what you want to build.',
    visionImageUrl: '',
    missionTitle: 'Our mission',
    missionBody: 'Explain how you serve people every day.',
    missionImageUrl: '',
    aboutPages: [
      {
        id: 'about',
        title: 'About us',
        body: 'Tell clients who you are and what makes your business special.',
        imageUrl: ''
      },
      {
        id: 'mission',
        title: 'Our mission',
        body: 'Explain how you serve people every day.',
        imageUrl: ''
      },
      {
        id: 'vision',
        title: 'Our vision',
        body: 'Share where you are headed and what you want to build.',
        imageUrl: ''
      }
    ],
    styleTokens: {},
    reasonsTitle: 'What we offer',
    reasonsEyebrow: 'The craft',
    reasonsBody: 'A focused set of services shaped around what your clients need most.',
    reasonsMarkerStyle: 'icon',
    reasons: [
      {
        id: 'r1',
        icon: 'award',
        title: 'Expert team',
        body: 'Skilled people who care about the result.'
      },
      {
        id: 'r2',
        icon: 'calendar',
        title: 'Easy booking',
        body: 'Reserve online in a few taps.'
      },
      {
        id: 'r3',
        icon: 'package',
        title: 'Quality products',
        body: 'Take home what you love.'
      }
    ],
    venueTitle: 'Gallery',
    venueEyebrow: 'Gallery',
    venueBody: '',
    venueImages: [],
    mapTitle: 'Visit',
    mapEyebrow: 'Find us',
    mapBody: '',
    address: '',
    mapEmbedUrl: '',
    mapLinkUrl: '',
    googlePlaceId: '',
    googleReviewsEnabled: null,
    googleReviewsSyncedAt: '',
    reviewsTitle: 'Reviews',
    reviewsEyebrow: 'Reviews',
    reviewsBody: '',
    reviews: [],
    offerTitle: 'View what we offer',
    offerBookCta: 'Bookings',
    offerBuyCta: 'Products',
    bookStripTitle: 'Ready to book?',
    bookStripBody: 'Pick a service and request a time that works for you.',
    bookStripCta: 'See availability',
    bookFaqTitle: 'FAQ',
    bookFaqEyebrow: 'FAQ',
    bookFaqBody: '',
    bookFaq: [
      { id: 'f1', q: 'How do requests work?', a: 'Send a request and we confirm by email.' },
      { id: 'f2', q: 'Can I reschedule?', a: 'Yes. Message us from Support or reply to your confirmation.' }
    ],
    featuredProductId: ''
  },
  socialPosts: [],
  services: [],
  serviceCategories: [],
  products: [],
  productCategories: [],
  currency: 'R',
  timezone: 'Africa/Johannesburg',
  planId: 'starter',
  billingInterval: 'month',
  planStatus: 'trialing',
  trialEndsAt: null,
  policies: {
    cancellation: '',
    terms: '',
    privacy: ''
  },
  features: {
    waitlist: true,
    faqEnabled: true,
    collectClientName: true,
    collectClientPhone: true,
    collectClientEmail: true,
    collectClientNotes: true
  }
});

export { createDemoWorkspace as createDemoWorkspaceSettings } from '../data/demoWorkspace';
