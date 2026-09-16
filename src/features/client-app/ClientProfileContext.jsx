import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  clearLocalClientProfile,
  makeDemoClientProfile,
  normalizeEngagement,
  readLocalClientProfile,
  socialPostKey,
  writeLocalClientProfile
} from './clientProfile';
import {
  addFollowedSlug,
  ensureClientProfile,
  isFirebaseConfigured,
  loadUserProfile,
  updateClientEngagement
} from './clientProfileApi';

const ClientProfileContext = createContext(null);

function withEngagement(profile) {
  if (!profile) return null;
  return { ...profile, ...normalizeEngagement(profile) };
}

export function ClientProfileProvider({ children }) {
  const { user, ready, configured, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [profileReady, setProfileReady] = useState(false);

  const persist = useCallback((next) => {
    const normalized = withEngagement(next);
    writeLocalClientProfile(normalized);
    setProfile(normalized);
    return normalized;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!ready) return;
      if (configured && user) {
        try {
          const remote = await loadUserProfile(user.uid);
          if (cancelled) return;
          if (remote?.kind === 'client') {
            persist(remote);
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
          setProfile(withEngagement(local));
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
  }, [ready, configured, user, persist]);

  const enterDemoClient = useCallback(() => {
    const demo = makeDemoClientProfile();
    return persist(demo);
  }, [persist]);

  const setClientSession = useCallback(
    (next) => {
      return persist(next);
    },
    [persist]
  );

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
      return persist({ ...profile, followedSlugs: nextSlugs });
    },
    [profile, persist]
  );

  const unfollowSlug = useCallback(
    async (slug) => {
      if (!profile) return profile;
      const nextSlugs = (profile.followedSlugs || []).filter((item) => item !== slug);
      if (isFirebaseConfigured() && profile.uid && !String(profile.uid).startsWith('demo')) {
        const { updateClientFollowedSlugs } = await import('./clientProfileApi');
        await updateClientFollowedSlugs(profile.uid, nextSlugs);
      }
      return persist({ ...profile, followedSlugs: nextSlugs });
    },
    [profile, persist]
  );

  const syncEngagement = useCallback(
    async (next) => {
      const normalized = persist(next);
      if (isFirebaseConfigured() && next.uid && !String(next.uid).startsWith('demo')) {
        try {
          await updateClientEngagement(next.uid, {
            likedKeys: normalized.likedKeys,
            savedKeys: normalized.savedKeys,
            commentsByKey: normalized.commentsByKey
          });
        } catch {
          /* keep local */
        }
      }
      return normalized;
    },
    [persist]
  );

  const isLiked = useCallback(
    (slug, postId) => (profile?.likedKeys || []).includes(socialPostKey(slug, postId)),
    [profile]
  );

  const isSaved = useCallback(
    (slug, postId) => (profile?.savedKeys || []).includes(socialPostKey(slug, postId)),
    [profile]
  );

  const getComments = useCallback(
    (slug, postId) => {
      const key = socialPostKey(slug, postId);
      const list = profile?.commentsByKey?.[key];
      return Array.isArray(list) ? list : [];
    },
    [profile]
  );

  const toggleLike = useCallback(
    async (slug, postId) => {
      if (!profile || !postId) return profile;
      const key = socialPostKey(slug, postId);
      const liked = new Set(profile.likedKeys || []);
      if (liked.has(key)) liked.delete(key);
      else liked.add(key);
      return syncEngagement({ ...profile, likedKeys: [...liked] });
    },
    [profile, syncEngagement]
  );

  const toggleSave = useCallback(
    async (slug, postId) => {
      if (!profile || !postId) return profile;
      const key = socialPostKey(slug, postId);
      const saved = new Set(profile.savedKeys || []);
      if (saved.has(key)) saved.delete(key);
      else saved.add(key);
      return syncEngagement({ ...profile, savedKeys: [...saved] });
    },
    [profile, syncEngagement]
  );

  const addComment = useCallback(
    async (slug, postId, body) => {
      if (!profile || !postId) return null;
      const text = String(body || '').trim();
      if (!text) return null;
      const key = socialPostKey(slug, postId);
      const comment = {
        id: `c-${Date.now()}`,
        body: text,
        at: Date.now(),
        authorName: profile.displayName || 'You'
      };
      const prev = Array.isArray(profile.commentsByKey?.[key]) ? profile.commentsByKey[key] : [];
      const commentsByKey = {
        ...(profile.commentsByKey || {}),
        [key]: [...prev, comment]
      };
      await syncEngagement({ ...profile, commentsByKey });
      return comment;
    },
    [profile, syncEngagement]
  );

  const bootstrapClientAfterAuth = useCallback(
    async (authUser, { displayName } = {}) => {
      const remote = await ensureClientProfile(authUser, { displayName });
      if (remote?.kind === 'client') {
        persist(remote);
      }
      return remote;
    },
    [persist]
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
      bootstrapClientAfterAuth,
      isLiked,
      isSaved,
      getComments,
      toggleLike,
      toggleSave,
      addComment
    }),
    [
      profile,
      profileReady,
      enterDemoClient,
      setClientSession,
      clearClientSession,
      followSlug,
      unfollowSlug,
      bootstrapClientAfterAuth,
      isLiked,
      isSaved,
      getComments,
      toggleLike,
      toggleSave,
      addComment
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
