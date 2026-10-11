/** Increment only when an explicitly requested demo reset is needed. */
import { RETAIL_CATEGORY_ADDITIONS, RETAIL_MAIN_CATEGORIES } from '../../functions/retailCategories.js';
import { isRetiredEventService } from '../../functions/serviceTemplates.js';
export const DEMO_SCENARIO_SCHEMA = 7;

/** Append new retail examples once, preserving edits and deliberate deletions. */
export function upgradeDemoRetailCatalog(stored, freshProducts) {
  if (stored?.isDemo !== true || stored.demoRetailSchema === 1) return stored;
  const addedLeaves = new Set(RETAIL_CATEGORY_ADDITIONS.map(category => category.id));
  const products = stored.products || [];
  const seen = new Set(products.map(product => product.id));
  const labels = new Map(RETAIL_MAIN_CATEGORIES.map(group => [group.id, group.label]));
  const formerLabels = new Set(['Clothing & fashion', 'Jewelry', 'Art', 'Handmade', 'Vintage', 'Sports', 'Books & stationery', 'Electronics', 'Digital', 'Beauty retail', 'Home & decor', 'Flowers & plants', 'Pet supplies']);
  const nextProducts = [...products.map(product => product.id?.startsWith('showcase-product-') && formerLabels.has(product.category)
    ? { ...product, category: labels.get(product.exploreMainCategoryId) || product.category } : product),
    ...freshProducts.filter(product => addedLeaves.has(product.exploreSubcategoryId) && !seen.has(product.id))];
  const counts = { products: freshProducts.length, services: stored.services?.length || 35 };
  const website = { ...stored.website };
  if (/^\d+ distinct examples\. Discover the right setup for what you offer, then try it yourself\.$/.test(website.homeSubtext || '')) website.homeSubtext = `${counts.products + counts.services} distinct examples. Discover the right setup for what you offer, then try it yourself.`;
  if (/^Explore \d+ products across every supported category and electronics setup\./.test(website.buySubtext || '')) website.buySubtext = `Explore ${counts.products} products across every supported category and electronics setup. Open an example to see its specs and try the editor.`;
  if (/^Explore \d+ products$/.test(website.offerBuyCta || '')) website.offerBuyCta = `Explore ${counts.products} products`;
  return { ...stored, demoRetailSchema: 1, products: nextProducts, website,
    productCategories: [...new Set([...(stored.productCategories || []).filter(category => !formerLabels.has(category)), ...nextProducts.map(product => product.category).filter(Boolean)])] };
}

const retiredCategory = id => /^equipment_(machinery|construction|agricultural|workshop|generators|commercial)$/.test(id || '');

/** Remove the withdrawn showcase examples without resetting other local edits. */
export function removeRetiredDemoEquipment(stored, freshProducts = []) {
  if (stored?.isDemo !== true || !Array.isArray(stored.products)) return stored;
  const removedIds = new Set(stored.products.filter(product => retiredCategory(product.exploreSubcategoryId)
    || /^showcase-product-equipment_(machinery|construction|agricultural|workshop|generators|commercial)$/.test(product.id || '')).map(product => product.id));
  const tool = freshProducts.find(product => product.id === 'showcase-product-equipment_tools');
  const needsToolUpdate = tool && stored.products.some(product => product.id === tool.id && product.listingType === 'equipment');
  if (!removedIds.size && !needsToolUpdate) return stored;
  const products = stored.products.filter(product => !removedIds.has(product.id)).map(product =>
    needsToolUpdate && product.id === tool.id ? { ...tool, name: product.name || tool.name, price: product.price ?? tool.price, imageUrls: product.imageUrls || tool.imageUrls } : product);
  const withdrawnEnquiry = record => removedIds.has(record.productId) || (needsToolUpdate && record.productId === tool.id);
  return { ...stored, products,
    productCategories: [...new Set(products.map(product => product.category).filter(Boolean))],
    threads: (stored.threads || []).filter(thread => !withdrawnEnquiry(thread)),
    listingEnquiries: (stored.listingEnquiries || []).filter(record => !withdrawnEnquiry(record)),
    demoCatalogRevision: 1 };
}

/** Old demo data is disposable; real accounts and new demo edits are isolated. */
export function upgradeDemoScenario(stored, fresh) {
  if (stored && typeof stored === 'object') {
    if (stored.isDemo !== true || stored.demoScenarioSchema === DEMO_SCENARIO_SCHEMA) return stored;
  }
  return fresh;
}

/** Withdraw event examples once, retaining local edits and historical receipt amounts. */
export function removeRetiredDemoEvents(stored, fresh) {
  if (stored?.isDemo !== true || stored.demoServiceFormatsSchema === 1) return stored;
  const removed = new Set((stored.services || []).filter(service => isRetiredEventService(service) || /^showcase-service-.+-event$/.test(service.id || '')).map(service => service.id));
  const services = (stored.services || []).filter(service => !removed.has(service.id));
  const serviceById = new Map(services.map(service => [service.id, service]));
  const replacements = new Map(fresh.bookings.map(booking => [booking.id, booking]));
  const bookings = (stored.bookings || []).flatMap(booking => {
    if (!removed.has(booking.serviceId)) return [booking];
    const replacement = replacements.get(booking.id);
    if (!replacement || !booking.id?.startsWith('showcase-booking-')) return [];
    const currentService = serviceById.get(replacement.serviceId);
    if (!currentService) return [];
    const dateKey = currentService.sessionStartDate || replacement.dateKey;
    const time = currentService.sessionStartTime || replacement.time;
    const variant = currentService.variants?.find(variant => variant.available !== false);
    return [{ ...booking, serviceId: replacement.serviceId, serviceName: replacement.serviceName, scheduleType: replacement.scheduleType,
      dateKey, date: dateKey, time, durationMinutes: replacement.durationMinutes,
      sessionStartDate: currentService.sessionStartDate, sessionEndDate: currentService.sessionEndDate, sessionStartTime: currentService.sessionStartTime, sessionEndTime: currentService.sessionEndTime,
      staffId: replacement.staffId, staffName: replacement.staffName, serviceVariantId: variant?.id || '', serviceVariantName: variant?.name || '' }];
  });
  const website = { ...stored.website };
  if (/^Explore 23 Slots, 12 Spots and 16 Events\./.test(website.bookSubtext || '')) website.bookSubtext = fresh.website.bookSubtext;
  if (/^Explore \d+ services$/.test(website.offerBookCta || '')) website.offerBookCta = `Explore ${services.length} services`;
  if (/^\d+ distinct examples\. Discover the right setup for what you offer, then try it yourself\.$/.test(website.homeSubtext || '')) website.homeSubtext = `${(stored.products || []).length + services.length} distinct examples. Discover the right setup for what you offer, then try it yourself.`;
  return { ...stored, services, bookings, website, demoServiceFormatsSchema: 1,
    threads: (stored.threads || []).filter(thread => !removed.has(thread.serviceId)),
    serviceCategories: [...new Set(services.map(service => service.category).filter(Boolean))] };
}
