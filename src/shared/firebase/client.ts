import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';

export type FirebaseBundle = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  functions: Functions;
};

function parseConfig(): Record<string, string> | null {
  const raw = import.meta.env.VITE_FIREBASE_CONFIG;
  if (!raw || raw === '{}' || raw === 'undefined') return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed?.apiKey || !parsed?.projectId) return null;
    return parsed;
  } catch {
    return null;
  }
}

let bundle: FirebaseBundle | null | undefined;

/** Returns null when Firebase env is not configured (local/demo mode). */
export function getFirebase(): FirebaseBundle | null {
  if (bundle !== undefined) return bundle;
  const config = parseConfig();
  if (!config) {
    bundle = null;
    return null;
  }
  const app = getApps()[0] || initializeApp(config);
  bundle = {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    functions: getFunctions(app)
  };
  return bundle;
}

export function isFirebaseConfigured(): boolean {
  return getFirebase() !== null;
}
