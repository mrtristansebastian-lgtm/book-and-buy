import {
  BriefcaseBusiness,
  CalendarDays,
  CreditCard,
  Home,
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
  workspaceTabLabels
} from '../../../config/routeConfig';
import { APP_NAME } from '../../../config/appConfig';
import { navigate } from '../../../app/routing';

const ICONS = {
  overview: Home,
  services: BriefcaseBusiness,
  staff: CalendarDays,
  products: Package,
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

  return (
    <div className="bb-shell native-ui min-h-screen">
      <div
        className="bb-owner-layout mx-auto max-w-[1400px] grid gap-0 min-h-screen"
        style={{ gridTemplateColumns: '240px 1fr' }}
      >
        <aside className="bb-owner-sidebar border-r border-black/5 bg-white/70 px-3 py-5 flex flex-col gap-5">
          <div className="px-2">
            <div className="bb-brand-mark text-xl">{APP_NAME}</div>
            <p className="bb-muted text-xs m-0 mt-1">Owner workspace</p>
          </div>

          <nav className="grid gap-4">
            {Object.entries(groups).map(([groupId, tabs]) => (
              <div key={groupId} className="grid gap-1">
                <div className="px-2 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-black/35">
                  {workspaceGroupLabels[groupId]}
                </div>
                {tabs.map((id) => {
                  const Icon = ICONS[id];
                  return (
                    <button
                      key={id}
                      type="button"
                      className="bb-nav-item"
                      aria-current={tab === id ? 'page' : undefined}
                      onClick={() => navigate(`/dashboard/${id}`)}
                    >
                      <Icon size={17} strokeWidth={2.2} />
                      <span>{workspaceTabLabels[id]}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        <main className="px-4 py-5 md:px-7 md:py-7 pb-24 md:pb-7">
          {children}
        </main>
      </div>

      <nav
        className="bb-mobile-dock hidden fixed bottom-0 inset-x-0 z-30 border-t border-black/8 bg-white/92 backdrop-blur px-2 py-2 justify-around"
      >
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
