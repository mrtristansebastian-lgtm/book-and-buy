import { ArrowRight, Images, MapPin, Plus } from 'lucide-react';
import { getFontFamily } from '../../../data/fonts';
import { withColorAlpha } from '../../../utils/theme';

export const BookingVenueGallery = ({
    headingLetterSpacing,
    inspectClass,
    isPreview,
    mapDisplayStyle,
    onInspect,
    pageAlignment,
    previewInspectEnabled,
    settings,
    subtextLetterSpacing,
    venueGalleryStyle,
    venueMapEmbedSrc,
    venueMapHref,
    venueMapLabel,
    venuePhotos
}) => {
    const shouldShowMap = mapDisplayStyle !== 'none' && (venueMapHref || venueMapEmbedSrc);
    const venueBgColor = settings.venueBgColor || withColorAlpha(settings.headingColor || '#000000', 2, '#000000');
    const venueBorderColor = settings.venueBorderColor || withColorAlpha(settings.headingColor || '#000000', 9, '#000000');
    const venueTextColor = settings.venueTextColor || settings.headingColor;
    const venueBodyColor = settings.venueBodyColor || settings.bodyColor;

    if (venuePhotos.length === 0 && !shouldShowMap && !isPreview) return null;

    return (
        <section
            className={`booking-venue-gallery booking-venue-${venueGalleryStyle} mt-8 ${inspectClass}`}
            data-preview-section="venue-gallery"
            onClick={() => previewInspectEnabled && onInspect('venue')}
            style={{
                borderColor: venueBorderColor,
                backgroundColor: venueBgColor
            }}
        >
            <div className={`booking-venue-gallery-header booking-venue-gallery-header-${pageAlignment}`}>
                <div className="booking-venue-gallery-copy">
                    <span className="booking-venue-gallery-kicker" style={{ color: venueBodyColor }}>
                        <Images size={13} /> Venue gallery
                    </span>
                    <h4
                        className="booking-venue-gallery-title"
                        style={{
                            color: venueTextColor,
                            fontFamily: getFontFamily(settings.headingFontFamily || settings.fontFamily),
                            ...(headingLetterSpacing ? { letterSpacing: headingLetterSpacing } : {})
                        }}
                    >
                        {settings.venueTitle || 'Inside the space'}
                    </h4>
                    <p
                        className="booking-venue-gallery-intro"
                        style={{
                            color: venueBodyColor,
                            fontFamily: getFontFamily(settings.bodyFontFamily || settings.fontFamily),
                            ...(subtextLetterSpacing ? { letterSpacing: subtextLetterSpacing } : {})
                        }}
                    >
                        {settings.venueIntro || 'See the place before you book.'}
                    </p>
                </div>
                {venuePhotos.length > 0 && (
                    <span className="booking-venue-gallery-count" style={{ color: venueTextColor }}>
                        {venuePhotos.length} {venuePhotos.length === 1 ? 'photo' : 'photos'}
                    </span>
                )}
            </div>
            {venuePhotos.length === 0 && isPreview ? (
                <div className="booking-venue-gallery-grid booking-venue-preview-empty">
                    {[0, 1, 2, 3].map((item) => (
                        <figure
                            key={item}
                            className={`booking-venue-photo is-preview-empty ${item === 0 ? 'is-featured' : ''}`}
                            style={{
                                color: venueBodyColor,
                                backgroundColor: venueBgColor
                            }}
                        >
                            <Images size={item === 0 ? 20 : 15} />
                            {item === 0 && (
                                <figcaption style={{ color: venueTextColor, backgroundColor: withColorAlpha(settings.backgroundColor || '#ffffff', 91, '#ffffff') }}>
                                    Venue image
                                </figcaption>
                            )}
                        </figure>
                    ))}
                </div>
            ) : venuePhotos.length > 0 && (
                <div className={`booking-venue-gallery-grid ${venuePhotos.length === 1 ? 'is-single' : ''}`}>
                    {venuePhotos.map((photo, index) => (
                        <figure key={`${photo}-${index}`} className={`booking-venue-photo ${index === 0 ? 'is-featured' : ''}`}>
                            <img src={photo} alt={`Venue view ${index + 1}`} loading="lazy" />
                            {index === 0 && (
                                <figcaption style={{ color: venueTextColor, backgroundColor: withColorAlpha(settings.backgroundColor || '#ffffff', 91, '#ffffff') }}>
                                    Step inside
                                </figcaption>
                            )}
                        </figure>
                    ))}
                </div>
            )}
            {venueMapEmbedSrc && mapDisplayStyle !== 'none' && (
                <div
                    className={`booking-map-embed booking-map-${mapDisplayStyle}`}
                    style={{
                        borderColor: venueBorderColor,
                        backgroundColor: venueBgColor
                    }}
                >
                    <iframe
                        title={`Map for ${venueMapLabel || settings.brandName || 'business location'}`}
                        src={venueMapEmbedSrc}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        allowFullScreen
                    />
                </div>
            )}
            {venueMapHref && mapDisplayStyle !== 'none' && (
                <a
                    href={venueMapHref}
                    target="_blank"
                    rel="noreferrer"
                    className={`booking-map-link booking-map-${mapDisplayStyle}`}
                    onClick={(event) => {
                        if (isPreview) event.preventDefault();
                    }}
                    style={{
                        color: venueTextColor,
                        borderColor: venueBorderColor,
                        backgroundColor: venueBgColor
                    }}
                >
                    <span><MapPin size={15} /> Open directions</span>
                    <ArrowRight size={14} />
                </a>
            )}
            {!venueMapHref && isPreview && mapDisplayStyle !== 'none' && (
                <button
                    type="button"
                    className={`booking-map-link booking-map-${mapDisplayStyle} booking-preview-map-blank`}
                    onClick={(event) => {
                        event.stopPropagation();
                    }}
                    style={{
                        color: venueTextColor,
                        borderColor: venueBorderColor,
                        backgroundColor: venueBgColor
                    }}
                >
                    <span><MapPin size={15} /> Add your location here</span>
                    <Plus size={14} />
                </button>
            )}
        </section>
    );
};
