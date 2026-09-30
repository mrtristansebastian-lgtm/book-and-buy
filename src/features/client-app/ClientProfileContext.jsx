import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { clearLocalClientProfile, emptyClientProfile, makeDemoClientProfile, readLocalClientProfile, writeLocalClientProfile } from './clientProfile';
import { ensureClientProfile, isFirebaseConfigured, loadUserProfile, updateClientProfileFields, updateClientSavedPlaceSlugs } from './clientProfileApi';

const ClientProfileContext = createContext(null);

function withoutSocialState(value) {
  if (!value) return null;
  const { followedSlugs, likedKeys, reactionsByKey, savedKeys, commentsByKey, ...profile } = value;
  return profile;
}

export function ClientProfileProvider({ children }) {
  const { user, ready, configured, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [profileReady, setProfileReady] = useState(false);

  const persist = useCallback((next) => {
    const cleaned = withoutSocialState(next);
    writeLocalClientProfile(cleaned);
    setProfile(cleaned);
    return cleaned;
  }, []);

  const updateExplorePrefs = useCallback((patch = {}) => {
    let saved = null;
    setProfile((prev) => {
      saved = withoutSocialState({ ...(prev || emptyClientProfile({ isDemo: true })), ...patch });
      writeLocalClientProfile(saved);
      return saved;
    });
    return saved;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!ready) return;
      if (configured && user) {
        try {
          const remote = await loadUserProfile(user.uid);
          if (!cancelled) setProfile(remote?.kind === 'client' ? persist({ ...remote, isDemo: false }) : null);
        } catch { if (!cancelled) setProfile(null); }
        finally { if (!cancelled) setProfileReady(true); }
        return;
      }
      const local = readLocalClientProfile();
      if (!cancelled) {
        setProfile(!configured || local?.isDemo ? withoutSocialState(local) : null);
        setProfileReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [ready, configured, user, persist]);

  const enterDemoClient = useCallback(() => persist(makeDemoClientProfile()), [persist]);
  const setClientSession = useCallback((next) => persist(next), [persist]);
  const clearClientSession = useCallback(async () => {
    clearLocalClientProfile();
    setProfile(null);
    if (configured && user) { try { await signOut(); } catch { /* ignore */ } }
  }, [configured, user, signOut]);

  const isPlaceSaved = useCallback((slug) => (profile?.savedPlaceSlugs || []).includes(String(slug || '').trim()), [profile]);
  const togglePlaceSave = useCallback(async (slug) => {
    if (!profile || !slug) return profile;
    const saved = new Set(profile.savedPlaceSlugs || []);
    const key = String(slug).trim();
    if (saved.has(key)) saved.delete(key); else saved.add(key);
    const next = persist({ ...profile, savedPlaceSlugs: [...saved] });
    try { await updateClientSavedPlaceSlugs(profile.uid, next.savedPlaceSlugs); } catch { /* retain local state */ }
    return next;
  }, [profile, persist]);

  const bootstrapClientAfterAuth = useCallback(async (authUser, { displayName } = {}) => {
    const remote = await ensureClientProfile(authUser, { displayName });
    if (remote?.kind === 'client') persist({ ...remote, isDemo: false });
    return remote;
  }, [persist]);

  const updateClientProfile = useCallback(async (patch = {}) => {
    if (!profile) return null;
    const next = persist({ ...profile, ...patch, email: patch.email != null ? String(patch.email).trim().toLowerCase() : profile.email, displayName: patch.displayName != null ? String(patch.displayName) : profile.displayName, photoURL: patch.photoURL != null ? String(patch.photoURL).trim() : profile.photoURL });
    if (isFirebaseConfigured() && next.uid && !String(next.uid).startsWith('demo')) {
      try { await updateClientProfileFields(next.uid, { displayName: next.displayName, email: next.email, photoURL: next.photoURL }); } catch { /* retain local state */ }
    }
    return next;
  }, [profile, persist]);

  const value = useMemo(() => ({
    profile,
    profileReady,
    isClient: Boolean(profile?.kind === 'client'),
    enterDemoClient,
    setClientSession,
    clearClientSession,
    isPlaceSaved,
    togglePlaceSave,
    bootstrapClientAfterAuth,
    updateClientProfile,
    updateExplorePrefs
  }), [profile, profileReady, enterDemoClient, setClientSession, clearClientSession, isPlaceSaved, togglePlaceSave, bootstrapClientAfterAuth, updateClientProfile, updateExplorePrefs]);

  return <ClientProfileContext.Provider value={value}>{children}</ClientProfileContext.Provider>;
}

export function useClientProfile() {
  const value = useContext(ClientProfileContext);
  if (!value) throw new Error('useClientProfile must be used within ClientProfileProvider');
  return value;
}
