import { getListingType, listingDetailsKey } from './listingTypes.js';

export function businessListingLocation(workspace = {}) {
  return String(workspace.website?.address || workspace.website?.profileLocation || '').trim();
}

export function listingLocationOptions(workspace = {}, current = '') {
  const address = businessListingLocation(workspace);
  const options = address ? [{ value: address, label: 'Business location', description: address }] : [];
  for (const branch of workspace.website?.branches || []) {
    const value = String(branch.address || '').trim();
    if (branch.enabled === false || !value || options.some(option => option.value === value)) continue;
    options.push({ value, label: branch.name || 'Branch', description: value });
  }
  if (current && !options.some(option => option.value === current)) options.push({ value: current, label: 'Current listing location', description: current });
  return options;
}

/** Default only missing locations; editing must preserve existing listing addresses. */
export function defaultListingLocation(product = {}, workspace = {}) {
  if (!['vehicle', 'equipment'].includes(getListingType(product))) return null;
  const key = listingDetailsKey(product);
  if (String(product[key]?.location || '').trim()) return null;
  const location = businessListingLocation(workspace);
  return location ? { [key]: { ...(product[key] || {}), location } } : null;
}
