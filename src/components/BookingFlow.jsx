import { lazy, memo, Suspense, useEffect, useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import '../styles/booking-runtime.css';
import { getFontFamily } from '../data/fonts';
import { withColorAlpha } from '../utils/theme';
import { BookingDetailsForm } from '../features/booking-flow/components/BookingDetailsForm';
import { BookingHeroSection } from '../features/booking-flow/components/BookingHeroSection';
import { BookingPageLoader } from '../features/booking-flow/components/BookingPageLoader';
import { BookingSelectionSections } from '../features/booking-flow/components/BookingSelectionSections';
import { BookingSelectionStep } from '../features/booking-flow/components/BookingSelectionStep';
import { BookingSocialLinks } from '../features/booking-flow/components/BookingSocialLinks';
import { BookingVenueGallery } from '../features/booking-flow/components/BookingVenueGallery';
import {
    buildGoogleMapsDirectionsUrl,
    buildGoogleMapsEmbedUrl,
    getMapPlaceLabel
} from '../features/maps/googleMaps';
import {
    bookingStyleDirections,
    createPreviewSocialLinks,
} from '../features/booking-flow/config/bookingFlowConfig';
import {
    clampNumber,
    getAlign,
    getBannerDisplay,
    getBookingStepLayout,
    getDisplayLook,
    getFunnelPageSettings,
    getLogoDisplay,
    getOptionalLetterSpacing,
    getStaffAssignmentMode,
    getVisualStyle,
    normalizeHandle,
    normalizeWebsite
} from '../features/booking-flow/utils/bookingFlowUtils';
import {
    useBookingFlowAvailability,
    useBookingFlowCalendar,
    useBookingFlowLifecycle,
    useBookingFlowPayment,
    useBookingFlowSubmission,
    useBookingServiceDisplay
} from '../features/booking-flow/hooks';

const previewSocialLinks = createPreviewSocialLinks();
const loadBookingCartStep = () => import('../features/booking-flow/components/BookingCartStep').then((module) => ({ default: module.BookingCartStep }));
const loadBookingCheckoutStep = () => import('../features/booking-flow/components/BookingCheckoutStep').then((module) => ({ default: module.BookingCheckoutStep }));
const loadBookingPaymentStep = () => import('../features/booking-flow/components/BookingPaymentStep').then((module) => ({ default: module.BookingPaymentStep }));
const loadBookingSuccessState = () => import('../features/booking-flow/components/BookingSuccessState').then((module) => ({ default: module.BookingSuccessState }));
const BookingCartStep = lazy(loadBookingCartStep);
const BookingCheckoutStep = lazy(loadBookingCheckoutStep);
const BookingPaymentStep = lazy(loadBookingPaymentStep);
const BookingSuccessState = lazy(loadBookingSuccessState);

const nativeTypographySettings = {
    fontFamily: 'figtree',
    headingFontFamily: 'plus-jakarta',
    bodyFontFamily: 'figtree',
    buttonFontFamily: 'inter',
    slotFontFamily: 'plus-jakarta',
    dateFontFamily: 'plus-jakarta',
    brandNameFontFamily: 'plus-jakarta',
    taglineFontFamily: 'figtree',
    welcomeFontFamily: 'figtree',
    headingLetterSpacing: 0,
    subtextLetterSpacing: 0
};

// --- PUBLIC BOOKING ENGINE (WITH NEW EXTENSIONS & SPECIFIC FONTS) ---
export const BookingFlow = memo(({ settings: incomingSettings, onComplete, isPreview = false, previewStep = 'select', onInspect, onInstallApp, onSettingChange, onMediaUpload }) => {
            const settings = useMemo(() => ({
                ...incomingSettings,
                ...nativeTypographySettings
            }), [incomingSettings]);
            const {
                isInitialLoading,
                setStep,
                setSubmittedBooking,
                step,
                submittedBooking
            } = useBookingFlowLifecycle({ settings, isPreview, previewStep });
            const {
                activeDate,
                availableTimesForActiveDate,
                displayDates,
                selectedDateIdx,
                selectedTime,
                setSelectedDateIdx,
                setSelectedTime,
                visibleDisplayDates
            } = useBookingFlowCalendar({ settings, isPreview });
            const [selectedStaffId, setSelectedStaffId] = useState('');
            const [formData, setFormData] = useState({ name: '', phone: '', email: '', country: '', birthday: '', note: '', emailOptIn: false });
            const [selectedManualPayment, setSelectedManualPayment] = useState('');
            const [openFaq, setOpenFaq] = useState(null);

            useEffect(() => {
                const preloadFunnelSteps = () => {
                    loadBookingCartStep();
                    loadBookingCheckoutStep();
                    loadBookingPaymentStep();
                    loadBookingSuccessState();
                };
                if (typeof window !== 'undefined' && window.requestIdleCallback) {
                    const idleId = window.requestIdleCallback(preloadFunnelSteps, { timeout: 1500 });
                    return () => window.cancelIdleCallback?.(idleId);
                }
                const fallbackTimer = setTimeout(preloadFunnelSteps, 600);
                return () => clearTimeout(fallbackTimer);
            }, []);

            const collectClientName = settings.features?.collectClientName !== false;
            const collectClientPhone = settings.features?.collectClientPhone !== false;
            const collectClientEmail = settings.features?.collectClientEmail !== false;
            const collectClientNotes = Boolean(settings.features?.collectClientNotes);
            const emailOptInEnabled = Boolean(settings.features?.emailUpdates !== false && collectClientEmail);
            const styleDirection = bookingStyleDirections.includes(settings.interfaceStyleDirection)
                ? settings.interfaceStyleDirection
                : 'native-precision';
            const styleDirectionClass = `booking-style-${styleDirection}`;
            const isCommandFlow = styleDirection === 'command-flow';
            const nativePrecisionHeroLayout = ['native-precision', 'command-flow'].includes(styleDirection)
                ? {
                    logoDisplay: { alignment: 'left', placement: 'badge' },
                    bannerDisplay: { height: 112, placement: 'top', opacity: 100 },
                    serviceBorderStyle: 'solid'
                }
                : null;
            const serviceDisplay = useBookingServiceDisplay({ isPreview, nativePrecisionHeroLayout, settings });
            const {
                activeServices,
                selectedService,
                selectedServiceCategory,
                selectedServiceForSummary,
                serviceCardsForDisplay,
                serviceCategories,
                serviceDisplayStyle,
                serviceDropdownEnabled,
                servicesDropdownOpen,
                setSelectedServiceCategory,
                setSelectedServiceId,
                setServicesDropdownOpen,
                showServiceStep
            } = serviceDisplay;
            const availabilityRules = settings.availabilityRules || {};
            const staffAssignmentMode = getStaffAssignmentMode(availabilityRules);
            const {
                displayTimesForActiveDate,
                isPreviewTimePlaceholder,
                isWaitlistMode,
                selectedAvailabilityStaff,
                serviceAvailability,
                serviceAwareAvailabilityEnabled,
                serviceStaffOptions
            } = useBookingFlowAvailability({
                activeDate,
                availableTimesForActiveDate,
                isPreview,
                selectedService,
                selectedStaffId,
                setSelectedStaffId,
                settings,
                staffAssignmentMode
            });
            useEffect(() => {
                if (!isPreview || previewStep === 'select' || selectedTime || !displayTimesForActiveDate.length) return;
                setSelectedTime(displayTimesForActiveDate[0]);
            }, [displayTimesForActiveDate, isPreview, previewStep, selectedTime]);
            const previewMotionClass = isPreview ? '' : 'transition-all duration-1000';
            const previewStepMotionClass = isPreview ? '' : 'animate-in fade-in slide-in-from-bottom-20 duration-1000';
            const previewSuccessMotionClass = isPreview ? '' : 'animate-in zoom-in-95 duration-1000';
            const serviceReady = activeServices.length === 0 || Boolean(selectedService?.id);
            const showStaffSelection = staffAssignmentMode === 'client' && Boolean(selectedService?.id) && serviceStaffOptions.length > 0;
            const staffReady = staffAssignmentMode !== 'client' || !serviceAwareAvailabilityEnabled || Boolean(selectedStaffId);
            const {
                staffStepNumber,
                dateStepNumber,
                timeStepNumber,
                faqStepNumber,
                dateSectionOrder,
                timeSectionOrder,
                faqSectionOrder,
                selectionActionOrder
            } = getBookingStepLayout({ showServiceStep, showStaffSelection });
            const detailsReady = Boolean(
                (!collectClientName || formData.name) &&
                (!collectClientPhone || formData.phone) &&
                (!collectClientEmail || formData.email)
            );
            const canContinueToCart = Boolean((selectedTime || isWaitlistMode) && serviceReady && staffReady && !serviceAvailability.loading);
            const canSubmitBooking = Boolean(canContinueToCart && detailsReady);

            useEffect(() => {
                setSelectedTime(null);
            }, [activeDate?.localDateStr, selectedService?.id, selectedStaffId]);

            useEffect(() => {
                setFormData(prev => ({
                    ...prev,
                    name: collectClientName ? prev.name : '',
                    phone: collectClientPhone ? prev.phone : '',
                    email: collectClientEmail ? prev.email : '',
                    note: collectClientNotes ? prev.note : '',
                    emailOptIn: emailOptInEnabled ? prev.emailOptIn : false
                }));
            }, [collectClientEmail, collectClientName, collectClientNotes, collectClientPhone, emailOptInEnabled]);

            const nativeAccent = Boolean(settings.nativeAccent);
            const accentGradientActive = nativeAccent;
            const dynamicStyles = {
                fontFamily: getFontFamily(settings.bodyFontFamily || settings.fontFamily),
                color: settings.bodyColor || '#666666',
                backgroundColor: settings.backgroundColor || '#ffffff',
                '--booking-calendar-tile-bg': settings.dateBgColor && settings.dateBgColor !== 'transparent' ? settings.dateBgColor : 'transparent',
                '--booking-calendar-tile-text': settings.dateTextColor || settings.bodyColor || '#666666',
                '--booking-calendar-active-bg': settings.dateActiveBgColor || settings.primaryColor || '#050505',
                '--booking-calendar-active-text': settings.dateActiveTextColor || '#ffffff',
                '--booking-slot-bg': settings.slotBgColor || '#ffffff',
                '--booking-slot-text': settings.slotTextColor || settings.bodyColor || '#050505',
                '--booking-slot-active-bg': settings.slotActiveBgColor || settings.primaryColor || '#050505',
                '--booking-slot-active-text': settings.slotActiveTextColor || '#ffffff',
                '--booking-service-bg': settings.serviceBgColor && settings.serviceBgColor !== 'transparent' ? settings.serviceBgColor : '#ffffff',
                '--booking-service-text': settings.serviceTextColor || settings.headingColor || '#050505',
                '--booking-service-body': settings.serviceBodyColor || settings.serviceTextColor || settings.headingColor || '#050505',
                '--booking-body-copy': settings.serviceBodyColor || settings.faqAnswerColor || settings.bodyColor || settings.serviceTextColor || settings.headingColor || '#050505',
                '--booking-service-border': settings.serviceBorderColor || withColorAlpha(settings.bodyColor || '#000000', 9, '#000000'),
                '--booking-service-active-bg': settings.serviceActiveBgColor || withColorAlpha(settings.primaryColor || '#000000', 7, '#000000'),
                '--booking-service-active-border': settings.serviceActiveBorderColor || settings.serviceBorderColor || settings.primaryColor || '#050505',
                '--booking-service-category-active': settings.serviceCategoryActiveColor || settings.primaryColor || '#050505',
                '--booking-service-category-active-bg': withColorAlpha(settings.serviceCategoryActiveColor || settings.primaryColor || '#050505', 7, '#000000'),
                '--booking-timeline-button-bg': settings.timelineButtonColor || settings.buttonColor || settings.primaryColor || '#050505',
                '--booking-timeline-button-text': settings.timelineButtonTextColor || settings.buttonTextColor || '#ffffff',
                '--booking-timeline-icon-bg': settings.timelineIconColor || settings.timelineButtonColor || settings.buttonColor || settings.primaryColor || '#050505',
                '--booking-timeline-icon-text': settings.timelineIconTextColor || settings.timelineButtonTextColor || settings.buttonTextColor || '#ffffff',
                '--booking-venue-bg': settings.venueBgColor || withColorAlpha(settings.bodyColor || '#000000', 2, '#000000'),
                '--booking-venue-text': settings.venueTextColor || settings.bodyColor || '#050505',
                '--booking-venue-body': settings.venueBodyColor || settings.bodyColor || '#666666',
                '--booking-venue-border': settings.venueBorderColor || withColorAlpha(settings.bodyColor || '#000000', 9, '#000000'),
                '--booking-faq-bg': settings.faqBgColor && settings.faqBgColor !== 'transparent' ? settings.faqBgColor : 'rgba(255, 255, 255, 0.82)',
                '--booking-faq-border': settings.faqBorderColor || withColorAlpha(settings.bodyColor || '#000000', 9, '#000000'),
                '--booking-faq-text': settings.faqTextColor || settings.bodyColor || '#050505',
                '--booking-faq-answer': settings.faqAnswerColor || settings.bodyColor || '#666666',
                '--booking-step-accent': settings.primaryColor || '#050505',
                '--booking-heading-underline': settings.headingUnderlineColor || settings.primaryColor || '#050505',
                '--booking-step-text': settings.headingColor || '#050505',
                '--booking-step-muted': settings.bodyColor || '#666666'
            };
            const cartPageSettings = getFunnelPageSettings({ settings, key: 'cart' });
            const checkoutPageSettings = getFunnelPageSettings({ settings, key: 'checkout' });
            const successPageSettings = getFunnelPageSettings({ settings, key: 'success' });
            const activePageBackground = step === 'cart'
                ? cartPageSettings.backgroundColor
                : step === 'details'
                    ? checkoutPageSettings.backgroundColor
                    : step === 'success'
                        ? successPageSettings.backgroundColor
                        : dynamicStyles.backgroundColor;
            const nativeAccentFillClass = accentGradientActive ? 'booking-gradient-accent' : '';
            const nativeAccentButtonClass = accentGradientActive ? 'booking-gradient-button' : '';
            const nativeAccentBorderClass = accentGradientActive ? 'booking-gradient-border' : '';
            const previewInspectEnabled = false;
            const inspectClass = "";
            const logoDisplay = useMemo(() => getLogoDisplay({
                nativePrecisionHeroLayout,
                settings
            }), [nativePrecisionHeroLayout, settings]);
            const pageAlignment = getAlign(logoDisplay.alignment);
            const pageJustify = pageAlignment === 'center' ? 'center' : pageAlignment === 'right' ? 'flex-end' : 'flex-start';
            const pageItems = pageAlignment === 'center' ? 'items-center' : pageAlignment === 'right' ? 'items-end' : 'items-start';
            const pageTextClass = pageAlignment === 'center' ? 'text-center' : pageAlignment === 'right' ? 'text-right' : 'text-left';
            const brandText = {
                size: clampNumber(settings.brandNameSize, 36, 120, 76),
                font: settings.brandNameFontFamily || settings.headingFontFamily || settings.fontFamily
            };
            const taglineText = {
                size: clampNumber(settings.taglineSize, 8, 22, 9),
                font: settings.taglineFontFamily || settings.bodyFontFamily || settings.fontFamily
            };
            const welcomeText = {
                size: clampNumber(settings.welcomeSize, 13, 32, 20),
                font: settings.welcomeFontFamily || settings.bodyFontFamily || settings.fontFamily
            };
            const headingLetterSpacing = getOptionalLetterSpacing(settings.headingLetterSpacing, -4, 8);
            const subtextLetterSpacing = getOptionalLetterSpacing(settings.subtextLetterSpacing, -1, 6);
            const dateStyle = getVisualStyle(settings.dateStyle || settings.availabilityStyle, 'minimal');
            const timeSlotStyle = getVisualStyle(settings.timeSlotStyle || settings.availabilityStyle, 'minimal');
            const actionButtonStyle = getVisualStyle(settings.actionButtonStyle, 'solid');
            const faqStyle = isCommandFlow ? 'minimal' : getVisualStyle(settings.faqStyle, 'minimal');
            const socialIconStyle = getVisualStyle(settings.socialIconStyle, 'outline');
            const serviceBorderStyle = getVisualStyle(nativePrecisionHeroLayout?.serviceBorderStyle || settings.serviceBorderStyle, 'solid');
            const calendarDisplayStyle = getDisplayLook('calendar', settings.calendarDisplayStyle, 'studio');
            const timeDisplayStyle = getDisplayLook('time', settings.timeDisplayStyle, 'pill');
            const faqDisplayStyle = isCommandFlow ? 'accordion' : getDisplayLook('faq', settings.faqDisplayStyle, 'accordion');
            const venueGalleryStyle = getDisplayLook('venue', settings.venueGalleryStyle, 'mosaic');
            const mapDisplayStyle = getDisplayLook('maps', settings.mapDisplayStyle, 'card');
            const socialDisplayStyle = getDisplayLook('social', settings.socialDisplayStyle, 'icons');
            const faqItems = (settings.features?.faqEnabled && Array.isArray(settings.features?.faqs))
                ? settings.features.faqs.filter(faq => faq?.q?.trim() && faq?.a?.trim())
                : [];
            const socialPlatformIsVisible = (platformKey) => (
                !settings.socialPlatforms || settings.socialPlatforms[platformKey] !== false
            );
            const socialLinks = settings.features?.socialLinks ? [
                settings.socials?.instagram && socialPlatformIsVisible('instagram') && {
                    key: 'instagram',
                    label: 'Instagram',
                    href: `https://instagram.com/${normalizeHandle(settings.socials.instagram).replace(/^instagram\.com\//i, '')}`
                },
                settings.socials?.tiktok && socialPlatformIsVisible('tiktok') && {
                    key: 'tiktok',
                    label: 'TikTok',
                    href: `https://www.tiktok.com/@${normalizeHandle(settings.socials.tiktok).replace(/^tiktok\.com\/@?/i, '')}`
                },
                settings.socials?.facebook && socialPlatformIsVisible('facebook') && {
                    key: 'facebook',
                    label: 'Facebook',
                    href: `https://facebook.com/${normalizeHandle(settings.socials.facebook).replace(/^(facebook|fb)\.com\//i, '')}`
                },
                settings.socials?.website && socialPlatformIsVisible('website') && {
                    key: 'website',
                    label: 'Website',
                    href: normalizeWebsite(settings.socials.website)
                }
            ].filter(Boolean) : [];
            const venuePhotos = Array.isArray(settings.venuePhotos)
                ? settings.venuePhotos.filter(Boolean).slice(0, 8)
                : [];
            const venueMapPlace = settings.mapPlace && typeof settings.mapPlace === 'object' ? settings.mapPlace : null;
            const venueMapLabel = getMapPlaceLabel(venueMapPlace, settings.address || settings.features?.location || '');
            const venueMapHref = buildGoogleMapsDirectionsUrl({
                address: settings.address || '',
                location: settings.features?.location || '',
                mapPlace: venueMapPlace
            });
            const venueMapEmbedSrc = buildGoogleMapsEmbedUrl(venueMapPlace);
            const {
                handleStartHostedPayment,
                paymentCheckout,
                paymentOptions,
                selectedHostedPaymentOption,
                selectedManualPaymentOption,
                setPaymentCheckout
            } = useBookingFlowPayment({
                formData,
                selectedManualPayment,
                selectedService,
                setSelectedManualPayment,
                setStep,
                settings,
                submittedBooking
            });
            const bannerDisplay = useMemo(() => getBannerDisplay({
                nativePrecisionHeroLayout,
                settings
            }), [nativePrecisionHeroLayout, settings]);
            const {
                handleAction,
                isSubmitting,
                submitError
            } = useBookingFlowSubmission({
                activeDate,
                canSubmitBooking,
                collectClientEmail,
                collectClientName,
                collectClientNotes,
                collectClientPhone,
                emailOptInEnabled,
                formData,
                isPreview,
                isWaitlistMode,
                onComplete,
                selectedAvailabilityStaff,
                selectedHostedPaymentOption,
                selectedManualPaymentOption,
                selectedService,
                selectedStaffId,
                selectedTime,
                setPaymentCheckout,
                setStep,
                setSubmittedBooking,
                staffAssignmentMode
            });

            if (isInitialLoading) {
                return <BookingPageLoader isPreview={isPreview} settings={settings} />;
            }

            if (!activeDate) {
                return (
                    <div
                        className={`w-full h-full min-h-full flex items-center justify-center px-4 py-10 ${accentGradientActive ? 'native-booking-theme' : ''} ${styleDirectionClass} ${isPreview ? 'booking-flow-preview' : 'booking-flow-public'}`}
                        style={{ ...dynamicStyles, backgroundColor: activePageBackground, overscrollBehaviorX: 'none' }}
                    >
                        <div
                            className="w-full max-w-lg rounded-3xl border px-6 py-7 text-center shadow-[0_28px_80px_-56px_rgba(15,23,42,0.42)]"
                            style={{
                                backgroundColor: settings.pageSurfaceColor || '#ffffff',
                                borderColor: withColorAlpha(settings.headingColor || '#000000', 8, '#000000')
                            }}
                        >
                            <div
                                className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border"
                                style={{
                                    backgroundColor: withColorAlpha(settings.primaryColor || settings.headingColor || '#000000', 5, '#ffffff'),
                                    borderColor: withColorAlpha(settings.primaryColor || settings.headingColor || '#000000', 14, '#000000'),
                                    color: settings.primaryColor || settings.headingColor || '#050505'
                                }}
                            >
                                <CalendarDays size={20} />
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.35em] opacity-35" style={{ color: settings.bodyColor }}>
                                Booking Page
                            </p>
                            <h1 className="mt-2 text-3xl font-black tracking-tight" style={{ color: settings.headingColor }}>
                                No booking dates open
                            </h1>
                            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed" style={{ color: settings.bodyColor }}>
                                There are no available dates right now. The business can reopen the schedule or publish new availability soon.
                            </p>
                        </div>
                    </div>
                );
            }

            const selectedStaffForSummary = selectedAvailabilityStaff || null;
            const bookingPageLayout = settings.bookingPageLayout === 'timeline' ? 'timeline' : 'stacked';
            const heroContent = (
                <BookingHeroSection
                    accentGradientActive={accentGradientActive}
                    bannerDisplay={bannerDisplay}
                    brandText={brandText}
                    headingLetterSpacing={headingLetterSpacing}
                    inspectClass={inspectClass}
                    isPreview={isPreview}
                    logoDisplay={logoDisplay}
                    nativeAccentFillClass={nativeAccentFillClass}
                    onInspect={onInspect}
                    onMediaUpload={onMediaUpload}
                    onSettingChange={onSettingChange}
                    pageAlignment={pageAlignment}
                    pageJustify={pageJustify}
                    previewInspectEnabled={previewInspectEnabled}
                    settings={settings}
                    subtextLetterSpacing={subtextLetterSpacing}
                    taglineText={taglineText}
                    venueMapHref={venueMapHref}
                    welcomeText={welcomeText}
                />
            );

            const selectionSections = (
                <BookingSelectionSections
                    date={{
                        activeDate,
                        calendarDisplayStyle,
                        dateSectionOrder,
                        dateStepNumber,
                        dateStyle,
                        displayDates,
                        selectedDateIdx,
                        setSelectedDateIdx,
                        visibleDisplayDates
                    }}
                    faq={{
                        faqDisplayStyle,
                        faqItems,
                        faqSectionOrder,
                        faqStepNumber,
                        faqStyle,
                        openFaq,
                        setOpenFaq
                    }}
                    presentation={{
                        accentGradientActive,
                        headingLetterSpacing,
                        inspectClass,
                        isPreview,
                        nativeAccentBorderClass,
                        nativeAccentFillClass,
                        onInspect,
                        onSettingChange,
                        pageAlignment,
                        pageItems,
                        pageJustify,
                        pageTextClass,
                        previewInspectEnabled,
                        bookingPageLayout,
                        settings,
                        showServiceStep
                    }}
                    services={{
                        activeServices,
                        selectedService,
                        selectedServiceCategory,
                        serviceBorderStyle,
                        serviceCardsForDisplay,
                        serviceCategories,
                        serviceDisplayStyle,
                        serviceDropdownEnabled,
                        servicesDropdownOpen,
                        setSelectedServiceCategory,
                        setSelectedServiceId,
                        setServicesDropdownOpen
                    }}
                    staff={{
                        selectedStaffId,
                        serviceStaffOptions,
                        setSelectedStaffId,
                        showStaffSelection,
                        staffStepNumber
                    }}
                    time={{
                        displayTimesForActiveDate,
                        isLoadingAvailability: serviceAvailability.loading,
                        isPreviewTimePlaceholder,
                        isWaitlistMode,
                        selectedTime,
                        setSelectedTime,
                        timeDisplayStyle,
                        timeSectionOrder,
                        timeSlotStyle,
                        timeStepNumber,
                        unavailableReason: serviceAvailability.unavailableReason
                    }}
                />
            );

            const detailsForm = (
                <BookingDetailsForm
                    collectClientEmail={collectClientEmail}
                    collectClientName={collectClientName}
                    collectClientNotes={collectClientNotes}
                    collectClientPhone={collectClientPhone}
                    detailsStepNumber="01"
                    formData={formData}
                    headingLetterSpacing={headingLetterSpacing}
                    inspectClass={inspectClass}
                    isPreview={isPreview}
                    isWaitlistMode={isWaitlistMode}
                    onInspect={onInspect}
                    onSettingChange={onSettingChange}
                    pageItems="items-start"
                    pageTextClass="text-left"
                    previewInspectEnabled={previewInspectEnabled}
                    sectionOrder={1}
                    setFormData={setFormData}
                    settings={checkoutPageSettings}
                    showServiceStep={false}
                    layout="checkout"
                />
            );

            const socialLinksContent = (
                <BookingSocialLinks
                    inspectClass={inspectClass}
                    isPreview={isPreview}
                    onInspect={onInspect}
                    previewInspectEnabled={previewInspectEnabled}
                    previewSocialLinks={previewSocialLinks}
                    settings={settings}
                    socialDisplayStyle={socialDisplayStyle}
                    socialIconStyle="outline"
                    socialLinks={socialLinks}
                />
            );

            const footerContent = (
                <div className="pt-8 md:pt-10 text-center" data-preview-section="action">
                    <BookingVenueGallery
                        headingLetterSpacing={headingLetterSpacing}
                        inspectClass={inspectClass}
                        isPreview={isPreview}
                        mapDisplayStyle="card"
                        onInspect={onInspect}
                        pageAlignment={pageAlignment}
                        previewInspectEnabled={previewInspectEnabled}
                        settings={settings}
                        subtextLetterSpacing={subtextLetterSpacing}
                        venueGalleryStyle="mosaic"
                        venueMapEmbedSrc={venueMapEmbedSrc}
                        venueMapHref={venueMapHref}
                        venueMapLabel={venueMapLabel}
                        venuePhotos={venuePhotos}
                    />
                    {socialLinksContent}
                </div>
            );
            const funnelStepFallback = <BookingPageLoader isPreview={isPreview} settings={settings} />;

            return (
                <div className={`w-full h-full max-w-full overflow-x-hidden flex flex-col ${previewMotionClass} select-none pb-12 ${accentGradientActive ? 'native-booking-theme' : ''} ${styleDirectionClass} ${isPreview ? 'booking-flow-preview' : 'booking-flow-public'}`} style={{ ...dynamicStyles, backgroundColor: activePageBackground, overscrollBehaviorX: 'none' }}>
                {step === 'select' && (
                    <BookingSelectionStep
                        actionButtonStyle={actionButtonStyle}
                        actionOrder={selectionActionOrder}
                        canContinue={canContinueToCart}
                        ctaLabel={settings.bookingCtaLabel || 'Add booking to cart'}
                        footerContent={footerContent}
                        heroContent={heroContent}
                        inspectClass={inspectClass}
                        isPreview={isPreview}
                        nativeAccentButtonClass={nativeAccentButtonClass}
                        onContinue={() => setStep('cart')}
                        previewStepMotionClass={previewStepMotionClass}
                        settings={settings}
                        showServiceStep={showServiceStep}
                    >
                        {selectionSections}
                    </BookingSelectionStep>
                )}

                {step === 'cart' && (
                    <Suspense fallback={funnelStepFallback}>
                    <BookingCartStep
                        actionButtonStyle={actionButtonStyle}
                        activeDate={activeDate}
                        isPreview={isPreview}
                        isWaitlistMode={isWaitlistMode}
                        nativeAccentButtonClass={nativeAccentButtonClass}
                        onBack={() => setStep('select')}
                        onContinue={() => setStep('details')}
                        previewStepMotionClass={previewStepMotionClass}
                        selectedService={selectedServiceForSummary}
                        selectedStaff={selectedStaffForSummary}
                        selectedTime={selectedTime}
                        settings={cartPageSettings}
                    />
                    </Suspense>
                )}

                {step === 'details' && (
                    <Suspense fallback={funnelStepFallback}>
                    <BookingCheckoutStep
                        actionButtonStyle={actionButtonStyle}
                        canSubmitBooking={canSubmitBooking}
                        detailsForm={detailsForm}
                        emailOptInEnabled={emailOptInEnabled}
                        formData={formData}
                        handleAction={handleAction}
                        inspectClass={inspectClass}
                        isPreview={isPreview}
                        isSubmitting={isSubmitting}
                        isWaitlistMode={isWaitlistMode}
                        nativeAccentButtonClass={nativeAccentButtonClass}
                        nativeAccentFillClass={nativeAccentFillClass}
                        onBack={() => setStep('cart')}
                        paymentOptions={paymentOptions}
                        selectedPaymentOptionId={selectedManualPayment}
                        setFormData={setFormData}
                        setSelectedPaymentOptionId={setSelectedManualPayment}
                        settings={checkoutPageSettings}
                        submitError={submitError}
                    />
                    </Suspense>
                )}

                {step === 'payment' && (
                    <Suspense fallback={funnelStepFallback}>
                    <BookingPaymentStep
                        checkoutUrl={paymentCheckout.checkoutUrl}
                        error={paymentCheckout.error}
                        isStarting={paymentCheckout.isStarting}
                        onBackToSuccess={() => setStep('success')}
                        onStartPayment={handleStartHostedPayment}
                        selectedPaymentOption={selectedHostedPaymentOption}
                    />
                    </Suspense>
                )}

                {step === 'success' && (
                    <Suspense fallback={funnelStepFallback}>
                    <BookingSuccessState
                        activeDate={activeDate}
                        formData={formData}
                        headingLetterSpacing={headingLetterSpacing}
                        inspectClass={inspectClass}
                        isPreview={isPreview}
                        isWaitlistMode={isWaitlistMode}
                        onInspect={onInspect}
                        onInstallApp={onInstallApp}
                        previewInspectEnabled={previewInspectEnabled}
                        previewSuccessMotionClass={previewSuccessMotionClass}
                        selectedManualPaymentOption={selectedManualPaymentOption}
                        selectedTime={selectedTime}
                        setStep={setStep}
                        settings={successPageSettings}
                        submittedBooking={submittedBooking}
                        subtextLetterSpacing={subtextLetterSpacing}
                    />
                    </Suspense>
                )}
                </div>
            );
        });


