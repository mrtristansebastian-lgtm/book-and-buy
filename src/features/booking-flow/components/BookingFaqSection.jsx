import { ChevronDown, ChevronUp } from 'lucide-react';
import { getFontFamily } from '../../../data/fonts';
import { previewFaqItems } from '../config/bookingFlowConfig';
import { getFaqItemStyle } from '../utils/bookingFlowUtils';

export const BookingFaqSection = ({
    faqDisplayStyle,
    faqItems,
    faqStepNumber,
    faqStyle,
    headingLetterSpacing,
    inspectClass,
    isPreview,
    onInspect,
    openFaq,
    pageTextClass,
    previewInspectEnabled,
    sectionOrder,
    setOpenFaq,
    settings,
    showServiceStep
}) => {
    if (faqItems.length === 0 && !isPreview) return null;

    const isPreviewEmpty = isPreview && faqItems.length === 0;
    const faqItemsForDisplay = faqItems.length > 0 ? faqItems : (isPreviewEmpty ? previewFaqItems : []);
    const serviceDescriptionColor = settings.serviceBodyColor || settings.serviceTextColor || settings.headingColor || '#050505';
    const serviceDescriptionFont = getFontFamily(settings.bodyFontFamily || settings.fontFamily);

    return (
        <section
            className={`booking-faq-section booking-faq-${faqDisplayStyle} pt-2 ${inspectClass}`}
            data-preview-section="faq"
            onClick={() => previewInspectEnabled && onInspect('faq')}
            style={{ order: sectionOrder ?? (showServiceStep ? 4 : 3) }}
        >
            <div className={`booking-faq-heading mx-auto flex flex-col items-center text-center ${pageTextClass} mb-6 px-1`}>
                <h4 className="booking-section-heading text-xl md:text-2xl font-bold tracking-tight" style={{ color: settings.headingColor, fontFamily: getFontFamily(settings.headingFontFamily || settings.fontFamily), ...(headingLetterSpacing ? { letterSpacing: headingLetterSpacing } : {}) }}>
                    {settings.faqHeading || 'Questions before booking'}
                </h4>
                <p className="booking-section-subtext" style={{ color: serviceDescriptionColor, fontFamily: serviceDescriptionFont }}>
                    {settings.faqSubtext || 'Helpful answers before you confirm.'}
                </p>
            </div>
            <div className={`space-y-3 ${isPreviewEmpty ? 'booking-faq-preview-empty' : ''}`}>
                {faqItemsForDisplay.map((faq, index) => {
                    const isAlwaysOpen = faqDisplayStyle === 'cards' || faqDisplayStyle === 'split';
                    const isOpen = isAlwaysOpen || (isPreviewEmpty ? index === 0 : openFaq === index);
                    return (
                        <button
                            key={`${faq.q}-${index}`}
                            type="button"
                            className={`booking-faq-item w-full text-left transition-all ${isPreviewEmpty ? 'is-preview-empty' : ''}`}
                            style={getFaqItemStyle({ settings, faqStyle })}
                            aria-expanded={isOpen}
                            onClick={(event) => {
                                event.stopPropagation();
                                if (isPreviewEmpty || isAlwaysOpen) return;
                                setOpenFaq(openFaq === index ? null : index);
                            }}
                        >
                            <span className="booking-faq-row">
                                {(faqDisplayStyle === 'numbered' || faqDisplayStyle === 'split') && <span className="booking-faq-visible-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>}
                                <span className="booking-faq-question" style={{ color: settings.faqTextColor || settings.headingColor, fontFamily: getFontFamily(settings.faqFontFamily || settings.headingFontFamily || settings.fontFamily) }}>{faq.q}</span>
                                {!isAlwaysOpen && <span className="booking-faq-icon" aria-hidden="true">
                                    {isOpen ? <ChevronUp size={16} style={{ color: settings.faqAnswerColor || settings.bodyColor }} /> : <ChevronDown size={16} style={{ color: settings.faqAnswerColor || settings.bodyColor }} />}
                                </span>}
                            </span>
                            {isOpen && <span className="booking-faq-answer" style={{ color: serviceDescriptionColor, fontFamily: serviceDescriptionFont }}>{faq.a}</span>}
                        </button>
                    );
                })}
            </div>
        </section>
    );
};
