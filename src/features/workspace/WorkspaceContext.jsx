import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { hydrateDemoWorkspace } from '../../data/demoWorkspace';
import { createBlankWorkspace } from '../../data/blankWorkspace';
import { useAuth } from '../auth/AuthContext';
import {
  loadOwnerWorkspaceFromFirestore,
  saveOwnerWorkspaceToFirestore
} from '../../shared/firebase/ownerWorkspace';
import { createWorkspaceApi } from './createWorkspaceApi';
import {
  MODE_KEY,
  OWNER_KEY,
  persistWorkspace,
  readInitialWorkspace,
  safeParse
} from './workspacePersistence';

const WorkspaceContext = createContext(null);

export function isDemoWorkspace(ws) {
  if (!ws) return false;
  if (ws.isDemo) return true;
  const slug = String(ws.slug || '').toLowerCase();
  return slug === 'flameandflour' || slug === 'flour-and-flame';
}

function ownerShellFromUser(user, prior = {}) {
  const base = createBlankWorkspace({
    onboardingComplete: Boolean(prior.onboardingComplete),
    ownerId: user.uid,
    isDemo: false,
    email: prior.email || user.email || '',
    brandName: isDemoWorkspace(prior) ? '' : prior.brandName || '',
    slug: isDemoWorkspace(prior) ? '' : prior.slug || ''
  });
  if (!isDemoWorkspace(prior) && prior.onboardingComplete) {
    return {
      ...prior,
      ...base,
      ...prior,
      ownerId: user.uid,
      isDemo: false,
      website: {
        ...base.website,
        ...(prior.website || {})
      }
    };
  }
  return base;
}

export function WorkspaceProvider({ children }) {
  const { user, configured } = useAuth();
  const [workspace, setWorkspace] = useState(() => readInitialWorkspace());
  const cloudHydratedRef = useRef(false);
  const skipNextCloudSaveRef = useRef(false);
  const clearedDemoForUid = useRef('');

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

  /**
   * Real signed-in accounts must never keep Flame & Flour / demo state.
   */
  useEffect(() => {
    let cancelled = false;
    async function hydrateOwner() {
      if (!configured || !user?.uid) {
        cloudHydratedRef.current = false;
        clearedDemoForUid.current = '';
        return;
      }

      if (clearedDemoForUid.current !== user.uid) {
        clearedDemoForUid.current = user.uid;
        setWorkspace((prev) => {
          if (!isDemoWorkspace(prev)) {
            if (prev.ownerId === user.uid && !prev.isDemo) return prev;
            return { ...prev, ownerId: user.uid, isDemo: false };
          }
          const stored = safeParse(localStorage.getItem(OWNER_KEY), null);
          const cleaned = ownerShellFromUser(
            user,
            stored && !isDemoWorkspace(stored) ? stored : { email: user.email || '' }
          );
          localStorage.setItem(MODE_KEY, 'owner');
          localStorage.setItem(OWNER_KEY, JSON.stringify(cleaned));
          skipNextCloudSaveRef.current = true;
          cloudHydratedRef.current = false;
          return cleaned;
        });
      }

      if (cloudHydratedRef.current) return;
      cloudHydratedRef.current = true;
      try {
        const remote = await loadOwnerWorkspaceFromFirestore(user.uid);
        if (cancelled || !remote || isDemoWorkspace(remote)) return;
        skipNextCloudSaveRef.current = true;
        setWorkspace((prev) => {
          if (isDemoWorkspace(prev)) {
            return {
              ...createBlankWorkspace({
                ...remote,
                ownerId: user.uid,
                isDemo: false,
                onboardingComplete: Boolean(remote.onboardingComplete)
              })
            };
          }
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
  }, [configured, user?.uid, user?.email]);

  /** Debounced owner settings write-through. */
  useEffect(() => {
    if (!configured || !user?.uid || isDemoWorkspace(workspace)) return;
    if (workspace.ownerId && workspace.ownerId !== user.uid) return;
    if (skipNextCloudSaveRef.current) {
      skipNextCloudSaveRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      saveOwnerWorkspaceToFirestore(user.uid, {
        ...workspace,
        ownerId: user.uid,
        isDemo: false
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
