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

  return (
    <>
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
        serviceBorderStyle={services.serviceBorderStyle}
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

      {staff.showStaffSelection && (
        <BookingServiceStaffSection
          headingLetterSpacing={headingLetterSpacing}
          pageItems={pageItems}
          pageTextClass={pageTextClass}
          sectionOrder={2}
          selectedService={services.selectedService}
          selectedStaffId={staff.selectedStaffId}
          setSelectedStaffId={staff.setSelectedStaffId}
          settings={settings}
          staffOptions={staff.serviceStaffOptions}
          staffStepNumber={staff.staffStepNumber}
        />
      )}

      <BookingDateSection
        activeDate={date.activeDate}
        availableDates={date.displayDates}
        calendarDisplayStyle={date.calendarDisplayStyle}
        dateStepNumber={date.dateStepNumber}
        dateStyle={date.dateStyle}
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
        sectionOrder={date.dateSectionOrder}
        setSelectedDateIdx={date.setSelectedDateIdx}
        settings={settings}
        showServiceStep={showServiceStep}
      />

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
        sectionOrder={time.timeSectionOrder}
        setSelectedTime={time.setSelectedTime}
        settings={settings}
        showServiceStep={showServiceStep}
        timeDisplayStyle={time.timeDisplayStyle}
        timeSlotStyle={time.timeSlotStyle}
        timeStepNumber={time.timeStepNumber}
        unavailableReason={time.unavailableReason}
      />

      <BookingFaqSection
        faqDisplayStyle={faq.faqDisplayStyle}
        faqItems={faq.faqItems}
        faqStepNumber={faq.faqStepNumber}
        faqStyle={faq.faqStyle}
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
    </>
  );
}
