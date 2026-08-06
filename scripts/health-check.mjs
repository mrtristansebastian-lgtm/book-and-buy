import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'package.json',
  'index.html',
  'src/main.jsx',
  'src/App.jsx',
  'src/design/native-accent-system.css',
  'src/config/eBusinessPlatform.js',
  'src/features/dashboard/OwnerWorkspaceApp.jsx',
  'src/features/website/PublicWebsiteApp.jsx',
  'src/features/onboarding/BusinessOnboardingPage.jsx',
  'functions/index.js',
  'firestore.rules'
];

const missing = required.filter((file) => !existsSync(path.join(root, file)));
if (missing.length) {
  console.error('health-check failed — missing files:');
  for (const file of missing) console.error(`  - ${file}`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
if (pkg.name !== 'book-and-buy') {
  console.error(`health-check failed — expected package name book-and-buy, got ${pkg.name}`);
  process.exit(1);
}

console.log('health-check ok');
console.log(`  package: ${pkg.name}@${pkg.version}`);
console.log(`  files: ${required.length}`);
