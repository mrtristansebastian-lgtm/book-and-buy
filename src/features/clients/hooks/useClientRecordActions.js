import { createClientPersistenceActions } from '../actions/clientPersistenceActions';

export function useClientRecordActions({
  buildClientKey,
  canManageWorkspace,
  clientDirectory,
  deleteStorageAsset,
  requestImageCropUpload,
  safeClientRecords,
  setClientMobileView,
  setClientRecords,
  setSelectedClientId,
  showToast,
  user,
  workspaceOwnerId
}) {
  return createClientPersistenceActions({
    buildClientKey,
    canManageWorkspace,
    clientDirectory,
    deleteStorageAsset,
    requestImageCropUpload,
    safeClientRecords,
    setClientMobileView,
    setClientRecords,
    setSelectedClientId,
    showToast,
    user,
    workspaceOwnerId
  });
}
