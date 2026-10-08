import { Button } from '../../shared/ui/Button';
import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CreditCard,
  Globe2,
  PanelTop,
  Truck,
  Lock,
  MapPin,
  NotebookTabs,
  Receipt,
  Search,
  Settings2,
  Shield,
  ShoppingCart,
  Star,
  Store,
  Users,
  WalletCards
} from 'lucide-react';
import { navigate, workspacePagePath } from '../../app/routing';
import { PageBackButton } from '../../shared/ui/PageBackButton';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { WorkspaceSaveReview } from './WorkspaceSaveReview';
import {
  DEFAULT_SETTINGS_SECTION,
  SETTINGS_SECTIONS,
  isSettingsSection,
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
import { MarketsSettingsPage } from './pages/MarketsSettingsPage';
import { ShippingSettingsPage } from './pages/ShippingSettingsPage';
import { ReviewsSettingsPage } from './pages/ReviewsSettingsPage';
import { DomainsSettingsPage } from './pages/DomainsSettingsPage';
import { PoliciesSettingsPage } from './pages/PoliciesSettingsPage';
import { AccountSettingsPage } from './pages/AccountSettingsPage';
import { AISettingsPage } from './pages/AISettingsPage';
import { ButlerSettingsPage } from './pages/ButlerSettingsPage';
import { getMarkets } from '../../utils/markets';
import { marketCountryName } from '../../config/marketCountries';
import { BranchesSettingsPage } from './pages/BranchesSettingsPage';

const ICONS = {
  ai: Shield,
  butler: Settings2,
  general: Store,
  plan: NotebookTabs,
  billing: Receipt,
  users: Users,
  payments: WalletCards,
  bookings: Settings2,
  checkout: ShoppingCart,
  notifications: Bell,
  locations: MapPin,
  markets: Globe2,
  shipping: Truck,
  reviews: Star,
  domains: PanelTop,
  policies: Shield,
  account: Lock
};

const COPY = {
  ai: { title: 'AI connections', lede: 'Your AI, connected to your business.' },
  butler: { title: 'Book and Buy Butler', lede: 'Your assistant, routine permissions and activity.' },
  markets: { title: 'Markets', lede: 'Where you sell, what you offer and how it arrives.' },
  shipping: { title: 'Shipping', lede: 'Reusable delivery profiles for your products and markets.' },
  general: {
    title: 'Business settings',
    lede: 'Business identity, contact details, timezone and opening hours.'
  },
  plan: {
    title: 'Plan',
    lede: 'Your profile access and Book and Buy plan information.'
  },
  billing: {
    title: 'Billing',
    lede: 'Profile billing information, separate from your customer payments.'
  },
  users: {
    title: 'Users',
    lede: 'Team profiles for scheduling. Profiles do not grant sign-in access.'
  },
  payments: {
    title: 'Payments',
    lede: 'Choose how clients pay — Stripe, PayPal, Paystack, and cash.'
  },
  bookings: {
    title: 'Bookings',
    lede: 'Booking policies and client rescheduling. Business hours live in Business settings.'
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
    lede: 'Your primary venue, map and business branches.'
  },
  reviews: {
    title: 'Reviews',
    lede: 'Real experiences, shared by your customers.'
  },
  domains: {
    title: 'Domains',
    lede: 'Your business address, domain ownership and secure connections.'
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

const MOBILE_MQ = '(max-width: 960px)';

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

export function SettingsShell({ section: sectionProp, detail = '', nestedDetail = '' }) {
  const { workspace, saveStatus, saveError, saveConflict, reviewSaveConflict, resolveSaveConflict, retrySave } = useWorkspace();
  const [saveReview,setSaveReview] = useState(null), [reviewError,setReviewError] = useState(''), [reviewBusy,setReviewBusy] = useState(false);
  const reviewChanges = async () => {setReviewBusy(true);setReviewError('');try {setSaveReview(await reviewSaveConflict());} catch (error) {setReviewError(error.message || 'The latest version could not be loaded. Please retry.');} finally {setReviewBusy(false);} };
  const hasExplicitSection = isSettingsSection(sectionProp);
  const section = resolveSettingsSection(sectionProp || DEFAULT_SETTINGS_SECTION);
  const [query, setQuery] = useState('');
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_MQ).matches : false
  );
  const marketDetail = section === 'markets' && detail;
  const currentMarket = marketDetail && getMarkets(workspace.website || {}).find(market => encodeURIComponent(market.id) === detail);
  const shippingDetail = section === 'shipping' && detail;
  const currentProfile = shippingDetail && (workspace.website?.shippingProfiles || []).find(profile => encodeURIComponent(profile.id) === detail);
  const branchesView = section === 'locations' && detail === 'branches';
  const currentBranch = branchesView && (workspace.website?.branches || []).find(branch => encodeURIComponent(branch.id) === nestedDetail);
  const copy = marketDetail ? detail === 'new'
    ? { title: 'Add a market', lede: 'Choose a country, then make it yours.' }
    : { title: currentMarket ? marketCountryName(currentMarket.countryCode) : 'Market unavailable', lede: 'Catalog and delivery, tailored to this market.' }
    : shippingDetail ? { title: detail === 'new' ? 'Add a shipping profile' : currentProfile ? currentProfile.name || 'Shipping profile' : 'Profile unavailable', lede: 'Delivery rates, products and connected markets.' }
    : branchesView ? { title: nestedDetail === 'new' ? 'Add a branch' : nestedDetail ? currentBranch?.name || 'Branch unavailable' : 'Branches', lede: 'Your business, in more than one place.' }
    : COPY[section] || COPY.general;

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Desktop always needs a section URL so the split pane stays in sync.
  useEffect(() => {
    if (hasExplicitSection || isMobile) return;
    navigate(workspacePagePath(`settings/${DEFAULT_SETTINGS_SECTION}`), { replace: true });
  }, [hasExplicitSection, isMobile]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SETTINGS_SECTIONS;
    return SETTINGS_SECTIONS.filter((item) => item.label.toLowerCase().includes(q));
  }, [query]);

  const go = (id) => navigate(workspacePagePath(`settings/${id}`));
  const goList = () => navigate(workspacePagePath(marketDetail ? 'settings/markets' : shippingDetail ? 'settings/shipping' : branchesView ? nestedDetail ? 'settings/locations/branches' : 'settings/locations' : 'settings'));

  const activeId = hasExplicitSection ? section : isMobile ? null : DEFAULT_SETTINGS_SECTION;
  const mobileView = hasExplicitSection ? 'detail' : 'index';

  let body = null;
  if (section === 'ai') body = <AISettingsPage />;
  else if (section === 'general') body = <GeneralSettingsPage />;
  else if (section === 'plan') body = <PlanSettingsPage />;
  else if (section === 'billing') body = <BillingSettingsPage />;
  else if (section === 'users') body = <UsersSettingsPage />;
  else if (section === 'payments') body = <PaymentsSettingsPage />;
  else if (section === 'butler') body = <ButlerSettingsPage />;
  else if (section === 'bookings') body = <BookingsSettingsPage />;
  else if (section === 'checkout') body = <CheckoutSettingsPage />;
  else if (section === 'notifications') body = <NotificationsSettingsPage />;
  else if (section === 'locations') body = branchesView ? <BranchesSettingsPage key={nestedDetail || 'branches-index'} detail={nestedDetail} /> : <LocationsSettingsPage />;
  else if (section === 'markets') body = <MarketsSettingsPage key={detail || 'index'} detail={detail} />;
  else if (section === 'shipping') body = <ShippingSettingsPage key={detail || 'shipping-index'} detail={detail} />;
  else if (section === 'reviews') body = <ReviewsSettingsPage />;
  else if (section === 'domains') body = <DomainsSettingsPage />;
  else if (section === 'policies') body = <PoliciesSettingsPage />;
  else if (section === 'account') body = <AccountSettingsPage />;

  return (
    <div className={`bb-settings is-mobile-${mobileView}`} data-settings-section={section}>
      <aside className="bb-settings-rail" aria-label="Settings categories">
        <header className="bb-settings-mobile-index-head">
          <div className="bb-page-title-wrap">
            <PageBackButton />
            <span className="bb-page-title-main">
              <div className="bb-page-header-glow" aria-hidden="true" />
              <h1 className="bb-page-title">Settings</h1>
            </span>
          </div>
          <p className="bb-muted">Business, billing, and account.</p>
        </header>

        <div className="bb-settings-search-wrap bb-search-field">
          <Search size={14} className="bb-settings-search-icon bb-search-field-icon" aria-hidden />
          <input
            className="bb-settings-search native-search-input"
            type="search"
            placeholder="Search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search settings"
          />
        </div>

        <nav className="bb-settings-nav">
          {filtered.map((item) => {
            const Icon = ICONS[item.id] || CreditCard;
            const active = item.id === activeId;
            return (
              <button
                key={item.id}
                type="button"
                className={`bb-settings-nav-item ${active ? 'is-active' : ''}`}
                onClick={() => go(item.id)}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={24} strokeWidth={1.85} className="bb-settings-nav-icon" />
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
          <div className="bb-page-title-wrap">
            <PageBackButton ariaLabel={marketDetail ? 'Back to Markets' : shippingDetail ? 'Back to Shipping' : branchesView ? nestedDetail ? 'Back to Branches' : 'Back to Locations' : 'Back to Settings'} onClick={goList} />
            <span className="bb-page-title-main">
              <div className="bb-page-header-glow" aria-hidden="true" />
              <h1 className="bb-page-title">{copy.title}</h1>
            </span>
            {!saveError && <span className="bb-settings-inline-status" role="status" title={workspace.isDemo ? 'Demo changes save on this device' : 'Changes save automatically'}>{workspace.isDemo ? 'Demo · saved locally' : saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Auto-save on'}</span>}
          </div>
          <p className="bb-muted">{copy.lede}</p>
        </header>
        {saveError && <div className={`bb-settings-save-state is-${saveStatus}`} role={saveError ? 'alert' : 'status'}>
          <span>{saveError || (workspace.isDemo ? 'Demo changes save on this device' : saveStatus === 'saving' ? 'Saving changes…' : saveStatus === 'saved' ? 'All changes saved' : 'Changes save automatically')}</span>
          {saveError && <Button action={saveConflict ? 'view' : 'retry'} variant="primary" type="button" className="bb-ghost-btn" busy={reviewBusy} onClick={saveConflict ? reviewChanges : retrySave}>{saveConflict ? 'Review changes' : 'Retry save'}</Button>}
        </div>}
        {reviewError && <p role="alert" className="bb-muted">{reviewError}</p>}
        {body}
      </div>
      {saveReview && <WorkspaceSaveReview review={saveReview} onResolve={resolveSaveConflict} onClose={() => setSaveReview(null)} />}
    </div>
  );
}
