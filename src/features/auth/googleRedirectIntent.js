const KEY = 'bookbuy-google-sign-in';
export function saveGoogleRedirectIntent(storage, { audience = 'business', returnPath = '' } = {}, now = Date.now()) {
  const intent = { audience: audience === 'individual' ? 'individual' : 'business', returnPath: safeReturnPath(returnPath), createdAt: now };
  storage.setItem(KEY, JSON.stringify(intent)); return intent;
}
function safeReturnPath(value) { return typeof value === 'string' && /^\/(?:app|dashboard|w|book|buy|shop)(?:\/|$)/.test(value) && !value.includes('\\') && value.length <= 500 ? value : ''; }
export function readGoogleRedirectIntent(storage, now = Date.now()) {
  try { const value = JSON.parse(storage.getItem(KEY) || 'null'); if (!value || !['business', 'individual'].includes(value.audience) || !Number.isFinite(value.createdAt) || now - value.createdAt > 600000 || value.createdAt > now + 5000) { clearGoogleRedirectIntent(storage); return null; } return { audience: value.audience, returnPath: safeReturnPath(value.returnPath), createdAt: value.createdAt }; } catch { return null; }
}
export function clearGoogleRedirectIntent(storage) { try { storage.removeItem(KEY); } catch { /* unavailable storage never changes authentication */ } }
