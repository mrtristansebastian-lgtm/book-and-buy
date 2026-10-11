import { mkdir, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const runtimeModules = process.env.CODEX_NODE_MODULES || 'C:/Users/LenovoUser/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
let sharp;
try { sharp = require('sharp'); } catch { sharp = require(path.join(runtimeModules, 'sharp')); }
const [source, assetPath] = process.argv.slice(2);
if (!source || !assetPath) throw new Error('Usage: node scripts/store-showcase-image.mjs <generated-image> <asset-path>');
const root = path.resolve('public/example/book-and-buy-showcase');
const destination = path.resolve(assetPath.startsWith('/example/') ? `public${assetPath}` : assetPath);
if (!destination.startsWith(`${root}${path.sep}`) || path.extname(destination) !== '.webp') throw new Error('Image destination must be a WebP inside the showcase folder.');
await mkdir(path.dirname(destination), { recursive: true });
await sharp(source).rotate().resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true }).webp({ quality: 86 }).toFile(destination);
const size = (await stat(destination)).size;
console.log(JSON.stringify({ path: assetPath, bytes: size }));
