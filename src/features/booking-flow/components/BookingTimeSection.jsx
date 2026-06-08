import { Bell } from 'lucide-react';
import { getFontFamily } from '../../../data/fonts';
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
}) => (
    <section data-preview-section="time" style={{ order: sectionOrder ?? (showServiceStep ? 3 : 2) }}>
        <div className={`flex flex-col ${pageItems} ${pageTextClass} mb-6 px-1 ${inspectClass}`} data-preview-section="time" onClick={() => previewInspectEnabled && onInspect('time')}>
            <h4 className="booking-section-heading text-xl md:text-2xl font-bold tracking-tight" style={{ color: settings.headingColor, fontFamily: getFontFamily(settings.headingFontFamily || settings.fontFamily), ...(headingLetterSpacing ? { letterSpacing: headingLetterSpacing } : {}) }}>
                {isWaitlistMode ? 'Join the waitlist' : 'What time works?'}
            </h4>
        </div>

        {isLoadingAvailability ? (
            <div className="py-8 text-center text-sm font-bold tracking-widest uppercase opacity-30">Checking availability</div>
        ) : displayTimesForActiveDate.length === 0 ? (
            isWaitlistMode ? (
                <div className={`p-8 border border-dashed rounded-lg text-center ${nativeAccentBorderClass}`} style={{ borderColor: settings.primaryColor }}>
                    <Bell size={24} className="mx-auto mb-4" style={{ color: settings.primaryColor }} />
                    <p className="text-sm font-bold mb-2" style={{ color: settings.headingColor, fontFamily: getFontFamily(settings.headingFontFamily || settings.fontFamily) }}>Standby List Active</p>
                    <p className="text-xs opacity-60">{unavailableReason || "Enter your details below. We'll notify you instantly if a slot opens."}</p>
                </div>
            ) : (
                <div className="py-8 text-center text-sm font-bold tracking-widest uppercase opacity-20">{unavailableReason || 'Fully Booked'}</div>
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
