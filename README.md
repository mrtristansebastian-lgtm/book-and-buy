# Build A Booking

Vite + React app for the Build A Booking builder and booking-page experience.

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run mobile:sync
npm run mobile:android
```

## Mobile App Prep

Capacitor is configured so the same React app can be wrapped for Android and iOS later.

- Android can be generated and tested on Windows with Android Studio.
- iOS is configured, but final iOS builds require macOS/Xcode.
- Store subscriptions should stay on the website; the mobile apps can focus on sign in and workspace management.

See `docs/mobile-app.md` for the free setup path and month-end publishing checklist.

## Firebase Setup

Copy `.env.example` to `.env.local` and replace `VITE_FIREBASE_CONFIG` with the Firebase web app config JSON string.

```bash
VITE_FIREBASE_CONFIG={"apiKey":"...","authDomain":"...","projectId":"..."}
VITE_APP_ID=build-a-booking-v2
```

The Firebase boundary lives in `src/services/firebase.js`, so production wiring can happen there without touching the UI components.

For Google sign-in, enable the Google provider in Firebase Authentication and add your local/production hostnames to Firebase Authentication -> Settings -> Authorized domains. Local Vite runs on `127.0.0.1` by default, so add `127.0.0.1` if Firebase rejects local sign-in.

`VITE_GOOGLE_OAUTH_CLIENT_ID` is optional and only needed for the direct Google Identity Services token flow. If you set it, add every browser origin that runs the app under that OAuth client's Authorized JavaScript origins in Google Cloud, such as `http://127.0.0.1:5173`, `http://localhost:5173`, and your production origin. Put the same exact origins in `VITE_GOOGLE_OAUTH_ALLOWED_ORIGINS` as a comma-separated list. Leave `VITE_GOOGLE_OAUTH_CLIENT_ID` blank to use Firebase's Google popup/redirect flow.

### Firebase Services To Enable

1. Authentication: enable Email/Password sign-in for business owners and Anonymous sign-in for public booking-page submissions.
2. Firestore Database: create in production mode, then publish `firestore.rules`.
3. Storage: enable Firebase Storage, then publish `storage.rules`.
4. Hosting: `firebase.json` is already configured for Vite's `dist` output and SPA rewrites.

### Deploy

```bash
npm run build
firebase deploy
```

### Public Booking Pages

After publishing from the Editor, the live booking page is available at:

```txt
/book/your-slug
```

Public submissions write to the owner booking queue and also create a locked public submission record for audit/debugging.

## Email Setup

Email delivery uses Resend from Firebase Functions. Browser code never stores or sends provider API keys.

Before deploying email features, configure these Firebase Functions secrets/env values:

```
RESEND_API_KEY
BUILD_A_BOOKING_EMAIL_FROM
BUILD_A_BOOKING_EMAIL_REPLY_TO
BUILD_A_BOOKING_APP_BASE_URL
```

Workspace owners manage booking email copy, email channels, in-app notification status, and reminders in Profile -> Notifications Studio.

## Structure

- `src/App.jsx` - main workspace state and page orchestration
- `src/components/` - extracted reusable app components
- `src/data/` - theme and font libraries
- `src/utils/` - dates and theme/color helpers
- `src/services/` - Firebase setup and exports
- `legacy/index.single-file.html` - preserved pre-migration single-file version
