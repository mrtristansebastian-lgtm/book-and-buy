import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');
const failures = [];

const requireFile = (relativePath) => {
  const filePath = join(root, relativePath);
  if (!existsSync(filePath)) failures.push(`Missing ${relativePath}`);
  return filePath;
};

const readRequired = (relativePath) => {
  const filePath = requireFile(relativePath);
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
};

const indexHtml = readRequired('dist/index.html');
const robots = readRequired('dist/robots.txt');
const appEntry = readRequired('src/main.jsx');
readRequired('dist/manifest.webmanifest');

if (!/<meta\s+name="description"\s+content="[^"]{60,}"/i.test(indexHtml)) {
  failures.push('dist/index.html needs a meaningful meta description.');
}

if (!/<main\b/i.test(appEntry) && !/id="app-shell"/i.test(appEntry)) {
  failures.push('The app shell should expose a main landmark.');
}

if (!/User-agent:\s*\*/i.test(robots) || !/Allow:\s*\//i.test(robots)) {
  failures.push('dist/robots.txt is not a valid crawl policy.');
}

if (/rel="modulepreload"[^>]+owner-workspace-runtime/i.test(indexHtml)) {
  failures.push('Owner workspace runtime should not be preloaded from the root HTML; it must stay route-loaded.');
}

const assetsDir = join(distDir, 'assets');
const assets = existsSync(assetsDir) ? readdirSync(assetsDir) : [];
const jsAssets = assets
  .filter((name) => name.endsWith('.js'))
  .map((name) => ({ name, size: statSync(join(assetsDir, name)).size }))
  .sort((a, b) => b.size - a.size);
const cssAssets = assets
  .filter((name) => name.endsWith('.css'))
  .map((name) => ({ name, size: statSync(join(assetsDir, name)).size }))
  .sort((a, b) => b.size - a.size);

const largestJs = jsAssets[0];
const totalJs = jsAssets.reduce((total, asset) => total + asset.size, 0);
const largestCss = cssAssets[0];
const totalCss = cssAssets.reduce((total, asset) => total + asset.size, 0);
const largestBudget = 900 * 1024;
const totalBudget = 1300 * 1024;
const largestCssBudget = 650 * 1024;
const totalCssBudget = 900 * 1024;
const bookingCoreBudget = 300 * 1024;
const bookingCore = jsAssets.find((asset) => asset.name.startsWith('booking-core-') || asset.name.startsWith('booking-page-'));
const publicBookingRuntime = jsAssets.find((asset) => asset.name.startsWith('public-booking-runtime-'));

if (!jsAssets.length) failures.push('No production JavaScript assets were generated.');
if (largestJs && largestJs.size > largestBudget) {
  failures.push(`Largest JS chunk is ${(largestJs.size / 1024).toFixed(1)} KB. Budget is 900 KB.`);
}
if (totalJs > totalBudget) {
  failures.push(`Total JS is ${(totalJs / 1024).toFixed(1)} KB. Budget is 1300 KB.`);
}
if (largestCss && largestCss.size > largestCssBudget) {
  failures.push(`Largest CSS asset is ${(largestCss.size / 1024).toFixed(1)} KB. Budget is 650 KB.`);
}
if (totalCss > totalCssBudget) {
  failures.push(`Total CSS is ${(totalCss / 1024).toFixed(1)} KB. Budget is 900 KB.`);
}
if (bookingCore && bookingCore.size > bookingCoreBudget) {
  failures.push(`Booking core JS is ${(bookingCore.size / 1024).toFixed(1)} KB. Budget is 300 KB.`);
}
if (bookingCore) {
  const bookingCoreText = readFileSync(join(assetsDir, bookingCore.name), 'utf8');
  if (/owner-workspace-runtime/i.test(bookingCoreText)) {
    failures.push('Booking core must not preload owner workspace runtime from the public booking funnel.');
  }
}
if (!publicBookingRuntime) {
  failures.push('Public booking runtime chunk was not generated.');
} else {
  const publicBookingRuntimeText = readFileSync(join(assetsDir, publicBookingRuntime.name), 'utf8');
  if (/owner-workspace-runtime/i.test(publicBookingRuntimeText)) {
    failures.push('Public booking runtime must not import owner workspace runtime.');
  }
}

console.log('Build A Booking health check');
console.log(`- JS chunks: ${jsAssets.length}`);
console.log(`- Largest JS: ${largestJs ? `${(largestJs.size / 1024).toFixed(1)} KB (${largestJs.name})` : 'n/a'}`);
console.log(`- Total JS: ${(totalJs / 1024).toFixed(1)} KB`);
console.log(`- CSS assets: ${cssAssets.length}`);
console.log(`- Largest CSS: ${largestCss ? `${(largestCss.size / 1024).toFixed(1)} KB (${largestCss.name})` : 'n/a'}`);
console.log(`- Total CSS: ${(totalCss / 1024).toFixed(1)} KB`);
console.log(`- Booking core JS: ${bookingCore ? `${(bookingCore.size / 1024).toFixed(1)} KB (${bookingCore.name})` : 'n/a'}`);
console.log(`- Public booking runtime: ${publicBookingRuntime ? `${(publicBookingRuntime.size / 1024).toFixed(1)} KB (${publicBookingRuntime.name})` : 'n/a'}`);
console.log('- SEO/PWA files: checked');

if (failures.length) {
  console.error('\nHealth check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Health check passed.');
