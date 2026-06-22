import { Bell, Clock3, Loader2 } from 'lucide-react';
import { getFontFamily } from '../../../data/fonts';
import { withColorAlpha } from '../../../utils/theme';
import { getTimeSlotStyle } from '../utils/bookingFlowUtils';

export const BookingTimeSection = ({
    displayTimesForActiveDate,
    headingLetterSpacing,
    inspectClass,
    isPreview,
    isPreviewTimePlaceholder,
    isLoadingAvailability,
    isWaitlistMode,
    nativeAccentBorderClass,
    nativeAccentFillClass,
    onInspect,
    onSettingChange,
    pageItems,
    pageTextClass,
    previewInspectEnabled,
    selectedTime,
    sectionOrder,
    setSelectedTime,
    settings,
    showServiceStep,
    timeDisplayStyle,
    timeSlotStyle,
    timeStepNumber,
    unavailableReason
}) => {
    const surfaceColor = settings.pageSurfaceColor || '#ffffff';
    const borderColor = withColorAlpha(settings.headingColor || '#000000', 8, '#000000');
    const accentColor = settings.primaryColor || settings.headingColor || '#050505';

    const renderStateCard = ({ Icon, label, title, copy, tone = 'neutral', spin = false }) => (
        <div
            className={`mx-auto w-full max-w-[34rem] rounded-2xl border px-5 py-5 md:px-6 md:py-6 ${tone === 'accent' ? nativeAccentBorderClass : ''}`}
            style={{
                backgroundColor: surfaceColor,
                borderColor: tone === 'accent' ? withColorAlpha(accentColor, 16, '#000000') : borderColor,
                boxShadow: '0 18px 44px -40px rgba(15, 23, 42, 0.32)'
            }}
        >
            <div className="flex items-start gap-4">
                <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border"
                    style={{
                        backgroundColor: tone === 'accent' ? withColorAlpha(accentColor, 5, '#ffffff') : '#ffffff',
                        borderColor: tone === 'accent' ? withColorAlpha(accentColor, 14, '#000000') : withColorAlpha(settings.headingColor || '#000000', 9, '#000000'),
                        color: tone === 'accent' ? accentColor : settings.headingColor || '#050505'
                    }}
                >
                    <Icon size={18} className={spin ? 'animate-spin' : ''} />
                </span>
                <div className="min-w-0">
                    {label && (
                        <p className="text-[10px] font-bold uppercase tracking-[0.35em] opacity-35" style={{ color: settings.bodyColor }}>
                            {label}
                        </p>
                    )}
                    <h5 className="mt-1 text-lg md:text-xl font-black tracking-tight" style={{ color: settings.headingColor, fontFamily: getFontFamily(settings.headingFontFamily || settings.fontFamily) }}>
                        {title}
                    </h5>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: settings.bodyColor }}>
                        {copy}
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <section data-preview-section="time" style={{ order: sectionOrder ?? (showServiceStep ? 3 : 2) }}>
            <div className={`flex flex-col ${pageItems} ${pageTextClass} mb-6 px-1 ${inspectClass}`} data-preview-section="time" onClick={() => previewInspectEnabled && onInspect('time')}>
                <h4 className="booking-section-heading text-xl md:text-2xl font-bold tracking-tight" style={{ color: settings.headingColor, fontFamily: getFontFamily(settings.headingFontFamily || settings.fontFamily), ...(headingLetterSpacing ? { letterSpacing: headingLetterSpacing } : {}) }}>
                    {isWaitlistMode ? 'Join the waitlist' : 'What time works?'}
                </h4>
            </div>

            {isLoadingAvailability ? (
                renderStateCard({
                    Icon: Loader2,
                    label: 'Availability',
                    title: 'Checking availability',
                    copy: "We're refreshing the live schedule for this day.",
                    tone: 'accent',
                    spin: true
                })
            ) : displayTimesForActiveDate.length === 0 ? (
                isWaitlistMode ? (
                    renderStateCard({
                        Icon: Bell,
                        label: 'Waitlist',
                        title: 'Join the waitlist',
                        copy: unavailableReason || "Enter your details below and we'll notify you as soon as a slot opens.",
                        tone: 'accent'
                    })
                ) : (
                    renderStateCard({
                        Icon: Clock3,
                        label: 'No openings',
                        title: 'Fully booked',
                        copy: unavailableReason || 'No open slots right now. Choose another date or send the request for review.',
                        tone: 'neutral'
                    })
                )
            ) : (
                <div className={`booking-time-look booking-time-${timeDisplayStyle} ${isPreviewTimePlaceholder ? 'booking-time-preview-empty' : ''} mx-auto grid w-full max-w-[34rem] grid-cols-3 gap-1.5 md:gap-2 ${isPreview ? 'cursor-pointer' : ''}`} onClick={() => previewInspectEnabled && onInspect('time')}>
                    {displayTimesForActiveDate.map((time, index) => {
                        const isActive = isPreviewTimePlaceholder ? index === 0 : selectedTime === time;
                        const nativeTimeClass = '';
                        return (
                            <button
                                key={time}
                                data-booking-time={time}
                                data-testid={`booking-time-slot-${index}`}
                                aria-pressed={isActive}
                                onClick={() => {
                                    if (isPreviewTimePlaceholder) return;
                                    setSelectedTime(time);
                                }}
                                className={`appearance-none outline-none focus:outline-none group relative transition-all duration-300 flex items-center justify-center w-full ${isPreviewTimePlaceholder ? 'is-preview-empty' : ''} ${timeSlotStyle !== 'minimal' ? 'py-2 md:py-2.5' : 'py-2'} ${timeSlotStyle !== 'minimal' && isActive ? 'z-10' : ''} ${nativeTimeClass}`}
                                style={getTimeSlotStyle({ isActive, settings, timeSlotStyle })}
                            >
                                <div className="flex items-center justify-center relative w-full">
                                    <span className={`text-[13px] md:text-sm font-bold tracking-normal transition-all duration-300 ${isActive && timeSlotStyle === 'minimal' ? '-translate-y-1 scale-105' : ''}`} style={{ fontFeatureSettings: '"tnum" on, "lnum" on' }}>{time}</span>
                                    {timeSlotStyle === 'minimal' && isActive && <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full shadow-lg ${nativeAccentFillClass}`} style={{ backgroundColor: settings.primaryColor }} />}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </section>
    );
};
