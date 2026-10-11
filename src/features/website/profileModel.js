import { isPublicPageEnabled } from '../../config/eBusinessPlatform.js';
import { isProductPubliclyVisible } from '../../utils/products.js';
import { isPresenceOnlyBusiness } from '../../../functions/businessCapabilities.js';
import { isEnquiryListing, listingSearchTerms } from '../../../functions/listingTypes.js';
import { publicBranches } from '../../../functions/branchesDomain.js';
import { isRetiredEventService } from '../../../functions/serviceTemplates.js';

/** Capability is determined before market filtering; a country picker must remain reachable. */
export function profileCatalog(workspace = {}) {
  if (isPresenceOnlyBusiness(workspace)) return { services: [], products: [], book: false, buy: false };
  const services = (workspace.services || []).filter((item) => item && item.active !== false && !isRetiredEventService(item));
  const products = (workspace.products || []).filter((item) => item && isProductPubliclyVisible(item));
  const available = workspace.profileCapabilities || { book: services.length > 0, buy: products.length > 0 };
  return {
    services, products,
    book: isPublicPageEnabled(workspace.website?.pages, 'book') && available.book,
    buy: isPublicPageEnabled(workspace.website?.pages, 'buy') && available.buy
  };
}

export function profileTabs(workspace) {
  const catalog = profileCatalog(workspace);
  return [{ id: 'home', label: 'Home' },
    ...(catalog.book ? [{ id: 'book', label: 'Book' }] : []),
    ...(catalog.buy ? [{ id: 'buy', label: 'Buy' }] : [])];
}

export function profileSectionTabs(workspace = {}, { editing = false } = {}) {
  const website = workspace.website || {};
  const sections = website.sections || {};
  return [
    { id: 'about', label: 'About' },
    { id: 'offers', section: 'offerIntro', label: 'What we offer' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'map', label: 'Location' },
    { id: 'faq', label: 'FAQs' },
    { id: 'contact', label: 'Contact' }
  ].filter(tab => editing || isPublicPageEnabled(website.pages, tab.id) && sections[tab.section || tab.id] !== false && (tab.id !== 'gallery' || sections.venue !== false || sections.gallery === true) &&
    (tab.id !== 'about' || hasProfileStory(website)) &&
    (tab.id !== 'offers' || [website.reasonsBody, ...(website.reasons || []).flatMap(reason => [reason.title, reason.body])]
      .some(value => String(value || '').trim())));
}

/** Guided navigation follows the same enabled pages as the public profile menu. */
export function profileJourney(workspace = {}, page = 'home') {
  const website = workspace.website || {};
  const story = profileSectionTabs(workspace).filter(tab => {
    if (tab.id === 'gallery') return (website.venueImages || []).some(image => image.url);
    if (tab.id === 'faq') return (website.bookFaq || []).some(item => String(item.q || '').trim());
    if (tab.id === 'map') return [website.address, website.mapBody, website.mapLinkUrl, website.mapEmbedUrl]
      .some(value => String(value || '').trim()) || publicBranches(website.branches).length > 0;
    return true;
  });
  const commerce = profileTabs(workspace).filter(tab => tab.id !== 'home');
  const storyIndex = story.findIndex(tab => tab.id === page);
  const commerceIndex = commerce.findIndex(tab => tab.id === page);
  return {
    story,
    commerce,
    nextStory: page === 'home' ? story[0] || null : storyIndex < 0 ? null :
      story[storyIndex + 1] || { id: 'home', label: 'Business card' },
    nextCommerce: commerceIndex < 0 ? commerce[0] || null : commerce[commerceIndex + 1] || null
  };
}

function hasProfileStory(website) {
  const hasBody = body => Boolean(String(body || '').trim());
  if (Array.isArray(website.storyPages)) return website.storyPages.some(page => hasBody(page.body) || hasBody(page.imageUrl));
  const pages = website.aboutPages?.length ? website.aboutPages : [
    { body: website.aboutBody, imageUrl: website.aboutImageUrl },
    { body: website.missionBody, imageUrl: website.missionImageUrl },
    { body: website.visionBody, imageUrl: website.visionImageUrl }
  ];
  return hasBody(website.storyBody ?? pages[0]?.body) || hasBody(website.storyImageUrl ?? pages[0]?.imageUrl) ||
    pages.slice(1).some(page => hasBody(page.body) || hasBody(page.imageUrl));
}

export function searchPublicCatalog(items, query = '') {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    const text = [item.name, item.category, item.description, ...listingSearchTerms(item), ...(item.tags || [])].filter(Boolean).join(' ').toLocaleLowerCase();
    return words.every((word) => text.includes(word));
  });
}

export function sortPublicCatalog(items, order = 'featured') {
  const price = item => {
    const options = isEnquiryListing(item) ? [] : item.variants?.filter(variant => variant.active !== false && variant.available !== false) || item.packages?.filter(option => option.active !== false && option.available !== false) || [];
    const values = (options.length ? options.map(option => option.price) : [item.price]).filter(value => value != null && String(value).trim() !== '').map(Number).filter(Number.isFinite);
    return values.length ? Math.min(...values) : null;
  };
  if (order === 'name') return [...items].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  if (order === 'price-asc' || order === 'price-desc') return [...items].sort((a, b) => {
    const left = price(a), right = price(b);
    if (left === null || right === null) return left === right ? 0 : left === null ? 1 : -1;
    return (left - right) * (order === 'price-desc' ? -1 : 1);
  });
  return items;
}
