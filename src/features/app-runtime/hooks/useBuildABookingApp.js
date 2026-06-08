import { useAppRouteHostConfig } from './useAppRouteHostConfig';
import { useWorkspaceActionRuntime } from './useWorkspaceActionRuntime';
import { useWorkspaceRuntimeState } from './useWorkspaceRuntimeState';

export function useBuildABookingApp() {
  const runtime = useWorkspaceRuntimeState();
  const actionRuntime = useWorkspaceActionRuntime({
    account: runtime.account,
    app: runtime.app,
    auth: runtime.auth,
    booking: runtime.booking,
    clients: runtime.clients,
    editor: runtime.editor,
    profile: runtime.profile,
    publicBooking: runtime.publicBooking,
    route: runtime.route,
    settingsState: runtime.settingsState,
    staff: runtime.staff,
    workspace: runtime.workspace
  });

  return useAppRouteHostConfig({
    actionRuntime,
    app: runtime.app,
    auth: runtime.auth,
    clientPortal: runtime.clientPortal,
    data: runtime.data,
    dashboardUi: runtime.dashboardUi,
    editor: runtime.editor,
    publicBooking: runtime.publicBooking,
    route: runtime.route,
    settingsState: runtime.settingsState,
    staff: runtime.staff,
    workspace: runtime.workspace
  });
}
