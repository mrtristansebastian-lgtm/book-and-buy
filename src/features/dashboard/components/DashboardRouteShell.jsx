import { DashboardNavigation } from './DashboardNavigation';
import { DashboardOverlays } from './DashboardOverlays';
import { DashboardMainRoutes } from './DashboardMainRoutes';

export function DashboardRouteShell({
  activeTab,
  mobileNavCollapsed,
  navigation,
  overlays,
  routes,
  sidebarCollapsed
}) {
  return (
    <div
      className={`flex h-screen overflow-hidden font-sans relative native-ui dashboard-light ${sidebarCollapsed ? 'dashboard-sidebar-is-collapsed' : ''} ${activeTab === 'editor' ? 'dashboard-editor-active' : ''}`}
    >
      <DashboardOverlays {...overlays} />
      <DashboardNavigation {...navigation} />
      <DashboardMainRoutes activeTab={activeTab} mobileNavCollapsed={mobileNavCollapsed} routes={routes} />
    </div>
  );
}
