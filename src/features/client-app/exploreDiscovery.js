import { distanceKm } from '../../shared/geo/haversine';
import {
  categoryLabel,
  expandExploreCategoryFilter
} from '../../config/businessCategories';

function numOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function normalizeBiz(raw = {}) {
  const slug = String(raw.slug || raw.id || '').trim();
  if (!slug) return null;
  const website = raw.website && typeof raw.website === 'object' ? raw.website : {};
  const categoryId = String(raw.categoryId || website.categoryId || '').trim();
  const categoryLabelText = String(
    raw.categoryLabel || website.profileCategory || categoryLabel(categoryId) || ''
  ).trim();
  const venueMode = String(raw.venueMode || website.venueMode || 'physical').trim() || 'physical';
  const locationLat = numOrNull(raw.locationLat ?? website.locationLat);
  const locationLng = numOrNull(raw.locationLng ?? website.locationLng);
  const countryCode = String(raw.countryCode || website.countryCode || '')
    .trim()
    .toUpperCase();
  const city = String(raw.city || website.city || website.profileLocation || '').trim();
  const servesCountries = Array.isArray(raw.servesCountries)
    ? raw.servesCountries
    : Array.isArray(website.servesCountries)
      ? website.servesCountries
      : [];

  return {
    slug,
    ownerId: String(raw.ownerId || '').trim(),
    brandName: String(raw.brandName || raw.name || slug).trim() || slug,
    blurb: String(raw.tagline || raw.blurb || raw.about || website.homeSubtext || '').trim(),
    logoUrl: raw.logoUrl || raw.logo || website.logoUrl || '',
    heroImageUrl: raw.heroImageUrl || raw.bannerUrl || website.heroImageUrl || website.socialBannerUrl || '',
    categoryId,
    categoryLabel: categoryLabelText,
    venueMode,
    locationLat,
    locationLng,
    countryCode,
    city,
    servesCountries: servesCountries.map((c) => String(c || '').trim().toUpperCase()).filter(Boolean),
    address: String(website.address || raw.address || '').trim()
  };
}

/** The shared category/location values shown on public and Find business profiles. */
export function getBusinessProfileMeta(biz = {}) {
  const category = String(biz.categoryLabel || '').trim();
  const onlineOnly = String(biz.venueMode || '').trim() === 'online';
  const location = onlineOnly
    ? 'Online'
    : String(biz.city || biz.address || '').trim();

  return { category, location, onlineOnly };
}

/** A compact text fallback for places rows. Find offer cards use the profile badges instead. */
export function formatBusinessCategoryLocation(biz = {}) {
  const { category, location, onlineOnly } = getBusinessProfileMeta(biz);

  if (category && location) return onlineOnly ? `${category} · ${location}` : `${category} in ${location}`;
  return category || location;
}

/** Item-level Explore tags are deliberately independent from business profile categories. */
export function itemMatchesExploreCategories(item = {}, expandedCategoryIds = null) {
  if (!expandedCategoryIds) return true;
  const id = String(item.exploreSubcategoryId || '').trim();
  return Boolean(id && expandedCategoryIds.has(id));
}

function hasCoords(biz) {
  return (
    Number.isFinite(biz?.locationLat) &&
    Number.isFinite(biz?.locationLng) &&
    !(biz.locationLat === 0 && biz.locationLng === 0)
  );
}

function servesClient(biz, clientCountryCode) {
  const serves = biz.servesCountries || [];
  if (serves.includes('*')) return true;
  const cc = String(clientCountryCode || '')
    .trim()
    .toUpperCase();
  if (!cc) return serves.length > 0;
  return serves.includes(cc);
}

/**
 * Filter + rank businesses for Local / International Explore.
 */
export function filterDiscoverBusinesses(directory, prefs = {}) {
  const {
    mode = 'local',
    maxKm = 30,
    categoryIds = [],
    clientLat = null,
    clientLng = null,
    clientCountryCode = ''
  } = prefs;

  const cats = expandExploreCategoryFilter(categoryIds);
  let list = (directory || []).map((biz) => ({ ...biz }));

  if (cats) {
    list = list.filter((biz) => biz.categoryId && cats.has(biz.categoryId));
  }

  if (mode === 'local') {
    list = list
      .filter((biz) => biz.venueMode === 'physical' || biz.venueMode === 'hybrid')
      .filter((biz) => hasCoords(biz))
      .map((biz) => ({
        ...biz,
        distanceKm: distanceKm(clientLat, clientLng, biz.locationLat, biz.locationLng)
      }))
      .filter((biz) => Number.isFinite(biz.distanceKm) && biz.distanceKm <= Number(maxKm) + 0.01)
      .sort((a, b) => a.distanceKm - b.distanceKm);
    return list;
  }

  // International: online/hybrid that serve client country (or worldwide)
  list = list
    .filter((biz) => biz.venueMode === 'online' || biz.venueMode === 'hybrid')
    .filter((biz) => servesClient(biz, clientCountryCode))
    .map((biz) => ({
      ...biz,
      distanceKm: hasCoords(biz)
        ? distanceKm(clientLat, clientLng, biz.locationLat, biz.locationLng)
        : Infinity
    }))
    .sort((a, b) => {
      const aLocal = a.countryCode && a.countryCode === clientCountryCode ? 0 : 1;
      const bLocal = b.countryCode && b.countryCode === clientCountryCode ? 0 : 1;
      if (aLocal !== bLocal) return aLocal - bLocal;
      return String(a.brandName).localeCompare(String(b.brandName));
    });
  return list;
}
