import { ArrowRight } from 'lucide-react';
import { getActionButtonStyle } from '../utils/bookingFlowUtils';

export const BookingSelectionStep = ({
  actionButtonStyle,
  actionOrder,
  canContinue,
  children,
  ctaLabel = 'Complete your details',
  footerContent,
  heroContent,
  inspectClass,
  isPreview,
  nativeAccentButtonClass,
  onContinue,
  previewStepMotionClass,
  settings,
  showServiceStep
}) => (
  <div className={`${previewStepMotionClass} min-h-full flex flex-col p-5 md:p-10 relative z-10 ${isPreview ? 'booking-flow-preview-shell' : 'booking-flow-public-shell'}`}>
    {heroContent}
    <div className="booking-selection-stack flex-1">
      <div className={`booking-selection-workspace ${showServiceStep ? 'has-service-step' : 'is-date-time-only'}`}>
        {children}
      </div>
      <div className="booking-selection-action pt-1.5 pb-6 mt-auto text-center" style={{ order: actionOrder }}>
        <button
          type="button"
          data-testid="booking-add-to-cart"
          onClick={onContinue}
          disabled={!canContinue && !isPreview}
          className={`booking-primary-action group relative appearance-none outline-none focus:outline-none w-full py-4 md:py-5 text-[11px] font-extrabold uppercase transition-all duration-700 flex items-center justify-center gap-3 overflow-hidden ${(!canContinue && !isPreview) ? 'opacity-25 grayscale cursor-not-allowed' : 'hover:-translate-y-1 shadow-[0_16px_32px_-18px_rgba(0,0,0,0.32)] active:translate-y-0 active:scale-95'} ${nativeAccentButtonClass} ${inspectClass}`}
          style={getActionButtonStyle({ settings, actionButtonStyle })}
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-700 ease-in-out" />
          <span className="relative z-10">{ctaLabel}</span>
          <ArrowRight size={17} className="relative z-10 transition-transform duration-500 group-hover:translate-x-2" />
        </button>
        <p className="booking-selection-helper mt-3 text-[10px] font-bold uppercase tracking-[0.24em] opacity-35" style={{ color: settings.bodyColor }}>
          Review your choice, then finish details in checkout
        </p>
        {footerContent}
      </div>
    </div>
  </div>
);
