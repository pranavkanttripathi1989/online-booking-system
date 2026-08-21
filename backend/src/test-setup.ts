// PLAN016/PLAN017 — encrypt()/decrypt() (common/crypto/secrets.ts) read
// SETTINGS_ENCRYPTION_KEY from process.env at call time. Unit tests build a
// narrow TestingModule directly rather than bootstrapping the full Nest app,
// so ConfigModule never loads .env — set a fixed, valid-length test key here
// instead, once, for every suite that exercises TOTP secrets or provider
// credential encryption.
process.env.SETTINGS_ENCRYPTION_KEY = process.env.SETTINGS_ENCRYPTION_KEY || '0'.repeat(64);
