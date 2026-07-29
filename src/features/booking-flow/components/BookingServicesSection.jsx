import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, LayoutList, X } from 'lucide-react';
import { getFontFamily } from '../../../data/fonts';
import { formatServiceDuration, formatServicePrice } from '../../../utils/services';
import { withColorAlpha } from '../../../utils/theme';
import { getServiceCardStyle } from '../utils/bookingFlowUtils';

const getServiceCategory = (service) => service.category?.trim() || '';

const getServiceCardVariant = (service = {}) => {
    return 'appointment';
};

export const BookingServicesSection = ({
    activeServices,
    headingLetterSpacing,
    inspectClass,
    isPreview,
    nativeAccent,
    nativeAccentBorderClass,
    onInspect,
    pageItems,
    pageTextClass,
    previewInspectEnabled,
    selectedService,
    selectedServiceCategory,
    serviceBorderStyle,
    serviceCardsForDisplay,
    serviceCategories,
    serviceDisplayStyle,
    serviceDropdownEnabled,
    serviceDropdownOpen,
    setSelectedServiceCategory,
    setSelectedServiceId,
    setServicesDropdownOpen,
    settings
}) => {
    const categoryDropdownId = useId();
    const [galleryState, setGalleryState] = useState(null);
    const serviceCarouselRef = useRef(null);
    const [serviceCarouselState, setServiceCarouselState] = useState({
        hasOverflow: false,
        canGoPrevious: false,
        canGoNext: false
    });

    const serviceTextColor = settings.serviceTextColor || settings.headingColor || '#050505';
    const serviceBodyColor = settings.serviceBodyColor || serviceTextColor;
    const serviceMetaColor = settings.serviceMetaColor || serviceTextColor;
    const serviceBgColor = settings.serviceBgColor && settings.serviceBgColor !== 'transparent'
        ? settings.serviceBgColor
        : '#FFFFFF';
    const serviceBorderColor = settings.serviceBorderColor || withColorAlpha(settings.bodyColor || '#000', 9, '#000000');
    const serviceCategoryActiveColor = settings.serviceCategoryActiveColor || settings.primaryColor || '#000000';
    const serviceCategoryActiveBgColor = withColorAlpha(serviceCategoryActiveColor, 7, '#000000');
    const serviceActiveBorderColor = settings.serviceActiveBorderColor || settings.serviceBorderColor || settings.primaryColor || '#000000';
    const serviceActiveBgColor = settings.serviceActiveBgColor || withColorAlpha(serviceActiveBorderColor, 7, '#000000');
    const goToServicesStudio = () => {
        if (typeof window !== 'undefined') window.location.hash = '#/dashboard/services';
    };

    const previewCategories = isPreview
        ? ['All', ...Array.from(new Set(serviceCardsForDisplay.map(service => getServiceCategory(service)).filter(Boolean)))]
        : [];
    const categoriesForDisplay = serviceCategories.length > 1 ? serviceCategories : previewCategories;
    const hasCategoryChoices = categoriesForDisplay.length > 1;
    const visibleServiceCards = activeServices.length === 0 && selectedServiceCategory !== 'All'
        ? serviceCardsForDisplay.filter(service => getServiceCategory(service) === selectedServiceCategory)
        : serviceCardsForDisplay;
    const serviceCards = visibleServiceCards.length > 0 ? visibleServiceCards : serviceCardsForDisplay;
    const selectedCategoryLabel = selectedServiceCategory === 'All' ? 'All services' : selectedServiceCategory;
    const galleryImages = Array.isArray(galleryState?.service?.imageUrls)
        ? galleryState.service.imageUrls.filter(Boolean)
        : [];
    const galleryIndex = galleryImages.length
        ? Math.min(galleryState?.index || 0, galleryImages.length - 1)
        : 0;
    const galleryImage = galleryImages[galleryIndex];

    useEffect(() => {
        const viewport = serviceCarouselRef.current;
        if (!viewport) return undefined;

        viewport.scrollTo({ left: 0 });

        const updateCarouselState = () => {
            const hasOverflow = serviceCards.length > 1 && viewport.scrollWidth > viewport.clientWidth + 4;
            const canGoPrevious = hasOverflow && viewport.scrollLeft > 4;
            const canGoNext = hasOverflow && viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - 4;

            setServiceCarouselState(previous => {
                if (
                    previous.hasOverflow === hasOverflow &&
                    previous.canGoPrevious === canGoPrevious &&
                    previous.canGoNext === canGoNext
                ) {
                    return previous;
                }
                return { hasOverflow, canGoPrevious, canGoNext };
            });
        };

        const frame = window.requestAnimationFrame(updateCarouselState);
        const resizeObserver = typeof ResizeObserver === 'undefined'
            ? null
            : new ResizeObserver(updateCarouselState);

        resizeObserver?.observe(viewport);
        viewport.addEventListener('scroll', updateCarouselState, { passive: true });

        return () => {
            window.cancelAnimationFrame(frame);
            resizeObserver?.disconnect();
            viewport.removeEventListener('scroll', updateCarouselState);
        };
    }, [selectedServiceCategory, serviceCards.length]);

    const moveServiceCarousel = (direction) => {
        const viewport = serviceCarouselRef.current;
        if (!viewport) return;

        const firstCard = viewport.querySelector('.booking-service-option');
        const styles = window.getComputedStyle(viewport);
        const gap = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0;
        const cardWidth = firstCard?.getBoundingClientRect().width || viewport.clientWidth * 0.78;

        viewport.scrollBy({
            left: direction * (cardWidth + gap),
            behavior: 'smooth'
        });
    };

    const selectCategory = (category) => {
        setSelectedServiceCategory(category);
        setServicesDropdownOpen(false);

        if (category === 'All' || activeServices.length === 0) return;
        const nextService = activeServices.find(service => getServiceCategory(service) === category);
        if (nextService && selectedService?.id !== nextService.id) {
            setSelectedServiceId(nextService.id);
        }
    };

    const renderServiceMeta = ({ duration, price, className = '', priceColor, mutedColor } = {}) => {
        if (!duration && !price) return null;
        return (
            <div className={`booking-service-meta ${className}`.trim()} aria-label="Price and duration">
                {price && (
                    <span className="booking-service-meta-item is-price" style={priceColor ? { color: priceColor } : undefined}>
                        <span className="booking-service-meta-label">Price</span>
                        <span className="booking-service-meta-value">{price}</span>
                    </span>
                )}
                {duration && (
                    <span className="booking-service-meta-item is-duration" style={mutedColor ? { color: mutedColor } : undefined}>
                        <span className="booking-service-meta-label">Duration</span>
                        <span className="booking-service-meta-value">{duration}</span>
                    </span>
                )}
            </div>
        );
    };

    const renderServiceImagePlaceholder = (showAction = false) => (
        <span className={`booking-service-image-placeholder ${showAction ? 'has-add-action' : ''}`} aria-hidden="true">
            <span className="booking-service-image-placeholder-icon" />
            {showAction && (
                <span className="booking-service-image-placeholder-action" />
            )}
        </span>
    );

    const renderServiceButton = (service, options = {}) => {
        const isPreviewPlaceholder = Boolean(service.isPreviewPlaceholder);
        const isActive = options.isActive ?? (selectedService?.id === service.id);
        const price = formatServicePrice(service);
        const duration = service.durationMode === 'schedule' ? '' : formatServiceDuration(service.duration);
        const hasServiceImage = Boolean(service.imageUrls?.[0]);
        const imageCount = Array.isArray(service.imageUrls) ? service.imageUrls.filter(Boolean).length : 0;
        const showServiceImageSlot = hasServiceImage || isPreview;
        const cardVariant = getServiceCardVariant(service);
        const openGallery = (event, index = 0) => {
            if (!imageCount) return;
            event.stopPropagation();
            event.preventDefault();
            setGalleryState({ service, index });
        };

        return (
            <button
                key={service.id}
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    if (isPreviewPlaceholder) {
                        goToServicesStudio();
                        return;
                    }
                    setSelectedServiceId(service.id);
                }}
                data-testid="booking-service-option"
                data-service-id={service.id}
                data-card-variant={cardVariant}
                className={`booking-service-option appearance-none outline-none focus:outline-none text-left rounded-2xl border p-4 md:p-5 transition-all booking-service-border-${serviceBorderStyle} booking-service-variant-${cardVariant} ${showServiceImageSlot ? 'has-service-image' : 'is-text-only-service'} ${!hasServiceImage && isPreview ? 'has-placeholder-image' : ''} ${isPreviewPlaceholder ? 'is-preview-empty' : ''} ${isActive ? `is-selected scale-[1.01] shadow-xl ${nativeAccentBorderClass}` : 'hover:-translate-y-0.5'}`}
                style={getServiceCardStyle({ isActive, settings, nativeAccent, serviceBorderStyle })}
            >
                <div className="booking-service-shell flex items-start gap-4">
                    {showServiceImageSlot && (
                        <div
                            className={`booking-service-image w-14 h-14 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center ${hasServiceImage ? 'is-gallery-enabled' : ''}`}
                            role={hasServiceImage ? 'button' : undefined}
                            tabIndex={hasServiceImage ? 0 : undefined}
                            aria-label={hasServiceImage ? `${service.name} photos` : undefined}
                            onClick={(event) => openGallery(event)}
                            onKeyDown={(event) => {
                                if (!hasServiceImage) return;
                                if (event.key === 'Enter' || event.key === ' ') openGallery(event);
                            }}
                            style={{ backgroundColor: isActive ? serviceActiveBorderColor : serviceBgColor, color: isActive ? (settings.buttonTextColor || '#000') : serviceTextColor }}
                        >
                            {hasServiceImage ? (
                                <>
                                    <span className="booking-service-image-fallback" aria-hidden="true">
                                        {renderServiceImagePlaceholder(false)}
                                    </span>
                                    <img
                                        src={service.imageUrls[0]}
                                        alt=""
                                        className="w-full h-full object-cover"
                                        onError={(event) => {
                                            event.currentTarget.style.display = 'none';
                                        }}
                                    />
                                    {imageCount > 1 && (
                                        <span className="booking-service-image-count" aria-label="Images">
                                            {imageCount}
                                        </span>
                                    )}
                                </>
                            ) : (
                                renderServiceImagePlaceholder(isPreviewPlaceholder)
                            )}
                        </div>
                    )}
                    <div
                        className="booking-service-copy booking-service-main min-w-0"
                        style={{ textAlign: 'left' }}
                    >
                        <div className="booking-service-title-line flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                {service.category && <span className="booking-service-eyebrow" style={{ color: serviceBodyColor }}>{service.category}</span>}
                                <h5 className="text-base md:text-lg font-bold tracking-tight" style={{ color: serviceTextColor, fontFamily: getFontFamily(settings.headingFontFamily || settings.fontFamily) }}>{service.name}</h5>
                            </div>
                            {isActive && (
                                <span className="booking-service-selected-mark" style={{ color: serviceActiveBorderColor, borderColor: withColorAlpha(serviceActiveBorderColor, 26, '#000000'), backgroundColor: serviceActiveBgColor }}>
                                    <Check size={12} strokeWidth={3} aria-hidden="true" />
                                </span>
                            )}
                        </div>
                        {service.description && (
                            <p
                                className="booking-service-description text-xs md:text-sm mt-2 leading-relaxed"
                                style={{
                                    color: serviceBodyColor,
                                    textAlign: 'left',
                                    marginLeft: 0,
                                    marginRight: 0,
                                    maxWidth: 'none'
                                }}
                            >
                                {service.description}
                            </p>
                        )}
                    </div>
                    {renderServiceMeta({ duration, price, className: 'booking-service-side booking-service-facts', priceColor: serviceMetaColor, mutedColor: serviceMetaColor })}
                </div>
            </button>
        );
    };

    const renderCategoryRail = () => {
        if (!hasCategoryChoices) return null;
        return (
            <div className="booking-service-category-rail" aria-label="Categories">
                {categoriesForDisplay.map(category => {
                    const isActive = selectedServiceCategory === category;
                    return (
                        <button
                            key={category}
                            type="button"
                            aria-pressed={isActive}
                            className={isActive ? nativeAccentBorderClass : ''}
                            onClick={(event) => {
                                event.stopPropagation();
                                selectCategory(category);
                            }}
                            style={{
                                color: isActive ? serviceTextColor : settings.bodyColor,
                                borderColor: isActive ? serviceCategoryActiveColor : serviceBorderColor,
                                backgroundColor: isActive ? serviceCategoryActiveBgColor : serviceBgColor
                            }}
                        >
                            {category}
                        </button>
                    );
                })}
            </div>
        );
    };

    const renderCategoryDropdown = () => {
        if (!hasCategoryChoices) return null;
        return (
            <div
                className={`booking-category-dropdown ${serviceDropdownOpen ? 'is-open' : ''}`}
                onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                        event.stopPropagation();
                        setServicesDropdownOpen(false);
                    }
                }}
            >
                <button
                    type="button"
                    className={`booking-category-dropdown-trigger booking-service-dropdown-border-${serviceBorderStyle} ${nativeAccentBorderClass}`}
                    aria-controls={categoryDropdownId}
                    aria-expanded={serviceDropdownOpen}
                    aria-haspopup="true"
                    aria-label="Category"
                    onClick={(event) => {
                        event.stopPropagation();
                        setServicesDropdownOpen(open => !open);
                    }}
                    style={{
                        color: serviceTextColor,
                        borderColor: serviceBorderColor,
                        backgroundColor: serviceBgColor,
                        fontFamily: getFontFamily(settings.headingFontFamily || settings.fontFamily)
                    }}
                >
                    <span>
                        <small>Category</small>
                        <strong>{selectedCategoryLabel}</strong>
                    </span>
                    <ChevronDown size={16} className="booking-category-dropdown-chevron" />
                </button>
                <div
                    id={categoryDropdownId}
                    className="booking-category-dropdown-panel"
                    aria-label="Categories"
                >
                    {categoriesForDisplay.map(category => {
                        const isActive = selectedServiceCategory === category;
                        return (
                            <button
                                key={category}
                                type="button"
                                aria-pressed={isActive}
                                className={isActive ? 'is-active' : ''}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    selectCategory(category);
                                }}
                                style={{
                                    color: isActive ? serviceTextColor : settings.bodyColor,
                                    borderColor: isActive ? serviceCategoryActiveColor : serviceBorderColor,
                                    backgroundColor: isActive ? serviceCategoryActiveBgColor : 'transparent',
                                    fontFamily: getFontFamily(settings.bodyFontFamily || settings.fontFamily)
                                }}
                            >
                                <span>{category}</span>
                                {isActive && <Check size={12} strokeWidth={3} aria-hidden="true" />}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    const categoryControl = serviceDropdownEnabled ? renderCategoryDropdown() : renderCategoryRail();

    if (activeServices.length === 0 && !isPreview) {
        return (
            <section data-preview-section="services" className="pt-2" style={{ order: 1 }}>
                <div className={`flex flex-col ${pageItems} ${pageTextClass} mb-6 px-1 ${inspectClass}`} onClick={() => previewInspectEnabled && onInspect('services')}>
                    <h4 className="booking-section-heading text-xl md:text-2xl font-bold tracking-tight" style={{ color: settings.headingColor, fontFamily: getFontFamily(settings.headingFontFamily || settings.fontFamily), ...(headingLetterSpacing ? { letterSpacing: headingLetterSpacing } : {}) }}>
                        {settings.serviceHeading || 'Choose your service'}
                    </h4>
                    <p className="booking-section-subtext" style={{ color: serviceBodyColor, fontFamily: getFontFamily(settings.bodyFontFamily || settings.fontFamily) }}>
                        {settings.serviceSubtext || 'Select the option that works best for you.'}
                    </p>
                </div>
                <div
                    className="mx-auto w-full max-w-[34rem] rounded-2xl border px-5 py-5 md:px-6 md:py-6"
                    style={{
                        backgroundColor: settings.pageSurfaceColor || '#ffffff',
                        borderColor: withColorAlpha(settings.headingColor || '#000000', 8, '#000000'),
                        boxShadow: '0 18px 44px -40px rgba(15, 23, 42, 0.32)'
                    }}
                >
                    <div className="flex items-start gap-4">
                        <span
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border"
                            style={{
                                backgroundColor: withColorAlpha(settings.primaryColor || '#000000', 5, '#ffffff'),
                                borderColor: withColorAlpha(settings.primaryColor || settings.headingColor || '#000000', 14, '#000000'),
                                color: settings.primaryColor || settings.headingColor || '#050505'
                            }}
                        >
                            <LayoutList size={18} />
                        </span>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-[0.35em] opacity-35" style={{ color: settings.bodyColor }}>
                                Services
                            </p>
                            <h5 className="mt-1 text-lg md:text-xl font-black tracking-tight" style={{ color: serviceTextColor, fontFamily: getFontFamily(settings.headingFontFamily || settings.fontFamily) }}>
                                No services published yet
                            </h5>
                            <p className="mt-2 text-sm leading-relaxed" style={{ color: serviceBodyColor }}>
                                This page can still collect a general request while the business finishes setting up services.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section data-preview-section="services" className="pt-2" style={{ order: 1 }}>
            <div className={`flex flex-col ${pageItems} ${pageTextClass} mb-6 px-1 ${inspectClass}`} onClick={() => previewInspectEnabled && onInspect('services')}>
                <h4 className="booking-section-heading text-xl md:text-2xl font-bold tracking-tight" style={{ color: settings.headingColor, fontFamily: getFontFamily(settings.headingFontFamily || settings.fontFamily), ...(headingLetterSpacing ? { letterSpacing: headingLetterSpacing } : {}) }}>
                    {settings.serviceHeading || 'Choose your service'}
                </h4>
                <p className="booking-section-subtext" style={{ color: serviceBodyColor, fontFamily: getFontFamily(settings.bodyFontFamily || settings.fontFamily) }}>
                    {settings.serviceSubtext || 'Select the option that works best for you.'}
                </p>
            </div>
            <div className={`booking-services-wrap booking-services-wrap-${serviceDisplayStyle} ${hasCategoryChoices ? 'has-category-control' : 'has-single-category'}`} onClick={() => previewInspectEnabled && onInspect('services')}>
                {categoryControl}
                <div
                    className={`booking-services-carousel ${serviceCarouselState.hasOverflow ? 'has-overflow' : ''} ${serviceCarouselState.canGoPrevious ? 'can-go-previous' : ''} ${serviceCarouselState.canGoNext ? 'can-go-next' : ''}`}
                    style={{ '--booking-carousel-fade': settings.backgroundColor || '#ffffff' }}
                >
                    {serviceCarouselState.hasOverflow && (
                        <button
                            type="button"
                            className="booking-services-carousel-arrow is-previous"
                            aria-label="Previous services"
                            disabled={!serviceCarouselState.canGoPrevious}
                            onClick={(event) => {
                                event.stopPropagation();
                                moveServiceCarousel(-1);
                            }}
                        >
                            <ChevronLeft size={17} strokeWidth={2.4} aria-hidden="true" />
                        </button>
                    )}
                    <div
                        ref={serviceCarouselRef}
                        className={`booking-services-grid booking-services-carousel-viewport booking-services-rail booking-services-tiles ${serviceDropdownEnabled ? 'booking-services-dropdown-cards' : ''} ${activeServices.length === 0 && isPreview ? 'booking-services-preview-empty' : ''} grid grid-cols-1 md:grid-cols-2 gap-3`}
                    >
                        {serviceCards.map((service, index) => renderServiceButton(
                            service,
                            activeServices.length === 0 ? { isActive: index === 0 } : {}
                        ))}
                    </div>
                    {serviceCarouselState.hasOverflow && (
                        <button
                            type="button"
                            className="booking-services-carousel-arrow is-next"
                            aria-label="Next services"
                            disabled={!serviceCarouselState.canGoNext}
                            onClick={(event) => {
                                event.stopPropagation();
                                moveServiceCarousel(1);
                            }}
                        >
                            <ChevronRight size={17} strokeWidth={2.4} aria-hidden="true" />
                        </button>
                    )}
                </div>
                {serviceCarouselState.hasOverflow && (
                    <div className="booking-services-carousel-controls">
                        <p className="booking-services-carousel-guide" aria-live="polite">
                            <span className="is-touch-guide">Swipe left or right to explore services</span>
                            <span className="is-pointer-guide">Use the arrows to explore services</span>
                        </p>
                    </div>
                )}
            </div>
            {galleryImage && (
                <div
                    className="booking-service-gallery-lightbox"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Service gallery"
                    onClick={(event) => {
                        event.stopPropagation();
                        setGalleryState(null);
                    }}
                >
                    <div className="booking-service-gallery-panel" onClick={(event) => event.stopPropagation()}>
                        <div className="booking-service-gallery-topbar">
                            <div>
                                <strong>{galleryState.service.name || 'Gallery'}</strong>
                                <span>{galleryIndex + 1} of {galleryImages.length}</span>
                            </div>
                            <button type="button" onClick={() => setGalleryState(null)} aria-label="Close">
                                <X size={16} strokeWidth={2.5} aria-hidden="true" />
                            </button>
                        </div>
                        <div className="booking-service-gallery-image">
                            <span className="booking-service-gallery-fallback" aria-hidden="true">
                                <span className="booking-service-gallery-fallback-mark" />
                            </span>
                            <img
                                src={galleryImage}
                                alt=""
                                onError={(event) => {
                                    event.currentTarget.style.display = 'none';
                                }}
                            />
                            {galleryImages.length > 1 && (
                                <>
                                    <button
                                        type="button"
                                        className="is-previous"
                                        onClick={() => setGalleryState(prev => ({ ...prev, index: (galleryIndex - 1 + galleryImages.length) % galleryImages.length }))}
                                        aria-label="Previous"
                                    >
                                        <ChevronDown className="booking-service-gallery-chevron is-previous" size={18} />
                                    </button>
                                    <button
                                        type="button"
                                        className="is-next"
                                        onClick={() => setGalleryState(prev => ({ ...prev, index: (galleryIndex + 1) % galleryImages.length }))}
                                        aria-label="Next"
                                    >
                                        <ChevronDown className="booking-service-gallery-chevron is-next" size={18} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};
