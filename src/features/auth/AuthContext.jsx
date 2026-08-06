import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { getFirebase, isFirebaseConfigured } from '../../shared/firebase/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!configured);

  useEffect(() => {
    const firebase = getFirebase();
    if (!firebase) {
      setReady(true);
      return undefined;
    }
    return onAuthStateChanged(firebase.auth, (next) => {
      setUser(next);
      setReady(true);
    });
  }, []);

  const api = useMemo(
    () => ({
      ready,
      configured,
      user,
      /** Local/demo mode when Firebase env is absent. */
      isLocalMode: !configured,
      signInEmail: async (email, password) => {
        const firebase = getFirebase();
        if (!firebase) throw new Error('Firebase Auth is not configured.');
        const cred = await signInWithEmailAndPassword(firebase.auth, email, password);
        return cred.user;
      },
      signUpEmail: async (email, password) => {
        const firebase = getFirebase();
        if (!firebase) throw new Error('Firebase Auth is not configured.');
        const cred = await createUserWithEmailAndPassword(firebase.auth, email, password);
        return cred.user;
      },
      signInGoogle: async () => {
        const firebase = getFirebase();
        if (!firebase) throw new Error('Firebase Auth is not configured.');
        const cred = await signInWithPopup(firebase.auth, new GoogleAuthProvider());
        return cred.user;
      },
      signOut: async () => {
        const firebase = getFirebase();
        if (!firebase) return;
        await signOut(firebase.auth);
      }
    }),
    [ready, configured, user]
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
