import { E_BUSINESS_PLATFORM_NAME } from './eBusinessPlatform';

/** Owner workspace tabs — Website (Pages) and Social under E-Business Platform. */
export const workspaceTabIds = [
  'overview',
  'services',
  'staff',
  'products',
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
  bookings: 'services',
  booking: 'services',
  'booking-requests': 'services',
  'social-profile': 'social',
  socialProfile: 'social',
  site: 'website',
  pages: 'website',
  editor: 'website',
  'e-business': 'website',
  ebusiness: 'website',
  orders: 'products',
  'product-orders': 'products',
  shop: 'products',
  buy: 'products',
  payments: 'finance'
};

export const workspaceTabGroups = {
  overview: 'home',
  services: 'book',
  staff: 'book',
  products: 'buy',
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
  staff: 'Schedule',
  products: 'Products',
  website: 'Pages',
  social: 'Social',
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

export const mobilePrimaryTabs = ['overview', 'services', 'staff', 'products', 'website'];

export const resolveWorkspaceTab = (tab = 'overview') =>
  workspaceTabAliases[tab] || (workspaceTabIds.includes(tab) ? tab : 'overview');
