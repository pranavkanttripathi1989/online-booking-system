// PLAN016/PLAN017 — encrypt()/decrypt() (common/crypto/secrets.ts) read
// SETTINGS_ENCRYPTION_KEY from process.env at call time. Unit tests build a
// narrow TestingModule directly rather than bootstrapping the full Nest app,
// so ConfigModule never loads .env — set a fixed, valid-length test key here
// instead, once, for every suite that exercises TOTP secrets or provider
// credential encryption.
process.env.SETTINGS_ENCRYPTION_KEY = process.env.SETTINGS_ENCRYPTION_KEY || '0'.repeat(64);

// F-29. bcrypt at the production cost of 12 is a few hundred milliseconds per
// hash by design. staff.service.spec.ts verifies a REAL hash with a real
// bcrypt.compare, and under --maxWorkers=2 that intermittently blew Jest's 5s
// timeout — failing in the full run while passing in isolation, which is
// exactly the flake that teaches a team to re-run CI instead of reading it.
// Cost affects brute-force expense, not correctness, so 4 is free here.
// common/crypto/bcrypt-cost.ts refuses this override when NODE_ENV=production,
// and bcrypt-cost.spec.ts pins the production default at 12.
process.env.BCRYPT_COST = process.env.BCRYPT_COST || '4';
