import { getFontFamily } from '../../../data/fonts';
import { withColorAlpha } from '../../../utils/theme';

export const BookingPageLoader = ({ isPreview, settings }) => {
    const loadingMotionClass = isPreview ? '' : 'transition-opacity duration-1000';
    const surfaceColor = settings.pageSurfaceColor || '#ffffff';
    const borderColor = withColorAlpha(settings.headingColor || '#000000', 8, '#000000');

    return (
        <div className={`booking-page-loader absolute inset-0 z-50 flex items-center justify-center px-4 ${loadingMotionClass}`} style={{ backgroundColor: settings.backgroundColor || '#ffffff' }}>
            <div className="w-full max-w-sm rounded-3xl border px-6 py-7 text-center shadow-[0_28px_80px_-56px_rgba(15,23,42,0.42)]" style={{ backgroundColor: surfaceColor, borderColor }}>
                <div className="brand-loader-orbit mx-auto mb-5">
                    {settings.logo ? (
                        <img
                            src={settings.logo}
                            alt={`${settings.brandName || 'Business'} logo`}
                            className="booking-client-loader-logo"
                        />
                    ) : (
                        <span
                            className="booking-client-loader-fallback"
                            style={{
                                color: settings.headingColor || '#050505',
                                fontFamily: getFontFamily(settings.headingFontFamily || settings.fontFamily)
                            }}
                        >
                            {settings.brandName?.charAt(0) || 'B'}
                        </span>
                    )}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.35em]" style={{ color: withColorAlpha(settings.bodyColor || '#71717a', 42, '#71717a') }}>
                    Loading booking page
                </p>
                <h2 className="mt-2 text-lg font-black tracking-tight" style={{ color: settings.headingColor || '#050505' }}>
                    Preparing your page
                </h2>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed" style={{ color: settings.bodyColor || '#666666' }}>
                    We&apos;re loading the live booking experience and current page settings.
                </p>
            </div>
        </div>
    );
};
