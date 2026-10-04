import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const load = async (path) => import(`data:text/javascript;base64,${Buffer.from(source(path)).toString('base64')}`);
const { resolvePublicProfile } = await load('src/features/website/publicProfileState.js');
const { profileAuthReturn, profileSignInPath, clientAuthRedirect } = await load('src/features/client-app/profileAuthReturn.js');
const local = { slug: 'my-business', ownerId: 'owner', brandName: 'Private business', website: { aboutBody: 'Private copy' } };
const base = { slug: 'another-business', local, configured: true, lookup: { slug: 'another-business', status: 'ready', workspace: null } };

test('missing public profiles never fabricate a profile from another workspace', () => {
  assert.equal(resolvePublicProfile(base).workspace, null);
  assert.equal(resolvePublicProfile(base).status, 'missing');
  assert.equal(resolvePublicProfile({ ...base, configured: false }).workspace, null);
});
test('slug changes hide stale remote business details until the new lookup resolves', () => {
  const result = resolvePublicProfile({ ...base, lookup: { slug: 'previous-business', status: 'ready', workspace: local } });
  assert.equal(result.status, 'loading');
  assert.equal(result.workspace, null);
});
test('unpublished local content is visible only to its authenticated owner or explicit demo', () => {
  const own = { ...base, slug: local.slug, lookup: { slug: local.slug, status: 'ready', workspace: null }, viewerId: 'owner', allowOwnerPreview: true };
  assert.equal(resolvePublicProfile(own).workspace, local);
  assert.equal(resolvePublicProfile({ ...own, viewerId: 'visitor' }).workspace, null);
  assert.equal(resolvePublicProfile({ ...own, allowOwnerPreview: false }).workspace, null);
  assert.equal(resolvePublicProfile({ ...base, useLocalDemo: true }).workspace, local);
});
test('published profiles remain public and lookup errors remain distinguishable from absence', () => {
  const remote = { slug: base.slug, brandName: 'Public business' };
  assert.deepEqual(resolvePublicProfile({ ...base, lookup: { slug: base.slug, status: 'ready', workspace: remote } }), { status: 'ready', workspace: remote, publicMode: true });
  assert.equal(resolvePublicProfile({ ...base, lookup: { slug: base.slug, status: 'error', workspace: null } }).status, 'error');
});
test('sign-in returns to the requested profile without accepting external or privileged redirects', () => {
  assert.equal(profileAuthReturn(profileSignInPath('flameandflour')), '/w/flameandflour');
  for (const target of ['https://evil.test', '//evil.test', '/dashboard/settings', '/w/a/../../dashboard', '/w/a?evil=yes', '/w/a\\b']) {
    assert.equal(profileAuthReturn(`/app/auth?returnTo=${encodeURIComponent(target)}`), '/app/find');
  }
});
test('a stale authentication effect cannot overwrite a completed profile return', () => {
  assert.equal(clientAuthRedirect(profileSignInPath('flameandflour')), '/w/flameandflour');
  assert.equal(clientAuthRedirect('/w/flameandflour'), null);
  assert.equal(clientAuthRedirect('/app/messages/thread-demo'), null);
});

function messageHelper({ cloud = false, thread = null, cloudError = null } = {}) {
  const navigated = [];
  const { outputText } = ts.transpileModule(source('src/features/client-app/startClientMessage.js'), { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const module = { exports: {} };
  new Function('module', 'exports', 'require', outputText)(module, module.exports, (id) => {
    if (id.includes('routing')) return { navigate: (path) => navigated.push(path) };
    if (id.includes('clientThreadsApi')) return { isFirebaseConfigured: () => cloud, ensureClientThread: async () => { if (cloudError) throw cloudError; return thread; } };
    return { rememberMessageAnalytics: () => {} };
  });
  return { start: module.exports.startClientMessage, navigated };
}
test('profile Message reports failure instead of sending visitors into an unrelated local inbox', async () => {
  const { start, navigated } = messageHelper({ cloud: true, cloudError: new Error('Offline') });
  await assert.rejects(start({ profile: { email: 'client@example.test' }, workspace: { ownerId: 'other-owner' }, requireThread: true }), /Offline/);
  assert.deepEqual(navigated, []);
});
test('profile Message opens real threads and same-business demo threads without sending a message', async () => {
  const real = messageHelper({ cloud: true, thread: { id: 'thread-real' } });
  await real.start({ profile: { email: 'client@example.test' }, workspace: { ownerId: 'owner' }, requireThread: true });
  assert.deepEqual(real.navigated, ['/app/messages/thread-real']);
  const demo = messageHelper();
  await demo.start({ profile: { email: 'demo@example.test' }, requireThread: true, startThreadFromClient: () => ({ id: 'thread-demo' }) });
  assert.deepEqual(demo.navigated, ['/app/messages/thread-demo']);
});
test('demo profile messaging remains local even with configured cloud services', async () => {
  const { start, navigated } = messageHelper({ cloud: true, thread: { id: 'must-not-open' } });
  await start({ profile: { email: 'demo@example.test' }, workspace: { isDemo: true, ownerId: 'demo-owner' }, requireThread: true, startThreadFromClient: () => ({ id: 'local-demo' }) });
  assert.deepEqual(navigated, ['/app/messages/local-demo']);
  assert.match(source('src/features/client-app/pages/ClientAuthPage.jsx'), /if \(!workspace\?\.isDemo\) loadDemoWorkspace\?\.\(\)/);
});
