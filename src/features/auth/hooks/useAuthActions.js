import { useCallback } from 'react';
import * as FirebaseSDK from '../../../services/firebase';
import { appId, auth, db, functions, isFirebaseConfigured } from '../../../services/firebase';
import {
  clearGoogleAuthIntentUrl,
  clearAuthReturnState,
  googleCalendarRedirectStorageKey,
  guestModeStorageKey,
  rememberLoginStorageKey,
  safeLocalRemove,
  safeLocalSet,
  safeSessionRemove,
  safeSessionSet,
  saveAuthReturnState,
  writeGoogleAuthIntentUrl
} from '../../../utils/workspaceRoute';
import {
  createGoogleProvider,
  hasGoogleIdentityClient,
  shouldUseRedirectGoogleAuth,
  signInWithGoogleIdentity,
  signInWithNativeGoogle,
  signOutNativeGoogle
} from '../utils/authGoogle';
import { readableAuthError } from '../utils/authErrors';

const normalizeEmail = (email = '') => email.trim().toLowerCase();

export function useAuthActions({
  activeTab,
  applyWorkspaceRoute,
  accountDeleteText,
  authForm,
  authMode,
  authPersona,
  clearWorkspaceDirty,
  confirmLeavingUnsavedChanges,
  deleteStorageAsset,
  editorTab,
  getAuthReturnRouteForPersona,
  isGuestWorkspace,
  isNativeAppRuntime,
  keepLoggedIn,
  personalProfile,
  resetWorkspaceRuntimeState,
  setAccountDeleteOpen,
  setAccountDeleteText,
  setActiveWorkspaceOwnerId,
  setAuthBusy,
  setAuthError,
  setAuthMode,
  setAuthPanelOpen,
  setAuthPersona,
  setAuthRedirectPending,
  setAuthRefreshTick,
  setClientGuestMode,
  setGuestMode,
  setView,
  setWorkspaceAccess,
  showToast,
  user,
  view
}) {
  const applyAuthPersistence = useCallback(async (remember = keepLoggedIn) => {
    safeLocalSet(rememberLoginStorageKey, remember ? 'true' : 'false');
    if (!isFirebaseConfigured || !auth || !FirebaseSDK.setPersistence) return;
    const persistence = remember
      ? FirebaseSDK.browserLocalPersistence
      : FirebaseSDK.browserSessionPersistence;
    await FirebaseSDK.setPersistence(auth, persistence);
  }, [keepLoggedIn]);

  const startGoogleRedirect = useCallback(async (returnRoute = { view: 'dashboard' }, options = {}) => {
    const provider = createGoogleProvider({ calendar: Boolean(options.calendar) });
    await applyAuthPersistence(keepLoggedIn);
    setAuthRedirectPending(true);
    const savedReturnRoute = saveAuthReturnState(returnRoute);
    if (options.calendar) safeSessionSet(googleCalendarRedirectStorageKey, 'true');
    writeGoogleAuthIntentUrl(savedReturnRoute);
    try {
      await FirebaseSDK.signInWithRedirect(auth, provider);
    } catch (error) {
      setAuthRedirectPending(false);
      clearAuthReturnState();
      clearGoogleAuthIntentUrl();
      safeSessionRemove(googleCalendarRedirectStorageKey);
      throw error;
    }
  }, [applyAuthPersistence, keepLoggedIn, setAuthRedirectPending]);

  const openAuthPanel = useCallback((mode = 'signin', persona = 'owner') => {
    setAuthMode(mode);
    setAuthPersona(persona);
    setAuthError('');
    setAuthPanelOpen(true);
  }, [setAuthError, setAuthMode, setAuthPanelOpen, setAuthPersona]);

  const openOwnerAuth = useCallback((mode = 'signin') => {
    openAuthPanel(mode, 'owner');
  }, [openAuthPanel]);

  const openSignupOrDashboard = useCallback(() => {
    if (!isFirebaseConfigured || user) {
      setView('dashboard');
      return;
    }
    openAuthPanel('signup', 'owner');
  }, [openAuthPanel, setView, user]);

  const callEmailFunction = useCallback(async (name, payload = {}) => {
    if (!functions || !FirebaseSDK.httpsCallable) {
      return { ok: false, skipped: true, reason: 'Email provider is not connected in this build.' };
    }
    const callable = FirebaseSDK.httpsCallable(functions, name);
    const result = await callable(payload);
    return result.data || {};
  }, []);

  const requestVerificationEmail = useCallback(async ({ silent = false } = {}) => {
    if (!isFirebaseConfigured || !auth?.currentUser?.email) {
      if (!silent) setAuthError('Sign in before requesting a verification email.');
      return false;
    }
    try {
      const result = await callEmailFunction('sendAuthVerificationEmail', { appId });
      if (result?.alreadyVerified) {
        if (!silent) showToast('Email is already verified.');
        return true;
      }
      if (result?.skipped) {
        if (!silent) setAuthError(result.reason || 'Verification email could not be sent yet.');
        return false;
      }
      if (!silent) showToast('Verification email sent.');
      return Boolean(result?.ok);
    } catch (error) {
      console.error(error);
      if (!silent) setAuthError(readableAuthError(error, 'Verification email could not be sent yet.'));
      return false;
    }
  }, [callEmailFunction, setAuthError, showToast]);

  const resendVerificationEmail = useCallback(async () => {
    setAuthBusy(true);
    setAuthError('');
    try {
      await requestVerificationEmail();
    } finally {
      setAuthBusy(false);
    }
  }, [requestVerificationEmail, setAuthBusy, setAuthError]);

  const refreshEmailVerification = useCallback(async () => {
    if (!auth?.currentUser) return false;
    setAuthBusy(true);
    setAuthError('');
    try {
      await auth.currentUser.reload();
      await auth.currentUser.getIdToken(true);
      setAuthRefreshTick(value => value + 1);
      if (auth.currentUser.emailVerified) {
        showToast('Email verified.');
        return true;
      }
      setAuthError('Email is not verified yet. Check your inbox and try again.');
      return false;
    } catch (error) {
      console.error(error);
      setAuthError(readableAuthError(error, 'Could not refresh verification status.'));
      return false;
    } finally {
      setAuthBusy(false);
    }
  }, [setAuthBusy, setAuthError, setAuthRefreshTick, showToast]);

  const sendPasswordResetEmail = useCallback(async () => {
    const email = normalizeEmail(authForm.email);
    if (!email) {
      setAuthError('Enter your email address first.');
      return false;
    }
    setAuthBusy(true);
    setAuthError('');
    try {
      const result = await callEmailFunction('sendPasswordResetEmail', { appId, email });
      if (result?.skipped) {
        setAuthError(result.reason || 'Password reset email could not be sent yet.');
        return false;
      }
      showToast('If that email exists, a reset link is on the way.');
      return true;
    } catch (error) {
      console.error(error);
      setAuthError(readableAuthError(error, 'Password reset email could not be sent yet.'));
      return false;
    } finally {
      setAuthBusy(false);
    }
  }, [authForm.email, callEmailFunction, setAuthBusy, setAuthError, showToast]);

  const openGuestDashboard = useCallback(() => {
    setActiveWorkspaceOwnerId('');
    setWorkspaceAccess([]);
    safeLocalRemove('build-a-booking-active-workspace');
    resetWorkspaceRuntimeState();
    setGuestMode(true);
    setClientGuestMode(false);
    safeLocalSet(guestModeStorageKey, 'true');
    setAuthPanelOpen(false);
    setAuthError('');
    applyWorkspaceRoute({ view: 'dashboard', activeTab: view === 'dashboard' ? activeTab : 'overview', editorTab });
    showToast('Guest workspace opened.');
  }, [activeTab, applyWorkspaceRoute, editorTab, resetWorkspaceRuntimeState, setActiveWorkspaceOwnerId, setAuthError, setAuthPanelOpen, setClientGuestMode, setGuestMode, setWorkspaceAccess, showToast, view]);

  const openClientPortal = useCallback(() => {
    if (!isFirebaseConfigured || user) {
      setClientGuestMode(false);
      applyWorkspaceRoute({ view: 'client' });
      return;
    }
    openAuthPanel('signin', 'client');
  }, [applyWorkspaceRoute, openAuthPanel, setClientGuestMode, user]);

  const openClientGuestPortal = useCallback(() => {
    setClientGuestMode(true);
    setAuthPanelOpen(false);
    setAuthError('');
    applyWorkspaceRoute({ view: 'client' });
    showToast('Client preview opened.');
  }, [applyWorkspaceRoute, setAuthError, setAuthPanelOpen, setClientGuestMode, showToast]);

  const handleAuthSubmit = useCallback(async (event) => {
    event.preventDefault();
    if (!isFirebaseConfigured) {
      setView('dashboard');
      return;
    }
    setAuthError('');
    setAuthBusy(true);
    try {
      await applyAuthPersistence(keepLoggedIn);
      if (authMode === 'signup') {
        await FirebaseSDK.createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
        await requestVerificationEmail({ silent: true });
      } else {
        await FirebaseSDK.signInWithEmailAndPassword(auth, authForm.email, authForm.password);
      }
      setGuestMode(false);
      setClientGuestMode(false);
      safeLocalRemove(guestModeStorageKey);
      setAuthPanelOpen(false);
      applyWorkspaceRoute(getAuthReturnRouteForPersona(authPersona));
      showToast(authMode === 'signup' ? 'Account created. Verify your email to continue.' : 'Signed in');
    } catch (error) {
      console.error(error);
      setAuthError(readableAuthError(error, authMode === 'signup' ? 'Could not create account.' : 'Could not sign in.'));
    } finally {
      setAuthBusy(false);
    }
  }, [applyAuthPersistence, applyWorkspaceRoute, authForm.email, authForm.password, authMode, authPersona, getAuthReturnRouteForPersona, keepLoggedIn, requestVerificationEmail, setAuthBusy, setAuthError, setAuthPanelOpen, setClientGuestMode, setGuestMode, setView, showToast]);

  const handleGoogleAuth = useCallback(async () => {
    if (!isFirebaseConfigured) {
      setAuthError('Google sign-in is not connected in this build. Rebuild with the Firebase config and deploy again.');
      showToast('Google sign-in is not connected yet.');
      return;
    }
    setAuthError('');
    setAuthBusy(true);
    try {
      const returnRoute = getAuthReturnRouteForPersona(authPersona);
      if (isNativeAppRuntime) {
        await applyAuthPersistence(keepLoggedIn);
        await signInWithNativeGoogle(auth);
        setGuestMode(false);
        setClientGuestMode(false);
        safeLocalRemove(guestModeStorageKey);
        setAuthPanelOpen(false);
        applyWorkspaceRoute(returnRoute);
        showToast('Signed in with Google');
        return;
      }
      if (shouldUseRedirectGoogleAuth()) {
        await startGoogleRedirect(returnRoute);
        return;
      }
      if (hasGoogleIdentityClient()) {
        await applyAuthPersistence(keepLoggedIn);
        await signInWithGoogleIdentity(auth);
        setGuestMode(false);
        setClientGuestMode(false);
        safeLocalRemove(guestModeStorageKey);
        setAuthPanelOpen(false);
        applyWorkspaceRoute(returnRoute);
        showToast('Signed in with Google');
        return;
      }
      clearAuthReturnState();
      clearGoogleAuthIntentUrl();
      safeSessionRemove(googleCalendarRedirectStorageKey);
      setAuthRedirectPending(false);
      await applyAuthPersistence(keepLoggedIn);
      const provider = createGoogleProvider();
      await FirebaseSDK.signInWithPopup(auth, provider);
      setGuestMode(false);
      setClientGuestMode(false);
      safeLocalRemove(guestModeStorageKey);
      setAuthPanelOpen(false);
      applyWorkspaceRoute(returnRoute);
      showToast('Signed in with Google');
    } catch (error) {
      console.error(error);
      if (['auth/popup-blocked', 'auth/cancelled-popup-request', 'auth/web-storage-unsupported', 'auth/operation-not-supported-in-this-environment', 'auth/internal-error'].includes(error?.code)) {
        try {
          await startGoogleRedirect(getAuthReturnRouteForPersona(authPersona));
          return;
        } catch (redirectError) {
          console.error(redirectError);
          setAuthError(readableAuthError(redirectError, 'Could not start Google sign-in.'));
          return;
        }
      }
      const message = error?.code === 'auth/operation-not-allowed'
        ? 'Google sign-in is not enabled yet. Enable Google under Firebase Authentication > Sign-in method.'
        : error?.code === 'auth/unauthorized-domain'
          ? 'This domain is not allowed for Google sign-in. Add build-a-booking.web.app in Firebase Authentication authorized domains.'
          : error?.code === 'auth/invalid-api-key'
            ? 'This build has an invalid Firebase API key. Check the Firebase config and redeploy.'
            : error?.code === 'auth/popup-closed-by-user'
              ? 'Google sign-in was closed before it finished.'
              : readableAuthError(error, 'Could not sign in with Google.');
      setAuthError(message);
    } finally {
      setAuthBusy(false);
    }
  }, [applyAuthPersistence, applyWorkspaceRoute, authPersona, getAuthReturnRouteForPersona, isNativeAppRuntime, keepLoggedIn, setAuthBusy, setAuthError, setAuthPanelOpen, setAuthRedirectPending, setClientGuestMode, setGuestMode, showToast, startGoogleRedirect]);

  const handleSignOut = useCallback(async () => {
    if (!confirmLeavingUnsavedChanges()) return;
    setAuthBusy(true);
    try {
      if (isNativeAppRuntime) await signOutNativeGoogle();
      if (isFirebaseConfigured && user) await FirebaseSDK.signOut(auth);
      showToast(isGuestWorkspace ? 'Guest mode closed.' : 'Signed out.');
    } catch (error) {
      console.error(error);
      showToast('Sign out could not finish. Please try again.');
      return;
    } finally {
      setAuthBusy(false);
    }
    clearAuthReturnState();
    setAuthRedirectPending(false);
    setGuestMode(false);
    setClientGuestMode(false);
    safeLocalRemove(guestModeStorageKey);
    setWorkspaceAccess([]);
    setActiveWorkspaceOwnerId('');
    safeLocalRemove('build-a-booking-active-workspace');
    resetWorkspaceRuntimeState();
    clearWorkspaceDirty();
    applyWorkspaceRoute({ view: 'landing', activeTab: 'overview', editorTab: 'introduction' });
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      window.history.replaceState({}, '', `${url.pathname}${url.search}`);
    }
  }, [applyWorkspaceRoute, clearWorkspaceDirty, confirmLeavingUnsavedChanges, isGuestWorkspace, isNativeAppRuntime, resetWorkspaceRuntimeState, setActiveWorkspaceOwnerId, setAuthBusy, setAuthRedirectPending, setClientGuestMode, setGuestMode, setWorkspaceAccess, showToast, user]);

  const deleteAccount = useCallback(async (accountDeleteText) => {
    if (isGuestWorkspace) {
      setAccountDeleteOpen(false);
      setAccountDeleteText('');
      await handleSignOut();
      return;
    }
    if (!user?.uid || !isFirebaseConfigured) {
      showToast('Sign in before deleting an account.');
      return;
    }
    if (accountDeleteText.trim().toUpperCase() !== 'DELETE') {
      showToast('Type DELETE to confirm account deletion.');
      return;
    }
    setAuthBusy(true);
    try {
      const uid = user.uid;
      const emailKey = normalizeEmail(user.email || personalProfile.email || '');
      await Promise.allSettled([
        FirebaseSDK.deleteDoc(FirebaseSDK.doc(db, 'artifacts', appId, 'accounts', uid)),
        emailKey ? FirebaseSDK.deleteDoc(FirebaseSDK.doc(db, 'artifacts', appId, 'accountLookup', emailKey)) : Promise.resolve()
      ]);
      if (personalProfile.photoURL) await deleteStorageAsset(personalProfile.photoURL);
      await FirebaseSDK.deleteUser(auth.currentUser);
      setAccountDeleteOpen(false);
      setAccountDeleteText('');
      showToast('Account deleted.');
      clearAuthReturnState();
      setAuthRedirectPending(false);
      setGuestMode(false);
      setClientGuestMode(false);
      safeLocalRemove(guestModeStorageKey);
      setWorkspaceAccess([]);
      setActiveWorkspaceOwnerId('');
      clearWorkspaceDirty();
      applyWorkspaceRoute({ view: 'landing', activeTab: 'overview', editorTab: 'introduction' });
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        window.history.replaceState({}, '', `${url.pathname}${url.search}`);
      }
    } catch (error) {
      console.error(error);
      if (error?.code === 'auth/requires-recent-login') showToast('Please sign out and sign in again before deleting your account.');
      else showToast('Account deletion could not finish.');
    } finally {
      setAuthBusy(false);
    }
  }, [applyWorkspaceRoute, clearWorkspaceDirty, deleteStorageAsset, handleSignOut, isGuestWorkspace, personalProfile, setAccountDeleteOpen, setAccountDeleteText, setActiveWorkspaceOwnerId, setAuthBusy, setAuthRedirectPending, setClientGuestMode, setGuestMode, setWorkspaceAccess, showToast, user]);

  const handleDeleteAccount = useCallback(async () => {
    await deleteAccount(accountDeleteText);
  }, [accountDeleteText, deleteAccount]);

  return {
    applyAuthPersistence,
    handleAuthSubmit,
    handleGoogleAuth,
    handleDeleteAccount,
    handleSignOut,
    openAuthPanel,
    openClientGuestPortal,
    openClientPortal,
    openGuestDashboard,
    openOwnerAuth,
    openSignupOrDashboard,
    refreshEmailVerification,
    requestVerificationEmail,
    resendVerificationEmail,
    sendPasswordResetEmail,
    shouldUseRedirectGoogleAuth,
    signInWithNativeGoogle,
    startGoogleRedirect
  };
}
