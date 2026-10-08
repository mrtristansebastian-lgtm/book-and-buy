import { createHash, randomBytes } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { getAuth } from 'firebase-admin/auth';
import { encryptSecret, decryptSecret, safeEqual } from '../payments/encrypt.js';
import { aiError, encryptionKey } from './config.js';
import { connectionFingerprint } from './connection.js';

const hash = value => createHash('sha256').update(value).digest('hex');
const random = () => randomBytes(32).toString('base64url');
const issuer = 'https://auth.openai.com';
const authorizeEndpoint = `${issuer}/api/accounts/authorize`;
const tokenEndpoint = `${issuer}/api/accounts/oauth/token`;
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`), { timeoutDuration: 10000 });
const inferenceScopes = ['chatgpt.tokens.use.direct', 'resource.invoke'];
const discoveryCache = new WeakMap();
const terminalRefreshErrors = new Set(['invalid_grant', 'invalid_refresh_token', 'token_expired', 'refresh_token_expired', 'refresh_token_invalidated', 'refresh_token_reused']);
const formEncode = value => new URLSearchParams({ value }).toString().slice(6);
const refreshTime = value => { const time = Number(value); return Number.isFinite(time) && time > 0 ? time < 100000000000 ? time * 1000 : time : null; };
async function discover(fetchImpl) {
  const cached = discoveryCache.get(fetchImpl);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const response = await fetchImpl(`${issuer}/.well-known/openid-configuration`, { redirect: 'error', signal: AbortSignal.timeout(10000), headers: { Accept: 'application/json' } });
  if (!response.ok) throw aiError('unavailable', 'ChatGPT sign-in is temporarily unavailable. Try again later.');
  const value = await response.json();
  if (value.issuer !== issuer || value.authorization_endpoint !== authorizeEndpoint || value.token_endpoint !== tokenEndpoint || value.jwks_uri !== `${issuer}/.well-known/jwks.json`) throw aiError('unavailable', 'ChatGPT issuer configuration could not be verified.');
  discoveryCache.set(fetchImpl, { value, expiresAt: Date.now() + 3600000 }); return value;
}

export function oauthConfig(env) {
  let redirectUri; let returnUrl;
  try { redirectUri = new URL(env.CHATGPT_REDIRECT_URI); returnUrl = new URL(env.CHATGPT_RETURN_URL); } catch { return null; }
  const method = env.CHATGPT_TOKEN_AUTH_METHOD;
  if (env.AI_CHATGPT_OAUTH_ENABLED !== 'true' || !/^oaiapp_[A-Za-z0-9_-]{1,200}$/.test(env.OPENAI_CLIENT_ID || '') || redirectUri.protocol !== 'https:' || returnUrl.protocol !== 'https:' || redirectUri.origin !== returnUrl.origin || redirectUri.username || redirectUri.password || returnUrl.username || returnUrl.password || redirectUri.hash || redirectUri.search || !['none', 'client_secret_basic'].includes(method) || (method === 'client_secret_basic' && !env.OPENAI_CLIENT_SECRET)) return null;
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
  const discovery = await discover(fetchImpl);
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
  if (config.method === 'client_secret_basic') headers.Authorization = `Basic ${Buffer.from(`${formEncode(config.clientId)}:${formEncode(config.clientSecret)}`).toString('base64')}`;
  const response = await fetchImpl(discovery.token_endpoint, { method: 'POST', redirect: 'error', headers, body: new URLSearchParams({ ...params, client_id: config.clientId, ...(config.inference ? { resource: 'https://api.openai.com/v1' } : {}) }), signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    let tokenCode; try { tokenCode = (await response.json()).error; } catch { /* no provider body reaches logs or the browser */ }
    if (terminalRefreshErrors.has(tokenCode)) throw Object.assign(aiError('failed-precondition', 'Reconnect ChatGPT to renew access.'), { reconnectRequired: params.grant_type === 'refresh_token' });
    if (tokenCode === 'invalid_client') throw aiError('unavailable', 'The ChatGPT application registration needs attention.');
    throw aiError('unavailable', 'ChatGPT authorization is temporarily unavailable. Try again later.');
  }
  const tokens = await response.json();
  if (!tokens || typeof tokens !== 'object' || (params.grant_type === 'authorization_code' && typeof tokens.id_token !== 'string') || (params.grant_type === 'refresh_token' && typeof tokens.access_token !== 'string') || (tokens.token_type && String(tokens.token_type).toLowerCase() !== 'bearer')) throw aiError('failed-precondition', 'ChatGPT returned an incomplete authorization. Reconnect to try again.');
  return tokens;
}
export function createChatGPTOAuth({ db, env, appId, fetchImpl = fetch, verifyIdentity = verifyChatGPTIdentity, verifyAccess = verifyInferenceToken, verifyFirebaseToken = token => getAuth().verifyIdToken(token, true) }) {
  const states = () => db.collection(`artifacts/${appId}/aiOAuthStates`);
  const connection = uid => db.doc(`artifacts/${appId}/users/${uid}/aiConnections/chatgpt`);
  const configOrFail = () => { const config = oauthConfig(env); if (!config) throw aiError('unavailable', 'ChatGPT account connection requires an approved registered application.'); return config; };
  return {
    async start(uid, workspaceId, { intent = 'connect', expectedRevision } = {}) {
      const config = configOrFail(); const key = encryptionKey(env);
      if (!['connect', 'reconnect', 'replace', 'enable-plan'].includes(intent)) throw aiError('invalid-argument', 'Choose a supported connection action.');
      const previous = (await connection(uid).get()).data() || {};
      if (expectedRevision && expectedRevision !== connectionFingerprint(previous)) throw aiError('aborted', 'Your ChatGPT connection changed. Refresh before continuing.');
      if (intent === 'enable-plan' && (!config.inference || !previous.connected)) throw aiError('failed-precondition', 'Plan permission requires an approved integration and a connected identity.');
      await discover(fetchImpl);
      const state = random(); const ticket = random(); const nonce = random(); const verifier = random();
      const expiresAt = Date.now() + 600000;
      const generation = previous.generation || null;
      await states().doc(hash(state)).set({ uid, workspaceId, generation, intent, requestInference: config.inference, stateHash: hash(state), ticketHash: hash(ticket), nonce, verifier: encryptSecret(verifier, key), expiresAt, consumed: false, prepared: false });
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
          if (user.firebase?.sign_in_provider === 'password' && user.email_verified !== true) throw aiError('permission-denied', 'Verify your email before connecting AI.');
          const state = String(req.body?.state || ''); const ticket = String(req.body?.setupTicket || '');
          if (!/^[A-Za-z0-9_-]{43}$/.test(state) || !/^[A-Za-z0-9_-]{43}$/.test(ticket)) throw aiError('invalid-argument', 'Invalid connection state.');
          const ref = states().doc(hash(state)); const browserBinding = random();
          const data = await db.runTransaction(async tx => {
            const snapshot = await tx.get(ref); const value = snapshot.data();
            if (!value || value.uid !== user.uid || value.expiresAt < Date.now() || value.prepared || value.consumed || !safeEqual(value.ticketHash, hash(ticket))) throw aiError('permission-denied', 'This connection request expired.');
            tx.update(ref, { prepared: true, bindingHash: hash(browserBinding), ticketHash: null }); return value;
          });
          const url = new URL(authorizeEndpoint);
          url.search = new URLSearchParams({ response_type: 'code', client_id: config.clientId, redirect_uri: config.redirectUri, scope: data.requestInference ? 'openid email profile offline_access chatgpt.tokens.use.direct resource.invoke' : 'openid email profile', ...(data.requestInference ? { resource: 'https://api.openai.com/v1' } : {}), ...(data.intent === 'enable-plan' ? { prompt: 'consent' } : {}), state, nonce: data.nonce, code_challenge: createHash('sha256').update(decryptSecret(data.verifier.ciphertext, data.verifier.iv, encryptionKey(env))).digest('base64url'), code_challenge_method: 'S256' }).toString();
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
        const grantedScopes = typeof tokens.scope === 'string' ? tokens.scope.split(' ').filter(Boolean) : [];
        if (config.inference && typeof tokens.access_token === 'string' && inferenceScopes.every(scope => grantedScopes.includes(scope))) {
          const access = await verifyAccess(tokens.access_token, config, identity.sub); inference = true; expiresAt = access.exp * 1000;
          encrypted = encryptSecret(JSON.stringify({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token || null }), encryptionKey(env));
        }
        const pending = await db.runTransaction(async tx => {
          const ref = connection(data.uid); const current = (await tx.get(ref)).data() || {};
          if ((current.generation || null) !== data.generation) throw aiError('aborted', 'This connection request was revoked.');
          const candidate = { provider: 'chatgpt', uid: data.uid, workspaceId: data.workspaceId, connected: true, type: inference ? 'oauth' : 'identity', issuer, clientId: config.clientId, subject: identity.sub, accountLabel: String(identity.email || identity.name || 'ChatGPT account').slice(0, 150), encrypted, expiresAt, grantedScopes, refreshable: Boolean(inference && tokens.refresh_token), earliestRefreshAt: refreshTime(tokens.earliest_refresh_at), reconnectRequired: false, generation: random(), updatedAt: Date.now(), ...(current.subject === identity.sub && current.issuer === issuer && current.clientId === config.clientId && current.planUsageAcknowledgedVersion ? { planUsageAcknowledgedVersion: current.planUsageAcknowledgedVersion, planUsageAcknowledgedAt: current.planUsageAcknowledgedAt } : {}) };
          if (current.connected && (current.subject !== identity.sub || current.issuer !== issuer || current.clientId !== config.clientId)) {
            tx.update(states().doc(hash(state)), { pending: candidate, expiresAt: Date.now() + 600000, confirmationStatus: 'pending', expectedRevision: connectionFingerprint(current) });
            return true;
          }
          tx.set(ref, candidate); return false;
        });
        const url = new URL(config.returnUrl); url.searchParams.set('aiConnection', pending ? 'pending' : inference ? 'connected' : 'identity-only'); if (pending) url.searchParams.set('pendingConnection', hash(state)); res.redirect(303, url.href);
      } catch {
        const url = new URL(config.returnUrl); url.searchParams.set('aiConnection', 'failed'); res.redirect(303, url.href);
      }
    },
    async pending(uid, pendingId) {
      configOrFail();
      if (!/^[a-f0-9]{64}$/.test(pendingId || '')) throw aiError('invalid-argument', 'Invalid connection confirmation.');
      const value = (await states().doc(pendingId).get()).data();
      if (!value || value.uid !== uid || value.confirmationStatus !== 'pending' || value.expiresAt <= Date.now()) throw aiError('not-found', 'This account replacement expired. Connect again.');
      return { pendingId, accountLabel: value.pending.accountLabel, expectedRevision: value.expectedRevision, expiresAt: value.expiresAt };
    },
    async confirm(uid, workspaceId, pendingId, expectedRevision, accept = true) {
      const config = configOrFail();
      if (!/^[a-f0-9]{64}$/.test(pendingId || '') || !/^[a-f0-9]{64}$/.test(expectedRevision || '')) throw aiError('invalid-argument', 'Invalid connection confirmation.');
      return db.runTransaction(async tx => {
        const stateRef = states().doc(pendingId), connectionRef = connection(uid);
        const [snapshot, stored] = await Promise.all([tx.get(stateRef), tx.get(connectionRef)]);
        const value = snapshot.data(), current = stored.data() || {};
        if (!value || value.uid !== uid || value.workspaceId !== workspaceId) throw aiError('permission-denied', 'This account replacement belongs to another owner.');
        if (value.confirmationStatus === (accept ? 'confirmed' : 'dismissed')) return { ok: true };
        if (value.confirmationStatus !== 'pending' || value.expiresAt <= Date.now()) throw aiError('failed-precondition', 'This account replacement expired. Connect again.');
        if (value.expectedRevision !== expectedRevision || connectionFingerprint(current) !== expectedRevision || value.pending?.clientId !== config.clientId) throw aiError('aborted', 'Your ChatGPT connection changed. Refresh before replacing it.');
        if (accept) tx.set(connectionRef, value.pending);
        tx.update(stateRef, { pending: null, confirmationStatus: accept ? 'confirmed' : 'dismissed' });
        return { ok: true };
      });
    },
    async credential(uid, stored) {
      const config = configOrFail();
      if (!config.inference || stored?.type !== 'oauth' || !stored.encrypted) throw aiError('unavailable', 'This ChatGPT connection has identity access only. Inference requires a separate approved grant.');
      if (stored.clientId !== config.clientId || stored.issuer !== issuer) throw aiError('failed-precondition', 'Reconnect ChatGPT after the application configuration changed.');
      const credentials = JSON.parse(decryptSecret(stored.encrypted.ciphertext, stored.encrypted.iv, encryptionKey(env)));
      if (stored.expiresAt > Date.now() + 60000) return credentials.accessToken;
      if (!credentials.refreshToken) {
        await db.runTransaction(async tx => { const ref = connection(uid); const current = (await tx.get(ref)).data(); if (current?.generation === stored.generation) tx.update(ref, { reconnectRequired: true, encrypted: null, updatedAt: Date.now() }); });
        throw aiError('failed-precondition', 'Reconnect ChatGPT to renew access.');
      }
      if (stored.earliestRefreshAt > Date.now()) { if (stored.expiresAt > Date.now() + 5000) return credentials.accessToken; throw aiError('unavailable', 'ChatGPT access cannot be refreshed yet. Try again shortly.'); }
      const ref = connection(uid); const lease = random();
      const currentCredential = await db.runTransaction(async tx => {
        const current = (await tx.get(ref)).data();
        if (current?.generation !== stored.generation || !current.encrypted) throw aiError('aborted', 'ChatGPT connection changed. Try again.');
        if (current.expiresAt > Date.now() + 60000) return current;
        if (current.refreshLeaseUntil > Date.now()) throw aiError('aborted', 'ChatGPT is refreshing access. Try again shortly.');
        tx.update(ref, { refreshLease: lease, refreshLeaseUntil: Date.now() + 30000 });
        return null;
      });
      if (currentCredential) return JSON.parse(decryptSecret(currentCredential.encrypted.ciphertext, currentCredential.encrypted.iv, encryptionKey(env))).accessToken;
      try {
        const tokens = await exchange(config, { grant_type: 'refresh_token', refresh_token: credentials.refreshToken }, fetchImpl);
        const access = await verifyAccess(tokens.access_token, config, stored.subject);
        if (!tokens.refresh_token) throw Object.assign(aiError('failed-precondition', 'Reconnect ChatGPT to renew access.'), { reconnectRequired: true });
        await db.runTransaction(async tx => {
          const current = (await tx.get(ref)).data();
          if (current?.generation !== stored.generation || current.refreshLease !== lease) throw aiError('aborted', 'ChatGPT connection changed.');
          tx.update(ref, { encrypted: encryptSecret(JSON.stringify({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token }), encryptionKey(env)), expiresAt: access.exp * 1000, earliestRefreshAt: refreshTime(tokens.earliest_refresh_at), refreshable: true, reconnectRequired: false, refreshLease: null, refreshLeaseUntil: 0 });
        });
        return tokens.access_token;
      } catch (error) {
        await db.runTransaction(async tx => { const current = (await tx.get(ref)).data(); if (current?.refreshLease === lease) tx.update(ref, { refreshLease: null, refreshLeaseUntil: 0, ...(error.reconnectRequired ? { encrypted: null, reconnectRequired: true, updatedAt: Date.now() } : {}) }); }); throw error;
      }
    },
    async revoke(stored) {
      // Local disconnection completes even if the provider is unavailable. The
      // caller reports unconfirmed remote revocation instead of simulating it.
      try {
        const config = configOrFail();
        if (stored.clientId !== config.clientId || !stored.encrypted) return false;
        const tokens = JSON.parse(decryptSecret(stored.encrypted.ciphertext, stored.encrypted.iv, encryptionKey(env)));
        // An access-only grant remains locally disabled, but no remote
        // revocation has been confirmed for it by the approved refresh flow.
        if (!tokens.refreshToken) return false;
        const discovery = await discover(fetchImpl); const endpoint = new URL(discovery.revocation_endpoint);
        if (endpoint.origin !== issuer || endpoint.username || endpoint.password || endpoint.hash) return false;
        const headers = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
        if (config.method === 'client_secret_basic') headers.Authorization = `Basic ${Buffer.from(`${formEncode(config.clientId)}:${formEncode(config.clientSecret)}`).toString('base64')}`;
        const response = await fetchImpl(endpoint.href, { method: 'POST', redirect: 'error', headers, body: new URLSearchParams({ token: tokens.refreshToken, token_type_hint: 'refresh_token', client_id: config.clientId }), signal: AbortSignal.timeout(10000) });
        return response.status === 200;
      } catch { return false; }
    }
  };
}
