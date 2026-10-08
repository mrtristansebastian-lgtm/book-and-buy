import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createChatGPTOAuth, oauthConfig, verifyChatGPTIdentity } from '../functions/ai/oauth.js';
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet } = await import(pathToFileURL(require.resolve('jose')).href);

const env = { AI_CHATGPT_OAUTH_ENABLED: 'true', OPENAI_CLIENT_ID: 'oaiapp_test', CHATGPT_REDIRECT_URI: 'https://example.com/api/ai/chatgpt', CHATGPT_RETURN_URL: 'https://example.com/business', CHATGPT_TOKEN_AUTH_METHOD: 'none' };
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
  return db;
}
function reply() {
  return { headers: {}, statusCode: 200, set(name, value) { this.headers[name] = value; return this; }, status(code) { this.statusCode = code; return this; }, send(value) { this.body = value; }, json(value) { this.body = value; }, end() {}, redirect(code, location) { this.statusCode = code; this.location = location; } };
}
function http(method, { body = {}, query = {}, headers = {} } = {}) { return { method, body, query, get: name => headers[name.toLowerCase()] }; }
test('PKCE browser transaction requires authenticated origin binding and is consumed once', async () => {
  const db = oauthDB(); let exchanges = 0; let codeVerifier;
  const oauth = createChatGPTOAuth({ db, env: { ...env, AI_SETTINGS_ENCRYPTION_KEY: 'k'.repeat(40) }, appId: 'app', verifyFirebaseToken: async token => { assert.equal(token, 'firebase-token'); return { uid: 'owner' }; }, verifyIdentity: async (_token, options) => { assert.equal(options.clientId, 'oaiapp_test'); assert.equal(typeof options.nonce, 'string'); return { sub: 'subject', email: 'owner@example.com' }; }, fetchImpl: async (url, options) => { exchanges++; assert.equal(url, 'https://auth.openai.com/api/accounts/oauth/token'); const body = new URLSearchParams(options.body); codeVerifier = body.get('code_verifier'); assert.equal(body.get('grant_type'), 'authorization_code'); return new Response(JSON.stringify({ id_token: 'mock-verified-token' }), { headers: { 'Content-Type': 'application/json' } }); } });
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
  const db = oauthDB(); const oauth = createChatGPTOAuth({ db, env: { ...env, AI_SETTINGS_ENCRYPTION_KEY: 'k'.repeat(40) }, appId: 'app', verifyFirebaseToken: async () => ({ uid: 'other' }), fetchImpl: () => { throw new Error('Network forbidden'); } });
  const setup = await oauth.start('owner', 'owner');
  const response = reply(); await oauth.callback(http('POST', { body: setup, headers: { origin: 'https://example.com', authorization: 'Bearer firebase-token' } }), response); assert.equal(response.statusCode, 403);
  for (const [path, value] of db.data) db.data.set(path, { ...value, expiresAt: Date.now() - 1000 });
  const ownerOAuth = createChatGPTOAuth({ db, env: { ...env, AI_SETTINGS_ENCRYPTION_KEY: 'k'.repeat(40) }, appId: 'app', verifyFirebaseToken: async () => ({ uid: 'owner' }), fetchImpl: () => { throw new Error('Network forbidden'); } });
  const expired = reply(); await ownerOAuth.callback(http('POST', { body: setup, headers: { origin: 'https://example.com', authorization: 'Bearer firebase-token' } }), expired); assert.equal(expired.statusCode, 403);
});

test('disconnect during pending authorization cannot restore a revoked connection', async () => {
  const db = oauthDB(); const oauth = createChatGPTOAuth({ db, env: { ...env, AI_SETTINGS_ENCRYPTION_KEY: 'k'.repeat(40) }, appId: 'app', verifyFirebaseToken: async () => ({ uid: 'owner' }), verifyIdentity: async () => ({ sub: 'subject' }), fetchImpl: async () => new Response(JSON.stringify({ id_token: 'mock-id' }), { headers: { 'Content-Type': 'application/json' } }) });
  const setup = await oauth.start('owner', 'owner'); const prepared = reply();
  await oauth.callback(http('POST', { body: setup, headers: { origin: 'https://example.com', authorization: 'Bearer token' } }), prepared);
  const cookie = prepared.headers['Set-Cookie'].split(';')[0];
  await db.doc('artifacts/app/users/owner/aiConnections/chatgpt').set({ connected: false, billingChoice: 'none', generation: 'disconnected-generation' });
  const completed = reply(); await oauth.callback(http('GET', { query: { state: setup.state, code: 'mock-code' }, headers: { cookie } }), completed);
  assert.ok(completed.location.includes('aiConnection=failed')); assert.equal(db.data.get('artifacts/app/users/owner/aiConnections/chatgpt').connected, false);
});
