import { lazy, Suspense } from 'react';

import { LazySectionFallback } from '../../../components/AppLoading';
import { ConfirmActionDialog, LegalDialog, NativeToast } from '../../../components/AppOverlays';
import { AppErrorBoundary } from '../../../components/AppErrorBoundary';
import { ImageCropModal } from '../../../components/ImageCropModal';
import { BookingInfoDialog } from '../../bookings/components/BookingDialogs';
import { RunningLateDialog } from '../../bookings/components/BookingDialogs';
import { AccountDeleteDialog } from '../../profile/components/AccountDeleteDialog';

const OwnerManual = lazy(() => (
  import('../../../components/OwnerManual').then((module) => ({ default: module.OwnerManual }))
));

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
  navigateWorkspaceTab,
  runningLateDialog,
  safeStaffList,
  setAccountDeleteOpen,
  setAccountDeleteText,
  setBookingInfoDialog,
  setConfirmDialog,
  setImageCropModal,
  setLegalPanel,
  setRunningLateDialog,
  setShowOwnerManual,
  showOwnerManual,
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
      {showOwnerManual && (
        <Suspense fallback={<LazySectionFallback label="Loading manual" />}>
          <AppErrorBoundary compact label="Owner Manual" resetKey="light">
            <OwnerManual
              onClose={() => setShowOwnerManual(false)}
              onNavigate={(targetTab, targetEditorTab) => {
                if (!navigateWorkspaceTab(targetTab, targetEditorTab)) return;
                setShowOwnerManual(false);
              }}
            />
          </AppErrorBoundary>
        </Suspense>
      )}
    </>
  );
}
