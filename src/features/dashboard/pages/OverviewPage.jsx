import { useMemo, useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { navigate, publicPagePath } from '../../../app/routing';
import { E_BUSINESS_PAGES, E_BUSINESS_PLATFORM_NAME } from '../../../config/eBusinessPlatform';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { formatDisplayDate, toDateKey } from '../../../utils/dates';

export function OverviewPage({ pendingRequests = 0, pendingOrders = 0, unreadSupport = 0 }) {
  const { workspace, bookings } = useWorkspace();
  const [copied, setCopied] = useState('');
  const todayKey = toDateKey(new Date());

  const todayBookings = useMemo(
    () =>
      bookings
        .filter((booking) => (booking.dateKey || booking.date) === todayKey)
        .filter((booking) => !['declined', 'cancelled'].includes(booking.status))
        .sort((a, b) => String(a.time).localeCompare(String(b.time))),
    [bookings, todayKey]
  );

  const copyLink = async (pageId) => {
    const path = publicPagePath(workspace.slug, pageId);
    const url = `${window.location.origin}${window.location.pathname}#${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(pageId);
      window.setTimeout(() => setCopied(''), 1600);
    } catch {
      navigate(path);
    }
  };

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <h1 className="bb-page-title text-3xl md:text-4xl m-0">Mission control</h1>
        <p className="bb-muted m-0 max-w-2xl">
          Queues and share links for {workspace.brandName} — not a fake analytics wall.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        {[
          {
            label: 'Booking requests',
            value: String(pendingRequests),
            href: '/dashboard/services',
            hint: 'Needs triage'
          },
          {
            label: 'Product orders',
            value: String(pendingOrders),
            href: '/dashboard/products',
            hint: 'Awaiting fulfilment'
          },
          {
            label: 'Support threads',
            value: String(unreadSupport),
            href: '/dashboard/communications',
            hint: 'Unread'
          }
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            className="bb-panel text-left p-5 grid gap-2"
            onClick={() => navigate(item.href)}
          >
            <span className="bb-muted text-sm">{item.label}</span>
            <span className="bb-page-title text-3xl">{item.value}</span>
            <span className="text-xs font-semibold text-black/40">{item.hint}</span>
          </button>
        ))}
      </section>

      <section className="bb-panel p-5 grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="bb-page-title text-xl m-0">Today on Schedule</h2>
            <p className="bb-muted m-0 mt-1 text-sm">{formatDisplayDate(todayKey)}</p>
          </div>
          <button type="button" className="bb-ghost-btn" onClick={() => navigate('/dashboard/staff')}>
            Open Schedule
          </button>
        </div>
        {todayBookings.length === 0 ? (
          <p className="bb-muted m-0 text-sm">No bookings on the board for today.</p>
        ) : (
          <div className="grid gap-2">
            {todayBookings.slice(0, 6).map((booking) => (
              <div
                key={booking.id}
                className="rounded-xl border border-black/8 px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <div className="grid gap-0.5">
                  <strong>
                    {booking.time} · {booking.serviceName}
                  </strong>
                  <span className="bb-muted">
                    {booking.clientName}
                    {booking.staffName ? ` · ${booking.staffName}` : ''}
                  </span>
                </div>
                <span className="text-xs font-bold uppercase tracking-wide">{booking.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bb-panel p-5 grid gap-4">
        <div>
          <h2 className="bb-page-title text-xl m-0">{E_BUSINESS_PLATFORM_NAME}</h2>
          <p className="bb-muted m-0 mt-1 text-sm">
            Share Home, Book, Buy, and Social — or open the live public page.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {E_BUSINESS_PAGES.map((page) => (
            <div
              key={page.id}
              className="rounded-xl border border-black/8 px-3 py-3 flex items-center justify-between gap-2"
            >
              <div className="grid gap-0.5 min-w-0">
                <strong className="text-sm">{page.label}</strong>
                <span className="bb-muted text-xs truncate">
                  #{publicPagePath(workspace.slug, page.id)}
                </span>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  type="button"
                  className="bb-ghost-btn px-3 py-2"
                  aria-label={`Copy ${page.label} link`}
                  onClick={() => copyLink(page.id)}
                >
                  {copied === page.id ? <Check size={15} /> : <Copy size={15} />}
                </button>
                <button
                  type="button"
                  className="bb-ghost-btn px-3 py-2"
                  aria-label={`Open ${page.label}`}
                  onClick={() => navigate(publicPagePath(workspace.slug, page.id))}
                >
                  <ExternalLink size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
