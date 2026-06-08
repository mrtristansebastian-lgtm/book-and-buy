import { useCallback, useEffect } from 'react';
import * as FirebaseSDK from '../../../services/firebase';
import { appId, auth, db, initialAuthToken, isFirebaseConfigured } from '../../../services/firebase';
import {
  authRedirectStartedStorageKey,
  clearGoogleAuthIntentUrl,
  clearAuthReturnState,
  getAuthReturnState,
  getGoogleAuthIntent,
  getSavedWorkspaceRoute,
  getWorkspaceRouteFromUrl,
  googleCalendarRedirectStorageKey,
  guestModeStorageKey,
  hasFreshAuthRedirectStart,
  safeLocalGet,
  safeLocalRemove,
  safeLocalSet,
  safeSessionGet,
  safeSessionRemove,
  shouldStartInGuestWorkspace
} from '../../../utils/workspaceRoute';
import { getGoogleAccessTokenFromResult } from '../utils/authGoogle';

const normalizeEmail = (email = '') => email.trim().toLowerCase();

export function useAuthBoot({
  applyAuthPersistence,
  applyWorkspaceRoute,
  authRedirectPending,
  guestMode,
  keepLoggedIn,
  loading,
  publicSlug,
  resetGuestWorkspaceSeed,
  resetWorkspaceRuntimeState,
  setAccessLoading,
  setAccountProfileOverride,
  setActiveWorkspaceOwnerId,
  setAuthBusy,
  setAuthError,
  setAuthPanelOpen,
  setAuthRedirectPending,
  setClientGuestMode,
  setGoogleCalendarAuth,
  setGuestMode,
  setLoading,
  setPublicError,
  setPublicLoading,
  setUser,
  setView,
  setWorkspaceAccess,
  showToast,
  user,
  view
}) {
  const syncCurrentAccount = useCallback(async (signedInUser) => {
    if (!isFirebaseConfigured || !signedInUser?.email) return;
    const emailKey = normalizeEmail(signedInUser.email);
    const profile = {
      uid: signedInUser.uid,
      email: emailKey,
      displayName: signedInUser.displayName || emailKey.split('@')[0],
      photoURL: signedInUser.photoURL || '',
      providerIds: signedInUser.providerData?.map(provider => provider.providerId) || [],
      updatedAt: Date.now()
    };
    await Promise.all([
      FirebaseSDK.setDoc(FirebaseSDK.doc(db, 'artifacts', appId, 'accounts', signedInUser.uid), profile, { merge: true }),
      FirebaseSDK.setDoc(FirebaseSDK.doc(db, 'artifacts', appId, 'accountLookup', emailKey), profile, { merge: true })
    ]);
  }, []);

  const loadWorkspaceAccess = useCallback(async (signedInUser) => {
    if (!isFirebaseConfigured || !signedInUser?.email) {
      setWorkspaceAccess([]);
      setActiveWorkspaceOwnerId(signedInUser?.uid || '');
      return;
    }

    setAccessLoading(true);
    try {
      const emailKey = normalizeEmail(signedInUser.email);
      const grantsRef = FirebaseSDK.collection(db, 'artifacts', appId, 'staffAccess', emailKey, 'workspaces');
      const grantsSnap = await FirebaseSDK.getDocs(grantsRef);
      const grants = grantsSnap.docs
        .map(grantDoc => ({ id: grantDoc.id, ...grantDoc.data() }))
        .filter(grant => grant.status !== 'revoked');
      const savedOwnerId = safeLocalGet('build-a-booking-active-workspace');
      const hasSavedWorkspace = savedOwnerId && (savedOwnerId === signedInUser.uid || grants.some(grant => grant.ownerId === savedOwnerId));
      const nextOwnerId = hasSavedWorkspace ? savedOwnerId : (grants[0]?.ownerId || signedInUser.uid);
      setWorkspaceAccess(grants);
      setActiveWorkspaceOwnerId(nextOwnerId);
      safeLocalSet('build-a-booking-active-workspace', nextOwnerId);
    } catch (error) {
      console.error(error);
      setWorkspaceAccess([]);
      setActiveWorkspaceOwnerId(signedInUser.uid);
      setAuthError('Signed in, but staff workspace access could not be checked yet.');
    } finally {
      setAccessLoading(false);
    }
  }, [setAccessLoading, setActiveWorkspaceOwnerId, setAuthError, setWorkspaceAccess]);

  useEffect(() => {
    applyAuthPersistence(keepLoggedIn).catch((error) => {
      console.error('Auth persistence could not be updated.', error);
    });
  }, [applyAuthPersistence, keepLoggedIn]);

  useEffect(() => {
    let cancelled = false;
    if (!isFirebaseConfigured || !user?.uid) {
      setAccountProfileOverride({});
      return undefined;
    }
    FirebaseSDK.getDoc(FirebaseSDK.doc(db, 'artifacts', appId, 'accounts', user.uid))
      .then((docSnap) => {
        if (cancelled || !docSnap.exists()) return;
        const accountData = docSnap.data();
        const savedProfile = accountData.personalProfile || {};
        setAccountProfileOverride({
          firstName: savedProfile.firstName || accountData.firstName || '',
          lastName: savedProfile.lastName || accountData.lastName || '',
          email: savedProfile.email || accountData.email || user.email || '',
          mobile: savedProfile.mobile || accountData.mobile || accountData.phone || '',
          photoURL: savedProfile.photoURL || accountData.photoURL || user.photoURL || ''
        });
      })
      .catch(error => console.error('Account profile load failed', error));
    return () => {
      cancelled = true;
    };
  }, [setAccountProfileOverride, user?.uid, user?.email, user?.photoURL]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (isFirebaseConfigured) {
          await applyAuthPersistence(keepLoggedIn);
          const googleAuthIntent = getGoogleAuthIntent();
          const redirectWasStarted = hasFreshAuthRedirectStart();
          if (redirectWasStarted) setAuthRedirectPending(true);
          if (!publicSlug) {
            const redirectResult = await FirebaseSDK.getRedirectResult(auth).catch((error) => {
              console.error(error);
              clearAuthReturnState();
              clearGoogleAuthIntentUrl();
              safeSessionRemove(googleCalendarRedirectStorageKey);
              const message = error?.code === 'auth/unauthorized-domain'
                ? 'Google sign-in needs this domain allowed in Firebase Authentication.'
                : error?.code === 'auth/web-storage-unsupported'
                  ? 'Your browser blocked the secure Google return. Try again or turn off private browsing for this site.'
                  : error.message || 'Google sign-in could not finish.';
              setAuthError(message);
              setAuthRedirectPending(false);
              return null;
            });
            if (redirectResult?.user && safeSessionGet(googleCalendarRedirectStorageKey) === 'true') {
              const accessToken = getGoogleAccessTokenFromResult(redirectResult);
              if (accessToken) {
                setGoogleCalendarAuth({
                  accessToken,
                  email: redirectResult.user.email || '',
                  connectedAt: Date.now()
                });
              }
              safeSessionRemove(googleCalendarRedirectStorageKey);
            }
            const completedRedirectUser = redirectResult?.user || auth.currentUser;
            if (completedRedirectUser && redirectWasStarted) {
              setUser(completedRedirectUser);
              setGuestMode(false);
              setClientGuestMode(false);
              safeLocalRemove(guestModeStorageKey);
              setAuthPanelOpen(false);
              setAuthRedirectPending(false);
              const authReturnState = getAuthReturnState();
              if (authReturnState?.view === 'dashboard' || authReturnState?.view === 'client') {
                applyWorkspaceRoute(authReturnState);
                clearAuthReturnState();
              }
            }
            if (redirectWasStarted) {
              safeSessionRemove(authRedirectStartedStorageKey);
              safeLocalRemove(authRedirectStartedStorageKey);
              clearGoogleAuthIntentUrl();
              if (!auth.currentUser && !redirectResult?.user) {
                clearAuthReturnState();
                setAuthRedirectPending(false);
              }
            } else if (googleAuthIntent && !auth.currentUser) {
              clearGoogleAuthIntentUrl();
              setAuthRedirectPending(false);
            } else if (googleAuthIntent && auth.currentUser) {
              clearGoogleAuthIntentUrl();
            }
          }
          if (!publicSlug && initialAuthToken) await FirebaseSDK.signInWithCustomToken(auth, initialAuthToken);
        } else {
          setLoading(false);
        }
      } catch (err) {
        const message = err?.code === 'auth/configuration-not-found'
          ? 'Firebase Auth is not enabled yet. Enable Email/Password and Anonymous sign-in in Firebase Authentication.'
          : 'Firebase sign-in could not start. Check your Firebase Auth setup and try again.';
        setAuthError(message);
        if (publicSlug) setPublicError(message);
        setLoading(false);
        setPublicLoading(false);
      }
    };
    initAuth();
    if (isFirebaseConfigured) {
      return FirebaseSDK.onAuthStateChanged(auth, (signedInUser) => {
        setUser(signedInUser);
        setLoading(false);
        setAuthBusy(false);
        if (!signedInUser) {
          setWorkspaceAccess([]);
          setActiveWorkspaceOwnerId('');
          safeLocalRemove('build-a-booking-active-workspace');
          const signedOutRoute = getWorkspaceRouteFromUrl() || getSavedWorkspaceRoute();
          if (shouldStartInGuestWorkspace(signedOutRoute)) resetGuestWorkspaceSeed();
          else resetWorkspaceRuntimeState();
          const redirectStillStarting = hasFreshAuthRedirectStart();
          setAuthRedirectPending(redirectStillStarting);
          return;
        }
        setAuthRedirectPending(false);
        setGuestMode(false);
        setClientGuestMode(false);
        safeLocalRemove(guestModeStorageKey);
        const authReturnState = getAuthReturnState();
        if (authReturnState?.view === 'dashboard' || authReturnState?.view === 'client') {
          applyWorkspaceRoute(authReturnState);
          clearAuthReturnState();
          setAuthPanelOpen(false);
          showToast('Signed in with Google');
        }
        if (!publicSlug) {
          syncCurrentAccount(signedInUser).catch(console.error);
          loadWorkspaceAccess(signedInUser);
        }
      });
    }
    return undefined;
  }, [publicSlug]);

  useEffect(() => {
    if (isFirebaseConfigured && !publicSlug && !loading && view === 'dashboard' && !user && !guestMode && !authRedirectPending) {
      setView('landing');
    }
  }, [authRedirectPending, guestMode, loading, publicSlug, setView, user, view]);
}
