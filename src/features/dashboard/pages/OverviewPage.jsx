import { useMemo, useState } from 'react';
import {
  CalendarCheck,
  Check,
  Copy,
  ExternalLink,
  Inbox,
  MessageSquare,
  Package,
  Wallet
} from 'lucide-react';
import { navigate, publicPagePath } from '../../../app/routing';
import { launcherApps } from '../../../config/appLauncher';
import { useAuth } from '../../auth/AuthContext';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { formatDisplayDate, toDateKey } from '../../../utils/dates';
import {
  buildFinanceLedger,
  computeFinanceMetrics,
  filterLedgerByPeriod,
  formatMoney
} from '../../finance/utils/financeLedger';
import { useWorkspaceBadges } from '../hooks/useWorkspaceBadges';
import { AppTile } from '../components/AppTile';

function greetingForHour(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function firstNameFrom(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.includes('@')) return raw.split('@')[0].split(/[._-]/)[0] || '';
  return raw.split(/\s+/)[0] || '';
}

function resolvePersonName({ user, staff = [], workspace }) {
  const email = String(user?.email || '').trim().toLowerCase();
  if (email) {
    const match = (staff || []).find(
      (member) => String(member.email || '').trim().toLowerCase() === email
    );
    if (match?.name) return firstNameFrom(match.name);
  }
  const owner = (staff || []).find((member) => member.accessRole === 'Owner');
  if (owner?.name) return firstNameFrom(owner.name);
  if (user?.displayName) return firstNameFrom(user.displayName);
  if (email) return firstNameFrom(email);
  return firstNameFrom(workspace?.brandName) || 'there';
}

function plural(count, one, many) {
  return `${count} ${count === 1 ? one : many}`;
}

/** Home launcher: greeting, business stats strip, and every mini-app as a widget tile. */
export function OverviewPage() {
  const { user } = useAuth();
  const { workspace, staff, bookings, orders, services } = useWorkspace();
  const { badgeFor, pendingRequests, pendingOrders, unreadSupport } = useWorkspaceBadges();
  const [copied, setCopied] = useState(false);
  const todayKey = toDateKey(new Date());
  const publicHomePath = publicPagePath(workspace.slug || 'your-business', 'home');
  const personName = resolvePersonName({ user, staff, workspace });
  const greeting = `${greetingForHour(new Date().getHours())}, ${personName}`;
  const waiting = pendingRequests + pendingOrders + unreadSupport;
  const currency = workspace.currency || 'R';

  const todayBookings = useMemo(
    () =>
      (bookings || []).filter(
        (booking) =>
          (booking.dateKey || booking.date) === todayKey &&
          !['cancelled', 'declined'].includes(booking.status)
      ).length,
    [bookings, todayKey]
  );

  const weekRevenue = useMemo(() => {
    const ledger = buildFinanceLedger({ bookings, orders, services, brandName: workspace.brandName });
    return computeFinanceMetrics(filterLedgerByPeriod(ledger, 'week'), 'week');
  }, [bookings, orders, services, workspace.brandName]);

  const stats = [
    {
      id: 'revenue',
      icon: Wallet,
      label: 'Revenue this week',
      value: formatMoney(weekRevenue.totalRevenueInCents, currency),
      hint:
        weekRevenue.pendingInCents > 0
          ? `${formatMoney(weekRevenue.pendingInCents, currency)} pending`
          : `${plural(weekRevenue.paidCount, 'payment', 'payments')}`,
      to: 'finance',
      featured: true
    },
    {
      id: 'today',
      icon: CalendarCheck,
      label: 'Bookings today',
      value: todayBookings,
      hint: todayBookings > 0 ? 'on the schedule' : 'nothing booked',
      to: 'staff'
    },
    {
      id: 'requests',
      icon: Inbox,
      label: 'Requests',
      value: pendingRequests,
      hint: pendingRequests > 0 ? 'waiting for approval' : 'all clear',
      to: 'requests',
      alert: pendingRequests > 0
    },
    {
      id: 'orders',
      icon: Package,
      label: 'Open orders',
      value: pendingOrders,
      hint: pendingOrders > 0 ? 'to fulfil & ship' : 'up to date',
      to: 'orders',
      alert: pendingOrders > 0
    },
    {
      id: 'messages',
      icon: MessageSquare,
      label: 'Unread messages',
      value: unreadSupport,
      hint: unreadSupport > 0 ? 'from clients' : 'inbox clear',
      to: 'communications',
      alert: unreadSupport > 0
    }
  ];

  const copyPublicLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}#${publicHomePath}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      navigate(publicHomePath);
    }
  };

  return (
    <div className="bb-launcher">
      <header className="bb-launcher-header bb-launcher-enter" style={{ '--i': 0 }}>
        <div className="bb-launcher-header-copy">
          <div className="bb-page-title-wrap">
            <div className="bb-page-header-glow" aria-hidden="true" />
            <h1 className="bb-page-title m-0">{greeting}</h1>
          </div>
          <p className="bb-muted m-0 bb-launcher-lede">
            {formatDisplayDate(todayKey)}
            <span className="bb-launcher-dot" aria-hidden="true" />
            {waiting > 0 ? `${plural(waiting, 'thing', 'things')} need you` : 'You’re all clear'}
          </p>
        </div>

        <div className="bb-launcher-live">
          <span className="bb-launcher-live-dot" aria-hidden="true" />
          <span className="bb-launcher-live-label">Live site</span>
          <button
            type="button"
            className="bb-launcher-live-btn"
            onClick={copyPublicLink}
            aria-label="Copy public site link"
          >
            {copied ? <Check size={14} strokeWidth={2.4} /> : <Copy size={14} strokeWidth={2.2} />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <button
            type="button"
            className="bb-launcher-live-btn is-primary"
            onClick={() => navigate(publicHomePath)}
          >
            <ExternalLink size={14} strokeWidth={2.2} />
            Open
          </button>
        </div>
      </header>

      <section
        className="bb-launcher-stats bb-launcher-enter"
        aria-label="Business at a glance"
        style={{ '--i': 1 }}
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <button
              key={stat.id}
              type="button"
              className={`bb-stat${stat.featured ? ' is-featured' : ''}${stat.alert ? ' is-alert' : ''}`}
              onClick={() => navigate(`/dashboard/${stat.to}`)}
            >
              <span className="bb-stat-head">
                <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
                <span className="bb-stat-label">{stat.label}</span>
              </span>
              <span className="bb-stat-value">{stat.value}</span>
              <span className="bb-stat-hint">{stat.hint}</span>
            </button>
          );
        })}
      </section>

      <section
        className="bb-launcher-grid"
        aria-label="Apps"
        style={{ '--n': launcherApps.length }}
      >
        {launcherApps.map((app, index) => (
          <AppTile key={app.id} app={app} badgeFor={badgeFor} index={index + 1} />
        ))}
      </section>
    </div>
  );
}
