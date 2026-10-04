import { useEffect, useState } from 'react';
import { parseAppRoute, useHashRoute, navigate, scrollAppToTop } from './app/routing';
import { AppLoginScreen } from './features/auth/AppLoginScreen';
import { useAuth } from './features/auth/AuthContext';
import { OwnerWorkspaceApp } from './features/dashboard/OwnerWorkspaceApp';
import { PublicWebsiteApp } from './features/website/PublicWebsiteApp';
import { BusinessOnboardingPage } from './features/onboarding/BusinessOnboardingPage';
import { ClientPortalPage } from './features/client-portal/ClientPortalPage';
import { ClientApp } from './features/client-app/ClientApp';
import { useClientProfile } from './features/client-app/ClientProfileContext';
import { useWorkspace } from './features/workspace/WorkspaceContext';
import { BrandMark } from './shared/ui/BrandMark';
import { useViewportZoomGate } from './shared/ui/useViewportZoomGate';
import { useCustomDomain } from './features/website/useCustomDomain';
import { ControlReview } from './shared/ui/ControlReview';

export default function App() {
  const [route, setRoute] = useState(() => parseAppRoute());
  const customDomain = useCustomDomain();
  const { workspace, loadDemoWorkspace } = useWorkspace();
  const { ready, configured, user, isLocalMode } = useAuth();
  const { isClient, profileReady } = useClientProfile();

  useViewportZoomGate();
  useEffect(() => useHashRoute(setRoute), []);

  const routeKey = [
    route.kind,
    route.tab,
    route.section,
    route.page,
    route.slug,
    route.itemId,
    ...(route.rest || [])
  ].join('/');
  useEffect(() => scrollAppToTop(), [routeKey]);
  useEffect(() => document.documentElement.classList.add('app-idle'), []);
  useEffect(() => {
    if (route.demo && !workspace.isDemo) loadDemoWorkspace();
  }, [route.demo, workspace.isDemo, loadDemoWorkspace]);
  useEffect(() => {
    if (route.kind === 'portal' && profileReady && isClient) {
      navigate('/app/account', { replace: true });
    }
  }, [route.kind, profileReady, isClient]);

  if (import.meta.env.DEV && window.location.hash === '#/control-review') return <ControlReview />;

  if (!ready || !profileReady || customDomain.loading) {
    return (
      <div className="bb-shell native-ui min-h-screen grid place-items-center">
        <BrandMark size="lg" className="bb-welcome-brand-slot" />
      </div>
    );
  }

  if (customDomain.enabled && customDomain.error) return <div className="bb-shell native-ui min-h-screen grid place-items-center"><p role="alert">{customDomain.error}</p></div>;
  if (customDomain.enabled && customDomain.slug) {
    // A custom host must never display a different seller via an edited hash.
    const page = route.kind === 'public' ? route.page : 'home';
    return <PublicWebsiteApp slug={customDomain.slug} page={page} itemId={route.kind === 'public' ? route.itemId || '' : ''} allowLocalDemo={false} />;
  }
  if (route.kind === 'public') {
    return <PublicWebsiteApp slug={route.slug} page={route.page} itemId={route.itemId || ''} />;
  }
  if (route.kind === 'onboarding') return <BusinessOnboardingPage />;
  if (route.kind === 'client') {
    return <ClientApp section={route.section || 'find'} rest={route.rest || []} />;
  }
  if (route.kind === 'portal') {
    if (isClient) {
      return <div className="bb-shell native-ui min-h-screen grid place-items-center bb-muted">Opening account…</div>;
    }
    return <ClientPortalPage />;
  }
  if (route.kind === 'owner') {
    const allowed = workspace.isDemo || isLocalMode || Boolean(user) || !configured;
    if (!allowed) return <AppLoginScreen />;
    if (isClient && !workspace.isDemo) {
      navigate('/app/find', { replace: true });
      return <div className="bb-shell native-ui min-h-screen grid place-items-center bb-muted">Opening client app…</div>;
    }
    if (!workspace.onboardingComplete && !workspace.isDemo) return <BusinessOnboardingPage />;
    return <OwnerWorkspaceApp tab={route.tab} rest={route.rest || []} />;
  }
  return <AppLoginScreen />;
}
