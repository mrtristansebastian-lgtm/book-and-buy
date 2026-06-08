import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { DashboardSidebar } from './DashboardSidebar';
import { DesktopWorkspaceDock } from './DesktopWorkspaceDock';
import { MobileWorkspaceNav } from './MobileWorkspaceNav';

export const DashboardNavigation = ({
  sidebarCollapsed,
  onToggleSidebar,
  ...navProps
}) => (
  <>
    <DashboardSidebar
      sidebarCollapsed={sidebarCollapsed}
      {...navProps}
    />

    <button
      type="button"
      onClick={onToggleSidebar}
      aria-label={sidebarCollapsed ? 'Expand owner navigation' : 'Collapse owner navigation'}
      title={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
      className="desktop-sidebar-toggle hidden md:flex fixed bottom-6 left-6 md:bottom-10 md:left-10 z-[100] w-12 h-12 bg-white border border-neutral-100 rounded-full shadow-2xl items-center justify-center text-neutral-400 hover:text-black transition-all hover:scale-110"
    >
      {sidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
    </button>

    <DesktopWorkspaceDock {...navProps} />
    <MobileWorkspaceNav {...navProps} />
  </>
);
