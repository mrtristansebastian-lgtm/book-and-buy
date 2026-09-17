import {
  BookOpen,
  Boxes,
  BriefcaseBusiness,
  CalendarClock,
  CalendarDays,
  ChartColumn,
  ClipboardList,
  CreditCard,
  Globe2,
  Home,
  Inbox,
  MessageSquare,
  Package,
  Radio,
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
  analytics: ChartColumn,
  'live-stats': Radio,
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
  analytics: 'Reports & trends',
  'live-stats': 'Visitors & carts now',
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
    blurb: 'Your public pages and storefront.',
    icon: Globe2,
    tabs: ['website', 'website-book', 'website-buy', 'website-checkout'],
    size: 'lg',
    hue: 'violet',
    tint: ['#d8ccff', '#d2cbff']
  },
  {
    id: 'social',
    label: 'Social',
    blurb: 'Posts, studio and client messages.',
    icon: Share2,
    tabs: ['social', 'communications'],
    size: 'md',
    hue: 'rose',
    tint: ['#ffd4f2', '#d8ccff']
  },
  {
    id: 'analytics',
    label: 'Analytics',
    blurb: 'Live presence and commerce reports.',
    icon: ChartColumn,
    tabs: ['live-stats', 'analytics'],
    size: 'md',
    hue: 'sky',
    tint: ['#b9e3ff', '#cbffb8']
  },
  {
    id: 'business',
    label: 'Office',
    blurb: 'Finance, clients and settings.',
    icon: BriefcaseBusiness,
    tabs: ['finance', 'clients', 'settings'],
    size: 'lg',
    hue: 'mint',
    tint: ['#cbffb8', '#f1ff9a']
  }
];

export const appForTab = (tab) =>
  launcherApps.find((app) => app.tabs.includes(tab)) || null;

export const LAUNCHER_TAB = 'overview';
