import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = join(root, 'dist', 'assets');
const reportDir = join(root, 'dist');
const failures = [];

if (!existsSync(assetsDir)) {
  console.error('No dist/assets directory found. Run npm run build first.');
  process.exit(1);
}

const assetRows = readdirSync(assetsDir)
  .filter((name) => /\.(js|css)$/.test(name))
  .map((name) => {
    const filePath = join(assetsDir, name);
    const bytes = statSync(filePath).size;
    const gzipBytes = gzipSync(readFileSync(filePath)).length;
    return {
      name,
      type: name.endsWith('.css') ? 'css' : 'js',
      bytes,
      gzipBytes
    };
  })
  .sort((a, b) => b.bytes - a.bytes);

const topSourcesByChunk = readdirSync(assetsDir)
  .filter((name) => name.endsWith('.js.map'))
  .map((name) => {
    const map = JSON.parse(readFileSync(join(assetsDir, name), 'utf8'));
    const sources = (map.sources || [])
      .map((source, index) => ({
        source: source.replace(/^\.\.\//, ''),
        chars: (map.sourcesContent?.[index] || '').length
      }))
      .filter((source) => source.chars > 0)
      .sort((a, b) => b.chars - a.chars)
      .slice(0, 25);
    return { chunk: name.replace(/\.map$/, ''), sources };
  });

const publicBookingInitialJsBudget = 300 * 1024;
const bookingCore = assetRows.find((asset) => asset.type === 'js' && asset.name.startsWith('booking-core-'));
if (bookingCore && bookingCore.bytes > publicBookingInitialJsBudget) {
  failures.push(`booking-core is ${(bookingCore.bytes / 1024).toFixed(1)} KB. Launch budget is 300 KB.`);
}

const report = {
  generatedAt: new Date().toISOString(),
  budgets: {
    bookingCoreMaxKb: publicBookingInitialJsBudget / 1024
  },
  assets: assetRows,
  topSourcesByChunk
};

writeFileSync(join(reportDir, 'bundle-report.json'), `${JSON.stringify(report, null, 2)}\n`);

console.log('Build A Booking bundle report');
for (const asset of assetRows.slice(0, 18)) {
  console.log(`- ${asset.name}: ${(asset.bytes / 1024).toFixed(1)} KB / gzip ${(asset.gzipBytes / 1024).toFixed(1)} KB`);
}
if (topSourcesByChunk.length) {
  const bookingChunks = topSourcesByChunk.filter((chunk) => /^booking-|^firebase-/.test(chunk.chunk));
  for (const chunk of bookingChunks) {
    console.log(`\nTop sources in ${chunk.chunk}:`);
    for (const source of chunk.sources.slice(0, 12)) {
      console.log(`- ${(source.chars / 1024).toFixed(1)} KB ${source.source}`);
    }
  }
}

if (failures.length) {
  console.error('\nBundle report failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('\nBundle report written to dist/bundle-report.json');
