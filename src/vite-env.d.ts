/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_CONFIG?: string;
  readonly VITE_APP_ID?: string;
  readonly VITE_INITIAL_AUTH_TOKEN?: string;
  readonly VITE_FIREBASE_APPCHECK_SITE_KEY?: string;
  readonly VITE_FIREBASE_APPCHECK_DEBUG_TOKEN?: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_GOOGLE_OAUTH_CLIENT_ID?: string;
  readonly VITE_GOOGLE_OAUTH_ALLOWED_ORIGINS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
