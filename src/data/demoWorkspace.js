import { createBlankWorkspace } from './blankWorkspace';
import { DEMO_SCENARIO_SCHEMA, upgradeDemoScenario, removeRetiredDemoEquipment, upgradeDemoRetailCatalog, removeRetiredDemoEvents } from './demoScenario';
import { createShowcaseProducts } from './demoShowcaseProducts';
import { createShowcaseServices, createShowcaseStaff } from './demoShowcaseServices';
import { createShowcaseActivity } from './demoShowcaseActivity';

/** A local, educational catalogue of the supported seller configurations. */
export function createDemoWorkspace(now = Date.now()) {
  const products = createShowcaseProducts();
  const services = createShowcaseServices(now);
  const staff = createShowcaseStaff();
  const activity = createShowcaseActivity({ products, services, staff, now });
  const digitalIds = products.filter(product => product.exploreMainCategoryId === 'buy_digital').map(product => product.id);
  const base = createBlankWorkspace({
    isDemo: true,
    onboardingComplete: true,
    ownerId: 'demo-owner',
    brandName: 'Book & Buy Showcase',
    slug: 'example',
    tagline: 'Explore what you can sell and book on Book & Buy.',
    welcomeMessage: 'Try an example booking or order. Everything in this showcase stays on this device.',
    staff,
    availabilityRules: { businessOpenTime: '08:00', businessCloseTime: '21:00', openWeekdays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], scheduleMode: 'time_slots', maxAdvanceBookingDays: 90, holdMode: 'pending_and_confirmed' },
    paymentGateways: [{ gatewayType: 'manual_eft', providerName: 'Example EFT', mode: 'test' }, { gatewayType: 'cash', providerName: 'Cash', mode: 'test' }],
    website: {
      homeHeadline: 'Explore what you can sell and book on Book & Buy.',
      homeSubtext: `${products.length + services.length} distinct examples. Discover the right setup for what you offer, then try it yourself.`,
      subcopy: 'A guided tour of products, services and the tools behind them.',
      bookSubtext: 'Explore 23 Slots and 12 Spots. Each example explains its specs, timing and booking flow.',
      buySubtext: `Explore ${products.length} products across every supported category and electronics setup. Open an example to see its specs and try the editor.`,
      logoUrl: '/example/book-and-buy-showcase/showcase-mark.svg',
      profileCategory: 'Platform showcase',
      profileLocation: 'Example Central, Cape Town',
      venueMode: 'hybrid',
      address: 'Example Central, Cape Town, South Africa',
      countryCode: 'ZA', city: 'Cape Town', region: 'Western Cape',
      branches: [{ id: 'showcase-branch-north', name: 'Example North', address: 'Example North, Cape Town, South Africa', countryCode: 'ZA', city: 'Cape Town', region: 'Western Cape', enabled: true }],
      markets: [{ id: 'showcase-market-za', countryCode: 'ZA', enabled: true, catalogMode: 'all', productIds: [], variantKeys: [], serviceIds: [], shippingProfileIds: ['showcase-delivery', 'showcase-manual-digital'] }],
      servesCountries: ['ZA'],
      buyerCountryCode: 'ZA',
      shippingProfiles: [
        { id: 'showcase-delivery', name: 'Example physical delivery', customerFacingName: 'Standard delivery', enabled: true, productMode: 'all', productIds: [], variantKeys: [], rateCents: 9500 },
        { id: 'showcase-manual-digital', name: 'Example digital manual fulfilment', customerFacingName: 'Manual fulfilment', enabled: true, productMode: 'selected', productIds: digitalIds, variantKeys: [], rateCents: 0 }
      ],
      aboutTitle: 'Find the setup that fits your offering',
      aboutBody: 'This is Book & Buy’s interactive showcase. Its products and services demonstrate what you can offer and how the tools work.\n\nExplore the Buy and Book pages, open an example, and look for “What this shows”. Try editing its specs, options or timing in the business demo. The example orders, bookings and reports show how those choices connect to daily work.\n\nYour changes stay on this device. Reset the showcase in Account settings whenever you want a fresh starting point.',
      sections: { about: true, offerIntro: true, gallery: false, reviews: false, map: false, faq: true, venue: false },
      sectionOrder: ['about', 'offerIntro', 'faq'],
      offerTitle: 'See what you could offer',
      offerBookCta: `Explore ${services.length} services`, offerBuyCta: `Explore ${products.length} products`,
      bookFaqTitle: 'Using the showcase',
      bookFaq: [
        { id: 'showcase-faq-business', question: 'Is this a real business?', answer: 'This is an educational demo. The offerings, clients, orders, bookings and traffic are examples. Demo actions stay on this device.' },
        { id: 'showcase-faq-categories', question: 'How do the two categories work?', answer: 'Discovery Category describes your offering so people can find it. Store Category organises your own Buy or Book page.' },
        { id: 'showcase-faq-reset', question: 'Can I try changing an example?', answer: 'Yes. Open its setup and change specs, options, status or timing. Reset showcase in Account settings restores the complete collection and refreshes example dates.' },
        { id: 'showcase-faq-limits', question: 'What should I know about the examples?', answer: 'Digital items use manual fulfilment and currently share product checkout’s address capture. Equipment hire examples are consultations or sessions. Human food businesses have presence-only profiles; pet food products are supported.' }
      ]
    },
    demoScenarioSchema: DEMO_SCENARIO_SCHEMA,
    demoProfilePictureSchema: 1,
    demoInboxSchema: 0,
    demoShowcaseActivitySchema: 1,
    demoCatalogRevision: 1,
    demoRetailSchema: 1,
    demoServiceFormatsSchema: 1,
    demoGeneratedAt: now
  });
  return { ...base, products, services, productCategories: [...new Set(products.map(product => product.category))], serviceCategories: [...new Set(services.map(service => service.category))], ...activity,
    paymentGateways: base.paymentGateways.map(gateway => ({ ...gateway, enabled: true, configured: true, mode: 'test', ...(gateway.gatewayType === 'manual_eft' ? { manualInstructions: 'Example EFT only. Try the pending-payment workflow; no real transfer is required.' } : {}) })) };
}

/** Replace obsolete demo scenarios once; subsequent local edits stay intact. */
export function hydrateDemoWorkspace(stored) {
  if (stored && typeof stored === 'object') {
    if (stored.isDemo !== true) return stored;
    if (stored.demoScenarioSchema === DEMO_SCENARIO_SCHEMA) {
      const products = createShowcaseProducts();
      const retail = upgradeDemoRetailCatalog(removeRetiredDemoEquipment(stored, products), products);
      return retail.demoServiceFormatsSchema === 1 ? retail : removeRetiredDemoEvents(retail, createDemoWorkspace(stored.demoGeneratedAt || Date.now()));
    }
  }
  return upgradeDemoScenario(stored, createDemoWorkspace());
}
