import { lazy, Suspense } from 'react';

import { AppErrorBoundary } from '../../../components/AppErrorBoundary';
import { BrandLoader, LazySectionFallback } from '../../../components/AppLoading';
import { BuildABookingBrand } from '../../../components/BuildABookingBrand';

const PublicBookingFlow = lazy(() => (
  import('../components/PublicBookingFlow').then((module) => ({ default: module.PublicBookingFlow }))
));

export function PublicBookingPage({
  error,
  loading,
  manualPaymentOptions,
  paymentOptions,
  onComplete,
  onHome,
  onInstallApp,
  onRetry,
  slug,
  workspace
}) {
  if (loading) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <BrandLoader label="Loading booking page" />
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="inline-flex mx-auto mb-8">
            <BuildABookingBrand className="w-56 max-w-full" variant="light" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-white/40 mb-4">Booking Page</p>
          <h1 className="text-4xl font-bold tracking-tight mb-4">Page unavailable</h1>
          <p className="text-white/55 leading-relaxed">{error || 'This booking page is not available yet.'}</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={onRetry} className="h-12 px-6 rounded-full bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-100 transition-colors">
              Try Again
            </button>
            <button onClick={onHome} className="h-12 px-6 rounded-full border border-white/15 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors">
              Build A Booking
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-x-hidden overflow-y-auto" style={{ backgroundColor: workspace.backgroundColor || '#ffffff' }}>
      <Suspense fallback={<LazySectionFallback label="Loading booking page" />}>
        <AppErrorBoundary compact label="Booking Page" resetKey={slug}>
          <PublicBookingFlow settings={{ ...workspace, manualPaymentOptions, paymentOptions }} onComplete={onComplete} onInstallApp={onInstallApp} />
        </AppErrorBoundary>
      </Suspense>
    </div>
  );
}
