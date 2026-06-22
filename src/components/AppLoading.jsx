import { BuildABookingMark } from './BuildABookingBrand';

export const BrandLoader = ({ label = 'Loading workspace', variant = 'dark' }) => (
  <div className="text-center">
    <div className="brand-loader-orbit mx-auto mb-6">
      <BuildABookingMark className="w-9 h-9" variant={variant} />
    </div>
    <p className={`text-[10px] font-bold uppercase tracking-[0.35em] ${variant === 'light' ? 'text-white/40' : 'text-neutral-300'}`}>{label}</p>
  </div>
);

export const LazySectionFallback = ({ label = 'Loading workspace', variant = 'dark' }) => (
  <div className="min-h-[320px] w-full flex items-center justify-center px-4 py-8 text-center">
    <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white px-6 py-7 shadow-[0_28px_80px_-56px_rgba(15,23,42,0.42)]">
      <BrandLoader label={label} variant={variant} />
      <p className={`mt-4 text-sm leading-relaxed ${variant === 'light' ? 'text-white/55' : 'text-neutral-500'}`}>
        Preparing the next view.
      </p>
    </div>
  </div>
);
