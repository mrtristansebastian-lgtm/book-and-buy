import { Images, MapPin, Plus } from 'lucide-react';
import { getFontFamily } from '../../../data/fonts';
import { getBlockMargins } from '../utils/bookingFlowUtils';

export const BookingHeroSection = ({
  accentGradientActive,
  bannerDisplay,
  brandText,
  headingLetterSpacing,
  inspectClass,
  isPreview,
  logoDisplay,
  nativeAccentFillClass,
  onInspect,
  onMediaUpload,
  onSettingChange,
  pageAlignment,
  pageJustify,
  previewInspectEnabled,
  settings,
  subtextLetterSpacing,
  taglineText,
  venueMapHref,
  welcomeText
}) => {
  const hasHeroLogo = Boolean(settings.logo && logoDisplay.visible);
  const heroMediaSource = settings.bannerImage || '';
  const hasHeroBanner = Boolean(heroMediaSource && bannerDisplay.visible);
  const canPreviewUploadMedia = Boolean(isPreview && onMediaUpload);
  const shouldRenderHeroLogo = Boolean(logoDisplay.visible && (hasHeroLogo || canPreviewUploadMedia));
  const shouldRenderHeroBanner = Boolean(bannerDisplay.visible && (hasHeroBanner || canPreviewUploadMedia));

  const handlePreviewMediaUpload = (key, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    onMediaUpload?.(key, file);
  };

  const renderPreviewMediaPlaceholder = ({ key, label, icon: Icon = Images, className = '' }) => {
    if (!canPreviewUploadMedia) return null;
    const isLogo = key === 'logo';
    return (
      <label
        className={`booking-preview-media-drop ${isLogo ? 'is-logo' : ''} ${className} ${inspectClass}`}
        data-preview-section={isLogo ? 'logo' : 'banner'}
        style={isLogo ? {
          '--booking-logo-size': `${logoDisplay.size}px`,
          width: logoDisplay.size,
          height: logoDisplay.size
        } : { '--hero-media-height': `${bannerDisplay.height}px`, '--hero-media-aspect-ratio': '2560 / 423' }}
        onClick={(event) => event.stopPropagation()}
        aria-label={label}
      >
        <span className="booking-preview-media-blank" aria-hidden="true">
          <Icon size={isLogo ? 18 : 22} />
        </span>
        <span className="booking-preview-media-add">
          <Plus size={13} />
          <span>{label}</span>
        </span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handlePreviewMediaUpload(key, event)}
        />
      </label>
    );
  };

  const renderHeroLogo = (extraClass = '') => hasHeroLogo ? (
    <button
      type="button"
      className={`booking-hero-logo-frame ${extraClass} ${inspectClass}`}
      style={{
        '--booking-logo-size': `${logoDisplay.size}px`,
        width: logoDisplay.size,
        height: logoDisplay.size
      }}
      onClick={() => previewInspectEnabled && onInspect('logo')}
      aria-label="Edit brand logo"
    >
      <img
        src={settings.logo}
        className="booking-hero-logo"
        alt="Brand Logo"
      />
    </button>
  ) : renderPreviewMediaPlaceholder({
    key: 'logo',
    label: 'Add logo',
    icon: Images,
    className: extraClass
  });

  const renderHeroMedia = (extraClass = '') => heroMediaSource && bannerDisplay.visible ? (
    <figure
      className={`booking-hero-media has-media ${extraClass} ${inspectClass}`}
      style={{ '--hero-media-height': `${bannerDisplay.height}px`, '--hero-media-aspect-ratio': '2560 / 423' }}
      onClick={() => previewInspectEnabled && onInspect('banner')}
    >
      <img
        src={heroMediaSource}
        className="booking-hero-banner-image"
        style={{ objectPosition: bannerDisplay.objectPosition, opacity: bannerDisplay.opacity / 100 }}
        alt="Business hero visual"
      />
    </figure>
  ) : renderPreviewMediaPlaceholder({
    key: 'bannerImage',
    label: 'Add header banner',
    icon: Images,
    className: `booking-hero-media ${extraClass}`
  });

  return (
    <header className={`booking-page-hero booking-hero-${pageAlignment} ${shouldRenderHeroBanner && bannerDisplay.placement === 'hero' ? 'has-banner' : ''} ${shouldRenderHeroLogo ? 'has-logo' : ''} logo-placement-${logoDisplay.placement} banner-placement-${bannerDisplay.placement} mb-10 flex-shrink-0`} data-preview-section="introduction">
      {shouldRenderHeroBanner && bannerDisplay.placement === 'top' && renderHeroMedia('booking-hero-media-top')}
      <div
        className={`booking-hero-kicker flex items-center gap-4 ${inspectClass}`}
        onClick={() => previewInspectEnabled && onInspect('calendar')}
      >
        <div className={`booking-hero-kicker-rule ${nativeAccentFillClass}`} style={{ backgroundColor: settings.primaryColor }} />
        <span
          className="font-bold uppercase opacity-40"
          style={{ color: settings.bodyColor, fontFamily: getFontFamily(taglineText.font), fontSize: `${taglineText.size}px`, ...(subtextLetterSpacing ? { letterSpacing: subtextLetterSpacing } : {}) }}
        >
          {settings.tagline}
        </span>
        <div className={`booking-hero-kicker-rule ${nativeAccentFillClass}`} style={{ backgroundColor: settings.primaryColor }} />
      </div>

      {shouldRenderHeroBanner && bannerDisplay.placement === 'hero' && renderHeroMedia()}

      <div className="booking-hero-copy">
        {shouldRenderHeroLogo && renderHeroLogo('booking-hero-logo-top')}
        <div className="booking-hero-title-lockup">
          <h1
            className={`booking-hero-title font-bold tracking-tighter leading-[0.85] max-w-full ${inspectClass}`}
            style={{
              color: settings.headingColor,
              fontFamily: getFontFamily(brandText.font),
              fontSize: `${brandText.size}px`,
              ...(headingLetterSpacing ? { letterSpacing: headingLetterSpacing } : {}),
              textAlign: 'center',
              overflowWrap: 'anywhere',
              ...getBlockMargins('center')
            }}
            onClick={() => previewInspectEnabled && onInspect('introduction')}
            contentEditable={previewInspectEnabled}
            suppressContentEditableWarning
            onBlur={(event) => isPreview && onSettingChange?.('brandName', event.currentTarget.textContent.trim())}
          >
            {settings.brandName}
          </h1>
        </div>
        <p
          className={`booking-hero-subtitle opacity-60 font-light leading-relaxed max-w-3xl ${inspectClass}`}
          style={{
            color: settings.bodyColor,
            fontFamily: getFontFamily(welcomeText.font),
            fontSize: `${welcomeText.size}px`,
            ...(subtextLetterSpacing ? { letterSpacing: subtextLetterSpacing } : {}),
            textAlign: 'center',
            ...getBlockMargins('center')
          }}
          onClick={() => previewInspectEnabled && onInspect('introduction')}
          contentEditable={previewInspectEnabled}
          suppressContentEditableWarning
          onBlur={(event) => isPreview && onSettingChange?.('welcomeMessage', event.currentTarget.textContent.trim())}
        >
          {settings.welcomeMessage}
        </p>

        {(settings.address || settings.features?.location) && (
          <div className="booking-hero-actions" style={{ justifyContent: pageJustify }}>
            {settings.address && (
              <span className="booking-hero-chip" style={{ color: settings.headingColor }}>
                <MapPin size={12} /> {settings.address}
              </span>
            )}
            {settings.features?.location && venueMapHref && (
              <a
                href={venueMapHref}
                target="_blank"
                rel="noreferrer"
                className={`booking-hero-chip booking-hero-chip-action transition-all hover:opacity-80 ${accentGradientActive ? 'booking-gradient-chip' : ''}`}
                style={{ color: settings.primaryColor }}
                onClick={(event) => {
                  if (isPreview) event.preventDefault();
                }}
              >
                <MapPin size={12} /> Get Directions
              </a>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
