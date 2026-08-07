import {
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Home,
  Inbox,
  MessageSquare,
  Package,
  Share2,
  Users,
  UserRound,
  Globe2
} from 'lucide-react';
import {
  mobilePrimaryTabs,
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
  products: Package,
  orders: ClipboardList,
  website: Globe2,
  social: Share2,
  communications: MessageSquare,
  finance: CreditCard,
  clients: Users,
  profile: UserRound
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
  const { workspace, threads, bookings, orders, exitDemoMode, resetDemoWorkspace, startOwnerOnboarding } =
    useWorkspace();
  const unreadSupport = (threads || []).filter((thread) => thread.unread).length;
  const pendingRequests = (bookings || []).filter((booking) =>
    ['pending', 'waitlist'].includes(booking.status)
  ).length;
  const pendingOrders = (orders || []).filter((order) =>
    ['pending', 'accepted', 'shipped'].includes(order.status)
  ).length;

  const badgeFor = (id) => {
    if (id === 'communications' && unreadSupport > 0) return unreadSupport;
    if (id === 'requests' && pendingRequests > 0) return pendingRequests;
    if (id === 'orders' && pendingOrders > 0) return pendingOrders;
    return 0;
  };

  return (
    <div className="bb-shell native-ui min-h-screen">
      {workspace.isDemo ? (
        <div className="sticky top-0 z-40 border-b border-black/8 bg-white/95 backdrop-blur px-4 py-2 flex flex-wrap items-center justify-between gap-2">
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

      <div
        className="bb-owner-layout mx-auto max-w-[1400px] grid gap-0 min-h-screen"
        style={{ gridTemplateColumns: '240px 1fr' }}
      >
        <aside className="bb-owner-sidebar border-r border-black/5 bg-white/70 px-3 py-5 flex flex-col gap-5">
          <div className="px-2">
            <div className="bb-brand-mark text-xl">{APP_NAME}</div>
            <p className="bb-muted text-xs m-0 mt-1 truncate">{workspace.brandName || 'Owner workspace'}</p>
          </div>

          <nav className="grid gap-4">
            {Object.entries(groups).map(([groupId, tabs]) => (
              <div key={groupId} className="grid gap-1">
                <div className="px-2 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-black/35">
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
                      onClick={() => navigate(`/dashboard/${id}`)}
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

        <main className="px-4 py-5 md:px-7 md:py-7 pb-24 md:pb-7">{children}</main>
      </div>

      <nav className="bb-mobile-dock hidden fixed bottom-0 inset-x-0 z-30 border-t border-black/8 bg-white/92 backdrop-blur px-2 py-2 justify-around">
        {mobilePrimaryTabs.map((id) => {
          const Icon = ICONS[id];
          return (
            <button
              key={id}
              type="button"
              className="bb-nav-item flex-col gap-1 py-2 px-2 text-[0.68rem]"
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => navigate(`/dashboard/${id}`)}
            >
              <Icon size={18} strokeWidth={2.2} />
              <span>{workspaceTabLabels[id]}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
