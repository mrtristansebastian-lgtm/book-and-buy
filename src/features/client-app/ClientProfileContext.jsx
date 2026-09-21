import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  clearLocalClientProfile,
  emptyClientProfile,
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
  updateClientEngagement,
  updateClientProfileFields,
  updateClientSavedPlaceSlugs
} from './clientProfileApi';
import {
  canUseCanonicalSocial,
  socialMutations,
  subscribeClientSocialNotifications
} from '../social/socialApi';
import { DEMO_CLIENT_SOCIAL_NOTIFICATIONS } from '../social/demoSocialData';

const ClientProfileContext = createContext(null);

function withEngagement(profile) {
  if (!profile) return null;
  return { ...profile, ...normalizeEngagement(profile) };
}

export function ClientProfileProvider({ children }) {
  const { user, ready, configured, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [profileReady, setProfileReady] = useState(false);
  const [socialNotifications, setSocialNotifications] = useState([]);
  const [socialNotificationsReady, setSocialNotificationsReady] = useState(false);

  const persist = useCallback((next) => {
    const normalized = withEngagement(next);
    writeLocalClientProfile(normalized);
    setProfile(normalized);
    return normalized;
  }, []);

  /** Merge explore prefs against latest profile so rapid patches don't stomp each other. */
  const updateExplorePrefs = useCallback((patch = {}) => {
    let saved = null;
    setProfile((prev) => {
      const base = prev || emptyClientProfile({ isDemo: true });
      saved = withEngagement({ ...base, ...patch });
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
          if (cancelled) return;
          if (remote?.kind === 'client') {
            const cleaned = {
              ...remote,
              isDemo: false,
              followedSlugs: (remote.followedSlugs || []).filter(
                (slug) => slug !== 'flameandflour' && slug !== 'flour-and-flame'
              )
            };
            persist(cleaned);
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
      /* Firebase on, no signed-in user: keep local demo client so Demo doesn't bounce to auth */
      if (!cancelled) {
        const local = readLocalClientProfile();
        setProfile(local?.isDemo ? withEngagement(local) : null);
        setProfileReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, configured, user, persist]);

  useEffect(() => {
    if (!profile?.uid) {
      setSocialNotifications([]);
      setSocialNotificationsReady(true);
      return undefined;
    }
    if (profile.isDemo || String(profile.uid).startsWith('demo')) {
      setSocialNotifications(DEMO_CLIENT_SOCIAL_NOTIFICATIONS.map((item) => ({ ...item })));
      setSocialNotificationsReady(true);
      return undefined;
    }
    setSocialNotificationsReady(false);
    return subscribeClientSocialNotifications(
      profile.uid,
      (items) => {
        setSocialNotifications(items);
        setSocialNotificationsReady(true);
      },
      () => setSocialNotificationsReady(true)
    );
  }, [profile?.uid, profile?.isDemo]);

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
      if (canUseCanonicalSocial(profile.uid)) {
        socialMutations.followBusiness({ slug, following: true }).catch(() => {});
      }
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
        socialMutations.followBusiness({ slug, following: false }).catch(() => {});
      }
      return persist({ ...profile, followedSlugs: nextSlugs });
    },
    [profile, persist]
  );

  const isPlaceSaved = useCallback(
    (slug) => (profile?.savedPlaceSlugs || []).includes(String(slug || '').trim()),
    [profile]
  );

  const togglePlaceSave = useCallback(
    async (slug) => {
      if (!profile || !slug) return profile;
      const key = String(slug).trim();
      const saved = new Set(profile.savedPlaceSlugs || []);
      if (saved.has(key)) saved.delete(key);
      else saved.add(key);
      const next = persist({ ...profile, savedPlaceSlugs: [...saved] });
      try {
        await updateClientSavedPlaceSlugs(profile.uid, next.savedPlaceSlugs);
      } catch {
        /* keep the local saved state */
      }
      return next;
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
            reactionsByKey: normalized.reactionsByKey,
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

  const getReaction = useCallback(
    (slug, postId) => {
      const key = socialPostKey(slug, postId);
      return profile?.reactionsByKey?.[key] || null;
    },
    [profile]
  );

  const isLiked = useCallback(
    (slug, postId) => Boolean(getReaction(slug, postId)),
    [getReaction]
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

  const setReaction = useCallback(
    async (slug, postId, reactionId) => {
      if (!profile || !postId) return profile;
      const key = socialPostKey(slug, postId);
      const prev = { ...(profile.reactionsByKey || {}) };
      const nextId = reactionId ? String(reactionId) : null;
      if (!nextId || prev[key] === nextId) {
        delete prev[key];
      } else {
        prev[key] = nextId;
      }
      const saved = await syncEngagement({
        ...profile,
        reactionsByKey: prev,
        likedKeys: Object.keys(prev)
      });
      if (canUseCanonicalSocial(profile.uid)) {
        socialMutations.togglePostLike({ slug, postId, active: Boolean(nextId) }).catch(() => {});
      }
      return saved;
    },
    [profile, syncEngagement]
  );

  const toggleLike = useCallback(
    async (slug, postId) => {
      const current = getReaction(slug, postId);
      if (current) return setReaction(slug, postId, null);
      return setReaction(slug, postId, 'like');
    },
    [getReaction, setReaction]
  );

  const toggleSave = useCallback(
    async (slug, postId) => {
      if (!profile || !postId) return profile;
      const key = socialPostKey(slug, postId);
      const saved = new Set(profile.savedKeys || []);
      if (saved.has(key)) saved.delete(key);
      else saved.add(key);
      const next = await syncEngagement({ ...profile, savedKeys: [...saved] });
      if (canUseCanonicalSocial(profile.uid)) {
        socialMutations.toggleSave({ slug, postId, active: saved.has(key) }).catch(() => {});
      }
      return next;
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
      if (canUseCanonicalSocial(profile.uid)) {
        try {
          const result = await socialMutations.createComment({ slug, postId, body: text });
          return result?.comment || comment;
        } catch {
          /* legacy copy remains available during migration */
        }
      }
      return comment;
    },
    [profile, syncEngagement]
  );

  const bootstrapClientAfterAuth = useCallback(
    async (authUser, { displayName } = {}) => {
      const remote = await ensureClientProfile(authUser, { displayName });
      if (remote?.kind === 'client') {
        persist({
          ...remote,
          isDemo: false,
          followedSlugs: (remote.followedSlugs || []).filter(
            (slug) => slug !== 'flameandflour' && slug !== 'flour-and-flame'
          )
        });
      }
      return remote;
    },
    [persist]
  );

  const updateClientProfile = useCallback(
    async (patch = {}) => {
      if (!profile) return null;
      const next = {
        ...profile,
        ...patch,
        email:
          patch.email != null
            ? String(patch.email).trim().toLowerCase()
            : profile.email,
        displayName:
          patch.displayName != null ? String(patch.displayName) : profile.displayName,
        photoURL: patch.photoURL != null ? String(patch.photoURL).trim() : profile.photoURL
      };
      const saved = persist(next);
      if (isFirebaseConfigured() && next.uid && !String(next.uid).startsWith('demo')) {
        try {
          await updateClientProfileFields(next.uid, {
            displayName: saved.displayName,
            email: saved.email,
            photoURL: saved.photoURL
          });
        } catch {
          /* keep local */
        }
      }
      return saved;
    },
    [profile, persist]
  );

  const markSocialNotificationsRead = useCallback(
    async (ids = [], { all = false } = {}) => {
      const targets = new Set(ids);
      const readAtMs = Date.now();
      setSocialNotifications((prev) =>
        prev.map((item) =>
          all || targets.has(item.id) ? { ...item, readAtMs: item.readAtMs || readAtMs } : item
        )
      );
      if (canUseCanonicalSocial(profile?.uid)) {
        try {
          await socialMutations.markNotificationsRead({ ids, all, audience: 'client' });
        } catch {
          /* optimistic read state is retained locally */
        }
      }
    },
    [profile?.uid]
  );

  const unreadSocialNotifications = useMemo(
    () => socialNotifications.filter((item) => !item.readAtMs).length,
    [socialNotifications]
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
      isPlaceSaved,
      togglePlaceSave,
      bootstrapClientAfterAuth,
      updateClientProfile,
      updateExplorePrefs,
      isLiked,
      getReaction,
      isSaved,
      getComments,
      toggleLike,
      setReaction,
      toggleSave,
      addComment,
      socialNotifications,
      socialNotificationsReady,
      unreadSocialNotifications,
      markSocialNotificationsRead
    }),
    [
      profile,
      profileReady,
      enterDemoClient,
      setClientSession,
      clearClientSession,
      followSlug,
      unfollowSlug,
      isPlaceSaved,
      togglePlaceSave,
      bootstrapClientAfterAuth,
      updateClientProfile,
      updateExplorePrefs,
      isLiked,
      getReaction,
      isSaved,
      getComments,
      toggleLike,
      setReaction,
      toggleSave,
      addComment,
      socialNotifications,
      socialNotificationsReady,
      unreadSocialNotifications,
      markSocialNotificationsRead
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
