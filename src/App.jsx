import { lazy, Suspense, useEffect, useState } from 'react';
import { BrandLoader } from './components/AppLoading';
import { getPublicBookingSlug } from './utils/publicBookingRoute';

const OwnerWorkspaceApp = lazy(() => import('./features/app-runtime/OwnerWorkspaceApp'));
const PublicBookingApp = lazy(() => import('./features/public-booking/PublicBookingApp'));

function usePublicRouteSlug() {
  const [publicSlug, setPublicSlug] = useState(getPublicBookingSlug);

  useEffect(() => {
    const syncPublicSlug = () => setPublicSlug(getPublicBookingSlug());
    window.addEventListener('hashchange', syncPublicSlug);
    window.addEventListener('popstate', syncPublicSlug);
    return () => {
      window.removeEventListener('hashchange', syncPublicSlug);
      window.removeEventListener('popstate', syncPublicSlug);
    };
  }, []);

  return publicSlug;
}

export default function App() {
  const publicSlug = usePublicRouteSlug();

  return (
    <Suspense fallback={<div className="h-screen bg-white flex items-center justify-center"><BrandLoader label={publicSlug ? 'Loading booking page' : 'Loading workspace'} /></div>}>
      {publicSlug ? <PublicBookingApp publicSlug={publicSlug} /> : <OwnerWorkspaceApp />}
    </Suspense>
  );
}
