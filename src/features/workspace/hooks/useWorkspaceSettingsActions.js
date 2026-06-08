import { createEditorSettingActions } from '../actions/editorSettingActions';
import { createWorkspacePersistenceActions } from '../actions/workspacePersistenceActions';

export function useWorkspaceSettingsActions({
  accountProfileKey,
  activeStaffId,
  canManageTeam,
  canManageWorkspace,
  clearWorkspaceDirty,
  displayStaffList,
  isWorkspaceOwner,
  markWorkspaceDirty,
  personalDisplayName,
  personalProfile,
  publishedSettingsSnapshotRef,
  resetEditorPreviewScroll,
  saveStaff,
  setAccountProfileOverride,
  setSettings,
  setStaffList,
  settings,
  settingsRef,
  showToast,
  staffList,
  user,
  workspaceRole,
  workspaceOwnerId
}) {
  const editorActions = createEditorSettingActions({
    markWorkspaceDirty,
    resetEditorPreviewScroll,
    setSettings,
    settings,
    showToast
  });

  const persistenceActions = createWorkspacePersistenceActions({
    accountProfileKey,
    activeStaffId,
    canManageTeam,
    canManageWorkspace,
    clearWorkspaceDirty,
    displayStaffList,
    isWorkspaceOwner,
    personalDisplayName,
    personalProfile,
    publishedSettingsSnapshotRef,
    saveStaff,
    setAccountProfileOverride,
    setSettings,
    setStaffList,
    settings,
    settingsRef,
    showToast,
    staffList,
    user,
    workspaceRole,
    workspaceOwnerId
  });

  return {
    ...editorActions,
    ...persistenceActions
  };
}
