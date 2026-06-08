import { useEffect, useRef } from 'react';

export function useWorkspaceDirtyState() {
  const unsavedWorkspaceChangesRef = useRef(false);

  const markWorkspaceDirty = () => {
    unsavedWorkspaceChangesRef.current = true;
  };

  const clearWorkspaceDirty = () => {
    unsavedWorkspaceChangesRef.current = false;
  };

  const confirmLeavingUnsavedChanges = () => {
    if (!unsavedWorkspaceChangesRef.current || typeof window === 'undefined') return true;
    const confirmed = window.confirm('Leave without saving?');
    if (confirmed) clearWorkspaceDirty();
    return confirmed;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const confirmPageExit = (event) => {
      if (!unsavedWorkspaceChangesRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', confirmPageExit);
    return () => window.removeEventListener('beforeunload', confirmPageExit);
  }, []);

  return {
    clearWorkspaceDirty,
    confirmLeavingUnsavedChanges,
    markWorkspaceDirty,
    unsavedWorkspaceChangesRef
  };
}
