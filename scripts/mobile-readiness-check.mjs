import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const requireIos = args.has('--require-ios') || process.env.BAB_REQUIRE_IOS === 'true';
const failures = [];
const warnings = [];

const read = (relativePath) => {
  const filePath = path.join(root, relativePath);
  if (!existsSync(filePath)) {
    failures.push(`Missing ${relativePath}`);
    return '';
  }
  return readFileSync(filePath, 'utf8');
};

const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const warn = (condition, message) => {
  if (!condition) warnings.push(message);
};

const capacitor = JSON.parse(read('capacitor.config.json') || '{}');
const manifest = read('android/app/src/main/AndroidManifest.xml');
const mainActivity = read('android/app/src/main/java/com/buildabooking/app/MainActivity.java');
const androidBuild = read('android/app/build.gradle');
const packageJson = JSON.parse(read('package.json') || '{}');

expect(capacitor.appId === 'com.buildabooking.app', 'Capacitor appId must stay com.buildabooking.app.');
expect(capacitor.appName === 'Build A Booking', 'Capacitor appName must stay Build A Booking.');
expect(capacitor.webDir === 'dist', 'Capacitor webDir must point at dist.');
expect(capacitor.server?.androidScheme === 'https', 'Android scheme should stay https.');
expect((capacitor.server?.allowNavigation || []).includes('build-a-booking.web.app'), 'Hosted Firebase domain must be allow-listed for native redirects.');
expect((capacitor.plugins?.FirebaseAuthentication?.providers || []).includes('google.com'), 'Native Google auth provider must be configured.');
expect(manifest.includes('android.permission.INTERNET'), 'Android app must request INTERNET permission.');
expect(manifest.includes('android:exported="true"'), 'Main Android activity must declare exported=true for launcher intent.');
expect(mainActivity.includes('package com.buildabooking.app;'), 'MainActivity package must match Capacitor appId.');
expect(androidBuild.includes('com.android.application'), 'Android app Gradle module must be present.');
expect(Boolean(packageJson.scripts?.['mobile:sync']), 'package.json must expose mobile:sync.');
expect(Boolean(packageJson.scripts?.['mobile:android']), 'package.json must expose mobile:android.');

if (requireIos) {
  expect(existsSync(path.join(root, 'ios')), 'iOS project is required for web + mobile 10/10 launch readiness.');
} else {
  warn(existsSync(path.join(root, 'ios')), 'iOS project is not present; run with --require-ios for the final mobile launch gate.');
}

warnings.forEach((message) => console.warn(`warn - ${message}`));

if (failures.length) {
  console.error('Mobile readiness check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Mobile readiness guard passed.');
