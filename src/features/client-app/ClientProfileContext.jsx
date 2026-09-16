import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  clearLocalClientProfile,
  makeDemoClientProfile,
  readLocalClientProfile,
  writeLocalClientProfile
} from './clientProfile';
import {
  addFollowedSlug,
  ensureClientProfile,
  isFirebaseConfigured,
  loadUserProfile
} from './clientProfileApi';

const ClientProfileContext = createContext(null);

export function ClientProfileProvider({ children }) {
  const { user, ready, configured, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!ready) return;
      if (configured && user) {
        try {
          const remote = await loadUserProfile(user.uid);
          if (cancelled) return;
          if (remote?.kind === 'client') {
            setProfile(remote);
            writeLocalClientProfile(remote);
          } else {
            setProfile(null);
          }
        } catch {
          if (!cancelled) setProfile(null);
        } finally {
          if (!cancelled) setProfileReady(true);
        }
        return;
      }
      if (!configured) {
        const local = readLocalClientProfile();
        if (!cancelled) {
          setProfile(local);
          setProfileReady(true);
        }
        return;
      }
      if (!cancelled) {
        setProfile(null);
        setProfileReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, configured, user]);

  const enterDemoClient = useCallback(() => {
    const demo = makeDemoClientProfile();
    writeLocalClientProfile(demo);
    setProfile(demo);
    return demo;
  }, []);

  const setClientSession = useCallback((next) => {
    writeLocalClientProfile(next);
    setProfile(next);
  }, []);

  const clearClientSession = useCallback(async () => {
    clearLocalClientProfile();
    setProfile(null);
    if (configured && user) {
      try {
        await signOut();
      } catch {
        /* ignore */
      }
    }
  }, [configured, user, signOut]);

  const followSlug = useCallback(
    async (slug) => {
      if (!profile || !slug) return profile;
      const nextSlugs = await addFollowedSlug(profile.uid, slug, profile.followedSlugs || []);
      const next = { ...profile, followedSlugs: nextSlugs };
      writeLocalClientProfile(next);
      setProfile(next);
      return next;
    },
    [profile]
  );

  const unfollowSlug = useCallback(
    async (slug) => {
      if (!profile) return profile;
      const nextSlugs = (profile.followedSlugs || []).filter((item) => item !== slug);
      if (isFirebaseConfigured() && profile.uid && !String(profile.uid).startsWith('demo')) {
        const { updateClientFollowedSlugs } = await import('./clientProfileApi');
        await updateClientFollowedSlugs(profile.uid, nextSlugs);
      }
      const next = { ...profile, followedSlugs: nextSlugs };
      writeLocalClientProfile(next);
      setProfile(next);
      return next;
    },
    [profile]
  );

  const bootstrapClientAfterAuth = useCallback(
    async (authUser, { displayName } = {}) => {
      const remote = await ensureClientProfile(authUser, { displayName });
      if (remote?.kind === 'client') {
        writeLocalClientProfile(remote);
        setProfile(remote);
      }
      return remote;
    },
    []
  );

  const value = useMemo(
    () => ({
      profile,
      profileReady,
      isClient: Boolean(profile?.kind === 'client'),
      enterDemoClient,
      setClientSession,
      clearClientSession,
      followSlug,
      unfollowSlug,
      bootstrapClientAfterAuth
    }),
    [
      profile,
      profileReady,
      enterDemoClient,
      setClientSession,
      clearClientSession,
      followSlug,
      unfollowSlug,
      bootstrapClientAfterAuth
    ]
  );

  return (
    <ClientProfileContext.Provider value={value}>{children}</ClientProfileContext.Provider>
  );
}

export function useClientProfile() {
  const value = useContext(ClientProfileContext);
  if (!value) throw new Error('useClientProfile must be used within ClientProfileProvider');
  return value;
}
