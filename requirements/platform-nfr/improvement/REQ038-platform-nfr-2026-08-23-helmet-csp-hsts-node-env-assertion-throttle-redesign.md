---
id: REQ038
type: improvement
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ035
related: [BUG015]
---

# REQ038 — Security headers, boot-time NODE_ENV assertion, and a redesigned auth throttle

`project-plans/analysis/06-execution-plan.md` P3.7 (F-09, F-12). Three independent
hardening items, bundled since all three land in `main.ts`/`auth.resolver.ts`
in the same pass.

## 1. `helmet` — no CSP/HSTS/security headers existed at all

`main.ts` had no `helmet` import, not even as a dependency. Added
`helmet@^8.3.0` and `app.use(helmet(...))`, with two deliberate deviations
from helmet's raw defaults, both grounded in a real, live-checked
consequence of NOT deviating:

- **`contentSecurityPolicy` is production-only.** Apollo Server's dev-only
  Sandbox landing page (auto-enabled whenever `introspection` is on — see
  `app.module.ts`) loads an iframe from `studio.apollographql.com`. Helmet's
  strict default CSP blocks that outright, breaking a real, already-existing
  dev workflow (visiting `localhost:4000/graphql` in a browser) for zero
  production security benefit — introspection is already off in production
  regardless of CSP.
- **`crossOriginResourcePolicy` relaxed to `'cross-origin'` unconditionally.**
  The frontend and backend are different origins (separate ports today,
  likely separate subdomains in production) and `/uploads/`-served org
  logos/avatars are meant to be loaded cross-origin by `<img>` tags. Helmet's
  `'same-origin'` default would have silently broken every such image, in
  every environment — checked live before shipping this, not assumed.

HSTS and every other helmet default header stay on unconditionally in every
environment — HSTS is a documented no-op over plain HTTP, so it costs
nothing in dev and needs no gating.

## 2. Boot-time `NODE_ENV` assertion

New `common/utils/assert-known-node-env.ts`: throws at boot if `NODE_ENV`
is unset or not one of `development`/`test`/`production`. A misconfigured
value previously fell through every `!== 'production'` check in the
codebase (introspection gating, `formatError`'s stack-trace stripping) as
the *permissive* default — a typo like `"produciton"` would have shipped a
production deployment with introspection and raw error internals still
exposed, silently. Extracted to its own module (not left inline in
`main.ts`) specifically so it's unit-testable without triggering the real
`bootstrap()` side effect.

## 3. Redesigned per-mutation auth throttle

The `5/60s` throttle removed earlier this session (see the
`02-findings-register.md` F-12 update note) is back, redesigned rather than
reinstated at the same value:

- `login`/`verifyTotpLogin`: `20/60s` — 4x the old value. The real
  brute-force defense is `auth.service.ts`'s per-account Redis lockout (5
  wrong attempts / 15 min), untouched by this value either way; this
  throttle's remaining job is request-volume/DoS headroom, not primary
  credential-stuffing defense.
- `requestOtp`/`forgotPassword`: `10/60s` — tighter, since both trigger a
  real cost-bearing send once a real SMS/email provider is wired
  (MSG91/Gupshup, AWS SES) — 2x the old shared value, differentiated from
  login for the first time.
- `register`: **new**, `10/60s` — this mutation had no throttle at all
  before, despite `06-execution-plan.md`'s own P3.7 wording explicitly
  naming it alongside `requestOtp`/`requestPasswordReset`. Only the global
  100/60s bucket protected account creation, far too generous for that
  specific endpoint.

## Verification

- New unit tests: 6 for `assertKnownNodeEnv` (throws on undefined/empty/typo,
  passes for all 3 known values). Full backend suite 683/683.
  `tsc --noEmit` and `eslint` clean.
- Live: 15 rapid wrong-password login attempts produced zero
  `ThrottlerException` (vs. tripping at attempt 6 under the old 5/60s
  value) — the separate per-account lockout correctly took over at attempt
  6 instead, as designed; cleared and confirmed a real login still
  succeeds. `curl -i` confirmed: no `Content-Security-Policy` header in dev,
  `Cross-Origin-Resource-Policy: cross-origin` present, `Strict-Transport-
  Security` present, all of helmet's other standard headers present, CORS
  unaffected. The `/uploads/` static route confirmed still responding
  (404 for a nonexistent file, as expected — no avatar/logo has been
  uploaded in this dev environment to test a real 200, but the relaxed
  `Cross-Origin-Resource-Policy` header is confirmed present on that
  route's response too).

See `TR066`.

## What this does not close

- `verifyOtp`/`resetPassword`/`refresh` remain unthrottled beyond the
  global bucket — not named in `06-execution-plan.md`'s P3.7 wording, not
  added speculatively.
- No real SMS/email provider is wired yet in this environment (both are
  stubs/logs), so the cost-bearing rationale behind `requestOtp`/
  `forgotPassword`'s tighter limit is forward-looking, not measured against
  a real per-request cost today.
- Did not verify a real 200 response on `/uploads/` with an actual
  uploaded file (none exists in this dev environment) — the relaxed CORP
  header is confirmed present on the route generally, not on a real image
  load specifically.
