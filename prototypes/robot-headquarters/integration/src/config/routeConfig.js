import { E_BUSINESS_PLATFORM_NAME } from './eBusinessPlatform';

/** Owner workspace tabs — client messages live with the Office tools. */
export const workspaceTabIds = [
  'overview',
  'business-overview',
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
  'communications',
  'finance',
  'finance-reports',
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
  'social-profile': 'overview',
  socialProfile: 'overview',
  social: 'overview',
  'social-notifications': 'overview',
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
  receipts: 'finance',
  invoices: 'finance',
  'financial-reports': 'finance-reports',
  'traffic-reports': 'analytics',
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
  'business-overview': 'run',
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
  communications: 'run',
  finance: 'run',
  'finance-reports': 'run',
  'live-stats': 'run',
  analytics: 'run',
  clients: 'run',
  settings: 'run'
};

export const workspaceTabLabels = {
  overview: 'Home',
  'business-overview': 'Business overview',
  services: 'Services',
  requests: 'Requests',
  staff: 'Schedule',
  availability: 'Availability',
  products: 'Products',
  orders: 'Orders',
  stock: 'Stock',
  website: 'Business profile',
  'website-book': 'Book page',
  'website-buy': 'Buy page',
  'website-checkout': 'Cart & checkout',
  communications: 'Messages',
  finance: 'Receipts & invoices',
  'finance-reports': 'Financial reports',
  'live-stats': 'Live Stats',
  analytics: 'Traffic reports',
  clients: 'Clients',
  settings: 'Settings'
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
