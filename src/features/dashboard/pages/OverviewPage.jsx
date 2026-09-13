import { useMemo, useState } from 'react';
import { Check, ChevronRight, Copy, ExternalLink } from 'lucide-react';
import { navigate, publicPagePath } from '../../../app/routing';
import { useAuth } from '../../auth/AuthContext';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { formatDisplayDate, toDateKey } from '../../../utils/dates';

const TODAY_CAP = 8;

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

export function OverviewPage({ pendingRequests = 0, pendingOrders = 0, unreadSupport = 0 }) {
  const { user } = useAuth();
  const { workspace, bookings, staff } = useWorkspace();
  const [copied, setCopied] = useState(false);
  const todayKey = toDateKey(new Date());
  const publicHomePath = publicPagePath(workspace.slug || 'your-business', 'home');
  const personName = resolvePersonName({ user, staff, workspace });
  const greeting = `${greetingForHour(new Date().getHours())}, ${personName}`;

  const todayBookings = useMemo(
    () =>
      bookings
        .filter((booking) => (booking.dateKey || booking.date) === todayKey)
        .filter((booking) => !['declined', 'cancelled'].includes(booking.status))
        .sort((a, b) => String(a.time).localeCompare(String(b.time))),
    [bookings, todayKey]
  );

  const attentionItems = [
    {
      id: 'requests',
      label: 'Booking requests',
      count: pendingRequests,
      href: '/dashboard/requests'
    },
    {
      id: 'orders',
      label: 'Product orders',
      count: pendingOrders,
      href: '/dashboard/orders'
    },
    {
      id: 'support',
      label: 'Support',
      count: unreadSupport,
      href: '/dashboard/communications'
    }
  ].filter((item) => item.count > 0);

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

  const visibleToday = todayBookings.slice(0, TODAY_CAP);
  const hasMoreToday = todayBookings.length > TODAY_CAP;

  return (
    <div className="bb-home">
      <header className="bb-home-header bb-home-enter">
        <div className="bb-page-title-wrap">
          <div className="bb-page-header-glow" aria-hidden="true" />
          <h1 className="bb-page-title bb-home-title">{greeting}</h1>
        </div>
        <p className="bb-muted bb-home-lede m-0">Today · {formatDisplayDate(todayKey)}</p>
      </header>

      <section className="bb-home-block bb-home-enter" style={{ animationDelay: '40ms' }}>
        <h2 className="bb-home-block-title">Needs attention</h2>
        {attentionItems.length === 0 ? (
          <p className="bb-home-clear m-0">You’re clear — nothing waiting.</p>
        ) : (
          <div className="bb-home-attention">
            {attentionItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className="bb-home-attention-row"
                onClick={() => navigate(item.href)}
              >
                <span className="bb-home-attention-label">{item.label}</span>
                <span className="bb-home-attention-count">{item.count}</span>
                <ChevronRight size={16} strokeWidth={2.2} className="bb-home-attention-chevron" />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="bb-home-block bb-home-enter" style={{ animationDelay: '80ms' }}>
        <div className="bb-home-block-head">
          <h2 className="bb-home-block-title m-0">Today</h2>
          <button
            type="button"
            className="bb-ghost-btn bb-home-inline-btn"
            onClick={() => navigate('/dashboard/staff')}
          >
            Open Schedule
          </button>
        </div>

        {todayBookings.length === 0 ? (
          <div className="bb-home-empty">
            <p className="bb-muted m-0">Nothing on the schedule today.</p>
          </div>
        ) : (
          <ul className="bb-home-today-list">
            {visibleToday.map((booking) => (
              <li key={booking.id} className="bb-home-today-row">
                <span className="bb-home-today-time">{booking.time || '—'}</span>
                <div className="bb-home-today-copy">
                  <strong>{booking.serviceName || 'Booking'}</strong>
                  <span className="bb-muted">
                    {[booking.clientName, booking.staffName].filter(Boolean).join(' · ') ||
                      'No client name'}
                  </span>
                </div>
                <span className={`bb-home-status is-${String(booking.status || 'pending')}`}>
                  {booking.status || 'pending'}
                </span>
              </li>
            ))}
          </ul>
        )}

        {hasMoreToday ? (
          <button
            type="button"
            className="bb-home-more"
            onClick={() => navigate('/dashboard/staff')}
          >
            View all on Schedule ({todayBookings.length})
          </button>
        ) : null}
      </section>

      <section className="bb-home-block bb-home-enter" style={{ animationDelay: '120ms' }}>
        <h2 className="bb-home-block-title">Live site</h2>
        <div className="bb-home-live">
          <div className="bb-home-live-copy min-w-0">
            <strong>Public site</strong>
            <span className="bb-muted truncate">#{publicHomePath}</span>
          </div>
          <div className="bb-home-live-actions">
            <button
              type="button"
              className="bb-ghost-btn"
              onClick={copyPublicLink}
              aria-label="Copy public site link"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              className="bb-primary-btn"
              onClick={() => navigate(publicHomePath)}
            >
              <ExternalLink size={15} />
              Open
            </button>
          </div>
        </div>
        <button
          type="button"
          className="bb-home-edit-pages"
          onClick={() => navigate('/dashboard/website')}
        >
          Edit pages
        </button>
      </section>
    </div>
  );
}
