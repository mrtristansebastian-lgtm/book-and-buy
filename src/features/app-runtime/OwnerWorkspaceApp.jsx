import { AppRouteHost } from '../../components/AppRouteHost';
import { useBuildABookingApp } from './hooks/useBuildABookingApp';

export default function OwnerWorkspaceApp() {
  const routeHostConfig = useBuildABookingApp();

  return <AppRouteHost {...routeHostConfig} />;
}
