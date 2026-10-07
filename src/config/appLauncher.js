import {
  BookOpen,
  Boxes,
  BriefcaseBusiness,
  CalendarClock,
  CalendarDays,
  ChartColumn,
  ClipboardList,
  CreditCard,
  ChartNoAxesCombined,
  Globe2,
  Home,
  Inbox,
  MessageSquare,
  Package,
  Radio,
  Settings,
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
  communications: MessageSquare,
  finance: CreditCard,
  'finance-reports': ChartNoAxesCombined,
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
  website: 'Banner, profile and details',
  'website-book': 'Services page',
  'website-buy': 'Storefront page',
  'website-checkout': 'Cart flow',
  communications: 'Client messages',
  finance: 'Paid & unpaid records',
  'finance-reports': 'Revenue, profit & conversion',
  analytics: 'Visitors & discovery',
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
    tint: ['#12D97A', '#6EE8AD']
  },
  {
    id: 'buy',
    label: 'Buy',
    blurb: 'Products, orders and stock.',
    icon: ShoppingBag,
    tabs: ['products', 'orders', 'stock'],
    size: 'lg',
    hue: 'sky',
    tint: ['#1E6BFF', '#70A3FF']
  },
  {
    id: 'presence',
    label: 'E-Business',
    blurb: 'Your business profile, Book and Buy.',
    icon: Globe2,
    tabs: ['website', 'website-book', 'website-buy', 'website-checkout'],
    size: 'lg',
    hue: 'violet',
    tint: ['#15181D', '#313740'],
    iconInk: '#F4F7FA'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    blurb: 'Traffic, financial reports and payment records.',
    icon: ChartColumn,
    tabs: ['live-stats', 'analytics', 'finance-reports', 'finance'],
    size: 'md',
    hue: 'sky',
    tint: ['#FFC400', '#FFE16A']
  },
  {
    id: 'business',
    label: 'Office',
    blurb: 'Messages, clients and settings.',
    icon: BriefcaseBusiness,
    tabs: ['communications', 'clients', 'settings'],
    size: 'lg',
    hue: 'mint',
    tint: ['#FF6A1A', '#FFA16B']
  }
];

export const appForTab = (tab) =>
  launcherApps.find((app) => app.tabs.includes(tab)) || null;

export const LAUNCHER_TAB = 'overview';
