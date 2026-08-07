import { E_BUSINESS_PLATFORM_NAME } from './eBusinessPlatform';

/** Owner workspace tabs — Website (Pages) and Business Blog under Business Platforms. */
export const workspaceTabIds = [
  'overview',
  'services',
  'requests',
  'staff',
  'products',
  'orders',
  'website',
  'social',
  'communications',
  'finance',
  'clients',
  'profile'
];

export const workspaceTabAliases = {
  business: 'staff',
  schedule: 'staff',
  calendar: 'staff',
  team: 'staff',
  'my-clients': 'clients',
  support: 'communications',
  inbox: 'communications',
  'support-inbox': 'communications',
  bookings: 'requests',
  booking: 'services',
  'booking-requests': 'requests',
  'social-profile': 'social',
  socialProfile: 'social',
  site: 'website',
  pages: 'website',
  editor: 'website',
  'e-business': 'website',
  ebusiness: 'website',
  'product-orders': 'orders',
  shop: 'products',
  buy: 'products',
  payments: 'finance'
};

export const workspaceTabGroups = {
  overview: 'home',
  services: 'book',
  requests: 'book',
  staff: 'book',
  products: 'buy',
  orders: 'buy',
  website: 'presence',
  social: 'presence',
  communications: 'run',
  finance: 'run',
  clients: 'run',
  profile: 'run'
};

export const workspaceTabLabels = {
  overview: 'Home',
  services: 'Services',
  requests: 'Requests',
  staff: 'Schedule',
  products: 'Products',
  orders: 'Orders',
  website: 'Pages',
  social: 'Business Blog',
  communications: 'Support',
  finance: 'Finance',
  clients: 'Clients',
  profile: 'Profile'
};

export const workspaceGroupLabels = {
  home: 'Home',
  book: 'Book',
  buy: 'Buy',
  presence: E_BUSINESS_PLATFORM_NAME,
  run: 'Run'
};

/** Nested under a parent catalog tab within the same nav group. */
export const workspaceTabParents = {
  requests: 'services',
  orders: 'products'
};

export const mobilePrimaryTabs = ['overview', 'services', 'staff', 'products', 'website'];

export const resolveWorkspaceTab = (tab = 'overview') =>
  workspaceTabAliases[tab] || (workspaceTabIds.includes(tab) ? tab : 'overview');
