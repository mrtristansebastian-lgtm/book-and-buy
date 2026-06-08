import { createClientCsvMigrationActions } from '../actions/clientCsvMigrationActions';
import { createClientPersistenceActions } from '../actions/clientPersistenceActions';
import { createFinanceImportActions } from '../actions/financeImportActions';

export function useClientRecordActions({
  bookingPageSlug,
  buildClientKey,
  canManageWorkspace,
  clientDirectory,
  clientRecords,
  deleteStorageAsset,
  requestImageCropUpload,
  safeClientRecords,
  safeFinanceImports,
  setBookingsAndCache,
  setClientMobileView,
  setClientRecords,
  setFinanceImports,
  setSelectedClientId,
  settings,
  showToast,
  user,
  visibleBookings,
  workspaceOwnerId
}) {
  const clientActions = createClientPersistenceActions({
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

  const financeActions = createFinanceImportActions({
    canManageWorkspace,
    safeFinanceImports,
    setFinanceImports,
    showToast,
    user,
    workspaceOwnerId
  });

  const csvActions = createClientCsvMigrationActions({
    bookingPageSlug,
    buildClientKey,
    canManageWorkspace,
    clientRecords,
    safeClientRecords,
    safeFinanceImports,
    saveClients: clientActions.saveClients,
    saveFinanceImports: financeActions.saveFinanceImports,
    setBookingsAndCache,
    settings,
    showToast,
    user,
    visibleBookings,
    workspaceOwnerId
  });

  return {
    ...clientActions,
    ...csvActions,
    ...financeActions
  };
}
