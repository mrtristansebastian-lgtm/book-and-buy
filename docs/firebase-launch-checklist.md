# Firebase Auth + Storage launch checklist (project: build-a-booking-ai)

Use this after the app code is wired. Without these Console steps the app stays in local/demo mode.

## 1. Web app config

1. Open [Firebase Console](https://console.firebase.google.com/project/build-a-booking-ai/settings/general).
2. Under **Your apps**, open the Web app (or add one).
3. Copy the `firebaseConfig` object.
4. Create `.env.local` in the repo root (never commit it):

```bash
VITE_FIREBASE_CONFIG={"apiKey":"...","authDomain":"build-a-booking-ai.firebaseapp.com","projectId":"build-a-booking-ai","storageBucket":"build-a-booking-ai.appspot.com","messagingSenderId":"...","appId":"..."}
VITE_APP_ID=book-and-buy-v1
```

`storageBucket` must be present. Restart Vite after saving.

## 2. Authentication

1. **Authentication → Sign-in method**: enable **Email/Password** and **Google**.
2. **Authentication → Settings → Authorized domains**: include
   - `localhost`
   - `127.0.0.1`
   - `build-a-booking-ai.web.app`
   - `build-a-booking-ai.firebaseapp.com`
   - any custom domain
3. Complete the **Google Cloud OAuth consent screen** (support email + app name). If the OAuth app is in Testing, add your Google account as a test user.

## 3. Storage

1. Open [Firebase Storage](https://console.firebase.google.com/project/build-a-booking-ai/storage) and click **Get Started** (pick production mode / default bucket) if Storage is not enabled yet.
2. Deploy rules (from repo root, with Firebase CLI signed in):

```bash
firebase deploy --only firestore:rules,storage
```

If Storage was just enabled, the first `storage` deploy may need a minute after Get Started.

Rules allow public read for brand/venue/services/website/products/social/account-avatars; image uploads on those folders; video on `social` only; chat attachments under thread paths.

## 4. Smoke test

1. `npm run dev` with `.env.local` loaded — welcome screen should **not** show “local mode”.
2. **Continue with Google** (individual + business paths).
3. Email signup: verification email sent; password accounts need verified email for Storage/Firestore writes (Google accounts are fine immediately).
4. Upload a service/product image and a social video while signed in as a business owner.
5. Client Account → upload profile photo.

## 5. Hosting

```bash
npx vite build
firebase deploy --only hosting
```

Live: https://build-a-booking-ai.web.app
