import { useCallback, useEffect, useRef } from 'react';

const defaultDirtySource = 'Workspace';
const cleanDirtySource = (source) => String(source || defaultDirtySource).trim().slice(0, 80) || defaultDirtySource;

const createCleanDirtyState = (overrides = {}) => ({
  isDirty: false,
  source: '',
  ...overrides
});

const buildUnsavedPrompt = (source) => {
  const label = cleanDirtySource(source);
  return [
    `Unsaved changes${label ? ` in ${label}` : ''}.`,
    'Leave without saving?'
  ].join('\n');
};

export function useWorkspaceDirtyState() {
  const unsavedWorkspaceChangesRef = useRef(createCleanDirtyState());

  const markWorkspaceDirty = useCallback((meta = {}) => {
    const source = cleanDirtySource(typeof meta === 'string' ? meta : meta.source);
    unsavedWorkspaceChangesRef.current = { isDirty: true, source };
  }, []);

  const clearWorkspaceDirty = useCallback(() => {
    unsavedWorkspaceChangesRef.current = createCleanDirtyState();
  }, []);

  const confirmLeavingUnsavedChanges = useCallback((options = {}) => {
    const current = unsavedWorkspaceChangesRef.current;
    if (!current.isDirty || typeof window === 'undefined') return true;
    const confirmed = window.confirm(buildUnsavedPrompt(options.source || current.source));
    if (confirmed) clearWorkspaceDirty();
    return confirmed;
  }, [clearWorkspaceDirty]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const confirmPageExit = (event) => {
      if (!unsavedWorkspaceChangesRef.current.isDirty) return;
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
