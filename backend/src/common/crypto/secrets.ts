import * as crypto from 'crypto';

// Shared at-rest encryption for anything stored in Postgres that must never
// be readable in plaintext by a database dump or a GraphQL query — SMS
// provider credentials (PLAN017) and TOTP secrets (PLAN016). AES-256-GCM:
// authenticated encryption, so a tampered ciphertext fails to decrypt rather
// than silently returning garbage. IV is random per call and prepended to
// the stored value, so decrypt() is self-contained — no separate IV column.

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // recommended for GCM
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!hex) {
    // Fails loudly rather than falling back to a hardcoded key or storing
    // plaintext — a misconfigured deployment should refuse to store secrets,
    // not silently store them insecurely.
    throw new Error('SETTINGS_ENCRYPTION_KEY is not set — cannot encrypt/decrypt stored secrets');
  }
  const key = Buffer.from(hex, 'hex');
  if (key.length !== 32) {
    throw new Error('SETTINGS_ENCRYPTION_KEY must be a 32-byte value, hex-encoded (64 hex characters)');
  }
  return key;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // iv || authTag || ciphertext, base64 — one opaque string to store.
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

export function decrypt(stored: string): string {
  const key = getKey();
  const raw = Buffer.from(stored, 'base64');
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

// Encrypts/decrypts a whole JSON object as one unit — used for provider
// credential blobs whose shape varies per provider (PLAN017) rather than
// per-field encryption, which would leak the field names in the clear.
export function encryptJson(value: Record<string, unknown>): string {
  return encrypt(JSON.stringify(value));
}

export function decryptJson<T = Record<string, unknown>>(stored: string): T {
  return JSON.parse(decrypt(stored));
}
