import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { hydrateDemoWorkspace } from '../../data/demoWorkspace';
import { createBlankWorkspace } from '../../data/blankWorkspace';
import { useAuth } from '../auth/AuthContext';
import {
  loadOwnerWorkspaceFromFirestore,
  saveOwnerWorkspaceToFirestore,
  readCachedOwnerBaseline,
  applyReviewedWorkspaceChanges,
  subscribeOwnerWorkspace
} from '../../shared/firebase/ownerWorkspace';
import { WORKSPACE_SECTIONS } from '../../../functions/workspaceDomain.js';
import { createWorkspaceConflictReview, assertWorkspaceConflictCurrent } from '../../shared/firebase/workspaceConflict';
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
  if (prior.ownerId && prior.ownerId !== user.uid) prior = {};
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
  const [saveStatus, setSaveStatus] = useState('ready');
  const [saveError, setSaveError] = useState('');
  const [orderActionError, setOrderActionError] = useState('');
  const [inventoryActionError, setInventoryActionError] = useState('');
  const [bookingActionError, setBookingActionError] = useState('');
  const [saveRetry, setSaveRetry] = useState(0);
  const [hydratedOwnerUid, setHydratedOwnerUid] = useState('');
  const [ownerWorkspaceError, setOwnerWorkspaceError] = useState('');
  const [saveConflict, setSaveConflict] = useState(false);
  const latestWorkspaceRef = useRef(workspace);
  latestWorkspaceRef.current = workspace;
  const cloudHydratedRef = useRef(false);
  const skipNextCloudSaveRef = useRef(false);
  const clearedDemoForUid = useRef('');
  const remoteWorkspaceRef = useRef(null);

  useEffect(() => {
    try { persistWorkspace(workspace); } catch { setSaveStatus('error'); setSaveError('This device could not save your changes. Free browser storage and try again.'); }
  }, [workspace]);

  /** One-time upgrade for cached demo workspaces missing rich Home sections. */
  useEffect(() => {
    setWorkspace((prev) => {
      if (!prev.isDemo) return prev;
      const next = hydrateDemoWorkspace(prev);
      if (
        next.websiteSchema === prev.websiteSchema &&
        next.financeSchema === prev.financeSchema &&
        next.website?.aboutBody === prev.website?.aboutBody &&
        (next.website?.venueImages?.length || 0) === (prev.website?.venueImages?.length || 0)
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
        remoteWorkspaceRef.current = null;
        setHydratedOwnerUid('');
        setOwnerWorkspaceError('');
        return;
      }

      if (clearedDemoForUid.current !== user.uid) {
        clearedDemoForUid.current = user.uid;
        setSaveError(''); setSaveStatus('ready'); setSaveConflict(false); setOrderActionError(''); setInventoryActionError(''); setBookingActionError('');
        cloudHydratedRef.current = false;
        remoteWorkspaceRef.current = null;
        setHydratedOwnerUid('');
        setOwnerWorkspaceError('');
        setWorkspace((prev) => {
          if (!isDemoWorkspace(prev)) {
            if (prev.ownerId === user.uid && !prev.isDemo) return prev;
            return ownerShellFromUser(user,prev);
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
      setOwnerWorkspaceError('');
      try {
        const cachedBaseline = readCachedOwnerBaseline(user.uid);
        const remote = await loadOwnerWorkspaceFromFirestore(user.uid);
        if (cancelled) return;
        cloudHydratedRef.current = true;
        remoteWorkspaceRef.current = remote || {};
        setHydratedOwnerUid(user.uid);
        if (!remote || isDemoWorkspace(remote)) return;
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
          const next = {
            ...prev,
            ...remote,
            ownerId: user.uid,
            isDemo: false,
            website: {
              ...prev.website,
              ...(remote.website || {})
            }
          };
          // Recover edits that were kept on this device after a failed save.
          // Keep their old revisions so another session's changes still conflict.
          if (cachedBaseline?.ownerId === user.uid && prev.ownerId === user.uid) {
            next.sectionRevisions = { ...(remote.sectionRevisions || {}) };
            let recovered = false;
            for (const [section,fields] of Object.entries(WORKSPACE_SECTIONS)) {
              let dirty = false;
              for (const field of fields) if (prev[field] !== undefined && JSON.stringify(prev[field]) !== JSON.stringify(cachedBaseline[field])) { next[field] = prev[field]; dirty = true; }
              if (dirty) { recovered = true; next.sectionRevisions[section] = prev.sectionRevisions?.[section] ?? cachedBaseline.sectionRevisions?.[section] ?? 0; }
            }
            if (recovered) skipNextCloudSaveRef.current = false;
          }
          return next;
        });
      } catch (error) {
        if (!cancelled) { const message = error.message || 'Your cloud workspace could not be loaded. Check your connection and retry before saving.'; setOwnerWorkspaceError(message); setSaveStatus('error'); setSaveError(message); }
      }
    }
    hydrateOwner();
    return () => {
      cancelled = true;
    };
  }, [configured, user?.uid, user?.email, saveRetry]);

  /** Debounced owner settings write-through. */
  useEffect(() => {
    if (!configured || !user?.uid || hydratedOwnerUid !== user.uid || isDemoWorkspace(workspace) || workspace.ownerId !== user.uid) return undefined;
    return subscribeOwnerWorkspace(user.uid, remote => {
      const baseline = remoteWorkspaceRef.current || remote;
      remoteWorkspaceRef.current = remote;
      setWorkspace(prior => {
        const next = { ...prior, ...remote, sectionRevisions: { ...(remote.sectionRevisions || {}) } };
        let dirty = false;
        for (const [section, fields] of Object.entries(WORKSPACE_SECTIONS)) {
          let sectionDirty = false;
          for (const field of fields) if (JSON.stringify(prior[field]) !== JSON.stringify(baseline[field])) {
            next[field] = prior[field]; sectionDirty = true; dirty = true;
          }
          if (sectionDirty) next.sectionRevisions[section] = prior.sectionRevisions?.[section] || 0;
        }
        if (JSON.stringify(prior) === JSON.stringify(next)) return prior;
        if (!dirty) skipNextCloudSaveRef.current = true;
        return next;
      });
    }, error => { setSaveStatus('error'); setSaveError(error.message || 'Live workspace updates are unavailable.'); });
  }, [configured, user?.uid, hydratedOwnerUid, workspace.isDemo, workspace.ownerId]);

  /** Debounced owner settings write-through. */
  useEffect(() => {
    if (!configured || !user?.uid || hydratedOwnerUid !== user.uid || isDemoWorkspace(workspace)) return;
    if (workspace.ownerId && workspace.ownerId !== user.uid) return;
    if (skipNextCloudSaveRef.current) {
      skipNextCloudSaveRef.current = false;
      return;
    }
    let cancelled = false;
    setSaveStatus('saving'); setSaveError('');
    const timer = window.setTimeout(() => {
      saveOwnerWorkspaceToFirestore(user.uid, {
        ...workspace,
        ownerId: user.uid,
        isDemo: false
      }).then((result) => {
        if (result?.ok !== true) throw new Error(result?.reason || 'Save unavailable');
        if (result.workspace) {
          remoteWorkspaceRef.current = result.workspace;
          setWorkspace(prior => {
            const next = { ...prior, sectionRevisions: result.workspace.sectionRevisions || prior.sectionRevisions };
            for (const fields of Object.values(WORKSPACE_SECTIONS)) for (const field of fields) {
              if (JSON.stringify(prior[field]) === JSON.stringify(workspace[field]) && result.workspace[field] !== undefined) next[field] = result.workspace[field];
            }
            return JSON.stringify(next) === JSON.stringify(prior) ? prior : next;
          });
        }
        if (!cancelled) { setSaveStatus('saved'); setSaveConflict(false); }
      }).catch(error => { if (!cancelled) { setSaveStatus('error'); setSaveConflict(String(error.code || '').endsWith('aborted')); setSaveError(error.message || 'Cloud save failed. Your changes are kept on this device. Check your connection and retry.'); } });
    }, 900);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [configured, user?.uid, hydratedOwnerUid, workspace, saveRetry]);

  const api = useMemo(
    () => createWorkspaceApi({ workspace, setWorkspace, user, onOrderError: setOrderActionError, onInventoryError: setInventoryActionError, onBookingError: setBookingActionError }),
    [workspace, user]
  );

  const ownerWorkspaceReady = !configured || !user?.uid || hydratedOwnerUid === user.uid;
  const reviewSaveConflict = async () => {
    const draft = structuredClone(latestWorkspaceRef.current), baseline = remoteWorkspaceRef.current || {};
    const remote = await loadOwnerWorkspaceFromFirestore(user.uid);
    if (!remote) throw new Error('Your cloud workspace was not found. Please retry.');
    const review = createWorkspaceConflictReview(baseline,draft,remote); assertWorkspaceConflictCurrent(review,latestWorkspaceRef.current); return review;
  };
  const resolveSaveConflict = async (review, action) => {
    assertWorkspaceConflictCurrent(review,latestWorkspaceRef.current);
    if (review.ownerId !== user?.uid) throw new Error('Sign in as the workspace owner.');
    const result = action === 'reapply' ? await applyReviewedWorkspaceChanges(user.uid,review.changes) : action === 'discard' ? {workspace:await loadOwnerWorkspaceFromFirestore(user.uid)} : null;
    if (!result?.workspace) throw new Error('The cloud workspace could not be loaded.');
    remoteWorkspaceRef.current = result.workspace; skipNextCloudSaveRef.current = true; setWorkspace(result.workspace); setSaveConflict(false); setSaveError(''); setSaveStatus('saved');
  };
  const value = useMemo(() => ({ ...api, saveStatus, saveError, saveConflict, reviewSaveConflict, resolveSaveConflict, ownerWorkspaceReady, ownerWorkspaceError, retrySave: () => setSaveRetry((prior) => prior + 1) }), [api, saveStatus, saveError, saveConflict, ownerWorkspaceReady, ownerWorkspaceError]);
  return <WorkspaceContext.Provider value={value}>{children}{bookingActionError && <div role="alert" className="bb-order-action-error"><span>{bookingActionError}</span><button type="button" onClick={() => setBookingActionError('')} aria-label="Dismiss booking error">×</button></div>}{orderActionError && <div role="alert" className="bb-order-action-error"><span>{orderActionError}</span><button type="button" onClick={() => setOrderActionError('')} aria-label="Dismiss order error">×</button></div>}{inventoryActionError && <div role="alert" className="bb-order-action-error"><span>{inventoryActionError}</span><button type="button" onClick={() => setInventoryActionError('')} aria-label="Dismiss inventory error">×</button></div>}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return value;
}
