import { lazy, Suspense } from 'react';
import { AppErrorBoundary } from '../../../components/AppErrorBoundary';
import { BuildABookingBrand } from '../../../components/BuildABookingBrand';
import { LazySectionFallback } from '../../../components/AppLoading';

const ClientPortal = lazy(() => (
  import('../../../components/ClientPortal').then((module) => ({ default: module.ClientPortal }))
));

export const ClientPortalGate = ({
  appId,
  db,
  user,
  isGuestPreview,
  authDialog,
  onOpenClientAuth,
  onPreviewClient,
  onExitGuestPreview,
  onSignOut,
  onOwnerLogin,
  onInstallApp
}) => {
  const portalUser = user || (isGuestPreview ? {
    uid: 'guest-client-preview',
    displayName: 'Guest Client',
    email: 'guest-client@example.com',
    photoURL: ''
  } : null);

  if (!portalUser) {
    return (
      <div className="native-ui min-h-screen flex items-start sm:items-center justify-center px-6 pt-14 pb-10 sm:p-6 bg-white text-black">
        {authDialog}
        <div className="max-w-md text-center">
          <BuildABookingBrand className="w-52 sm:w-60 mx-auto mb-8 sm:mb-10" variant="dark" />
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-neutral-400 mb-4">Client Portal</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 leading-tight">Sign in to stay close to your booking.</h1>
          <p className="text-neutral-500 leading-relaxed mb-7 text-base sm:text-lg">Use the same email you booked with to manage updates, request changes, and chat with the business.</p>
          <div className="grid gap-3">
            <button onClick={onOpenClientAuth} className="h-12 px-8 rounded-full bg-black text-white text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-black/10">
              Client Sign In
            </button>
            <button onClick={onPreviewClient} className="h-12 px-8 rounded-full bg-white border border-neutral-200 text-black text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-black/5 hover:border-black transition-colors">
              Preview Client Side
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<LazySectionFallback label="Loading client portal" />}>
      <AppErrorBoundary compact label="Client Portal" resetKey={`${portalUser?.uid || 'guest'}-light`}>
        <ClientPortal
          appId={appId}
          db={isGuestPreview ? null : db}
          user={portalUser}
          isGuestPreview={isGuestPreview}
          onSignOut={isGuestPreview ? onExitGuestPreview : onSignOut}
          onOwnerLogin={onOwnerLogin}
          onInstallApp={onInstallApp}
        />
      </AppErrorBoundary>
    </Suspense>
  );
};
