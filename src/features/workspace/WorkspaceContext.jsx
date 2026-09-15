import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { hydrateDemoWorkspace } from '../../data/demoWorkspace';
import { useAuth } from '../auth/AuthContext';
import {
  loadOwnerWorkspaceFromFirestore,
  saveOwnerWorkspaceToFirestore
} from '../../shared/firebase/ownerWorkspace';
import { createWorkspaceApi } from './createWorkspaceApi';
import { persistWorkspace, readInitialWorkspace } from './workspacePersistence';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { user, configured } = useAuth();
  const [workspace, setWorkspace] = useState(() => readInitialWorkspace());
  const cloudHydratedRef = useRef(false);
  const skipNextCloudSaveRef = useRef(false);

  useEffect(() => {
    persistWorkspace(workspace);
  }, [workspace]);

  /** One-time upgrade for cached demo workspaces missing rich Home sections. */
  useEffect(() => {
    setWorkspace((prev) => {
      if (!prev.isDemo) return prev;
      const next = hydrateDemoWorkspace(prev);
      if (
        next.websiteSchema === prev.websiteSchema &&
        next.socialSchema === prev.socialSchema &&
        next.website?.aboutBody === prev.website?.aboutBody &&
        (next.website?.venueImages?.length || 0) === (prev.website?.venueImages?.length || 0) &&
        (next.socialPosts?.length || 0) === (prev.socialPosts?.length || 0)
      ) {
        return prev;
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (workspace.isDemo) cloudHydratedRef.current = false;
  }, [workspace.isDemo]);

  /** Bind ownerId + hydrate owner settings from Firestore when signed in. */
  useEffect(() => {
    let cancelled = false;
    async function hydrateOwner() {
      if (!configured || !user?.uid) {
        cloudHydratedRef.current = false;
        return;
      }
      if (workspace.isDemo) return;

      setWorkspace((prev) => {
        if (prev.isDemo) return prev;
        if (prev.ownerId === user.uid) return prev;
        return { ...prev, ownerId: user.uid, isDemo: false };
      });

      if (cloudHydratedRef.current) return;
      cloudHydratedRef.current = true;
      try {
        const remote = await loadOwnerWorkspaceFromFirestore(user.uid);
        if (cancelled || !remote) return;
        skipNextCloudSaveRef.current = true;
        setWorkspace((prev) => {
          if (prev.isDemo) return prev;
          return {
            ...prev,
            ...remote,
            ownerId: user.uid,
            isDemo: false,
            website: {
              ...prev.website,
              ...(remote.website || {})
            }
          };
        });
      } catch {
        /* keep local cache */
      }
    }
    hydrateOwner();
    return () => {
      cancelled = true;
    };
    // Only re-run on auth identity; workspace.isDemo checked inside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, user?.uid, workspace.isDemo]);

  /** Debounced owner settings write-through. */
  useEffect(() => {
    if (!configured || !user?.uid || workspace.isDemo) return;
    if (workspace.ownerId && workspace.ownerId !== user.uid) return;
    if (skipNextCloudSaveRef.current) {
      skipNextCloudSaveRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      saveOwnerWorkspaceToFirestore(user.uid, {
        ...workspace,
        ownerId: user.uid
      }).catch(() => {});
    }, 900);
    return () => window.clearTimeout(timer);
  }, [configured, user?.uid, workspace]);

  const api = useMemo(
    () => createWorkspaceApi({ workspace, setWorkspace, user }),
    [workspace, user]
  );

  return <WorkspaceContext.Provider value={api}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return value;
}
