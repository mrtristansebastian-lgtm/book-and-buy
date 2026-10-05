import { Button } from '../../../shared/ui/Button';
import { useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, Globe2, Sparkles } from 'lucide-react';
import { navigate, publicPagePath } from '../../../app/routing';
import { useAuth } from '../../auth/AuthContext';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { formatDisplayDate, toDateKey } from '../../../utils/dates';
import {
  FINANCE_PERIODS,
  buildFinanceLedger,
  formatMoney,
  getPeriodBounds
} from '../../finance/utils/financeLedger';
import { buildFinanceMetricView, formatFinanceMetricValue } from '../../finance/utils/financeMetrics';
import { DashboardStat } from '../../../shared/ui/DashboardStat';
import { PeriodCustomPicker } from '../../../shared/ui/PeriodCustomPicker';
import { PeriodSegmentedControl } from '../../../shared/ui/PeriodSegmentedControl';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { useWorkspaceBadges } from '../hooks/useWorkspaceBadges';
import { useLivePresence } from '../../analytics/hooks/useLivePresence';
import { AnalyticsLiveWorldMap } from '../../analytics/components/AnalyticsLiveWorldMap';

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

/** Business Home: greeting + stats. Apps live in the side panel / mobile menu. */
export function OverviewPage() {
  const { user } = useAuth();
  const { workspace, staff, bookings, orders, services } = useWorkspace();
  const { pendingRequests, pendingOrders, unreadSupport } = useWorkspaceBadges();
  const livePresence = useLivePresence();
  const [copied, setCopied] = useState(false);
  const [periodId, setPeriodId] = useState('week');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [customPickerOpen, setCustomPickerOpen] = useState(false);
  const periodOptions = FINANCE_PERIODS.map((period) => ({
    id: period.id,
    label: period.label,
    shortLabel: period.shortLabel
  }));
  const todayKey = toDateKey(new Date());
  const publicHomePath = publicPagePath(workspace.slug || 'your-business', 'home');
  const personName = resolvePersonName({ user, staff, workspace });
  const greeting = `${greetingForHour(new Date().getHours())}, ${personName}`;
  const waiting = pendingRequests + pendingOrders + unreadSupport;
  const currency = workspace.currency || 'R';
  const isFresh =
    !workspace.isDemo &&
    (!(workspace.services || []).length &&
      !(workspace.products || []).length &&
      !workspace.website?.logoUrl &&
      !workspace.website?.heroImageUrl);

  const upcomingBookings = useMemo(() => {
    const { start, end } = getPeriodBounds(periodId, customRange);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const from = Math.max(todayStart.getTime(), start ?? 0);
    return (bookings || []).filter((booking) => {
      if (['cancelled', 'declined'].includes(booking.status)) return false;
      const key = booking.dateKey || booking.date;
      if (!key) return false;
      const [y, m, d] = String(key).split('-').map(Number);
      if (!y || !m || !d) return false;
      const ts = new Date(y, m - 1, d, 12).getTime();
      if (ts < from) return false;
      if (end != null && ts > end) return false;
      return true;
    }).length;
  }, [bookings, periodId, customRange]);

  const revenue = useMemo(() => {
    const ledger = buildFinanceLedger({ bookings, orders, services, brandName: workspace.brandName, currency });
    return {
      paid: buildFinanceMetricView({ ledger, metricId: 'revenue', periodId, customRange, currency }),
      pending: buildFinanceMetricView({ ledger, metricId: 'pending_payments', periodId, customRange, currency })
    };
  }, [bookings, orders, services, workspace.brandName, currency, periodId, customRange]);
  const revenueNote = [revenue.paid.unavailableReason, revenue.paid.coverageNote || revenue.paid.currencyNote].filter(Boolean).join(' ');

  const stats = [
    {
      id: 'revenue',
      label: 'Revenue',
      value: formatFinanceMetricValue(revenue.paid.value, 'money', currency),
      hint:
        !revenue.paid.available
          ? revenue.paid.unavailableReason
          : revenue.pending.value > 0
            ? `${formatMoney(revenue.pending.value, currency)} pending`
            : `${plural(revenue.paid.receiptCount, 'payment', 'payments')}`,
      to: 'finance-reports/revenue',
      featured: true
    },
    {
      id: 'bookings',
      label: 'Upcoming bookings',
      value: upcomingBookings,
      hint: upcomingBookings > 0 ? 'on the schedule' : 'nothing booked',
      to: 'staff'
    },
    {
      id: 'requests',
      label: 'Booking requests',
      value: pendingRequests,
      hint: pendingRequests > 0 ? 'waiting for approval' : 'all clear',
      to: 'requests',
      alert: pendingRequests > 0
    },
    {
      id: 'orders',
      label: 'Orders to ship',
      value: pendingOrders,
      hint: pendingOrders > 0 ? 'to fulfil & ship' : 'up to date',
      to: 'orders',
      alert: pendingOrders > 0
    },
    {
      id: 'messages',
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
    <div className="bb-launcher is-home-only">
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

        <div className="bb-launcher-tools">
          <PeriodSegmentedControl
            variant="period"
            ariaLabel="Stats time period"
            value={periodId}
            options={periodOptions}
            onChange={setPeriodId}
            onCustomSelect={() => setCustomPickerOpen(true)}
          />

          <div className="bb-launcher-live" role="group" aria-label="Public profile actions">
            <span className="bb-launcher-live-status">
            <span className="bb-launcher-live-dot" aria-hidden="true" />
            <span className="bb-launcher-live-label">Live site</span>
            </span>
            <Button action="copy" variant="secondary"
              type="button"
              className="bb-launcher-live-btn bb-home-utility-action"
              onClick={copyPublicLink}
              aria-label="Copy public site link"
            >
              {copied ? <Check size={14} strokeWidth={2.4} /> : <Copy size={14} strokeWidth={2.2} />}
              {copied ? 'Copied' : 'Copy link'}
            </Button>
            <Button action="open" variant="secondary"
              type="button"
              className="bb-launcher-live-btn bb-home-utility-action"
              onClick={() => navigate(publicHomePath)}
            >
              <ExternalLink size={14} strokeWidth={2.2} />
              Open
            </Button>
          </div>
        </div>
      </header>

      <PeriodCustomPicker
        open={customPickerOpen}
        from={customRange.from || ''}
        to={customRange.to || customRange.from || ''}
        onClose={() => setCustomPickerOpen(false)}
        onApply={({ from, to }) => {
          setCustomRange({ from, to });
          setPeriodId('custom');
          setCustomPickerOpen(false);
        }}
      />

      {isFresh ? (
        <section className="bb-launcher-enter" style={{ '--i': 0.5 }} aria-label="Get started">
          <EmptyState
            icon={Sparkles}
            eyebrow="Fresh workspace"
            title="Make it yours"
            description="Add a logo, build your home page, and publish your first post. No sample content — just your business."
            action={
              <Button action="settings" variant="primary"
                type="button"
                className="bb-primary-btn"
                onClick={() => navigate('/dashboard/website')}
              >
                <Globe2 size={16} strokeWidth={2.2} aria-hidden="true" />
                Set up home page
              </Button>
            }
          />
        </section>
      ) : null}

      <section
        className="bb-launcher-stats bb-launcher-enter"
        aria-label="Business at a glance"
        style={{ '--i': 1 }}
      >
        {stats.map((stat) => (
          <DashboardStat
            key={stat.id}
            as="button"
            type="button"
            titleTag="span"
            appearance="operational"
            className={`bb-stat${stat.featured ? ' is-featured' : ''}${stat.alert ? ' is-alert' : ''}`}
            value={stat.value}
            label={stat.label}
            aria-describedby={stat.id === 'revenue' && revenueNote ? 'bb-home-revenue-note' : undefined}
            title={stat.hint}
            onClick={() => navigate(`${workspace.isDemo ? '/demo' : '/dashboard'}/${stat.to}`)}
          />
        ))}
      </section>
      {revenueNote ? <p id="bb-home-revenue-note" className="bb-home-metric-note">{revenueNote}</p> : null}

      <div className="bb-launcher-enter" style={{ '--i': 1.35 }}>
        <AnalyticsLiveWorldMap
          sessions={livePresence.liveSessions}
          total={livePresence.liveCount}
          totalLabel={livePresence.liveCountLabel}
          now={livePresence.activityNow}
          loading={livePresence.loading}
          error={livePresence.error}
          usingDemo={livePresence.usingDemo}
          variant="home"
          onOpenLiveStats={() => navigate('/dashboard/live-stats')}
        />
      </div>
    </div>
  );
}
