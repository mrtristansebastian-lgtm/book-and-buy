/**
 * Public-safe workspace fields for Firestore `#/w/:slug` documents.
 * Never include bookings, orders, threads, or payment secrets.
 */
import { effectivePublicPages, isPresenceOnlyBusiness, publicBusinessSocialLinks } from '../../../functions/businessCapabilities.js';

import { normalizeListing, listingDetailsKey, publicListingDetails, listingSpecificationGroups, listingFacts } from '../../../functions/listingTypes.js';
import { normalizeServiceConfiguration, serviceConfigurationFields, serviceFacts, isRetiredEventService } from '../../../functions/serviceTemplates.js';
type AnyRecord = Record<string, unknown>;

function publicPaymentGateways(gateways: unknown) {
  if (!Array.isArray(gateways)) return [];
  return gateways
    .filter(
      (gateway): gateway is AnyRecord =>
        Boolean(
          gateway &&
            typeof gateway === 'object' &&
            (gateway as AnyRecord).enabled &&
            (gateway as AnyRecord).configured !== false
        )
    )
    .map((gateway) => ({
      gatewayType: gateway.gatewayType,
      enabled: true,
      configured: true,
      mode: gateway.mode || 'live',
      providerName: gateway.providerName || gateway.label || gateway.gatewayType,
      label: gateway.label || gateway.providerName || gateway.gatewayType,
      credentialSummary: {
        instructions: (gateway.credentialSummary as AnyRecord | undefined)?.instructions,
        accountHolder: (gateway.credentialSummary as AnyRecord | undefined)?.accountHolder,
        bankName: (gateway.credentialSummary as AnyRecord | undefined)?.bankName,
        accountNumber: (gateway.credentialSummary as AnyRecord | undefined)?.accountNumber,
        branchCode: (gateway.credentialSummary as AnyRecord | undefined)?.branchCode
      }
    }));
}

function publicServices(services: unknown) {
  if (!Array.isArray(services)) return [];
  return services
    .filter((service): service is AnyRecord => Boolean(service && typeof service === 'object' && !isRetiredEventService(service) && (service as AnyRecord).active !== false && (service as AnyRecord).available !== false && !['draft', 'archived'].includes(String((service as AnyRecord).status || ''))))
    .map((service) => ({
      ...normalizeServiceConfiguration(service),
      serviceConfigurationFields: serviceConfigurationFields(service),
      serviceFacts: serviceFacts(service),
      id: service.id,
      name: service.name,
      description: service.description || '',
      duration: service.duration,
      minDuration: service.minDuration,
      fixedDuration: service.fixedDuration !== false,
      price: service.price,
      currency: service.currency,
      priceType: service.priceType,
      scheduleType: service.scheduleType,
      timingMode: service.timingMode,
      timingNotes: service.timingNotes,
      category: service.category || '',
      exploreMainCategoryId: service.exploreMainCategoryId || '',
      exploreSubcategoryId: service.exploreSubcategoryId || '',
      capacity: service.capacity,
      sessionStartDate: service.sessionStartDate,
      sessionStartTime: service.sessionStartTime,
      sessionEndDate: service.sessionEndDate,
      sessionEndTime: service.sessionEndTime,
      sessions: service.sessions,
      sessionLabel: service.sessionLabel,
      staffIds: service.staffIds,
      photoURL: service.photoURL,
      imageUrls: service.imageUrls || [],
      variants: Array.isArray(service.variants)
        ? service.variants.filter((variant: AnyRecord) => variant.available !== false).map((variant: AnyRecord) => ({
            id: variant.id,
            name: variant.name,
            description: variant.description || '',
            price: variant.price,
            minDuration: variant.minDuration,
            available: variant.available !== false
          }))
        : [],
      active: true
    }));
}

function isPublicProduct(product: AnyRecord) {
  const status = String(product.status || '').toLowerCase();
  if (status === 'draft' || status === 'archived') return false;
  return product.active !== false;
}

function publicProducts(products: unknown) {
  if (!Array.isArray(products)) return [];
  return products
    .filter((product): product is AnyRecord => Boolean(product && typeof product === 'object' && isPublicProduct(product as AnyRecord)))
    .map((product) => ({
      ...normalizeListing(product),
      [listingDetailsKey(product)]: publicListingDetails(product),
      listingSpecificationGroups: listingSpecificationGroups(product),
      listingFacts: listingFacts(product),
      id: product.id,
      name: product.name,
      title: product.title,
      description: product.description || '',
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      priceInCents: product.priceInCents,
      currency: product.currency,
      priceType: product.priceType,
      quoteBased: product.quoteBased,
      category: product.category || product.mainCategory || '',
      exploreMainCategoryId: product.exploreMainCategoryId || '',
      exploreSubcategoryId: product.exploreSubcategoryId || '',
      productType: product.productType || '',
      vendor: product.vendor || '',
      tags: Array.isArray(product.tags) ? product.tags : [],
      collections: Array.isArray(product.collections) ? product.collections : [],
      sku: product.sku || '',
      stockAvailable: product.stockAvailable,
      stockLabel: product.stockLabel,
      hideStockOnCard: product.hideStockOnCard,
      image: product.image,
      imageUrls: product.imageUrls || [],
      options: Array.isArray(product.options) ? product.options : [],
      variants: Array.isArray(product.variants)
        ? product.variants
          .filter((variant): variant is AnyRecord => Boolean(variant && typeof variant === 'object'))
          .map((variant) => ({
            id: variant.id,
            title: variant.title,
            optionValues: variant.optionValues || {},
            price: variant.price,
            priceInCents: variant.priceInCents,
            compareAtPrice: variant.compareAtPrice,
            sku: variant.sku || '',
            stockAvailable: variant.stockAvailable,
            weight: variant.weight,
            weightUnit: variant.weightUnit,
            length: variant.length,
            width: variant.width,
            height: variant.height,
            dimensionUnit: variant.dimensionUnit,
            size: variant.size,
            imageUrl: variant.imageUrl || '',
            available: variant.available !== false
          }))
        : [],
      stockNote: product.stockNote,
      status: 'active',
      active: true
    }));
}

function publicStaff(staff: unknown) {
  if (!Array.isArray(staff)) return [];
  return staff
    .filter((member): member is AnyRecord => Boolean(member && typeof member === 'object' && (member as AnyRecord).active !== false))
    .map((member) => ({
      id: member.id,
      name: member.name,
      role: member.role || member.accessRole || 'Staff',
      color: member.color || '#111827'
    }));
}

export function buildPublicWorkspaceSnapshot(workspace: AnyRecord) {
  const presenceOnly = isPresenceOnlyBusiness(workspace);
  const ownerId = String(workspace.ownerId || '');
  const slug = String(workspace.slug || '');
  const website = (workspace.website || {}) as AnyRecord;
  const categoryId = String(website.categoryId || '').trim();
  const categoryLabel = String(website.profileCategory || '').trim();
  const venueMode = String(website.venueMode || 'physical').trim() || 'physical';
  const locationLat = Number(website.locationLat);
  const locationLng = Number(website.locationLng);
  const countryCode = String(website.countryCode || '')
    .trim()
    .toUpperCase();
  const city = String(website.city || website.profileLocation || '').trim();
  const servesCountries = Array.isArray(website.servesCountries)
    ? website.servesCountries.map((code) => String(code || '').trim().toUpperCase()).filter(Boolean)
    : [];

  return {
    ownerId,
    slug,
    brandName: workspace.brandName || 'Business',
    tagline: workspace.tagline || '',
    email: workspace.email || '',
    phone: workspace.phone || '',
    welcomeMessage: workspace.welcomeMessage || '',
    website: { ...website, pages: effectivePublicPages(workspace), profileMode: presenceOnly ? 'presence' : 'commerce', socialLinks: publicBusinessSocialLinks((website.socialLinks || {}) as AnyRecord) },
    // Denormalized discovery fields for Explore directory reads
    categoryId,
    categoryLabel,
    venueMode,
    locationLat: Number.isFinite(locationLat) ? locationLat : null,
    locationLng: Number.isFinite(locationLng) ? locationLng : null,
    countryCode,
    city,
    servesCountries,
    services: presenceOnly ? [] : publicServices(workspace.services),
    products: presenceOnly ? [] : publicProducts(workspace.products),
    staff: publicStaff(workspace.staff),
    availabilityRules: workspace.availabilityRules || {},
    staffAvailability: workspace.staffAvailability || {},
    paymentGateways: presenceOnly ? [] : publicPaymentGateways(workspace.paymentGateways),
    published: true,
    publishedAt: Date.now(),
    updatedAt: Date.now()
  };
}
