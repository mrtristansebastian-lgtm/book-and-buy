import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'crypto';

const ALGO = 'aes-256-gcm';

function deriveKey(secret) {
  const raw = String(secret || '').trim();
  if (!raw) {
    throw new Error(
      'PAYMENT_SETTINGS_ENCRYPTION_KEY is not set. Add a 32+ character secret to Functions env.'
    );
  }
  return createHash('sha256').update(raw).digest();
}

export function encryptSecret(plainText, envKey = process.env.PAYMENT_SETTINGS_ENCRYPTION_KEY) {
  const key = deriveKey(envKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([enc, tag]).toString('base64'),
    iv: iv.toString('base64')
  };
}

export function decryptSecret(
  ciphertext,
  iv,
  envKey = process.env.PAYMENT_SETTINGS_ENCRYPTION_KEY
) {
  const key = deriveKey(envKey);
  const buf = Buffer.from(String(ciphertext || ''), 'base64');
  const ivBuf = Buffer.from(String(iv || ''), 'base64');
  if (buf.length < 17) throw new Error('Invalid ciphertext');
  const data = buf.subarray(0, buf.length - 16);
  const tag = buf.subarray(buf.length - 16);
  const decipher = createDecipheriv(ALGO, key, ivBuf);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export function last4(value = '') {
  const raw = String(value || '').replace(/\s/g, '');
  return raw ? raw.slice(-4) : '';
}

export function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
