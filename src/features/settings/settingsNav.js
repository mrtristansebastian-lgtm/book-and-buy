export const SETTINGS_SECTIONS = [
  { id: 'general', label: 'General' },
  { id: 'plan', label: 'Plan' },
  { id: 'billing', label: 'Billing' },
  { id: 'users', label: 'Users' },
  { id: 'payments', label: 'Payments' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'checkout', label: 'Checkout' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'locations', label: 'Locations' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'domains', label: 'Domains' },
  { id: 'policies', label: 'Policies' },
  { id: 'account', label: 'Account' }
];

export const DEFAULT_SETTINGS_SECTION = 'general';

export function isSettingsSection(value = '') {
  const id = String(value || '')
    .trim()
    .toLowerCase();
  return SETTINGS_SECTIONS.some((section) => section.id === id);
}

export function resolveSettingsSection(value = '') {
  const id = String(value || '')
    .trim()
    .toLowerCase();
  if (isSettingsSection(id)) return id;
  return DEFAULT_SETTINGS_SECTION;
}
