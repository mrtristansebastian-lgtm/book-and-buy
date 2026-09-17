import {
  BookOpen,
  Boxes,
  BriefcaseBusiness,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Globe2,
  Home,
  Inbox,
  MessageSquare,
  Package,
  Settings,
  Share2,
  ShoppingBag,
  ShoppingCart,
  Users
} from 'lucide-react';

/** Icon per workspace tab — shared by launcher tiles and the mini-app bar. */
export const TAB_ICONS = {
  overview: Home,
  services: BriefcaseBusiness,
  requests: Inbox,
  staff: CalendarDays,
  availability: CalendarClock,
  products: Package,
  orders: ClipboardList,
  stock: Boxes,
  website: Globe2,
  'website-book': BookOpen,
  'website-buy': ShoppingBag,
  'website-checkout': ShoppingCart,
  social: Share2,
  communications: MessageSquare,
  finance: CreditCard,
  clients: Users,
  settings: Settings
};

/** One-line hint under each sub-page tile on the launcher. */
export const TAB_HINTS = {
  services: 'What you offer',
  requests: 'Approve & assign',
  staff: 'Day, week, month',
  availability: 'Hours & time off',
  products: 'Your catalogue',
  orders: 'Fulfil & ship',
  stock: 'Levels & alerts',
  website: 'Hero, about, photos',
  'website-book': 'Services page',
  'website-buy': 'Storefront page',
  'website-checkout': 'Cart flow',
  social: 'Posts & blog',
  communications: 'Client messages',
  finance: 'Payments & payouts',
  clients: 'People & history',
  settings: 'Business & team'
};

/**
 * Mini-apps shown on the Home launcher. Each app owns a set of workspace
 * tabs; multi-tab apps get a segmented tab bar inside the app.
 * `size` drives the bento span (lg = 2x2, md = 1x2, sm = 1x1).
 */
export const launcherApps = [
  {
    id: 'book',
    label: 'Book',
    blurb: 'Services, requests and your schedule.',
    icon: CalendarDays,
    tabs: ['services', 'requests', 'staff', 'availability'],
    size: 'lg',
    hue: 'mint',
    tint: ['#f1ff9a', '#cbffb8']
  },
  {
    id: 'buy',
    label: 'Buy',
    blurb: 'Products, orders and stock.',
    icon: ShoppingBag,
    tabs: ['products', 'orders', 'stock'],
    size: 'lg',
    hue: 'sky',
    tint: ['#b7fff0', '#b9e3ff']
  },
  {
    id: 'presence',
    label: 'E-Business',
    blurb: 'Your public pages and social.',
    icon: Globe2,
    tabs: ['website', 'website-book', 'website-buy', 'website-checkout', 'social'],
    size: 'lg',
    hue: 'violet',
    tint: ['#d8ccff', '#d2cbff']
  },
  {
    id: 'business',
    label: 'Office',
    blurb: 'Support, finance, clients and settings.',
    icon: BriefcaseBusiness,
    tabs: ['communications', 'finance', 'clients', 'settings'],
    size: 'lg',
    hue: 'rose',
    tint: ['#d8ccff', '#ffd4f2']
  }
];

export const appForTab = (tab) =>
  launcherApps.find((app) => app.tabs.includes(tab)) || null;

export const LAUNCHER_TAB = 'overview';
