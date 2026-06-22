import { lazy, Suspense } from 'react';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ backgroundColor: '#f6f7f9' }}>
        <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white px-6 py-7 text-center shadow-[0_28px_80px_-56px_rgba(15,23,42,0.42)]">
          <div className="mx-auto mb-5 flex justify-center">
            <BuildABookingBrand className="w-48 max-w-full" variant="dark" />
          </div>
          <BrandLoader label="Loading booking page" variant="dark" />
          <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-neutral-500">
            Preparing the public booking experience.
          </p>
        </div>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ backgroundColor: '#f6f7f9' }}>
        <div className="w-full max-w-lg rounded-3xl border border-neutral-200 bg-white px-6 py-7 shadow-[0_28px_80px_-56px_rgba(15,23,42,0.42)]">
          <div className="mx-auto mb-5 flex justify-center">
            <BuildABookingBrand className="w-52 max-w-full" variant="dark" />
          </div>
          <div className="flex items-start gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-left">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-neutral-200 bg-white text-neutral-900">
              <AlertCircle size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-neutral-400">Booking Page</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-neutral-950">Page unavailable</h1>
              <p className="mt-3 text-sm leading-relaxed text-neutral-500">{error || 'This booking page is not available yet.'}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white px-6 text-[10px] font-bold uppercase tracking-widest text-neutral-950 transition-colors hover:bg-neutral-50"
            >
              <RefreshCw size={14} />
              Try Again
            </button>
            <button
              type="button"
              onClick={onHome}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-neutral-200 bg-neutral-950 px-6 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-neutral-800"
            >
              <Home size={14} />
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
