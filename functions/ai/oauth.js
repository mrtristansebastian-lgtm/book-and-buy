import { createHash, randomBytes } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { getAuth } from 'firebase-admin/auth';
import { encryptSecret, decryptSecret, safeEqual } from '../payments/encrypt.js';
import { aiError, encryptionKey } from './config.js';

const hash = value => createHash('sha256').update(value).digest('hex');
const random = () => randomBytes(32).toString('base64url');
const issuer = 'https://auth.openai.com';
const authorizeEndpoint = `${issuer}/api/accounts/authorize`;
const tokenEndpoint = `${issuer}/api/accounts/oauth/token`;
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`), { timeoutDuration: 10000 });
const inferenceScopes = ['chatgpt.tokens.use.direct', 'resource.invoke'];

export function oauthConfig(env) {
  let redirectUri; let returnUrl;
  try { redirectUri = new URL(env.CHATGPT_REDIRECT_URI); returnUrl = new URL(env.CHATGPT_RETURN_URL); } catch { return null; }
  const method = env.CHATGPT_TOKEN_AUTH_METHOD;
  if (env.AI_CHATGPT_OAUTH_ENABLED !== 'true' || !env.OPENAI_CLIENT_ID || redirectUri.protocol !== 'https:' || returnUrl.protocol !== 'https:' || redirectUri.origin !== returnUrl.origin || redirectUri.username || redirectUri.password || returnUrl.username || returnUrl.password || redirectUri.hash || !['none', 'client_secret_basic'].includes(method) || (method === 'client_secret_basic' && !env.OPENAI_CLIENT_SECRET)) return null;
  return { clientId: env.OPENAI_CLIENT_ID, redirectUri: redirectUri.href, returnUrl: returnUrl.href, origin: returnUrl.origin, method, clientSecret: env.OPENAI_CLIENT_SECRET || '', inference: env.AI_CHATGPT_INFERENCE_APPROVED === 'true' };
}
export async function verifyChatGPTIdentity(token, { clientId, nonce, keySet = jwks }) {
  const { payload } = await jwtVerify(token, keySet, { issuer, audience: clientId, algorithms: ['RS256', 'ES256'], requiredClaims: ['sub', 'iat', 'exp', 'nonce'], clockTolerance: 5 });
  if (!safeEqual(String(payload.nonce), nonce) || typeof payload.sub !== 'string' || !payload.sub) throw aiError('permission-denied', 'ChatGPT identity verification failed.');
  return payload;
}
async function verifyInferenceToken(token, config, identitySubject, keySet = jwks) {
  const { payload } = await jwtVerify(token, keySet, { issuer, audience: 'https://api.openai.com/v1', algorithms: ['RS256', 'ES256'], requiredClaims: ['sub', 'iat', 'exp', 'client_id', 'scope'], clockTolerance: 5 });
  const scopes = String(payload.scope || '').split(' ');
  if (payload.sub !== identitySubject || payload.client_id !== config.clientId || !inferenceScopes.every(scope => scopes.includes(scope))) throw aiError('permission-denied', 'ChatGPT has not granted inference access to this application.');
  return payload;
}
async function exchange(config, params, fetchImpl) {
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
  if (config.method === 'client_secret_basic') headers.Authorization = `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`;
  const response = await fetchImpl(tokenEndpoint, { method: 'POST', redirect: 'error', headers, body: new URLSearchParams({ ...params, client_id: config.clientId }), signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw aiError('failed-precondition', 'ChatGPT authorization could not be completed. Reconnect to try again.');
  return response.json();
}
export function createChatGPTOAuth({ db, env, appId, fetchImpl = fetch, verifyIdentity = verifyChatGPTIdentity, verifyAccess = verifyInferenceToken, verifyFirebaseToken = token => getAuth().verifyIdToken(token, true) }) {
  const states = () => db.collection(`artifacts/${appId}/aiOAuthStates`);
  const connection = uid => db.doc(`artifacts/${appId}/users/${uid}/aiConnections/chatgpt`);
  const configOrFail = () => { const config = oauthConfig(env); if (!config) throw aiError('unavailable', 'ChatGPT account connection requires an approved registered application.'); return config; };
  return {
    async start(uid, workspaceId) {
      const config = configOrFail(); const key = encryptionKey(env);
      const state = random(); const ticket = random(); const nonce = random(); const verifier = random();
      const expiresAt = Date.now() + 600000;
      const generation = ((await connection(uid).get()).data() || {}).generation || null;
      await states().doc(hash(state)).set({ uid, workspaceId, generation, stateHash: hash(state), ticketHash: hash(ticket), nonce, verifier: encryptSecret(verifier, key), expiresAt, consumed: false, prepared: false });
      // Browser binds this transaction with an authenticated HTTP request before navigation.
      return { setupUrl: config.redirectUri, setupTicket: ticket, state, expiresAt };
    },
    async callback(req, res) {
      res.set('Cache-Control', 'no-store'); res.set('Referrer-Policy', 'no-referrer');
      let config;
      try { config = configOrFail(); } catch { res.status(503).send('ChatGPT account connection is not configured.'); return; }
      const cookiePath = new URL(config.redirectUri).pathname;
      if (req.method === 'OPTIONS') {
        if (req.get('origin') !== config.origin) { res.status(403).end(); return; }
        res.set('Access-Control-Allow-Origin', config.origin); res.set('Access-Control-Allow-Credentials', 'true'); res.set('Access-Control-Allow-Headers', 'authorization,content-type'); res.set('Access-Control-Allow-Methods', 'POST,OPTIONS'); res.status(204).end(); return;
      }
      if (req.method === 'POST') {
        try {
          if (req.get('origin') !== config.origin) throw aiError('permission-denied', 'The connection must start from Book & Buy.');
          res.set('Access-Control-Allow-Origin', config.origin); res.set('Access-Control-Allow-Credentials', 'true');
          const bearer = req.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
          if (!bearer) throw aiError('unauthenticated', 'Sign in required.');
          const user = await verifyFirebaseToken(bearer);
          const state = String(req.body?.state || ''); const ticket = String(req.body?.setupTicket || '');
          if (!/^[A-Za-z0-9_-]{43}$/.test(state) || !/^[A-Za-z0-9_-]{43}$/.test(ticket)) throw aiError('invalid-argument', 'Invalid connection state.');
          const ref = states().doc(hash(state)); const browserBinding = random();
          const data = await db.runTransaction(async tx => {
            const snapshot = await tx.get(ref); const value = snapshot.data();
            if (!value || value.uid !== user.uid || value.expiresAt < Date.now() || value.prepared || value.consumed || !safeEqual(value.ticketHash, hash(ticket))) throw aiError('permission-denied', 'This connection request expired.');
            tx.update(ref, { prepared: true, bindingHash: hash(browserBinding), ticketHash: null }); return value;
          });
          const url = new URL(authorizeEndpoint);
          url.search = new URLSearchParams({ response_type: 'code', client_id: config.clientId, redirect_uri: config.redirectUri, scope: config.inference ? 'openid email profile offline_access chatgpt.tokens.use.direct resource.invoke' : 'openid email profile', state, nonce: data.nonce, code_challenge: createHash('sha256').update(decryptSecret(data.verifier.ciphertext, data.verifier.iv, encryptionKey(env))).digest('base64url'), code_challenge_method: 'S256' }).toString();
          // Hosting forwards only __session cookies to rewritten Cloud Functions.
          // A distinct value prefix and callback-only path isolate this binding.
          res.set('Set-Cookie', `__session=bbai.${browserBinding}; Path=${cookiePath}; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
          res.json({ authUrl: url.href, expiresAt: data.expiresAt });
        } catch { res.status(403).json({ error: 'Unable to prepare ChatGPT connection. Sign in and try again.' }); }
        return;
      }
      if (req.method !== 'GET') { res.status(405).end(); return; }
      res.set('Set-Cookie', `__session=; Path=${cookiePath}; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
      try {
        const state = String(req.query.state || ''); const code = String(req.query.code || '');
        const binding = req.get('cookie')?.match(/(?:^|;\s*)__session=bbai\.([A-Za-z0-9_-]{43})(?:;|$)/)?.[1];
        if (!/^[A-Za-z0-9_-]{43}$/.test(state) || !binding) throw aiError('permission-denied', 'Invalid connection state.');
        const ref = states().doc(hash(state));
        const data = await db.runTransaction(async tx => {
          const snapshot = await tx.get(ref); const value = snapshot.data();
          if (!value || !value.prepared || value.consumed || value.expiresAt < Date.now() || !safeEqual(value.bindingHash, hash(binding))) throw aiError('permission-denied', 'Invalid connection state.');
          tx.update(ref, { consumed: true, verifier: null, bindingHash: null, nonce: null }); return value;
        });
        if (!code || code.length > 4000 || req.query.error) throw aiError('failed-precondition', 'Authorization was declined.');
        const tokens = await exchange(config, { grant_type: 'authorization_code', code, redirect_uri: config.redirectUri, code_verifier: decryptSecret(data.verifier.ciphertext, data.verifier.iv, encryptionKey(env)) }, fetchImpl);
        const identity = await verifyIdentity(tokens.id_token, { clientId: config.clientId, nonce: data.nonce });
        let inference = false; let encrypted = null; let expiresAt = null;
        if (config.inference && typeof tokens.access_token === 'string') {
          const access = await verifyAccess(tokens.access_token, config, identity.sub); inference = true; expiresAt = access.exp * 1000;
          encrypted = encryptSecret(JSON.stringify({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token || null }), encryptionKey(env));
        }
        await db.runTransaction(async tx => {
          const ref = connection(data.uid); const current = (await tx.get(ref)).data() || {};
          if ((current.generation || null) !== data.generation) throw aiError('aborted', 'This connection request was revoked.');
          tx.set(ref, { provider: 'chatgpt', uid: data.uid, workspaceId: data.workspaceId, connected: true, type: inference ? 'oauth' : 'identity', issuer, clientId: config.clientId, subject: identity.sub, accountLabel: String(identity.email || identity.name || 'ChatGPT account').slice(0, 150), encrypted, expiresAt, generation: random(), updatedAt: Date.now() });
        });
        const url = new URL(config.returnUrl); url.searchParams.set('aiConnection', inference ? 'connected' : 'identity-only'); res.redirect(303, url.href);
      } catch {
        const url = new URL(config.returnUrl); url.searchParams.set('aiConnection', 'failed'); res.redirect(303, url.href);
      }
    },
    async credential(uid, stored) {
      const config = configOrFail();
      if (!config.inference || stored?.type !== 'oauth' || !stored.encrypted) throw aiError('unavailable', 'This ChatGPT connection has identity access only. Inference requires a separate approved grant.');
      const credentials = JSON.parse(decryptSecret(stored.encrypted.ciphertext, stored.encrypted.iv, encryptionKey(env)));
      if (stored.expiresAt > Date.now() + 60000) return credentials.accessToken;
      if (!credentials.refreshToken) throw aiError('failed-precondition', 'Reconnect ChatGPT to renew access.');
      const ref = connection(uid); const lease = random();
      await db.runTransaction(async tx => {
        const current = (await tx.get(ref)).data();
        if (current?.generation !== stored.generation || current.refreshLeaseUntil > Date.now()) throw aiError('aborted', 'ChatGPT connection changed. Try again.');
        tx.update(ref, { refreshLease: lease, refreshLeaseUntil: Date.now() + 30000 });
      });
      try {
        const tokens = await exchange(config, { grant_type: 'refresh_token', refresh_token: credentials.refreshToken }, fetchImpl);
        const access = await verifyAccess(tokens.access_token, config, stored.subject);
        if (!tokens.refresh_token) throw aiError('failed-precondition', 'Reconnect ChatGPT to renew access.');
        await db.runTransaction(async tx => {
          const current = (await tx.get(ref)).data();
          if (current?.generation !== stored.generation || current.refreshLease !== lease) throw aiError('aborted', 'ChatGPT connection changed.');
          tx.update(ref, { encrypted: encryptSecret(JSON.stringify({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token }), encryptionKey(env)), expiresAt: access.exp * 1000, refreshLease: null, refreshLeaseUntil: 0 });
        });
        return tokens.access_token;
      } catch (error) {
        await db.runTransaction(async tx => { const current = (await tx.get(ref)).data(); if (current?.refreshLease === lease) tx.update(ref, { refreshLease: null, refreshLeaseUntil: 0 }); }); throw error;
      }
    }
  };
}
