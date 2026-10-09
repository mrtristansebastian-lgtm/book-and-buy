import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../public/builder/site-export.js';
const { validate, zip } = globalThis.BookBuySiteExport;
test('rejects traversal, private config and credentials', () => {
  for (const path of ['../secret.js', '/index.html', '.env', 'assets/../secret.js', 'firebase.json', 'service-account.json']) assert.throws(() => validate(path, '{}'));
  assert.throws(() => validate('site.js', 'const apiKey = "sk-proj-abcdefghijklmnopqrstuvwxyz";'));
  assert.doesNotThrow(() => validate('assets/site.js', 'console.log("hello")'));
});
test('ZIP preserves website bytes and filenames without app state', async () => {
  const bytes = new TextEncoder().encode('<h1>My site</h1>');
  const archive = new Uint8Array(await zip([{ path: 'index.html', bytes }]).arrayBuffer());
  const view = new DataView(archive.buffer);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  const crcArchive = new DataView(await zip([{ path: "checksum.txt", bytes: new TextEncoder().encode("123456789") }]).arrayBuffer());
  assert.equal(crcArchive.getUint32(14, true), 0xcbf43926);
  const length = view.getUint16(26, true);
  assert.equal(new TextDecoder().decode(archive.slice(30, 30 + length)), 'index.html');
  assert.deepEqual(archive.slice(30 + length, 30 + length + bytes.length), bytes);
  assert.equal(view.getUint32(archive.length - 22, true), 0x06054b50);
  assert.equal(view.getUint16(archive.length - 14, true), 1);
});
