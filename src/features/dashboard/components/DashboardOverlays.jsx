import { ConfirmActionDialog, LegalDialog, NativeToast } from '../../../components/AppOverlays';
import { ImageCropModal } from '../../../components/ImageCropModal';
import { BookingInfoDialog } from '../../bookings/components/BookingDialogs';
import { RunningLateDialog } from '../../bookings/components/BookingDialogs';
import { AccountDeleteDialog } from '../../profile/components/AccountDeleteDialog';

export function DashboardOverlays({
  accountDeleteOpen,
  accountDeleteText,
  authBusy,
  authDialog,
  bookingInfoDialog,
  confirmDialog,
  deleteBooking,
  getBookingService,
  handleDeleteAccount,
  handleImageCropSave,
  imageCropCommitRef,
  imageCropModal,
  imageCropSaving,
  legalPages,
  legalPanel,
  runningLateDialog,
  safeStaffList,
  setAccountDeleteOpen,
  setAccountDeleteText,
  setBookingInfoDialog,
  setConfirmDialog,
  setImageCropModal,
  setLegalPanel,
  setRunningLateDialog,
  submitRunningLateDialog,
  toast
}) {
  return (
    <>
      <NativeToast message={toast} />
      {authDialog}
      <LegalDialog pages={legalPages} panel={legalPanel} onClose={() => setLegalPanel(null)} />
      <ConfirmActionDialog
        dialog={confirmDialog}
        onCancel={() => setConfirmDialog(null)}
        onConfirm={() => {
          const action = confirmDialog?.onConfirm;
          setConfirmDialog(null);
          action?.();
        }}
      />
      <BookingInfoDialog
        booking={bookingInfoDialog}
        staffList={safeStaffList}
        getBookingService={getBookingService}
        onClose={() => setBookingInfoDialog(null)}
        onRequestDelete={(booking) => {
          setBookingInfoDialog(null);
          setConfirmDialog({
            eyebrow: 'Booking Record',
            title: 'Remove this booking?',
            body: 'This deletes the record from your workspace. Client profiles and other bookings stay untouched.',
            actionLabel: 'Remove',
            onConfirm: () => deleteBooking(booking.id)
          });
        }}
      />
      <RunningLateDialog
        dialog={runningLateDialog}
        onClose={() => setRunningLateDialog(null)}
        onChange={setRunningLateDialog}
        onSubmit={submitRunningLateDialog}
      />
      <AccountDeleteDialog
        open={accountDeleteOpen}
        text={accountDeleteText}
        busy={authBusy}
        onTextChange={setAccountDeleteText}
        onClose={() => { setAccountDeleteOpen(false); setAccountDeleteText(''); }}
        onDelete={handleDeleteAccount}
      />
      <ImageCropModal
        crop={imageCropModal}
        saving={imageCropSaving}
        onChange={(updates) => setImageCropModal(prev => (prev ? { ...prev, ...updates } : prev))}
        onClose={() => {
          if (imageCropSaving) return;
          setImageCropModal(null);
          imageCropCommitRef.current = null;
        }}
        onSave={handleImageCropSave}
      />
    </>
  );
}
