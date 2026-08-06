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
      shop: true,
      social: true
    },
    headline: 'Welcome in.',
    subcopy: 'Book a service or shop products from one place.',
    ctaLabel: 'Book now'
  },
  socialPosts: [],
  services: [],
  products: [],
  features: {
    waitlist: true,
    faq: true
  }
});

export const DEMO_WORKSPACE = {
  ...createDefaultSettings(),
  slug: 'flour-and-flame',
  brandName: 'Flour & Flame',
  tagline: 'Baking studio in Cape Town',
  welcomeMessage: 'Reserve a class or take home something fresh.',
  website: {
    pages: { home: true, book: true, shop: true, social: true },
    headline: 'Bake with us.',
    subcopy: 'Hands-on classes, private sessions, and kitchen goods.',
    ctaLabel: 'Book a class'
  }
};
