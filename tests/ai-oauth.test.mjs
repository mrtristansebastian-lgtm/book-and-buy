import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createChatGPTOAuth, oauthConfig, verifyChatGPTIdentity } from '../functions/ai/oauth.js';
import { encryptSecret, decryptSecret } from '../functions/payments/encrypt.js';
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet } = await import(pathToFileURL(require.resolve('jose')).href);

const env = { AI_CHATGPT_OAUTH_ENABLED: 'true', OPENAI_CLIENT_ID: 'oaiapp_test', CHATGPT_REDIRECT_URI: 'https://example.com/api/ai/chatgpt', CHATGPT_RETURN_URL: 'https://example.com/business', CHATGPT_TOKEN_AUTH_METHOD: 'none' };
const discovery = { issuer: 'https://auth.openai.com', authorization_endpoint: 'https://auth.openai.com/api/accounts/authorize', token_endpoint: 'https://auth.openai.com/api/accounts/oauth/token', jwks_uri: 'https://auth.openai.com/.well-known/jwks.json', revocation_endpoint: 'https://auth.openai.com/api/accounts/oauth/revoke' };
const withDiscovery = callback => async (url, options) => url === 'https://auth.openai.com/.well-known/openid-configuration' ? new Response(JSON.stringify(discovery), { headers: { 'Content-Type': 'application/json' } }) : callback(url, options);
test('OAuth identity and inference registration gates are independent and fail closed', () => {
  assert.equal(oauthConfig({}), null); assert.equal(oauthConfig({ ...env, AI_CHATGPT_OAUTH_ENABLED: '' }), null);
  assert.equal(oauthConfig({ ...env, CHATGPT_REDIRECT_URI: 'http://example.com/callback' }), null);
  assert.equal(oauthConfig({ ...env, CHATGPT_TOKEN_AUTH_METHOD: 'client_secret_basic' }), null);
  assert.equal(oauthConfig(env).inference, false); assert.equal(oauthConfig({ ...env, AI_CHATGPT_INFERENCE_APPROVED: 'true' }).inference, true);
});
test('JWKS verification rejects wrong issuer, audience, nonce, expiration and signatures', async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256'); const jwk = await exportJWK(publicKey); jwk.kid = 'test-key'; jwk.alg = 'RS256';
  const keySet = createLocalJWKSet({ keys: [jwk] });
  const sign = async (claims = {}, signingKey = privateKey) => new SignJWT({ nonce: 'expected-nonce', ...claims }).setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).setIssuer(claims.iss || 'https://auth.openai.com').setAudience(claims.aud || 'oaiapp_test').setSubject('subject').setIssuedAt().setExpirationTime(claims.exp || '5m').sign(signingKey);
  const verify = token => verifyChatGPTIdentity(token, { clientId: 'oaiapp_test', nonce: 'expected-nonce', keySet });
  assert.equal((await verify(await sign())).sub, 'subject');
  for (const claims of [{ iss: 'https://attacker.example' }, { aud: 'wrong-client' }, { nonce: 'wrong' }, { exp: Math.floor(Date.now() / 1000) - 20 }]) await assert.rejects(verify(await sign(claims)));
  const other = await generateKeyPair('RS256'); await assert.rejects(verify(await sign({}, other.privateKey)));
});

function oauthDB() {
  const data = new Map();
  const doc = path => ({ path, get: async () => ({ exists: data.has(path), data: () => structuredClone(data.get(path)) }), set: async value => data.set(path, structuredClone(value)) });
  const db = { doc, data, collection: path => ({ doc: id => doc(`${path}/${id}`) }), runTransaction: async callback => callback({ get: ref => ref.get(), set: (ref, value) => data.set(ref.path, structuredClone(value)), update: (ref, patch) => data.set(ref.path, { ...data.get(ref.path), ...structuredClone(patch) }) }) };
  let lock = Promise.resolve();
  const transact = db.runTransaction;
  db.runTransaction = async callback => { const prior = lock; let release; lock = new Promise(resolve => { release = resolve; }); await prior; try { return await transact(callback); } finally { release(); } };
  return db;
}
function reply() {
  return { headers: {}, statusCode: 200, set(name, value) { this.headers[name] = value; return this; }, status(code) { this.statusCode = code; return this; }, send(value) { this.body = value; }, json(value) { this.body = value; }, end() {}, redirect(code, location) { this.statusCode = code; this.location = location; } };
}
function http(method, { body = {}, query = {}, headers = {} } = {}) { return { method, body, query, get: name => headers[name.toLowerCase()] }; }
test('PKCE browser transaction requires authenticated origin binding and is consumed once', async () => {
  const db = oauthDB(); let exchanges = 0; let codeVerifier;
  const oauth = createChatGPTOAuth({ db, env: { ...env, AI_SETTINGS_ENCRYPTION_KEY: 'k'.repeat(40) }, appId: 'app', verifyFirebaseToken: async token => { assert.equal(token, 'firebase-token'); return { uid: 'owner' }; }, verifyIdentity: async (_token, options) => { assert.equal(options.clientId, 'oaiapp_test'); assert.equal(typeof options.nonce, 'string'); return { sub: 'subject', email: 'owner@example.com' }; }, fetchImpl: withDiscovery(async (url, options) => { exchanges++; assert.equal(url, 'https://auth.openai.com/api/accounts/oauth/token'); const body = new URLSearchParams(options.body); codeVerifier = body.get('code_verifier'); assert.equal(body.get('grant_type'), 'authorization_code'); return new Response(JSON.stringify({ id_token: 'mock-verified-token' }), { headers: { 'Content-Type': 'application/json' } }); }) });
  const setup = await oauth.start('owner', 'owner');
  assert.ok(!JSON.stringify(setup).includes('verifier'));
  const wrongOrigin = reply(); await oauth.callback(http('POST', { body: setup, headers: { origin: 'https://attacker.example', authorization: 'Bearer firebase-token' } }), wrongOrigin); assert.equal(wrongOrigin.statusCode, 403);
  const prepared = reply(); await oauth.callback(http('POST', { body: setup, headers: { origin: 'https://example.com', authorization: 'Bearer firebase-token' } }), prepared);
  assert.equal(prepared.statusCode, 200); const authorization = new URL(prepared.body.authUrl); assert.equal(authorization.searchParams.get('code_challenge_method'), 'S256'); assert.equal(authorization.searchParams.get('scope'), 'openid email profile');
  const cookie = prepared.headers['Set-Cookie'].split(';')[0]; assert.ok(prepared.headers['Set-Cookie'].includes('HttpOnly; Secure; SameSite=Lax'));
  assert.ok(cookie.startsWith('__session=bbai.')); assert.ok(prepared.headers['Set-Cookie'].includes('Path=/api/ai/chatgpt;'));
  const missingCookie = reply(); await oauth.callback(http('GET', { query: { state: setup.state, code: 'mock-code' } }), missingCookie); assert.ok(missingCookie.location.includes('aiConnection=failed')); assert.equal(exchanges, 0);
  const completed = reply(); await oauth.callback(http('GET', { query: { state: setup.state, code: 'mock-code' }, headers: { cookie } }), completed);
  assert.ok(completed.location.includes('aiConnection=identity-only')); assert.equal(codeVerifier.length, 43); assert.equal(exchanges, 1);
  const stored = db.data.get('artifacts/app/users/owner/aiConnections/chatgpt'); assert.equal(stored.type, 'identity'); assert.equal(stored.encrypted, null); assert.equal(stored.subject, 'subject');
  const replay = reply(); await oauth.callback(http('GET', { query: { state: setup.state, code: 'mock-code' }, headers: { cookie } }), replay); assert.ok(replay.location.includes('aiConnection=failed')); assert.equal(exchanges, 1);
  assert.ok(!JSON.stringify([...db.data.values()]).includes('mock-verified-token'));
});
test('expired and cross-owner setup tickets cannot establish browser OAuth binding', async () => {
  const db = oauthDB(); const oauth = createChatGPTOAuth({ db, env: { ...env, AI_SETTINGS_ENCRYPTION_KEY: 'k'.repeat(40) }, appId: 'app', verifyFirebaseToken: async () => ({ uid: 'other' }), fetchImpl: withDiscovery(() => { throw new Error('Network forbidden'); }) });
  const setup = await oauth.start('owner', 'owner');
  const response = reply(); await oauth.callback(http('POST', { body: setup, headers: { origin: 'https://example.com', authorization: 'Bearer firebase-token' } }), response); assert.equal(response.statusCode, 403);
  for (const [path, value] of db.data) db.data.set(path, { ...value, expiresAt: Date.now() - 1000 });
  const ownerOAuth = createChatGPTOAuth({ db, env: { ...env, AI_SETTINGS_ENCRYPTION_KEY: 'k'.repeat(40) }, appId: 'app', verifyFirebaseToken: async () => ({ uid: 'owner' }), fetchImpl: withDiscovery(() => { throw new Error('Network forbidden'); }) });
  const expired = reply(); await ownerOAuth.callback(http('POST', { body: setup, headers: { origin: 'https://example.com', authorization: 'Bearer firebase-token' } }), expired); assert.equal(expired.statusCode, 403);
});

test('disconnect during pending authorization cannot restore a revoked connection', async () => {
  const db = oauthDB(); const oauth = createChatGPTOAuth({ db, env: { ...env, AI_SETTINGS_ENCRYPTION_KEY: 'k'.repeat(40) }, appId: 'app', verifyFirebaseToken: async () => ({ uid: 'owner' }), verifyIdentity: async () => ({ sub: 'subject' }), fetchImpl: withDiscovery(async () => new Response(JSON.stringify({ id_token: 'mock-id' }), { headers: { 'Content-Type': 'application/json' } })) });
  const setup = await oauth.start('owner', 'owner'); const prepared = reply();
  await oauth.callback(http('POST', { body: setup, headers: { origin: 'https://example.com', authorization: 'Bearer token' } }), prepared);
  const cookie = prepared.headers['Set-Cookie'].split(';')[0];
  await db.doc('artifacts/app/users/owner/aiConnections/chatgpt').set({ connected: false, billingChoice: 'none', generation: 'disconnected-generation' });
  const completed = reply(); await oauth.callback(http('GET', { query: { state: setup.state, code: 'mock-code' }, headers: { cookie } }), completed);
  assert.ok(completed.location.includes('aiConnection=failed')); assert.equal(db.data.get('artifacts/app/users/owner/aiConnections/chatgpt').connected, false);
});

test('approved inference still requires returned scopes and otherwise retains identity only', async () => {
  for (const granted of [false, true]) {
    const db = oauthDB(); let resource;
    const oauth = createChatGPTOAuth({ db, env: { ...env, AI_CHATGPT_INFERENCE_APPROVED: 'true', AI_SETTINGS_ENCRYPTION_KEY: 'k'.repeat(40) }, appId: 'app', verifyFirebaseToken: async () => ({ uid: 'owner' }), verifyIdentity: async () => ({ sub: 'subject' }), verifyAccess: async () => ({ exp: Math.floor(Date.now() / 1000) + 3600 }), fetchImpl: withDiscovery(async (_url, options) => { resource = new URLSearchParams(options.body).get('resource'); return new Response(JSON.stringify({ id_token: 'mock-id', access_token: 'mock-access', refresh_token: 'mock-refresh', scope: granted ? 'openid chatgpt.tokens.use.direct resource.invoke offline_access' : 'openid profile' }), { headers: { 'Content-Type': 'application/json' } }); }) });
    const setup = await oauth.start('owner', 'owner'); const prepared = reply(); await oauth.callback(http('POST', { body: setup, headers: { origin: 'https://example.com', authorization: 'Bearer token' } }), prepared);
    assert.equal(new URL(prepared.body.authUrl).searchParams.get('resource'), 'https://api.openai.com/v1');
    const complete = reply(); await oauth.callback(http('GET', { query: { state: setup.state, code: 'code' }, headers: { cookie: prepared.headers['Set-Cookie'].split(';')[0] } }), complete);
    const stored = db.data.get('artifacts/app/users/owner/aiConnections/chatgpt'); assert.equal(stored.type, granted ? 'oauth' : 'identity'); assert.equal(Boolean(stored.encrypted), granted); assert.equal(resource, 'https://api.openai.com/v1');
    assert.ok(!JSON.stringify(stored).includes('mock-access'));
  }
});

const refreshEnv = { ...env, AI_CHATGPT_INFERENCE_APPROVED: 'true', AI_SETTINGS_ENCRYPTION_KEY: 'k'.repeat(40) };
const expiredConnection = () => ({ connected: true, type: 'oauth', issuer: 'https://auth.openai.com', clientId: 'oaiapp_test', subject: 'subject', generation: 'one', expiresAt: Date.now() - 1000, encrypted: encryptSecret(JSON.stringify({ accessToken: 'old-access', refreshToken: 'old-refresh' }), refreshEnv.AI_SETTINGS_ENCRYPTION_KEY) });
test('rotating refresh replaces tokens together, and a stale reader uses the latest credential', async () => {
  const db = oauthDB(); const stored = expiredConnection(); const ref = db.doc('artifacts/app/users/owner/aiConnections/chatgpt'); await ref.set(stored); let refreshes = 0;
  const oauth = createChatGPTOAuth({ db, env: refreshEnv, appId: 'app', verifyAccess: async (_token, config, subject) => { assert.equal(config.clientId, 'oaiapp_test'); assert.equal(subject, 'subject'); return { exp: Math.floor(Date.now() / 1000) + 3600 }; }, fetchImpl: withDiscovery(async (_url, options) => { refreshes++; const body = new URLSearchParams(options.body); assert.equal(body.get('resource'), 'https://api.openai.com/v1'); assert.equal(body.get('refresh_token'), 'old-refresh'); return new Response(JSON.stringify({ access_token: 'new-access', refresh_token: 'new-refresh', token_type: 'Bearer' }), { headers: { 'Content-Type': 'application/json' } }); }) });
  assert.equal(await oauth.credential('owner', stored), 'new-access'); assert.equal(await oauth.credential('owner', stored), 'new-access'); assert.equal(refreshes, 1);
  const current = (await ref.get()).data(); assert.equal(current.refreshLease, null); assert.equal(current.reconnectRequired, false); assert.equal(JSON.parse(decryptSecret(current.encrypted.ciphertext, current.encrypted.iv, refreshEnv.AI_SETTINGS_ENCRYPTION_KEY)).refreshToken, 'new-refresh');
});

test('terminal refresh errors clear unusable tokens but temporary failures preserve access', async () => {
  for (const [status, tokenCode, reconnectRequired] of [[400, 'invalid_grant', true], [503, 'server_error', false], [401, 'invalid_client', false]]) {
    const db = oauthDB(); const stored = expiredConnection(); const ref = db.doc('artifacts/app/users/owner/aiConnections/chatgpt'); await ref.set(stored);
    const oauth = createChatGPTOAuth({ db, env: refreshEnv, appId: 'app', fetchImpl: withDiscovery(async () => new Response(JSON.stringify({ error: tokenCode, error_description: 'sensitive-secret' }), { status, headers: { 'Content-Type': 'application/json' } })) });
    await assert.rejects(oauth.credential('owner', stored), error => !error.message.includes('sensitive'));
    const current = (await ref.get()).data(); assert.equal(Boolean(current.reconnectRequired), reconnectRequired); assert.equal(Boolean(current.encrypted), !reconnectRequired); assert.equal(current.refreshLeaseUntil, 0);
  }
});

test('provider revocation reports confirmation without leaking tokens or trusting a foreign endpoint', async () => {
  let revokeBody;
  const oauth = createChatGPTOAuth({ db: oauthDB(), env: refreshEnv, appId: 'app', fetchImpl: withDiscovery(async (url, options) => { assert.equal(url, discovery.revocation_endpoint); revokeBody = new URLSearchParams(options.body); return new Response(null, { status: 200 }); }) });
  assert.equal(await oauth.revoke(expiredConnection()), true); assert.equal(revokeBody.get('token_type_hint'), 'refresh_token'); assert.equal(revokeBody.get('token'), 'old-refresh');
  const unsafe = createChatGPTOAuth({ db: oauthDB(), env: refreshEnv, appId: 'app', fetchImpl: async url => { assert.equal(url, 'https://auth.openai.com/.well-known/openid-configuration'); return new Response(JSON.stringify({ ...discovery, revocation_endpoint: 'https://attacker.example/collect' }), { headers: { 'Content-Type': 'application/json' } }); } });
  assert.equal(await unsafe.revoke(expiredConnection()), false);
});

test('access-only grants report unconfirmed revocation without contacting the provider', async () => {
  let calls = 0;
  const oauth = createChatGPTOAuth({ db: oauthDB(), env: refreshEnv, appId: 'app', fetchImpl: async () => { calls++; throw new Error('Network forbidden'); } });
  const stored = { ...expiredConnection(), refreshable: false, encrypted: encryptSecret(JSON.stringify({ accessToken: 'access-only', refreshToken: null }), refreshEnv.AI_SETTINGS_ENCRYPTION_KEY) };
  assert.equal(await oauth.revoke(stored), false);
  assert.equal(calls, 0);
});

test('issuer discovery and registered confidential client authentication fail closed', async () => {
  const unsafe = createChatGPTOAuth({ db: oauthDB(), env: refreshEnv, appId: 'app', fetchImpl: async () => new Response(JSON.stringify({ ...discovery, token_endpoint: 'https://attacker.example/token' }), { headers: { 'Content-Type': 'application/json' } }) });
  await assert.rejects(unsafe.start('owner', 'owner'), { code: 'unavailable' });
  assert.equal(oauthConfig({ ...env, OPENAI_CLIENT_ID: 'dynamic_agent_client' }), null);
  assert.equal(oauthConfig({ ...env, CHATGPT_REDIRECT_URI: 'https://example.com/api/ai/chatgpt?callback=evil' }), null);
});


test('a different verified account remains pending until owner confirms a revision-bound replacement', async () => {
  for (const accept of [false, true]) {
    const db = oauthDB(), ref = db.doc('artifacts/app/users/owner/aiConnections/chatgpt');
    await ref.set({ connected: true, type: 'identity', issuer: 'https://auth.openai.com', clientId: 'oaiapp_test', subject: 'original', generation: 'original-generation' });
    const oauth = createChatGPTOAuth({ db, env: { ...env, AI_SETTINGS_ENCRYPTION_KEY: 'k'.repeat(40) }, appId: 'app', verifyFirebaseToken: async () => ({ uid: 'owner' }), verifyIdentity: async () => ({ sub: 'replacement', email: 'new@example.com' }), fetchImpl: withDiscovery(async () => new Response(JSON.stringify({ id_token: 'mock-id' }), { headers: { 'Content-Type': 'application/json' } })) });
    const setup = await oauth.start('owner', 'owner', { intent: 'replace' }), prepared = reply();
    await oauth.callback(http('POST', { body: setup, headers: { origin: 'https://example.com', authorization: 'Bearer token' } }), prepared);
    const complete = reply(); await oauth.callback(http('GET', { query: { state: setup.state, code: 'code' }, headers: { cookie: prepared.headers['Set-Cookie'].split(';')[0] } }), complete);
    const pendingId = new URL(complete.location).searchParams.get('pendingConnection'); assert.ok(pendingId); assert.equal((await ref.get()).data().subject, 'original');
    const pending = await oauth.pending('owner', pendingId); assert.equal(pending.accountLabel, 'new@example.com'); assert.ok(!JSON.stringify(pending).includes('subject'));
    await assert.rejects(oauth.pending('other', pendingId), { code: 'not-found' });
    await assert.rejects(oauth.confirm('other', 'other', pendingId, pending.expectedRevision, true), { code: 'permission-denied' });
    await assert.rejects(oauth.confirm('owner', 'owner', pendingId, 'f'.repeat(64), true), { code: 'aborted' });
    await oauth.confirm('owner', 'owner', pendingId, pending.expectedRevision, accept); await oauth.confirm('owner', 'owner', pendingId, pending.expectedRevision, accept);
    assert.equal((await ref.get()).data().subject, accept ? 'replacement' : 'original');
    assert.equal(db.data.get('artifacts/app/aiOAuthStates/' + pendingId).pending, null);
  }
});

test('pending replacement expiry and connection changes cannot override the current account', async () => {
  const db = oauthDB(), oauth = createChatGPTOAuth({ db, env, appId: 'app' });
  const pendingId = 'a'.repeat(64), revision = 'b'.repeat(64);
  await db.doc('artifacts/app/aiOAuthStates/' + pendingId).set({ uid: 'owner', workspaceId: 'owner', confirmationStatus: 'pending', expectedRevision: revision, expiresAt: Date.now() - 1, pending: { clientId: 'oaiapp_test' } });
  await assert.rejects(oauth.confirm('owner', 'owner', pendingId, revision, true), { code: 'failed-precondition' });
  await assert.rejects(oauth.pending('owner', pendingId), { code: 'not-found' });
  const value = db.data.get('artifacts/app/aiOAuthStates/' + pendingId); value.expiresAt = Date.now() + 600000; db.data.set('artifacts/app/aiOAuthStates/' + pendingId, value);
  await assert.rejects(oauth.confirm('owner', 'owner', pendingId, revision, true), { code: 'aborted' });
});

test('explicit plan permission reauthorization uses consent and approval gates make zero requests', async () => {
  const db = oauthDB(); await db.doc('artifacts/app/users/owner/aiConnections/chatgpt').set({ connected: true, type: 'identity', subject: 'subject', generation: 'one' });
  const oauth = createChatGPTOAuth({ db, env: refreshEnv, appId: 'app', verifyFirebaseToken: async () => ({ uid: 'owner' }), fetchImpl: withDiscovery(() => { throw new Error('No exchange expected'); }) });
  const setup = await oauth.start('owner', 'owner', { intent: 'enable-plan' }), prepared = reply();
  await oauth.callback(http('POST', { body: setup, headers: { origin: 'https://example.com', authorization: 'Bearer token' } }), prepared);
  const url = new URL(prepared.body.authUrl); assert.equal(url.searchParams.get('prompt'), 'consent'); assert.ok(url.searchParams.get('scope').includes('chatgpt.tokens.use.direct'));
  let calls = 0; const gated = createChatGPTOAuth({ db, env: { ...refreshEnv, AI_CHATGPT_OAUTH_ENABLED: 'false', AI_CHATGPT_INFERENCE_APPROVED: 'false' }, appId: 'app', fetchImpl: async () => { calls++; throw new Error('Network forbidden'); } });
  await assert.rejects(gated.start('owner', 'owner'), { code: 'unavailable' }); assert.equal(calls, 0);
});


test('concurrent refreshes serialize rotation and disconnect cannot be overwritten by a late refresh', async () => {
  for (const disconnect of [false, true]) {
    const db = oauthDB(), stored = expiredConnection(), ref = db.doc('artifacts/app/users/owner/aiConnections/chatgpt'); await ref.set(stored);
    let release, entered, calls = 0; const barrier = new Promise(resolve => { release = resolve; }), ready = new Promise(resolve => { entered = resolve; });
    const oauth = createChatGPTOAuth({ db, env: refreshEnv, appId: 'app', verifyAccess: async () => ({ exp: Math.floor(Date.now() / 1000) + 3600 }), fetchImpl: withDiscovery(async () => { calls++; entered(); await barrier; return new Response(JSON.stringify({ access_token: 'new-access', refresh_token: 'new-refresh' }), { headers: { 'Content-Type': 'application/json' } }); }) });
    const first = oauth.credential('owner', stored).then(value => ({ value }), error => ({ error })); await ready;
    await assert.rejects(oauth.credential('owner', stored), { code: 'aborted' }); assert.equal(calls, 1);
    if (disconnect) await ref.set({ connected: false, generation: 'disconnected', encrypted: null });
    release(); const result = await first;
    if (disconnect) { assert.equal(result.error.code, 'aborted'); assert.equal((await ref.get()).data().encrypted, null); }
    else { assert.equal(result.value, 'new-access'); assert.equal(await oauth.credential('owner', stored), 'new-access'); assert.equal(calls, 1); }
  }
});

test('earliest refresh time prevents premature rotation without erasing still-valid credentials', async () => {
  const db = oauthDB(), stored = { ...expiredConnection(), expiresAt: Date.now() + 30000, earliestRefreshAt: Date.now() + 20000 }; await db.doc('artifacts/app/users/owner/aiConnections/chatgpt').set(stored);
  let calls = 0; const oauth = createChatGPTOAuth({ db, env: refreshEnv, appId: 'app', fetchImpl: async () => { calls++; throw new Error('Forbidden'); } });
  assert.equal(await oauth.credential('owner', stored), 'old-access'); assert.equal(calls, 0);
  await assert.rejects(oauth.credential('owner', { ...stored, expiresAt: Date.now() - 1 }), { code: 'unavailable' }); assert.equal(calls, 0); assert.ok(db.data.get('artifacts/app/users/owner/aiConnections/chatgpt').encrypted);
});

test('confidential identity code exchange sends provisioned authentication only in its secure header', async () => {
  const db = oauthDB(); let exchanged = false;
  const oauth = createChatGPTOAuth({ db, env: { ...env, CHATGPT_TOKEN_AUTH_METHOD: 'client_secret_basic', OPENAI_CLIENT_SECRET: 'mock:secret', AI_SETTINGS_ENCRYPTION_KEY: 'k'.repeat(40) }, appId: 'app', verifyFirebaseToken: async () => ({ uid: 'owner' }), verifyIdentity: async () => ({ sub: 'subject' }), fetchImpl: withDiscovery(async (_url, options) => { exchanged = true; assert.equal(options.headers.Authorization, 'Basic ' + Buffer.from('oaiapp_test:mock%3Asecret').toString('base64')); assert.equal(new URLSearchParams(options.body).has('client_secret'), false); return new Response(JSON.stringify({ id_token: 'mock-id' }), { headers: { 'Content-Type': 'application/json' } }); }) });
  const setup = await oauth.start('owner', 'owner'), prepared = reply(); await oauth.callback(http('POST', { body: setup, headers: { origin: 'https://example.com', authorization: 'Bearer token' } }), prepared);
  const complete = reply(); await oauth.callback(http('GET', { query: { state: setup.state, code: 'code' }, headers: { cookie: prepared.headers['Set-Cookie'].split(';')[0] } }), complete); assert.equal(exchanged, true); assert.ok(complete.location.includes('identity-only'));
});
