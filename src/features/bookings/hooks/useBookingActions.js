import { useState } from 'react';

import { createBookingChatActions } from '../actions/bookingChatActions';
import { createBookingLifecycleActions } from '../actions/bookingLifecycleActions';
import { createBookingSubmissionActions } from '../actions/bookingSubmissionActions';

export function useBookingActions({
  communications,
  confirmLeavingUnsavedChanges,
  createClientNotification,
  createOwnerNotification,
  getBookingClientAvatar,
  isGuestWorkspace,
  navigateWorkspaceTab,
  publicSlug,
  publicWorkspace,
  safeStaffList,
  setActiveTab,
  setBookingFilter,
  setBookingsAndCache,
  setManualBookingOpen,
  setManualBookingServiceId,
  setSupportThreadFocus,
  settings,
  showToast,
  user,
  visibleBookings,
  workspaceOwnerId,
  workspaceServices
}) {
  const [runningLateDialog, setRunningLateDialog] = useState(null);

  const submissionActions = createBookingSubmissionActions({
    createOwnerNotification,
    publicSlug,
    publicWorkspace,
    setBookingFilter,
    setBookingsAndCache,
    setManualBookingOpen,
    setManualBookingServiceId,
    settings,
    showToast,
    user,
    workspaceOwnerId,
    workspaceServices
  });

  const lifecycleActions = createBookingLifecycleActions({
    communications,
    createClientNotification,
    runningLateDialog,
    safeStaffList,
    setBookingsAndCache,
    setRunningLateDialog,
    settings,
    showToast,
    user,
    visibleBookings,
    workspaceOwnerId
  });

  const chatActions = createBookingChatActions({
    confirmLeavingUnsavedChanges,
    getBookingClientAvatar,
    isGuestWorkspace,
    navigateWorkspaceTab,
    safeStaffList,
    setActiveTab,
    setSupportThreadFocus,
    settings,
    showToast,
    updateBooking: lifecycleActions.updateBooking,
    user,
    visibleBookings,
    workspaceOwnerId
  });

  return {
    ...submissionActions,
    ...lifecycleActions,
    ...chatActions,
    runningLateDialog,
    setRunningLateDialog
  };
}
