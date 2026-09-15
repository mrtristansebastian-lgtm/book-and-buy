import { useEffect, useState } from 'react';
import {
  BriefcaseBusiness,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Ellipsis,
  Home,
  Inbox,
  MessageSquare,
  Package,
  Boxes,
  Share2,
  Users,
  Settings,
  Globe2,
  X
} from 'lucide-react';
import {
  mobileDockItems,
  workspaceGroupLabels,
  workspaceTabGroups,
  workspaceTabIds,
  workspaceTabLabels,
  workspaceTabParents
} from '../../../config/routeConfig';
import { APP_NAME } from '../../../config/appConfig';
import { navigate } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';

const ICONS = {
  overview: Home,
  services: BriefcaseBusiness,
  requests: Inbox,
  staff: CalendarDays,
  availability: CalendarClock,
  products: Package,
  orders: ClipboardList,
  stock: Boxes,
  website: Globe2,
  social: Share2,
  communications: MessageSquare,
  finance: CreditCard,
  clients: Users,
  settings: Settings
};

function groupTabs() {
  const groups = {};
  for (const tab of workspaceTabIds) {
    const group = workspaceTabGroups[tab];
    if (!groups[group]) groups[group] = [];
    groups[group].push(tab);
  }
  return groups;
}

export function OwnerWorkspaceShell({ tab, children }) {
  const groups = groupTabs();
  const [moreOpen, setMoreOpen] = useState(false);
  const { workspace, threads, bookings, orders, exitDemoMode, resetDemoWorkspace, startOwnerOnboarding } =
    useWorkspace();
  const unreadSupport = (threads || []).filter((thread) => thread.unread).length;
  const pendingRequests = (bookings || []).filter((booking) =>
    ['pending', 'waitlist'].includes(booking.status)
  ).length;
  const pendingOrders = (orders || []).filter((order) =>
    ['pending', 'accepted', 'shipped'].includes(order.status)
  ).length;

  useEffect(() => {
    setMoreOpen(false);
  }, [tab]);

  useEffect(() => {
    if (!moreOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setMoreOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  const badgeFor = (id) => {
    if (id === 'communications' && unreadSupport > 0) return unreadSupport;
    if (id === 'requests' && pendingRequests > 0) return pendingRequests;
    if (id === 'orders' && pendingOrders > 0) return pendingOrders;
    return 0;
  };

  const go = (id) => {
    setMoreOpen(false);
    navigate(`/dashboard/${id}`);
  };

  const primaryDockIds = new Set(
    mobileDockItems.filter((item) => item.kind === 'tab').map((item) => item.id)
  );
  const moreActive = moreOpen || !primaryDockIds.has(tab);

  return (
    <div
      className={`bb-shell native-ui ${tab === 'communications' ? 'is-support-flush' : 'min-h-screen'}${
        moreOpen ? ' is-more-open' : ''
      }`}
    >
      {workspace.isDemo ? (
        <div className="bb-demo-banner border-b border-black/8 bg-white px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="bb-primary-btn py-1 px-3 text-xs pointer-events-none">Demo mode</span>
            <span className="bb-muted">
              Exploring <strong className="text-ink">{workspace.brandName}</strong> as a guest.
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="bb-ghost-btn py-1.5 px-3 text-sm" onClick={() => resetDemoWorkspace()}>
              Reset demo
            </button>
            <button
              type="button"
              className="bb-ghost-btn py-1.5 px-3 text-sm"
              onClick={() => {
                exitDemoMode();
                navigate('/');
              }}
            >
              Exit demo
            </button>
            <button
              type="button"
              className="bb-ink-btn py-1.5 px-3 text-sm"
              onClick={() => {
                startOwnerOnboarding();
                navigate('/onboarding');
              }}
            >
              Create account
            </button>
          </div>
        </div>
      ) : null}

      <div className="bb-owner-layout">
        {moreOpen ? (
          <button
            type="button"
            className="bb-owner-nav-backdrop"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
          />
        ) : null}

        <aside
          className={`bb-owner-sidebar${moreOpen ? ' is-open' : ''}`}
          id="bb-owner-more-menu"
        >
          <div className="bb-owner-sidebar-top">
            <div className="px-2 min-w-0">
              <div className="bb-brand-mark text-xl">{APP_NAME}</div>
              <p className="bb-muted text-xs m-0 mt-1 truncate">
                {workspace.brandName || 'Owner workspace'}
              </p>
            </div>
            <button
              type="button"
              className="bb-owner-nav-close"
              aria-label="Close menu"
              onClick={() => setMoreOpen(false)}
            >
              <X size={18} strokeWidth={2.2} />
            </button>
          </div>

          <nav className="bb-owner-sidebar-nav">
            {Object.entries(groups).map(([groupId, tabs]) => (
              <div key={groupId} className="grid gap-1">
                <div className="bb-owner-nav-group-label">
                  {workspaceGroupLabels[groupId]}
                </div>
                {tabs.map((id) => {
                  const Icon = ICONS[id];
                  const nested = Boolean(workspaceTabParents[id]);
                  const badge = badgeFor(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`bb-nav-item ${nested ? 'is-nested' : ''}`}
                      aria-current={tab === id ? 'page' : undefined}
                      onClick={() => go(id)}
                    >
                      <Icon size={nested ? 15 : 17} strokeWidth={2.2} />
                      <span>{workspaceTabLabels[id]}</span>
                      {badge > 0 ? (
                        <span className="ml-auto text-[0.65rem] font-bold">{badge}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        <div className="bb-owner-content">
          <main className={`bb-owner-main ${tab === 'communications' ? 'is-flush' : ''}`}>
            {children}
          </main>
        </div>
      </div>

      <nav className="bb-mobile-dock" aria-label="Primary">
        {mobileDockItems.map((item) => {
          if (item.kind === 'more') {
            return (
              <button
                key={item.id}
                type="button"
                className="bb-mobile-dock-item"
                aria-current={moreActive ? 'true' : undefined}
                aria-expanded={moreOpen}
                aria-controls="bb-owner-more-menu"
                onClick={() => setMoreOpen((open) => !open)}
              >
                <Ellipsis size={20} strokeWidth={2.2} />
                <span>{item.label}</span>
              </button>
            );
          }

          const Icon = ICONS[item.id] || Home;
          const badge = badgeFor(item.id);
          return (
            <button
              key={item.id}
              type="button"
              className="bb-mobile-dock-item"
              aria-current={!moreOpen && tab === item.id ? 'page' : undefined}
              onClick={() => go(item.id)}
            >
              <span className="bb-mobile-dock-icon-wrap">
                <Icon size={20} strokeWidth={2.2} />
                {badge > 0 ? (
                  <span className="bb-mobile-dock-badge">{badge > 9 ? '9+' : badge}</span>
                ) : null}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
