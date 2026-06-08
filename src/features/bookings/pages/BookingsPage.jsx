import { BookingDateRangeDialog } from '../components/BookingDateRangeDialog';
import { BookingDesk } from '../components/BookingDesk';
import { ManualBookingSheet } from '../components/ManualBookingSheet';

export const BookingsPage = ({
  actions,
  bookingDeskState,
  manualBooking,
  rangeDialog
}) => {
  const handleRangeFromChange = (value) => {
    rangeDialog.setBookingCustomRange(prev => ({
      ...prev,
      from: value,
      to: prev.to && prev.to >= value ? prev.to : value
    }));
  };

  const handleRangeToChange = (value) => {
    rangeDialog.setBookingCustomRange(prev => ({ ...prev, to: value }));
  };

  return (
    <div className="bookings-page flex-1 overflow-y-auto bg-white p-4 sm:p-6 md:p-10 lg:p-12">
      {manualBooking.isOpen && (
        <ManualBookingSheet
          activeStaffProfile={manualBooking.activeStaffProfile}
          displayStaffList={manualBooking.displayStaffList}
          manualBookingServiceId={manualBooking.manualBookingServiceId}
          onClose={manualBooking.onClose}
          onManualBookingServiceIdChange={manualBooking.onManualBookingServiceIdChange}
          onSubmit={manualBooking.onSubmit}
          selectedManualBookingService={manualBooking.selectedManualBookingService}
          workspaceServices={manualBooking.workspaceServices}
        />
      )}

      <BookingDesk
        actions={actions}
        bookingDesk={bookingDeskState.bookingDesk}
        bookingDeskPeriod={bookingDeskState.bookingDeskPeriod}
        bookingPaymentFilter={bookingDeskState.bookingPaymentFilter}
        bookingRows={bookingDeskState.bookingRows}
        bookingSearch={bookingDeskState.bookingSearch}
        bookingSort={bookingDeskState.bookingSort}
        displayStaffList={manualBooking.displayStaffList}
        onBookingDeskPeriodChange={bookingDeskState.onBookingDeskPeriodChange}
        onBookingFilterChange={bookingDeskState.onBookingFilterChange}
        onBookingPaymentFilterChange={bookingDeskState.onBookingPaymentFilterChange}
        onBookingSearchChange={bookingDeskState.onBookingSearchChange}
        onBookingSortChange={bookingDeskState.onBookingSortChange}
        onOpenCustomRange={rangeDialog.onOpen}
        onOpenManualBooking={manualBooking.onOpen}
        safeStaffList={bookingDeskState.safeStaffList}
      />

      {rangeDialog.isOpen && (
        <BookingDateRangeDialog
          bookingCustomRange={rangeDialog.bookingCustomRange}
          onClose={rangeDialog.onClose}
          onFromChange={handleRangeFromChange}
          onSave={rangeDialog.onSave}
          onToChange={handleRangeToChange}
        />
      )}
    </div>
  );
};
