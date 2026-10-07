import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { publishProfileDraft } from '../src/features/website/publishProfileDraft.js';
import { IMAGE_PRESETS, resolveFrameAspect } from '../src/features/media/imagePresets.js';


const nativeRequire = createRequire(import.meta.url);
const cache = new Map();
function load(file) {
  const path = resolve(file);
  if (cache.has(path)) return cache.get(path);
  const module = { exports: {} };
  cache.set(path, module.exports);
  const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const require = (id) => {
    if (!id.startsWith('.')) return nativeRequire(id);
    const candidate = resolve(dirname(path), id);
    return load(existsSync(candidate) ? candidate : `${candidate}.js`);
  };
  new Function('module', 'exports', 'require', outputText)(module, module.exports, require);
  return module.exports;
}
const { profileCatalog, profileTabs, searchPublicCatalog } = load('src/features/website/profileModel.js');
const product = { id: 'p', name: 'Object', active: true, status: 'active' };
const service = { id: 's', name: 'Consultation', active: true };
const ids = (workspace) => profileTabs(workspace).map(({ id }) => id);

test('profile actions match services-only, products-only, mixed and empty businesses', () => {
  assert.deepEqual(ids({ services: [service] }), ['home', 'book']);
  assert.deepEqual(ids({ products: [product] }), ['home', 'buy']);
  assert.deepEqual(ids({ services: [service], products: [product] }), ['home', 'book', 'buy']);
  assert.deepEqual(ids({}), ['home']);
  assert.deepEqual(ids({ services: [{ ...service, active: false }], products: [{ ...product, status: 'draft' }] }), ['home']);
});
test('hidden catalogs and draft/archived products never become public offerings', () => {
  const workspace = { services: [service], products: [product, { ...product, id: 'draft', status: 'draft' }, { ...product, id: 'archived', status: 'archived' }], website: { pages: { book: false, shop: false } } };
  assert.deepEqual(ids(workspace), ['home']);
  assert.deepEqual(profileCatalog(workspace).products.map((item) => item.id), ['p']);
});
test('market-filtered profiles keep their country picker reachable without leaking offerings', () => {
  const workspace = { services: [], products: [], profileCapabilities: { book: true, buy: false } };
  assert.deepEqual(ids(workspace), ['home', 'book']);
  assert.deepEqual(profileCatalog(workspace).services, []);
});
test('large catalogs search all words without changing source records', () => {
  const items = Array.from({ length: 200 }, (_, i) => ({ id: i, name: `Object ${i}`, category: i % 2 ? 'Studio' : 'Home' }));
  assert.deepEqual(searchPublicCatalog(items, 'studio 199').map((row) => row.id), [199]);
  assert.equal(searchPublicCatalog(items, 'missing').length, 0);
  assert.equal(searchPublicCatalog(items, '').length, 200);
  assert.equal(items[199].name, 'Object 199');
});
test('product photos keep portrait, landscape and panoramic composition by default', () => {
  for (const aspect of [0.2, 2 / 3, 1, 3 / 2, 5]) assert.equal(resolveFrameAspect(aspect, 'productPhoto'), aspect);
  for (const key of ['logo', 'socialBanner', 'about', 'venue']) {
    assert.equal(IMAGE_PRESETS[key].width / IMAGE_PRESETS[key].height, IMAGE_PRESETS[key].aspect);
  }
});
test('new profiles contain no prewritten claims, story prompts or FAQ promises', () => {
  const code = readFileSync('src/config/workspaceDefaults.js', 'utf8').split('export { createDemoWorkspace')[0];
  const { outputText } = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const module = { exports: {} };
  new Function('module', 'exports', outputText)(module, module.exports);
  const { website } = module.exports.createDefaultSettings();
  for (const key of ['aboutPages', 'reasons', 'bookFaq']) assert.deepEqual(website[key], []);
  for (const key of ['aboutBody', 'missionBody', 'visionBody', 'reasonsBody']) assert.equal(website[key], '');
});
test('failed publication retains the prior live metadata and draft', async () => {
  const workspace = { brandName: 'Business', slug: 'business', publishedAt: 123, website: { published: true, homeSubtext: 'New draft' } };
  let marked = false;
  const result = await publishProfileDraft(workspace, { publish: async () => ({ ok: false, localOnly: true }), markPublished: () => { marked = true; } });
  assert.equal(result.ok, false); assert.equal(marked, false); assert.equal(workspace.publishedAt, 123);
  await assert.rejects(publishProfileDraft(workspace, { publish: async () => { throw Error('Network'); }, markPublished: () => { marked = true; } }), /Network/);
  assert.equal(marked, false); assert.equal(workspace.website.homeSubtext, 'New draft');
});
test('successful publishing marks only the completed snapshot; demo never calls publisher', async () => {
  let calls = 0; let marked = 0;
  const workspace = { brandName: 'Business', slug: 'business', website: { homeSubtext: 'Draft' } };
  const options = { ownerId: 'owner', publish: async (snapshot) => { calls++; assert.equal(snapshot.ownerId, 'owner'); assert.equal(snapshot.website.published, true); return { ok: true }; }, markPublished: (time) => { marked = time; } };
  await publishProfileDraft(workspace, options);
  assert.equal(calls, 1); assert.ok(marked > 0); assert.equal(workspace.website.published, undefined);
  await publishProfileDraft({ ...workspace, isDemo: true }, options); assert.equal(calls, 1);
  await publishProfileDraft({ ...workspace, brandName: '' }, options); assert.equal(calls, 1);
});
