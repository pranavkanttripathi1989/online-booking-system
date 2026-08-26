---
feature: security
date: 2026-08-22
ids: [BUG003]
status: done
---

# security — 2026-08-22 (F-02: frontend mock-auth bypass)

Closed `project-plans/analysis/02-findings-register.md` F-02 (S1, client-side authentication and role bypass), the second of the audit's three S1 findings to close this session after `BUG002`/F-11.

Deleted the `mock_`-token trust branch and `MOCK_USERS` login fallback from `AuthContext.jsx`/`login.jsx` entirely, rather than gating or hardening them — there was no legitimate use for a client-side-only authenticated state once every real login path already issues a real JWT. Changed the `ME_QUERY` failure handler to always log out instead of falling back to a cached user. Rebuilt OTP login onto the real `requestOtp`/`verifyOtp` resolvers (previously a pure client-side simulation accepting a hardcoded `123456`), which required a real UI correction: the backend's `RequestOtpInput` is phone-only, so the "email or phone" field became "Phone Number" — matching the actual contract rather than the guessed one, per Hard Rule 7. Deleted `login-legacy.jsx` and its `/login-legacy` route outright (a second, less-visible copy of the same bypass) rather than fixing a duplicate page.

Distinguished in scope from `RegisterTab`'s separate, already-labeled-as-simulated registration form (`"Simulate registration — replace with real GraphQL mutation when backend ready"`) — that form never calls `login()` or grants a session, so it isn't an authentication bypass and wasn't touched here; it's a different, pre-existing gap (no real phone-based signup backend exists) that would be its own, larger slice.

Reproduced the exact bypass live before fixing it (planted a forged `mock_admin_token_001` + fabricated `super_admin` role directly into `localStorage`) and confirmed after the fix that reloading rejects it completely — `ME_QUERY` fails against the real backend, both storage keys clear, and the app redirects to `/login`. Also live-verified: real password login issues a real JWT and lands on `/dashboard`; a known-wrong password returns the server's real error instead of the old universal `"password"`/`"demo"` bypass; a full OTP login round-trip works end-to-end (requested a real code for a seeded phone number, read it from the backend's own console stub, verified it, landed authenticated).

## Bug

- [BUG003 — Frontend client-side authentication and role bypass (F-02)](../../requirements/security/bug/BUG003-security-2026-08-22-frontend-mock-auth-bypass.md) — done

## Testing

- `npx eslint` on every touched file — no new errors (pre-existing F-22 warnings unrelated).
- `npx jest` — 4/4 passing, unaffected.
- `e2e/auth-login.spec.js` — 2/2 passing against the live stack; a stale comment referencing the removed `MOCK_USERS` fallback corrected in the same change.
- `e2e/admin-roles.spec.js`, `dashboard.spec.js`, `manager-clinics.spec.js` — 6/6 passing combined, confirming `loginAs()` (shared by 29 of 31 e2e specs) is unaffected across Admin and Manager roles. One transient failure under 3-file parallel workers reproduced as pre-existing resource contention (the spec file's own header comment already documents this flakiness class) — confirmed unrelated by re-running the same file alone (2/2 pass).

## Related

- [security-2026-08-22 bundle](../security-2026-08-22/manifest.md) — `BUG002`/F-11, the first S1 finding closed this session; both were fixed in the same working session as part of `project-plans/analysis/06-execution-plan.md`'s Phase F.
- [project-plans/analysis/07-prd-gap-analysis-and-roadmap.md](../../project-plans/analysis/07-prd-gap-analysis-and-roadmap.md) — Phase F (foundation hardening) is the hard prerequisite this fix is part of, before any PRD-derived `REQ014`–`035` work begins.
