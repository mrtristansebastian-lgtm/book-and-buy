import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const nativeRequire = createRequire(import.meta.url);
const cache = new Map();
function load(path) {
  const file = new URL(path, import.meta.url);
  if (cache.has(file.href)) return cache.get(file.href);
  const module = { exports: {} };
  cache.set(file.href, module.exports);
  const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }
  });
  new Function('module', 'exports', 'require', outputText)(module, module.exports, id => {
    if (!id.startsWith('.')) return nativeRequire(id);
    const base = new URL(id, file);
    return load([base, new URL(`${base.href}.js`)].find(existsSync).href);
  });
  return module.exports;
}

const { profileJourney } = load('../src/features/website/profileModel.js');
const { ProfileStoryNavigation } = load('../src/features/website/components/ProfileStoryNavigation.jsx');
const product = { id: 'product-1', name: 'Product #1', status: 'active', active: true, price: 250 };
const service = { id: 'service-1', name: 'Service #1', active: true, price: 650 };

function business(overrides = {}) {
  const { website = {}, ...rest } = overrides;
  return {
    brandName: 'Your Business', services: [service], products: [product], ...rest,
    website: {
      aboutBody: 'Meet our business and the team behind it.',
      reasonsBody: 'Explore our products and services.',
      venueImages: [{ id: 'photo-1', url: '/assets/placeholders/demo-image.svg' }],
      address: 'Cape Town, South Africa',
      bookFaq: [{ id: 'faq-1', q: 'How can I get in touch?', a: 'Send our team a message.' }],
      ...website,
      pages: { book: true, buy: true, ...(website.pages || {}) },
      sections: { ...(website.sections || {}) }
    }
  };
}

const ids = tabs => tabs.map(tab => tab.id);

test('Home starts the enabled business story and offers Book before Buy', () => {
  const journey = profileJourney(business());
  assert.deepEqual(ids(journey.story), ['about', 'offers', 'gallery', 'reviews', 'map', 'faq', 'contact']);
  assert.deepEqual(ids(journey.commerce), ['book', 'buy']);
  assert.equal(journey.nextStory.id, 'about');
  assert.equal(journey.nextStory.label, 'About');
  assert.equal(journey.nextCommerce.id, 'book');
  assert.equal(journey.nextCommerce.label, 'Book');
});

test('story sections move in menu order and Contact returns to Home', () => {
  const workspace = business();
  for (const [page, next] of [
    ['about', 'offers'], ['offers', 'gallery'], ['gallery', 'reviews'],
    ['reviews', 'map'], ['map', 'faq'], ['faq', 'contact'], ['contact', 'home']
  ]) {
    const journey = profileJourney(workspace, page);
    assert.equal(journey.nextStory.id, next, `Continue from ${page}`);
    assert.equal(journey.nextCommerce.id, 'book', `Book remains available from ${page}`);
  }
});

test('disabled About and sections are skipped without leading to hidden pages', () => {
  const workspace = business({ website: {
    pages: { about: false, map: false, faq: false },
    sections: { offerIntro: false, gallery: false, reviews: false }
  } });
  const home = profileJourney(workspace, 'home');
  assert.deepEqual(ids(home.story), ['contact']);
  assert.equal(home.nextStory.id, 'contact');
  assert.equal(profileJourney(workspace, 'contact').nextStory.id, 'home');
  assert.equal(profileJourney(workspace, 'about').nextStory, null);
});

test('empty story content, empty offers and legacy venue visibility affect the journey', () => {
  const workspace = business({ website: {
    storyPages: [{ id: 'story', body: '   ' }], reasonsBody: '', reasons: [],
    sections: { venue: false, map: false, faq: false, contact: false }
  } });
  const journey = profileJourney(workspace);
  assert.deepEqual(ids(journey.story), ['reviews']);
  assert.equal(journey.nextStory.id, 'reviews');
  assert.equal(profileJourney(workspace, 'reviews').nextStory.id, 'home');
  const noStory = profileJourney(business({ website: { sections: {
    about: false, offerIntro: false, gallery: false, reviews: false, map: false, faq: false, contact: false
  } } }));
  assert.deepEqual(noStory.story, []);
  assert.equal(noStory.nextStory, null);
  assert.equal(noStory.nextCommerce.id, 'book');
});

test('empty gallery, location and FAQ sections are skipped even when enabled', () => {
  const workspace = business({ website: {
    venueImages: [{ id: 'empty-photo', url: '' }], address: '', mapBody: '', mapLinkUrl: '', mapEmbedUrl: '',
    bookFaq: [{ id: 'empty-question', q: '   ', a: 'A draft answer has no visible question.' }],
    sections: { gallery: true, venue: true, map: true, faq: true }
  } });
  const journey = profileJourney(workspace);
  assert.deepEqual(ids(journey.story), ['about', 'offers', 'reviews', 'contact']);
  assert.equal(profileJourney(workspace, 'offers').nextStory.id, 'reviews');
  assert.equal(profileJourney(workspace, 'reviews').nextStory.id, 'contact');
});

test('removing every About section suppresses legacy content in the menu and continuation', () => {
  const workspace = business({ website: { storyPages: [], aboutBody: 'Old About', missionBody: 'Old mission' } });
  assert.equal(profileJourney(workspace).story.some(tab => tab.id === 'about'), false);
  assert.equal(profileJourney(workspace).nextStory.id, 'offers');
  assert.equal(profileJourney(workspace, 'about').nextStory, null);
  const edited = business({ website: { storyPages: [{ id: 'about', title: 'About', body: '' }],
    reasonsBody: '', reasons: [], venueImages: [], bookFaq: [] } });
  assert.equal(profileJourney(edited).nextStory.id, 'reviews');
  assert.equal(profileJourney(edited, 'reviews').nextStory.id, 'map');
});

test('Next page opens the next usable information section and never appears in catalogs', () => {
  const workspace = business({ website: { venueImages: [], bookFaq: [], sections: { reviews: false } } });
  let opened;
  const next = ProfileStoryNavigation({ workspace, page: 'offers', onOpenPage: id => { opened = id; } });
  const button = next.props.children;
  assert.equal(button.props.children[0].props.children, 'Next page · Location');
  button.props.onClick();
  assert.equal(opened, 'map');
  for (const page of ['home', 'book', 'buy', 'checkout']) assert.equal(ProfileStoryNavigation({ workspace, page }), null);
  const policy = ProfileStoryNavigation({ workspace, page: 'privacy', onOpenPage: id => { opened = id; } });
  policy.props.children.props.onClick();
  assert.equal(opened, 'home');
});

test('retained story images stay discoverable while whitespace-only offers are skipped', () => {
  const workspace = business({ website: { aboutBody: '', aboutImageUrl: '/merchant-photo.jpg', reasonsBody: '  ', reasons: [{ title: ' ', body: '' }] } });
  assert.equal(profileJourney(workspace).nextStory.id, 'about');
  assert.equal(profileJourney(workspace, 'about').nextStory.id, 'gallery');
  const cleared = { ...workspace, website: { ...workspace.website, storyPages: [] } };
  assert.equal(profileJourney(cleared).nextStory.id, 'gallery');
});

test('Book-only and Buy-only businesses expose only their usable commerce action', () => {
  const bookOnly = business({ products: [] });
  assert.deepEqual(ids(profileJourney(bookOnly).commerce), ['book']);
  assert.equal(profileJourney(bookOnly).nextCommerce.id, 'book');
  assert.equal(profileJourney(bookOnly, 'about').nextCommerce.id, 'book');
  assert.equal(profileJourney(bookOnly, 'book').nextCommerce, null);

  const buyOnly = business({ services: [] });
  assert.deepEqual(ids(profileJourney(buyOnly).commerce), ['buy']);
  assert.equal(profileJourney(buyOnly).nextCommerce.id, 'buy');
  assert.equal(profileJourney(buyOnly, 'about').nextCommerce.id, 'buy');
  assert.equal(profileJourney(buyOnly, 'buy').nextCommerce, null);
});

test('a business offering both continues from Book to Buy and ends the commerce sequence at Buy', () => {
  const workspace = business();
  assert.equal(profileJourney(workspace, 'book').nextStory, null);
  assert.equal(profileJourney(workspace, 'book').nextCommerce.id, 'buy');
  assert.equal(profileJourney(workspace, 'buy').nextStory, null);
  assert.equal(profileJourney(workspace, 'buy').nextCommerce, null);
  for (const page of ['cart', 'checkout', 'success']) {
    assert.equal(profileJourney(workspace, page).nextStory, null, page);
  }
});

test('inactive services and draft, archived or inactive products cannot create commerce actions', () => {
  const workspace = business({
    services: [{ ...service, active: false }],
    products: [
      { ...product, id: 'draft', status: 'draft' },
      { ...product, id: 'archived', status: 'archived' },
      { ...product, id: 'inactive', active: false }
    ]
  });
  for (const page of ['home', 'about', 'book', 'buy']) {
    const journey = profileJourney(workspace, page);
    assert.deepEqual(journey.commerce, [], page);
    assert.equal(journey.nextCommerce, null, page);
  }
  assert.equal(profileJourney(workspace).nextStory.id, 'about');
});

test('hidden Book, Buy and legacy Shop pages override an otherwise available catalog', () => {
  const hiddenBook = business({ website: { pages: { book: false } } });
  assert.deepEqual(ids(profileJourney(hiddenBook).commerce), ['buy']);
  assert.equal(profileJourney(hiddenBook).nextCommerce.id, 'buy');
  const hiddenShop = business({ website: { pages: { shop: false } } });
  assert.deepEqual(ids(profileJourney(hiddenShop).commerce), ['book']);
  assert.equal(profileJourney(hiddenShop, 'book').nextCommerce, null);
  const hiddenBoth = business({ website: { pages: { book: false, buy: false } } });
  assert.deepEqual(profileJourney(hiddenBoth).commerce, []);
  assert.equal(profileJourney(hiddenBoth, 'about').nextCommerce, null);
});

test('market-filtered catalogs retain declared capabilities while explicitly unavailable capabilities stay hidden', () => {
  const filtered = business({ services: [], products: [], profileCapabilities: { book: true, buy: true } });
  assert.deepEqual(ids(profileJourney(filtered).commerce), ['book', 'buy']);
  assert.equal(profileJourney(filtered, 'book').nextCommerce.id, 'buy');
  const limited = business({ profileCapabilities: { book: false, buy: true } });
  assert.deepEqual(ids(profileJourney(limited).commerce), ['buy']);
  assert.equal(profileJourney(limited).nextCommerce.id, 'buy');
  const hidden = business({ services: [], products: [], profileCapabilities: { book: true, buy: true },
    website: { pages: { book: false, buy: false } } });
  assert.deepEqual(profileJourney(hidden).commerce, []);
});

test('legacy Shop settings respect the Buy page choice and preserve the canonical Buy action', () => {
  const hiddenBuy = business({ website: { pages: { buy: false, shop: true } } });
  assert.deepEqual(ids(profileJourney(hiddenBuy).commerce), ['book']);
  assert.equal(profileJourney(hiddenBuy, 'book').nextCommerce, null);
  const enabledShop = business({ services: [], website: { pages: { buy: true, shop: true } } });
  assert.deepEqual(ids(profileJourney(enabledShop).commerce), ['buy']);
  assert.equal(profileJourney(enabledShop).nextCommerce.id, 'buy');
  assert.equal(profileJourney(enabledShop, 'buy').nextCommerce, null);
});

test('presence-only profiles keep their story while suppressing commerce despite catalog and capability data', () => {
  for (const overrides of [
    { profileMode: 'presence' },
    { website: { profileMode: 'presence' } },
    { website: { categoryId: 'restaurants_takeaways' } }
  ]) {
    const workspace = business({ ...overrides, profileCapabilities: { book: true, buy: true } });
    const journey = profileJourney(workspace);
    assert.deepEqual(journey.commerce, []);
    assert.equal(journey.nextCommerce, null);
    assert.equal(journey.nextStory.id, 'about');
    assert.equal(profileJourney(workspace, 'book').nextCommerce, null);
    assert.equal(profileJourney(workspace, 'buy').nextCommerce, null);
  }
});
