import { Capacitor, registerPlugin } from '@capacitor/core';
import * as FirebaseSDK from '../../../services/firebase';
import { GOOGLE_CALENDAR_EVENTS_SCOPE } from '../../../services/googleCalendar';

const GOOGLE_IDENTITY_CLIENT_ID = (import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || '').trim();
const FirebaseAuthentication = registerPlugin('FirebaseAuthentication');

let googleIdentityPromise = null;

export const shouldUseRedirectGoogleAuth = () => {
  if (typeof window === 'undefined') return false;
  if (Capacitor?.isNativePlatform?.()) return true;
  return false;
};

export const hasGoogleIdentityClient = () => Boolean(GOOGLE_IDENTITY_CLIENT_ID);

const loadGoogleIdentityClient = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Google Identity can only load in the browser.'));
  }
  if (!GOOGLE_IDENTITY_CLIENT_ID) {
    return Promise.reject(new Error('Missing VITE_GOOGLE_OAUTH_CLIENT_ID.'));
  }
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google);
  if (googleIdentityPromise) return googleIdentityPromise;

  googleIdentityPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-bookify-google-identity="true"]');

    const handleReady = () => {
      if (window.google?.accounts?.oauth2) resolve(window.google);
      else reject(new Error('Google Identity did not initialize.'));
    };

    if (existingScript) {
      existingScript.addEventListener('load', handleReady, { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Google Identity script failed to load.')), { once: true });
      handleReady();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.bookifyGoogleIdentity = 'true';
    script.onload = handleReady;
    script.onerror = () => reject(new Error('Google Identity script failed to load.'));
    document.head.appendChild(script);
  });

  return googleIdentityPromise;
};

export const createGoogleProvider = (options = {}) => {
  const provider = new FirebaseSDK.GoogleAuthProvider();
  if (options.calendar) provider.addScope(GOOGLE_CALENDAR_EVENTS_SCOPE);
  provider.setCustomParameters({ prompt: options.calendar ? 'consent select_account' : 'select_account' });
  return provider;
};

export const getGoogleAccessTokenFromResult = (result) => {
  const credential = FirebaseSDK.GoogleAuthProvider.credentialFromResult?.(result);
  return credential?.accessToken || result?._tokenResponse?.oauthAccessToken || '';
};

export const signInWithGoogleIdentity = async (authInstance, options = {}) => {
  const google = await loadGoogleIdentityClient();
  const scopes = ['openid', 'email', 'profile'];
  if (options.calendar) scopes.push(GOOGLE_CALENDAR_EVENTS_SCOPE);

  const accessToken = await new Promise((resolve, reject) => {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_IDENTITY_CLIENT_ID,
      prompt: options.calendar ? 'consent select_account' : 'select_account',
      scope: scopes.join(' '),
      callback: (response = {}) => {
        if (response.error) {
          const error = new Error(response.error_description || response.error);
          error.code = `google/${response.error}`;
          reject(error);
          return;
        }
        if (!response.access_token) {
          const error = new Error('Google did not return an access token.');
          error.code = 'google/missing-access-token';
          reject(error);
          return;
        }
        resolve(response.access_token);
      }
    });
    tokenClient.requestAccessToken();
  });

  const credential = FirebaseSDK.GoogleAuthProvider.credential(null, accessToken);
  const firebaseResult = await FirebaseSDK.signInWithCredential(authInstance, credential);
  return { firebaseResult, accessToken };
};

export const signInWithNativeGoogle = async (authInstance, options = {}) => {
  const result = await FirebaseAuthentication.signInWithGoogle(options);
  const idToken = result?.credential?.idToken;
  const accessToken = result?.credential?.accessToken;
  if (!idToken && !accessToken) {
    throw new Error('Google did not return a usable sign-in token. Check the Android Firebase app setup.');
  }
  const credential = FirebaseSDK.GoogleAuthProvider.credential(idToken || null, accessToken || undefined);
  const firebaseResult = await FirebaseSDK.signInWithCredential(authInstance, credential);
  return { firebaseResult, accessToken };
};

export const signOutNativeGoogle = async () => {
  await FirebaseAuthentication.signOut().catch((error) => {
    console.warn('Native Firebase sign out skipped.', error);
  });
};
