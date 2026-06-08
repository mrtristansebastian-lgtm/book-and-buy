import { getSocialLinkStyle } from '../utils/bookingFlowUtils';

const getPlatformKey = (key = '', label = '') => {
    const value = `${key} ${label}`.toLowerCase();
    if (value.includes('instagram')) return 'instagram';
    if (value.includes('tiktok')) return 'tiktok';
    if (value.includes('facebook')) return 'facebook';
    return 'website';
};

const BrandMark = ({ platform }) => {
    if (platform === 'instagram') {
        return (
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <defs>
                    <linearGradient id="booking-instagram-mark" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#FEDA75" />
                        <stop offset="0.24" stopColor="#FA7E1E" />
                        <stop offset="0.5" stopColor="#D62976" />
                        <stop offset="0.74" stopColor="#962FBF" />
                        <stop offset="1" stopColor="#4F5BD5" />
                    </linearGradient>
                </defs>
                <rect x="3" y="3" width="18" height="18" rx="5.2" stroke="url(#booking-instagram-mark)" />
                <circle cx="12" cy="12" r="4.15" stroke="url(#booking-instagram-mark)" />
                <circle cx="17.25" cy="6.75" r="0.8" fill="#D62976" stroke="none" />
            </svg>
        );
    }

    if (platform === 'tiktok') {
        return (
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                <path fill="#25F4EE" d="M13.55 3.85c.35 3 2 4.8 4.8 5.1v3.05a8 8 0 0 1-4.65-1.5v6.55c0 3.65-2.25 5.8-5.65 5.8a5.3 5.3 0 0 1-2.85-.82 5.08 5.08 0 0 0 3.2 1.12c3.4 0 5.65-2.15 5.65-5.8V10.8a8 8 0 0 0 4.65 1.5V9.25c-2.8-.3-4.45-2.1-4.8-5.1h-.35Z" />
                <path fill="#FE2C55" d="M15.35 3c.35 3 2 4.8 4.8 5.1v3.05a8 8 0 0 1-4.65-1.5v6.55c0 3.65-2.25 5.8-5.65 5.8a5.08 5.08 0 0 1-3.2-1.12 5.36 5.36 0 0 0 3.55 1.35c3.4 0 5.65-2.15 5.65-5.8V9.88a8 8 0 0 0 4.65 1.5V8.32c-2.8-.3-4.45-2.1-4.8-5.1L15.35 3Z" />
                <path fill="#050505" d="M14.7 3c.35 3 2 4.8 4.8 5.1v3.05a8 8 0 0 1-4.65-1.5v6.55c0 3.65-2.25 5.8-5.65 5.8A5.1 5.1 0 0 1 4 16.85c0-3.25 2.55-5.55 5.98-5.28v3.18c-1.38-.22-2.45.52-2.45 1.82 0 1.13.82 1.9 1.95 1.9 1.25 0 2.1-.75 2.1-2.48V3h3.12Z" />
            </svg>
        );
    }

    if (platform === 'facebook') {
        return (
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
                <path fill="#1877F2" d="M14.05 8.6V7.1c0-.72.16-1.1 1.18-1.1H17V3.2A23 23 0 0 0 14.42 3c-2.55 0-4.3 1.55-4.3 4.38V8.6H7.25v3.15h2.87V21h3.45v-9.25h2.82l.45-3.15h-3.79Z" />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M3.6 9h16.8M3.6 15h16.8M12 3c2.25 2.45 3.35 5.45 3.35 9S14.25 18.55 12 21M12 3C9.75 5.45 8.65 8.45 8.65 12S9.75 18.55 12 21" />
        </svg>
    );
};

export const BookingSocialLinks = ({
    inspectClass,
    isPreview,
    onInspect,
    previewInspectEnabled,
    previewSocialLinks,
    settings,
    socialDisplayStyle,
    socialIconStyle,
    socialLinks
}) => {
    const linksForDisplay = socialLinks.length > 0 ? socialLinks : (isPreview ? previewSocialLinks : []);
    if (linksForDisplay.length === 0) return null;

    const isPreviewEmpty = socialLinks.length === 0;

    return (
        <div className={`booking-social-links booking-social-${socialDisplayStyle} booking-social-placement-footer ${isPreviewEmpty ? 'booking-social-preview-empty' : ''} mt-8 flex flex-wrap items-center justify-center gap-3 ${inspectClass}`} data-preview-section="social" onClick={() => previewInspectEnabled && onInspect('social')}>
            {linksForDisplay.map(link => {
                const platform = getPlatformKey(link.key, link.label);
                return (
                    <a
                        key={link.key}
                        href={link.href}
                        target={link.isPreviewPlaceholder ? undefined : '_blank'}
                        rel={link.isPreviewPlaceholder ? undefined : 'noreferrer'}
                        className={`inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full px-4 text-[10px] font-bold uppercase tracking-widest transition-all hover:-translate-y-0.5 ${link.isPreviewPlaceholder ? 'is-preview-empty' : ''}`}
                        style={getSocialLinkStyle({ settings, socialIconStyle })}
                        aria-label={link.label}
                        onClick={(event) => {
                            if (isPreview || link.isPreviewPlaceholder) event.preventDefault();
                        }}
                    >
                        <BrandMark platform={platform} />
                        <span>{link.label}</span>
                    </a>
                );
            })}
        </div>
    );
};
