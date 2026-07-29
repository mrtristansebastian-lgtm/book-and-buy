import { useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Clock, Sparkles, Users } from 'lucide-react';
import { BookingDateSection } from './BookingDateSection';
import { BookingFaqSection } from './BookingFaqSection';
import { BookingServiceStaffSection } from './BookingServiceStaffSection';
import { BookingServicesSection } from './BookingServicesSection';
import { BookingTimeSection } from './BookingTimeSection';

export function BookingSelectionSections({
  date,
  faq,
  presentation,
  services,
  staff,
  time
}) {
  const {
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
    settings,
    showServiceStep
  } = presentation;
  const timelineMode = presentation.bookingPageLayout === 'timeline' && showServiceStep;
  const [timelineStep, setTimelineStep] = useState('services');

  const servicesSection = (
    <BookingServicesSection
      activeServices={services.activeServices}
      headingLetterSpacing={headingLetterSpacing}
      inspectClass={inspectClass}
      isPreview={isPreview}
      nativeAccent={accentGradientActive}
      nativeAccentBorderClass={nativeAccentBorderClass}
      onInspect={onInspect}
      pageItems={pageItems}
      pageTextClass={pageTextClass}
      previewInspectEnabled={previewInspectEnabled}
      selectedService={services.selectedService}
      selectedServiceCategory={services.selectedServiceCategory}
      serviceBorderStyle="solid"
      serviceCardsForDisplay={services.serviceCardsForDisplay}
      serviceCategories={services.serviceCategories}
      serviceDisplayStyle={services.serviceDisplayStyle}
      serviceDropdownEnabled={services.serviceDropdownEnabled}
      serviceDropdownOpen={services.servicesDropdownOpen}
      setSelectedServiceCategory={services.setSelectedServiceCategory}
      setSelectedServiceId={services.setSelectedServiceId}
      setServicesDropdownOpen={services.setServicesDropdownOpen}
      settings={settings}
    />
  );

  const staffSection = staff.showStaffSelection ? (
    <BookingServiceStaffSection
      headingLetterSpacing={headingLetterSpacing}
      pageItems={pageItems}
      pageTextClass={pageTextClass}
      sectionOrder={timelineMode ? 1 : 2}
      selectedService={services.selectedService}
      selectedStaffId={staff.selectedStaffId}
      setSelectedStaffId={staff.setSelectedStaffId}
      settings={settings}
      staffOptions={staff.serviceStaffOptions}
      staffStepNumber={staff.staffStepNumber}
    />
  ) : null;

  const dateSection = (
    <BookingDateSection
      activeDate={date.activeDate}
      availableDates={date.displayDates}
      calendarDisplayStyle="studio"
      dateStepNumber={date.dateStepNumber}
      dateStyle="solid"
      displayDates={date.visibleDisplayDates}
      headingLetterSpacing={headingLetterSpacing}
      inspectClass={inspectClass}
      isPreview={isPreview}
      nativeAccentFillClass={nativeAccentFillClass}
      onInspect={onInspect}
      onSettingChange={onSettingChange}
      pageAlignment={pageAlignment}
      pageItems={pageItems}
      pageJustify={pageJustify}
      pageTextClass={pageTextClass}
      previewInspectEnabled={previewInspectEnabled}
      selectedDateIdx={date.selectedDateIdx}
      sectionOrder={timelineMode ? 1 : date.dateSectionOrder}
      setSelectedDateIdx={date.setSelectedDateIdx}
      settings={settings}
      showServiceStep={showServiceStep}
    />
  );

  const timeSection = (
    <BookingTimeSection
      displayTimesForActiveDate={time.displayTimesForActiveDate}
      headingLetterSpacing={headingLetterSpacing}
      inspectClass={inspectClass}
      isPreview={isPreview}
      isPreviewTimePlaceholder={time.isPreviewTimePlaceholder}
      isLoadingAvailability={time.isLoadingAvailability}
      isWaitlistMode={time.isWaitlistMode}
      nativeAccentBorderClass={nativeAccentBorderClass}
      nativeAccentFillClass={nativeAccentFillClass}
      onInspect={onInspect}
      onSettingChange={onSettingChange}
      pageItems={pageItems}
      pageTextClass={pageTextClass}
      previewInspectEnabled={previewInspectEnabled}
      selectedTime={time.selectedTime}
      sectionOrder={timelineMode ? 1 : time.timeSectionOrder}
      setSelectedTime={time.setSelectedTime}
      settings={settings}
      showServiceStep={showServiceStep}
      timeDisplayStyle="pill"
      timeSlotStyle="solid"
      timeStepNumber={time.timeStepNumber}
      unavailableReason={time.unavailableReason}
    />
  );

  const faqSection = (
    <BookingFaqSection
      faqDisplayStyle="accordion"
      faqItems={faq.faqItems}
      faqStepNumber={faq.faqStepNumber}
      faqStyle="minimal"
      headingLetterSpacing={headingLetterSpacing}
      inspectClass={inspectClass}
      isPreview={isPreview}
      onInspect={onInspect}
      openFaq={faq.openFaq}
      pageItems={pageItems}
      pageTextClass={pageTextClass}
      previewInspectEnabled={previewInspectEnabled}
      sectionOrder={faq.faqSectionOrder}
      setOpenFaq={faq.setOpenFaq}
      settings={settings}
      showServiceStep={showServiceStep}
    />
  );

  const timelineSteps = [
    {
      id: 'services',
      label: 'Services',
      detail: services.selectedService?.name || 'Choose service',
      icon: Sparkles,
      content: servicesSection,
      complete: Boolean(services.selectedService?.id)
    },
    ...(staff.showStaffSelection ? [{
      id: 'staff',
      label: 'Staff',
      detail: staff.selectedStaffId ? 'Team selected' : 'Choose team',
      icon: Users,
      content: staffSection,
      complete: Boolean(staff.selectedStaffId)
    }] : []),
    {
      id: 'date',
      label: 'Day',
      detail: date.activeDate ? `${date.activeDate.dayName}, ${date.activeDate.dayNum}` : 'Choose day',
      icon: CalendarDays,
      content: dateSection,
      complete: Boolean(date.activeDate?.localDateStr)
    },
    {
      id: 'time',
      label: 'Time',
      detail: time.selectedTime || (time.isWaitlistMode ? 'Waitlist' : 'Choose time'),
      icon: Clock,
      content: timeSection,
      complete: Boolean(time.selectedTime || time.isWaitlistMode)
    }
  ];
  const activeTimelineIndex = Math.max(0, timelineSteps.findIndex(step => step.id === timelineStep));
  const activeStep = timelineSteps[activeTimelineIndex] || timelineSteps[0];
  const goToTimelineStep = (direction) => {
    const nextIndex = Math.min(Math.max(activeTimelineIndex + direction, 0), timelineSteps.length - 1);
    setTimelineStep(timelineSteps[nextIndex]?.id || timelineSteps[0]?.id || 'services');
  };

  if (timelineMode) {
    return (
      <>
        <section className="booking-horizontal-timeline" data-preview-section="timeline">
          <div className="booking-horizontal-stage">
            <div
              className="booking-horizontal-track"
              style={{ transform: `translateX(-${activeTimelineIndex * 100}%)` }}
            >
              {timelineSteps.map(step => (
                <div key={step.id} className={`booking-horizontal-panel ${step.id === activeStep.id ? 'is-active' : ''}`}>
                  {step.content}
                </div>
              ))}
            </div>
          </div>
          <aside className="booking-horizontal-tabs" aria-label="Booking timeline">
            {timelineSteps.map((step, index) => {
              const Icon = step.icon;
              const active = step.id === activeStep.id;
              const complete = index < activeTimelineIndex && step.complete;
              return (
                <button
                  key={step.id}
                  type="button"
                  className={`${active ? 'is-active' : ''} ${complete ? 'is-complete' : ''}`}
                  aria-pressed={active}
                  onClick={() => setTimelineStep(step.id)}
                >
                  <i aria-hidden="true"><Icon size={17} /></i>
                  <span>
                    <b>{step.label}</b>
                  </span>
                </button>
              );
            })}
          </aside>
          <div className="booking-horizontal-controls">
            <button type="button" onClick={() => goToTimelineStep(-1)} disabled={activeTimelineIndex === 0}>
              <ArrowLeft size={14} />
              Back
            </button>
            <button type="button" onClick={() => goToTimelineStep(1)} disabled={activeTimelineIndex === timelineSteps.length - 1}>
              Next
              <ArrowRight size={14} />
            </button>
          </div>
        </section>
        {faqSection}
      </>
    );
  }

  return (
    <>
      {servicesSection}
      {staffSection}
      {dateSection}
      {timeSection}
      {faqSection}
    </>
  );
}
