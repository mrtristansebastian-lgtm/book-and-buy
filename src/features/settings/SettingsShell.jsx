import { useMemo, useState } from 'react';
import {
  Bell,
  CreditCard,
  Globe2,
  Lock,
  MapPin,
  NotebookTabs,
  Receipt,
  Search,
  Settings2,
  Shield,
  ShoppingCart,
  Store,
  Users,
  WalletCards
} from 'lucide-react';
import { navigate } from '../../app/routing';
import { useWorkspace } from '../workspace/WorkspaceContext';
import {
  DEFAULT_SETTINGS_SECTION,
  SETTINGS_SECTIONS,
  resolveSettingsSection
} from './settingsNav';
import { GeneralSettingsPage } from './pages/GeneralSettingsPage';
import { PlanSettingsPage } from './pages/PlanSettingsPage';
import { BillingSettingsPage } from './pages/BillingSettingsPage';
import { UsersSettingsPage } from './pages/UsersSettingsPage';
import { PaymentsSettingsPage } from './pages/PaymentsSettingsPage';
import { BookingsSettingsPage } from './pages/BookingsSettingsPage';
import { CheckoutSettingsPage } from './pages/CheckoutSettingsPage';
import { NotificationsSettingsPage } from './pages/NotificationsSettingsPage';
import { LocationsSettingsPage } from './pages/LocationsSettingsPage';
import { DomainsSettingsPage } from './pages/DomainsSettingsPage';
import { PoliciesSettingsPage } from './pages/PoliciesSettingsPage';
import { AccountSettingsPage } from './pages/AccountSettingsPage';

const ICONS = {
  general: Store,
  plan: NotebookTabs,
  billing: Receipt,
  users: Users,
  payments: WalletCards,
  bookings: Settings2,
  checkout: ShoppingCart,
  notifications: Bell,
  locations: MapPin,
  domains: Globe2,
  policies: Shield,
  account: Lock
};

const COPY = {
  general: {
    title: 'General',
    lede: 'Business identity, currency, and timezone.'
  },
  plan: {
    title: 'Plan',
    lede: 'Choose the Book and Buy plan that fits your studio.'
  },
  billing: {
    title: 'Billing',
    lede: 'Subscription payment method and invoices for Book and Buy.'
  },
  users: {
    title: 'Users',
    lede: 'Team roster and access roles.'
  },
  payments: {
    title: 'Payments',
    lede: 'Client checkout gateways — Stripe, Paystack, EFT, and cash.'
  },
  bookings: {
    title: 'Bookings',
    lede: 'Booking policies. Hours and day status stay in Availability.'
  },
  checkout: {
    title: 'Checkout',
    lede: 'What clients enter when they book or buy.'
  },
  notifications: {
    title: 'Notifications',
    lede: 'Owner alerts and upcoming client reminders.'
  },
  locations: {
    title: 'Locations',
    lede: 'Your primary venue address and map.'
  },
  domains: {
    title: 'Domains',
    lede: 'Public slug today; custom domain when ready.'
  },
  policies: {
    title: 'Policies',
    lede: 'Cancellation, terms, and privacy copy for clients.'
  },
  account: {
    title: 'Account',
    lede: 'Sign-in and workspace data controls.'
  }
};

function initials(name = '') {
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'BB';
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export function SettingsShell({ section: sectionProp }) {
  const { workspace } = useWorkspace();
  const section = resolveSettingsSection(sectionProp || DEFAULT_SETTINGS_SECTION);
  const [query, setQuery] = useState('');
  const copy = COPY[section] || COPY.general;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SETTINGS_SECTIONS;
    return SETTINGS_SECTIONS.filter((item) => item.label.toLowerCase().includes(q));
  }, [query]);

  const go = (id) => navigate(`/dashboard/settings/${id}`);

  let body = null;
  if (section === 'general') body = <GeneralSettingsPage />;
  else if (section === 'plan') body = <PlanSettingsPage />;
  else if (section === 'billing') body = <BillingSettingsPage />;
  else if (section === 'users') body = <UsersSettingsPage />;
  else if (section === 'payments') body = <PaymentsSettingsPage />;
  else if (section === 'bookings') body = <BookingsSettingsPage />;
  else if (section === 'checkout') body = <CheckoutSettingsPage />;
  else if (section === 'notifications') body = <NotificationsSettingsPage />;
  else if (section === 'locations') body = <LocationsSettingsPage />;
  else if (section === 'domains') body = <DomainsSettingsPage />;
  else if (section === 'policies') body = <PoliciesSettingsPage />;
  else if (section === 'account') body = <AccountSettingsPage />;

  return (
    <div className="bb-settings">
      <aside className="bb-settings-rail" aria-label="Settings categories">
        <div className="bb-settings-search-wrap">
          <Search size={14} className="bb-settings-search-icon" aria-hidden />
          <input
            className="bb-settings-search"
            type="search"
            placeholder="Search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search settings"
          />
        </div>

        <select
          className="bb-settings-mobile-select"
          value={section}
          onChange={(event) => go(event.target.value)}
          aria-label="Settings section"
        >
          {SETTINGS_SECTIONS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>

        <nav className="bb-settings-nav">
          {filtered.map((item) => {
            const Icon = ICONS[item.id] || CreditCard;
            const active = item.id === section;
            return (
              <button
                key={item.id}
                type="button"
                className={`bb-settings-nav-item ${active ? 'is-active' : ''}`}
                onClick={() => go(item.id)}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={16} strokeWidth={2} className="bb-settings-nav-icon" />
                <span>{item.label}</span>
              </button>
            );
          })}
          {filtered.length === 0 ? (
            <p className="bb-muted m-0 text-sm px-2 py-3">No matching settings.</p>
          ) : null}
        </nav>

        <div className="bb-settings-rail-foot">
          <div className="bb-settings-avatar" aria-hidden>
            {initials(workspace.brandName)}
          </div>
          <div className="min-w-0">
            <strong>{workspace.brandName || 'Business'}</strong>
            <span>{workspace.email || 'No email set'}</span>
          </div>
        </div>
      </aside>

      <div className="bb-settings-main">
        <header className="bb-settings-main-head">
          <h1 className="bb-page-title">{copy.title}</h1>
          <p className="bb-muted">{copy.lede}</p>
        </header>
        {body}
      </div>
    </div>
  );
}
