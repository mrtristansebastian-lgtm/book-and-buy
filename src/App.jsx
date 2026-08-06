import { useEffect, useState } from 'react';
import { parseAppRoute, useHashRoute } from './app/routing';
import { AppLoginScreen } from './features/auth/AppLoginScreen';
import { OwnerWorkspaceApp } from './features/dashboard/OwnerWorkspaceApp';
import { PublicWebsiteApp } from './features/website/PublicWebsiteApp';

export default function App() {
  const [route, setRoute] = useState(() => parseAppRoute());

  useEffect(() => useHashRoute(setRoute), []);

  useEffect(() => {
    document.documentElement.classList.add('app-idle');
  }, []);

  if (route.kind === 'public') {
    return <PublicWebsiteApp slug={route.slug} page={route.page} />;
  }

  if (route.kind === 'owner') {
    return <OwnerWorkspaceApp tab={route.tab} />;
  }

  return <AppLoginScreen />;
}
