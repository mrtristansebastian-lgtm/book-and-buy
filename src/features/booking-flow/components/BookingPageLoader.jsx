import { getFontFamily } from '../../../data/fonts';
import { withColorAlpha } from '../../../utils/theme';

export const BookingPageLoader = ({ isPreview, settings }) => {
    const loadingMotionClass = isPreview ? '' : 'transition-opacity duration-1000';

    return (
        <div className={`booking-page-loader absolute inset-0 z-50 flex items-center justify-center ${loadingMotionClass}`} style={{ backgroundColor: settings.backgroundColor || '#ffffff' }}>
            <div className="text-center">
                <div className="brand-loader-orbit mx-auto mb-6">
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
                <p className="text-[10px] font-bold uppercase tracking-[0.35em]" style={{ color: withColorAlpha(settings.bodyColor || '#71717a', 40, '#71717a') }}>
                    Loading booking page
                </p>
            </div>
        </div>
    );
};
