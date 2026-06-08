import { useId } from 'react';
import { Check, ChevronDown, Clock, ImageIcon, Plus } from 'lucide-react';
import { getFontFamily } from '../../../data/fonts';
import { formatServiceDuration, formatServicePrice } from '../../../utils/services';
import { withColorAlpha } from '../../../utils/theme';
import { getServiceCardStyle } from '../utils/bookingFlowUtils';

const getServiceCategory = (service) => service.category?.trim() || '';

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

    if (activeServices.length === 0 && !isPreview) return null;

    const serviceTextColor = settings.serviceTextColor || settings.headingColor || '#050505';
    const serviceBodyColor = settings.serviceBodyColor || serviceTextColor;
    const serviceBgColor = settings.serviceBgColor && settings.serviceBgColor !== 'transparent'
        ? settings.serviceBgColor
        : '#FFFFFF';
    const serviceBorderColor = settings.serviceBorderColor || withColorAlpha(settings.bodyColor || '#000', 9, '#000000');
    const serviceActiveBgColor = settings.serviceActiveBgColor || withColorAlpha(settings.primaryColor || '#000', 7, '#000000');
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

    const selectCategory = (category) => {
        setSelectedServiceCategory(category);
        setServicesDropdownOpen(false);

        if (category === 'All' || activeServices.length === 0) return;
        const nextService = activeServices.find(service => getServiceCategory(service) === category);
        if (nextService && selectedService?.id !== nextService.id) {
            setSelectedServiceId(nextService.id);
        }
    };

    const renderServiceMeta = ({ duration, price, className = '', priceColor, mutedColor, showClock = false } = {}) => {
        if (!duration && !price) return null;
        return (
            <div className={`booking-service-meta ${className}`.trim()} aria-label="Service price and duration">
                {duration && (
                    <span className="booking-service-meta-item is-duration" style={mutedColor ? { color: mutedColor } : undefined}>
                        {showClock && <Clock size={12} />}
                        {duration}
                    </span>
                )}
                {duration && price && <span className="booking-service-meta-separator" aria-hidden="true">/</span>}
                {price && (
                    <span className="booking-service-meta-item is-price" style={priceColor ? { color: priceColor } : undefined}>
                        {price}
                    </span>
                )}
            </div>
        );
    };

    const renderServiceImagePlaceholder = (showAction = false) => (
        <span className={`booking-service-image-placeholder ${showAction ? 'has-add-action' : ''}`} aria-hidden={showAction ? undefined : 'true'}>
            <ImageIcon className="booking-service-image-placeholder-icon" size={22} />
            {showAction && (
                <span className="booking-service-image-placeholder-action">
                    <Plus size={13} />
                    <span>Add services</span>
                </span>
            )}
        </span>
    );

    const renderServiceButton = (service, options = {}) => {
        const isPreviewPlaceholder = Boolean(service.isPreviewPlaceholder);
        const isActive = options.isActive ?? (selectedService?.id === service.id);
        const price = formatServicePrice(service);
        const duration = formatServiceDuration(service.duration);
        const hasServiceImage = Boolean(service.imageUrls?.[0]);
        const showServiceImageSlot = hasServiceImage || isPreview;

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
                className={`booking-service-option appearance-none outline-none focus:outline-none text-left rounded-2xl border p-4 md:p-5 transition-all booking-service-border-${serviceBorderStyle} ${showServiceImageSlot ? 'has-service-image' : 'is-text-only-service'} ${!hasServiceImage && isPreview ? 'has-placeholder-image' : ''} ${isPreviewPlaceholder ? 'is-preview-empty' : ''} ${isActive ? `is-selected scale-[1.01] shadow-xl ${nativeAccentBorderClass}` : 'hover:-translate-y-0.5'}`}
                style={getServiceCardStyle({ isActive, settings, nativeAccent, serviceBorderStyle })}
            >
                <div className="booking-service-shell flex items-start gap-4">
                    {showServiceImageSlot && (
                        <div className="booking-service-image w-14 h-14 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center" style={{ backgroundColor: isActive ? (settings.primaryColor || '#000') : serviceBgColor, color: isActive ? (settings.buttonTextColor || '#000') : serviceTextColor }}>
                            {hasServiceImage ? (
                                <img src={service.imageUrls[0]} alt="" className="w-full h-full object-cover" />
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
                                <span className="booking-service-selected-mark" style={{ color: settings.primaryColor, borderColor: `${settings.primaryColor || '#000'}40`, backgroundColor: `${settings.primaryColor || '#000'}0F` }}>
                                    <Check size={14} />
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
                    {renderServiceMeta({ duration, price, className: 'booking-service-side booking-service-facts', priceColor: serviceTextColor, mutedColor: serviceBodyColor })}
                </div>
            </button>
        );
    };

    const renderCategoryRail = () => {
        if (!hasCategoryChoices) return null;
        return (
            <div className="booking-service-category-rail" aria-label="Service categories">
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
                                borderColor: isActive ? settings.primaryColor : serviceBorderColor,
                                backgroundColor: isActive ? serviceActiveBgColor : serviceBgColor
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
                    aria-label="Choose service category"
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
                    aria-label="Service categories"
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
                                    borderColor: isActive ? settings.primaryColor : serviceBorderColor,
                                    backgroundColor: isActive ? serviceActiveBgColor : 'transparent',
                                    fontFamily: getFontFamily(settings.bodyFontFamily || settings.fontFamily)
                                }}
                            >
                                <span>{category}</span>
                                {isActive && <Check size={13} />}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    const categoryControl = serviceDropdownEnabled ? renderCategoryDropdown() : renderCategoryRail();

    return (
        <section data-preview-section="services" className="pt-2" style={{ order: 1 }}>
            <div className={`flex flex-col ${pageItems} ${pageTextClass} mb-6 px-1 ${inspectClass}`} onClick={() => previewInspectEnabled && onInspect('services')}>
                <h4 className="booking-section-heading text-xl md:text-2xl font-bold tracking-tight" style={{ color: settings.headingColor, fontFamily: getFontFamily(settings.headingFontFamily || settings.fontFamily), ...(headingLetterSpacing ? { letterSpacing: headingLetterSpacing } : {}) }}>
                    Choose your service
                </h4>
            </div>
            <div className={`booking-services-wrap booking-services-wrap-${serviceDisplayStyle} ${hasCategoryChoices ? 'has-category-control' : 'has-single-category'}`} onClick={() => previewInspectEnabled && onInspect('services')}>
                {categoryControl}
                <div className={`booking-services-grid booking-services-rail booking-services-tiles ${serviceDropdownEnabled ? 'booking-services-dropdown-cards' : ''} ${activeServices.length === 0 && isPreview ? 'booking-services-preview-empty' : ''} grid grid-cols-1 md:grid-cols-2 gap-3`}>
                    {serviceCards.map((service, index) => renderServiceButton(service, { isActive: activeServices.length === 0 && index === 0 }))}
                </div>
            </div>
        </section>
    );
};
