import { E_BUSINESS_PLATFORM_NAME } from './eBusinessPlatform';

/** Owner workspace tabs — Social studio + messages live in the Social group. */
export const workspaceTabIds = [
  'overview',
  'services',
  'requests',
  'staff',
  'availability',
  'products',
  'orders',
  'stock',
  'website',
  'website-book',
  'website-buy',
  'website-checkout',
  'social',
  'communications',
  'finance',
  'live-stats',
  'analytics',
  'clients',
  'settings'
];

export const workspaceTabAliases = {
  business: 'staff',
  schedule: 'staff',
  calendar: 'staff',
  team: 'staff',
  hours: 'availability',
  'staff-availability': 'availability',
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
  'home-page': 'website',
  homepage: 'website',
  'book-page': 'website-book',
  'buy-page': 'website-buy',
  'shop-page': 'website-buy',
  cart: 'website-checkout',
  checkout: 'website-checkout',
  'cart-checkout': 'website-checkout',
  'product-orders': 'orders',
  inventory: 'stock',
  shop: 'products',
  buy: 'products',
  payments: 'finance',
  analytics: 'analytics',
  stats: 'analytics',
  insights: 'analytics',
  'live-stats': 'live-stats',
  live: 'live-stats',
  presence: 'live-stats',
  profile: 'settings'
};

export const workspaceTabGroups = {
  overview: 'home',
  services: 'book',
  requests: 'book',
  staff: 'book',
  availability: 'book',
  products: 'buy',
  orders: 'buy',
  stock: 'buy',
  website: 'presence',
  'website-book': 'presence',
  'website-buy': 'presence',
  'website-checkout': 'presence',
  social: 'social',
  communications: 'social',
  finance: 'run',
  'live-stats': 'run',
  analytics: 'run',
  clients: 'run',
  settings: 'run'
};

export const workspaceTabLabels = {
  overview: 'Home',
  services: 'Services',
  requests: 'Requests',
  staff: 'Schedule',
  availability: 'Availability',
  products: 'Products',
  orders: 'Orders',
  stock: 'Stock',
  website: 'Home page',
  'website-book': 'Book page',
  'website-buy': 'Buy page',
  'website-checkout': 'Cart & checkout',
  social: 'Social studio',
  communications: 'Messages',
  finance: 'Finance',
  'live-stats': 'Live Stats',
  analytics: 'Reports',
  clients: 'Clients',
  settings: 'Settings'
};

export const workspaceGroupLabels = {
  home: 'Home',
  book: 'Book',
  buy: 'Buy',
  presence: E_BUSINESS_PLATFORM_NAME,
  social: 'Social',
  run: 'Run'
};

/** Nested under a parent catalog tab within the same nav group. */
export const workspaceTabParents = {
  requests: 'services',
  orders: 'products'
};

/** Mobile dock: Messages + Home are direct; More opens the full workspace menu. */
export const mobileDockItems = [
  { id: 'communications', label: 'Messages', kind: 'tab' },
  { id: 'overview', label: 'Home', kind: 'tab' },
  { id: 'more', label: 'More', kind: 'more' }
];

/** @deprecated Prefer mobileDockItems — kept for any older imports. */
export const mobilePrimaryTabs = ['communications', 'overview'];

export const resolveWorkspaceTab = (tab = 'overview') =>
  workspaceTabAliases[tab] || (workspaceTabIds.includes(tab) ? tab : 'overview');
