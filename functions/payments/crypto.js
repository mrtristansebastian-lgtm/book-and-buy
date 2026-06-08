const crypto = require('crypto');
const { defineSecret } = require('firebase-functions/params');

const PAYMENT_SETTINGS_ENCRYPTION_KEY = defineSecret('PAYMENT_SETTINGS_ENCRYPTION_KEY');

const toBuffer = (value) => (Buffer.isBuffer(value) ? value : Buffer.from(String(value || ''), 'utf8'));

const getEncryptionKey = () => {
  const raw = PAYMENT_SETTINGS_ENCRYPTION_KEY.value() || process.env.PAYMENT_SETTINGS_ENCRYPTION_KEY || '';
  if (!raw) {
    throw new Error('PAYMENT_SETTINGS_ENCRYPTION_KEY is required for payment gateway secrets.');
  }

  const encoding = /^[a-f0-9]{64}$/i.test(raw) ? 'hex' : 'base64';
  const key = Buffer.from(raw, encoding);
  if (key.length !== 32) {
    throw new Error('PAYMENT_SETTINGS_ENCRYPTION_KEY must decode to exactly 32 bytes.');
  }
  return key;
};

const encryptJson = (value = {}) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(JSON.stringify(value), 'utf8')),
    cipher.final()
  ]);

  return {
    algorithm: 'aes-256-gcm',
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: encrypted.toString('base64')
  };
};

const decryptJson = (payload = {}) => {
  if (!payload.ciphertext || !payload.iv || !payload.tag) return {};
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(payload.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final()
  ]);
  return JSON.parse(decrypted.toString('utf8'));
};

const hashHex = (algorithm, value) => crypto.createHash(algorithm).update(toBuffer(value)).digest('hex');

const hmacHex = (algorithm, secret, payload) => (
  crypto.createHmac(algorithm, toBuffer(secret)).update(payload).digest('hex')
);

const safeCompare = (expected, incoming) => {
  const left = toBuffer(String(expected || ''));
  const right = toBuffer(String(incoming || ''));
  if (!left.length || left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

const safeCompareHex = (expected, incoming) => (
  safeCompare(String(expected || '').toLowerCase(), String(incoming || '').toLowerCase())
);

module.exports = {
  PAYMENT_SETTINGS_ENCRYPTION_KEY,
  decryptJson,
  encryptJson,
  hashHex,
  hmacHex,
  safeCompare,
  safeCompareHex
};
