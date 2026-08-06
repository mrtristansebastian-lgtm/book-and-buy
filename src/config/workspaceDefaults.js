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

export { createDemoWorkspace as createDemoWorkspaceSettings } from '../data/demoWorkspace';
