import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, X } from 'lucide-react';
import { getFontFamily } from '../../../data/fonts';
import { getLocalDateStr } from '../../../utils/dates';
import { withColorAlpha } from '../../../utils/theme';
import { getDateSlotStyle } from '../utils/bookingFlowUtils';

export const BookingDateSection = ({
    activeDate,
    availableDates,
    calendarDisplayStyle,
    dateStepNumber,
    dateStyle,
    displayDates,
    headingLetterSpacing,
    inspectClass,
    isPreview,
    nativeAccentFillClass,
    onInspect,
    onSettingChange,
    pageAlignment,
    pageItems,
    pageJustify,
    pageTextClass,
    previewInspectEnabled,
    selectedDateIdx,
    sectionOrder,
    setSelectedDateIdx,
    settings,
    showServiceStep
}) => {
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerMonth, setPickerMonth] = useState(() => (
        activeDate?.localDateStr ? new Date(`${activeDate.localDateStr}T00:00:00`) : new Date()
    ));
    const selectedDateKey = activeDate?.localDateStr || '';
    const todayKey = getLocalDateStr(new Date());
    const availableDateIndex = useMemo(() => {
        const entries = new Map();
        (availableDates || displayDates).forEach((date, index) => {
            if (date.localDateStr) entries.set(date.localDateStr, index);
        });
        return entries;
    }, [availableDates, displayDates]);
    const pickerMonthLabel = pickerMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const pickerDays = useMemo(() => {
        const firstDay = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), 1);
        const lastDay = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 0);
        const leadingDays = (firstDay.getDay() + 6) % 7;
        return [
            ...Array.from({ length: leadingDays }, (_, index) => ({ key: `empty-${index}`, empty: true })),
            ...Array.from({ length: lastDay.getDate() }, (_, index) => {
                const date = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), index + 1);
                const dateStr = getLocalDateStr(date);
                return { key: dateStr, date, dateStr, empty: false };
            })
        ];
    }, [pickerMonth]);
    const openPicker = (event) => {
        event.stopPropagation();
        setPickerMonth(activeDate?.localDateStr ? new Date(`${activeDate.localDateStr}T00:00:00`) : new Date());
        setPickerOpen(true);
    };
    const closePicker = (event) => {
        event?.stopPropagation?.();
        setPickerOpen(false);
    };
    const selectPickerDate = (dateStr) => {
        const nextIndex = availableDateIndex.get(dateStr);
        if (typeof nextIndex !== 'number') return;
        setSelectedDateIdx(nextIndex);
        setPickerOpen(false);
    };
    const datePool = availableDates || displayDates;
    const canStepBack = selectedDateIdx > 0;
    const canStepForward = selectedDateIdx < (datePool.length - 1);
    const activeDateObject = activeDate?.localDateStr ? new Date(`${activeDate.localDateStr}T00:00:00`) : null;
    const activeDayName = activeDateObject
        ? activeDateObject.toLocaleDateString('en-US', { weekday: 'long' })
        : activeDate?.dayName;
    const savedDateLabel = String(settings.dateLabel || '').trim();
    const dateHeading = !savedDateLabel || /^which day are you looking to book\s*\?$/i.test(savedDateLabel)
        ? 'Pick your booking date'
        : savedDateLabel;

    return (
        <section data-preview-section="calendar" style={{ order: sectionOrder ?? (showServiceStep ? 2 : 1) }}>
            <div className={`booking-date-section-head booking-date-focus-head mb-2 px-1 md:mb-3 ${inspectClass}`} onClick={() => previewInspectEnabled && onInspect('calendar')}>
                <div className={`booking-date-copy mx-auto flex flex-col items-center text-center ${pageTextClass}`}>
                    <h3 className="booking-section-heading text-xl md:text-2xl font-bold tracking-tight" style={{ color: settings.headingColor, fontFamily: getFontFamily(settings.headingFontFamily || settings.fontFamily), ...(headingLetterSpacing ? { letterSpacing: headingLetterSpacing } : {}) }} contentEditable={previewInspectEnabled} suppressContentEditableWarning onBlur={(event) => isPreview && onSettingChange?.('dateLabel', event.currentTarget.textContent.trim())}>{dateHeading}</h3>
                    <div className="booking-date-title-row booking-date-focus-title flex flex-wrap items-center justify-center gap-2">
                        <h4 className="text-xl md:text-2xl font-bold tracking-tight" style={{ color: settings.headingColor, fontFamily: getFontFamily(settings.headingFontFamily || settings.fontFamily), ...(headingLetterSpacing ? { letterSpacing: headingLetterSpacing } : {}) }}>
                            <span>{activeDayName}, {activeDate.month} {activeDate.dayNum}</span> <span className="font-light italic opacity-40">{activeDate.year}</span>
                        </h4>
                        <button type="button" onClick={openPicker} aria-label="Edit selected day" title="Edit selected day" className="booking-calendar-picker-trigger booking-date-heading-edit appearance-none outline-none focus:outline-none flex items-center justify-center transition-all" style={{ color: settings.headingColor }}>
                            <Pencil size={13} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="booking-calendar-focus-row">
                <button type="button" disabled={!canStepBack} onClick={() => setSelectedDateIdx(Math.max(0, selectedDateIdx - 1))} className="booking-calendar-focus-arrow appearance-none outline-none focus:outline-none flex items-center justify-center transition-all border" style={{ borderColor: withColorAlpha(settings.headingColor || '#000', 19, '#000000'), color: settings.headingColor }}>
                    <ChevronLeft size={16} />
                </button>
                <div className={`booking-calendar-look booking-calendar-focus-tile booking-calendar-${calendarDisplayStyle} ${isPreview ? 'cursor-pointer' : ''}`} onClick={() => previewInspectEnabled && onInspect('calendar')}>
                    <button aria-pressed="true" onClick={() => setSelectedDateIdx(selectedDateIdx)} className="appearance-none outline-none focus:outline-none flex flex-col items-center justify-center gap-1.5 text-center transition-all duration-500 relative shadow-xl z-10" style={getDateSlotStyle({ isActive: true, settings, dateStyle })}>
                        <span className="block w-full text-center text-[9px] md:text-[10px] font-bold uppercase tracking-[0.3em] transition-all">{activeDate.dayName}</span>
                        <span className="block w-full text-center text-3xl md:text-4xl font-bold tracking-tighter transition-all">{activeDate.dayNum}</span>
                        {dateStyle === 'minimal' && <div className={`absolute -bottom-3 w-10 h-[2px] rounded-full ${nativeAccentFillClass}`} style={{ backgroundColor: settings.primaryColor }} />}
                    </button>
                </div>
                <button type="button" disabled={!canStepForward} onClick={() => setSelectedDateIdx(Math.min(datePool.length - 1, selectedDateIdx + 1))} className="booking-calendar-focus-arrow appearance-none outline-none focus:outline-none flex items-center justify-center transition-all border" style={{ borderColor: withColorAlpha(settings.headingColor || '#000', 19, '#000000'), color: settings.headingColor }}>
                    <ChevronRight size={16} />
                </button>
            </div>

            {pickerOpen && (
                <div className="booking-date-picker-backdrop" onClick={closePicker}>
                    <div className="booking-date-picker-modal" role="dialog" aria-modal="true" aria-label="Select booking day" onClick={(event) => event.stopPropagation()}>
                        <div className="booking-date-picker-title">
                            <div>
                                <p>Select Day</p>
                                <h3>{pickerMonthLabel}</h3>
                            </div>
                            <button type="button" onClick={closePicker} aria-label="Close date picker">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="booking-date-picker-nav">
                            <button type="button" onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() - 1, 1))}>
                                <ChevronLeft size={16} />
                                Previous
                            </button>
                            <button type="button" onClick={() => setPickerMonth(new Date())}>Today</button>
                            <button type="button" onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 1))}>
                                Next
                                <ChevronRight size={16} />
                            </button>
                        </div>
                        <div className="booking-date-picker-weekdays" aria-hidden="true">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span key={day}>{day}</span>)}
                        </div>
                        <div className="booking-date-picker-grid">
                            {pickerDays.map(day => {
                                if (day.empty) return <span key={day.key} className="is-empty" />;
                                const isAvailable = availableDateIndex.has(day.dateStr);
                                return (
                                    <button
                                        key={day.key}
                                        type="button"
                                        disabled={!isAvailable}
                                        className={`${day.dateStr === selectedDateKey ? 'is-active' : ''} ${day.dateStr === todayKey ? 'is-today' : ''}`}
                                        onClick={() => selectPickerDate(day.dateStr)}
                                    >
                                        {day.date.getDate()}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};
