---
id: CTX-platform-nfr-2026-08-23-req038
type: improvement
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ038
related: [REQ035, REQ037, BUG015]
---

# platform-nfr — REQ038, security headers + NODE_ENV assertion + throttle redesign (2026-08-23)

Third slice of `06-execution-plan.md` P3. `helmet` added with two deliberate,
live-checked deviations from its defaults (CSP production-only for the
Apollo Sandbox, CORP relaxed for cross-origin avatar/logo loading), a
boot-time `NODE_ENV` assertion, and the earlier-reverted auth throttle
redesigned (higher, differentiated limits) rather than left removed.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ038 | [security headers + NODE_ENV assertion + throttle redesign](../../requirements/platform-nfr/improvement/REQ038-platform-nfr-2026-08-23-helmet-csp-hsts-node-env-assertion-throttle-redesign.md) |
| implementation-plans | PLAN040 | [implementation](../../implementation-plans/platform-nfr/improvement/PLAN040-platform-nfr-2026-08-23-helmet-csp-hsts-node-env-assertion-throttle-redesign.md) |
| test-plans | TP067 | [verification plan](../../test-plans/platform-nfr/improvement/TP067-platform-nfr-2026-08-23-helmet-csp-hsts-node-env-assertion-throttle-redesign-verification.md) |
| test-results | TR066 | [verification results](../../test-results/platform-nfr/improvement/TR066-platform-nfr-2026-08-23-helmet-csp-hsts-node-env-assertion-throttle-redesign-verification.md) |
| test-suggestions | — | skipped — hardening against already-established patterns |

## What this does not do

- `verifyOtp`/`resetPassword`/`refresh` remain unthrottled beyond the
  global bucket.
- No real SMS/email provider is wired in this environment, so the
  cost-bearing rationale for the tighter `requestOtp`/`forgotPassword`
  limit is forward-looking.
