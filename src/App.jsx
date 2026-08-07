import { useEffect, useState } from 'react';
import { parseAppRoute, useHashRoute } from './app/routing';
import { AppLoginScreen } from './features/auth/AppLoginScreen';
import { useAuth } from './features/auth/AuthContext';
import { OwnerWorkspaceApp } from './features/dashboard/OwnerWorkspaceApp';
import { PublicWebsiteApp } from './features/website/PublicWebsiteApp';
import { BusinessOnboardingPage } from './features/onboarding/BusinessOnboardingPage';
import { ClientPortalPage } from './features/client-portal/ClientPortalPage';
import { useWorkspace } from './features/workspace/WorkspaceContext';

export default function App() {
  const [route, setRoute] = useState(() => parseAppRoute());
  const { workspace, loadDemoWorkspace } = useWorkspace();
  const { ready, configured, user, isLocalMode } = useAuth();

  useEffect(() => useHashRoute(setRoute), []);

  useEffect(() => {
    document.documentElement.classList.add('app-idle');
  }, []);

  useEffect(() => {
    if (route.demo && !workspace.isDemo) loadDemoWorkspace();
  }, [route.demo, workspace.isDemo, loadDemoWorkspace]);

  if (!ready) {
    return (
      <div className="bb-shell native-ui min-h-screen grid place-items-center bb-muted">
        Loading…
      </div>
    );
  }

  if (route.kind === 'public') {
    return (
      <PublicWebsiteApp slug={route.slug} page={route.page} itemId={route.itemId || ''} />
    );
  }

  if (route.kind === 'onboarding') {
    return <BusinessOnboardingPage />;
  }

  if (route.kind === 'portal') {
    return <ClientPortalPage />;
  }

  if (route.kind === 'owner') {
    const allowed =
      workspace.isDemo || isLocalMode || Boolean(user) || !configured;
    if (!allowed) {
      return <AppLoginScreen />;
    }
    if (!workspace.onboardingComplete && !workspace.isDemo) {
      return <BusinessOnboardingPage />;
    }
    return <OwnerWorkspaceApp tab={route.tab} />;
  }

  return <AppLoginScreen />;
}
