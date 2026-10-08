import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  getRedirectResult,
  onIdTokenChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { getFirebase, isFirebaseConfigured } from '../../shared/firebase/client';
import { saveGoogleRedirectIntent, readGoogleRedirectIntent, clearGoogleRedirectIntent } from './googleRedirectIntent';

const AuthContext = createContext(null);
const redirectChecks = new WeakMap();
const currentRedirectIntent = () => { try { return readGoogleRedirectIntent(window.sessionStorage); } catch { return null; } };

const FRIENDLY_AUTH_ERRORS = {
  'auth/popup-closed-by-user': 'Google sign-in was closed before finishing.',
  'auth/cancelled-popup-request': 'Google sign-in was cancelled.',
  'auth/popup-blocked': 'Pop-up blocked. Trying redirect sign-in…',
  'auth/account-exists-with-different-credential':
    'An account already exists with this email using a different sign-in method.',
  'auth/email-already-in-use': 'That email already has an account. Sign in instead.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/wrong-password': 'Wrong email or password.',
  'auth/user-not-found': 'No account found for that email.',
  'auth/weak-password': 'Use a password with at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled in Firebase Console.',
  'auth/unauthorized-domain': 'Google sign-in is not enabled for this app address yet.',
  'auth/web-storage-unsupported': 'This browser cannot save the sign-in session. Allow site storage and try again.'
};

export function mapAuthError(error) {
  const code = String(error?.code || '');
  if (code && FRIENDLY_AUTH_ERRORS[code]) return FRIENDLY_AUTH_ERRORS[code];
  const message = String(error?.message || '').trim();
  if (message && !message.startsWith('Firebase:')) return message;
  return 'Sign-in failed. Try again.';
}

function shouldFallbackToRedirect(error) {
  const code = String(error?.code || '');
  return code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment';
}

async function signInWithGoogleFlow(auth, intent) {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const cred = await signInWithPopup(auth, provider);
    return cred.user;
  } catch (error) {
    if (!shouldFallbackToRedirect(error)) throw error;
    try { saveGoogleRedirectIntent(window.sessionStorage, intent); } catch { throw new Error('Allow site storage to continue with Google in this browser.'); }
    try { await signInWithRedirect(auth, provider); } catch (redirectError) { clearGoogleRedirectIntent(window.sessionStorage); throw redirectError; }
    return null;
  }
}

export function AuthProvider({ children }) {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState(null);
  const [claims, setClaims] = useState({});
  const [ready, setReady] = useState(!configured);
  const [authError, setAuthError] = useState('');
  const [redirectResult, setRedirectResult] = useState(null);
  const [redirectIntent] = useState(currentRedirectIntent);

  useEffect(() => {
    const firebase = getFirebase();
    if (!firebase) {
      setReady(true);
      return undefined;
    }

    let cancelled = false, version = 0;
    if (!redirectChecks.has(firebase.auth)) redirectChecks.set(firebase.auth, getRedirectResult(firebase.auth).then(result => ({ result }), error => ({ error })));
    const checkedRedirect = redirectChecks.get(firebase.auth).then(({ result, error }) => {
      if (cancelled) return;
      if (error) setAuthError(mapAuthError(error));
      if (result?.user) setRedirectResult(result.user);
      try { clearGoogleRedirectIntent(window.sessionStorage); } catch { /* no credentials stored */ }
    });

    const unsubscribe = onIdTokenChanged(firebase.auth, async (next) => {
      const ticket = ++version;
      await checkedRedirect;
      if (cancelled) return;
      if (ticket !== version) return;
      setUser(next); setClaims({});
      if (next) {
        try {
          const token = await next.getIdTokenResult();
          if (!cancelled && ticket === version) setClaims(token.claims || {});
        } catch {
          if (!cancelled && ticket === version) setClaims({});
        }
      } else {
        setClaims({});
      }
      if (!cancelled && ticket === version) setReady(true);
    });
    return () => { cancelled = true; version++; unsubscribe(); };
  }, []);

  const api = useMemo(
    () => ({
      ready,
      configured,
      user,
      claims,
      authError,
      redirectResult,
      redirectIntent,
      clearRedirectResult: () => { setRedirectResult(null); setAuthError(''); },
      isPlatformAdmin: claims.platformAdmin === true || claims.role === 'platform_admin',
      /** Local/demo mode when Firebase env is absent. */
      isLocalMode: !configured,
      signInEmail: async (email, password) => {
        const firebase = getFirebase();
        if (!firebase) throw new Error('Firebase Auth is not configured.');
        try {
          const cred = await signInWithEmailAndPassword(firebase.auth, email, password);
          return cred.user;
        } catch (error) {
          throw new Error(mapAuthError(error));
        }
      },
      signUpEmail: async (email, password, { displayName } = {}) => {
        const firebase = getFirebase();
        if (!firebase) throw new Error('Firebase Auth is not configured.');
        try {
          const cred = await createUserWithEmailAndPassword(firebase.auth, email, password);
          const name = String(displayName || '').trim();
          if (name) {
            try {
              await updateProfile(cred.user, { displayName: name });
            } catch {
              /* non-fatal */
            }
          }
          try {
            await sendEmailVerification(cred.user);
          } catch {
            /* non-fatal — rules still require verify for password writes */
          }
          return cred.user;
        } catch (error) {
          throw new Error(mapAuthError(error));
        }
      },
      signInGoogle: async (intent = {}) => {
        const firebase = getFirebase();
        if (!firebase) throw new Error('Firebase Auth is not configured.');
        try {
          setAuthError('');
          return await signInWithGoogleFlow(firebase.auth, intent);
        } catch (error) {
          throw new Error(mapAuthError(error));
        }
      },
      signOut: async () => {
        const firebase = getFirebase();
        if (!firebase) return;
        await signOut(firebase.auth);
      },
      mapAuthError
    }),
    [ready, configured, user, claims, authError, redirectResult, redirectIntent]
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
