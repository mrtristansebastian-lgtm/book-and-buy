# Build A Booking Mobile App Prep

This repo is now ready for the free part of the mobile app path.

## What Is Ready Now

- Capacitor is installed for native Android/iOS wrappers.
- Android can be generated and opened locally.
- iOS is configured, but final iOS generation/signing needs macOS and an Apple Developer account later.
- The web app manifest is tuned for homescreen installs and app shortcuts.
- Branded Android icon and splash assets are generated from `assets/logo.png` and `assets/logo-dark.png`.

## Free Commands

Build the web app and sync it into native projects:

```bash
npm run mobile:sync
```

Regenerate Android app icon and splash assets after changing the logo:

```bash
npm run mobile:assets
```

Open Android Studio after Android is added:

```bash
npm run mobile:android
```

## Android Setup

The Android project can be generated on Windows:

```bash
npx cap add android
npm run mobile:sync
```

Android Studio is free. It is only needed when you want to run the app on an emulator/device or create a signed build.

To build locally, install Android Studio with the bundled JDK, then make sure `JAVA_HOME` points to that JDK. Without Java configured, Gradle will not be able to create an APK.

Debug APK command after Java/Android Studio are ready:

```bash
cd android
./gradlew assembleDebug
```

## iOS Setup Later

iOS requires a Mac with Xcode:

```bash
npx cap add ios
npm run mobile:sync
npx cap open ios
```

Apple Developer Program payment is only needed when you are ready to publish or do TestFlight properly.

## Store Payment Strategy

Keep subscriptions and plan upgrades on the website. The mobile app should focus on sign in, dashboard, bookings, schedule, clients, communication, and editor access. This avoids building in-app purchases before the business is ready.

## Month-End Checklist

1. Create Google Play Console account.
2. Create Apple Developer account.
3. Add Android SHA fingerprints to Firebase Auth.
4. Add iOS bundle ID to Firebase.
5. Prepare privacy policy and support email.
6. Capture app screenshots.
7. Build signed Android release.
8. Build iOS release from a Mac or cloud Mac service.
