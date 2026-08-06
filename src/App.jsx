import { useEffect, useState } from 'react';
import { parseAppRoute, useHashRoute } from './app/routing';
import { AppLoginScreen } from './features/auth/AppLoginScreen';
import { OwnerWorkspaceApp } from './features/dashboard/OwnerWorkspaceApp';
import { PublicWebsiteApp } from './features/website/PublicWebsiteApp';
import { BusinessOnboardingPage } from './features/onboarding/BusinessOnboardingPage';
import { ClientPortalPage } from './features/client-portal/ClientPortalPage';
import { useWorkspace } from './features/workspace/WorkspaceContext';

export default function App() {
  const [route, setRoute] = useState(() => parseAppRoute());
  const { workspace, loadDemoWorkspace } = useWorkspace();

  useEffect(() => useHashRoute(setRoute), []);

  useEffect(() => {
    document.documentElement.classList.add('app-idle');
  }, []);

  useEffect(() => {
    if (route.demo && !workspace.isDemo) loadDemoWorkspace();
  }, [route.demo, workspace.isDemo, loadDemoWorkspace]);

  if (route.kind === 'public') {
    return <PublicWebsiteApp slug={route.slug} page={route.page} />;
  }

  if (route.kind === 'onboarding') {
    return <BusinessOnboardingPage />;
  }

  if (route.kind === 'portal') {
    return <ClientPortalPage />;
  }

  if (route.kind === 'owner') {
    if (!workspace.onboardingComplete && !workspace.isDemo) {
      return <BusinessOnboardingPage />;
    }
    return <OwnerWorkspaceApp tab={route.tab} />;
  }

  return <AppLoginScreen />;
}
