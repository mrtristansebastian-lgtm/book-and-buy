import { useMemo } from 'react';
import {
  BookOpenCheck,
  BriefcaseBusiness,
  CalendarDays,
  DollarSign,
  HeartHandshake,
  LayoutDashboard,
  MessagesSquare,
  Palette,
  Settings2,
  UsersRound
} from 'lucide-react';
import { safeLocalSet } from '../../../utils/workspaceRoute';

const mobilePrimaryNavIds = ['communications', 'bookings', 'business', 'finance'];

export function useDashboardNavigationModel({
  activeTab,
  accessLoading,
  applyWorkspaceRoute,
  clientFirstTimers,
  isGuestWorkspace,
  mobileNavCollapsed,
  mobileNavOpen,
  navigateWorkspaceTab,
  onAuth,
  onSignOut,
  playMobileNavSound,
  setActiveWorkspaceOwnerId,
  setMobileNavOpen,
  setSidebarCollapsed,
  sidebarCollapsed,
  user,
  visibleBookings,
  workspaceChoices,
  workspaceOwnerId,
  workspaceRole
}) {
  const dashboardGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const navItems = useMemo(() => ([
    { id: 'overview', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'bookings', icon: BookOpenCheck, label: 'Bookings', badge: visibleBookings.some(b => b.status === 'pending' || b.status === 'waitlist') },
    { id: 'business', icon: CalendarDays, label: 'Schedule' },
    { id: 'communications', icon: MessagesSquare, label: 'Support Inbox' },
    { id: 'editor', icon: Palette, label: 'Editor' },
    { id: 'services', icon: BriefcaseBusiness, label: 'Services' },
    { id: 'finance', icon: DollarSign, label: 'Finance' },
    { id: 'clients', icon: HeartHandshake, label: 'Clients', badge: clientFirstTimers > 0 },
    { id: 'staff', icon: UsersRound, label: 'Team' },
    { id: 'profile', icon: Settings2, label: 'Profile' }
  ]), [clientFirstTimers, visibleBookings]);

  const mobilePrimaryNavItems = useMemo(
    () => mobilePrimaryNavIds.map(id => navItems.find(item => item.id === id)).filter(Boolean),
    [navItems]
  );
  const mobileMoreNavItems = useMemo(
    () => navItems.filter(item => !mobilePrimaryNavIds.includes(item.id)),
    [navItems]
  );
  const mobileMoreActive = mobileMoreNavItems.some(item => item.id === activeTab);
  const mobileMoreHasBadge = mobileMoreNavItems.some(item => item.badge);

  const navigation = {
    activeTab,
    accessLoading,
    isGuestWorkspace,
    mobileMoreActive,
    mobileMoreHasBadge,
    mobileMoreNavItems,
    mobileNavCollapsed,
    mobileNavOpen,
    mobilePrimaryNavItems,
    navItems,
    sidebarCollapsed,
    user,
    workspaceChoices,
    workspaceOwnerId,
    workspaceRole,
    onAuth,
    onLanding: () => applyWorkspaceRoute({ view: 'dashboard', activeTab: 'overview' }),
    onMobileMoreToggle: () => {
      playMobileNavSound();
      setMobileNavOpen(open => !open);
    },
    onNavigateTab: navigateWorkspaceTab,
    onSignOut,
    onToggleMobileNav: setMobileNavOpen,
    onToggleSidebar: () => setSidebarCollapsed(!sidebarCollapsed),
    onWorkspaceChange: (ownerId) => {
      setActiveWorkspaceOwnerId(ownerId);
      safeLocalSet('build-a-booking-active-workspace', ownerId);
    }
  };

  return { dashboardGreeting, navigation };
}
