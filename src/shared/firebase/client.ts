import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from 'firebase/app-check';

export type FirebaseBundle = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  functions: Functions;
  appCheck: AppCheck | null;
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
  const appCheckSiteKey = String(import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY || '').trim();
  let appCheck: AppCheck | null = null;
  if (appCheckSiteKey && typeof window !== 'undefined') {
    const debugToken = String(import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN || '').trim();
    if (debugToken) (window as Window & { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
    try {
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true
      });
    } catch {
      // React StrictMode can request the shared Firebase bundle twice in development.
    }
  }
  bundle = {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    functions: getFunctions(app),
    appCheck
  };
  return bundle;
}

export function isFirebaseConfigured(): boolean {
  return getFirebase() !== null;
}
