---
id: PLAN040
type: improvement
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ038
related: [TP067, TR066]
---

# PLAN040 — Security headers, boot-time NODE_ENV assertion, throttle redesign

No test-suggestions stage per `REQ013` Phase D.

## 1. `helmet`

- `npm install helmet` inside the backend container (updates
  `package.json`/`package-lock.json`, not just the anonymous
  `node_modules` volume).
- `main.ts`: `app.use(helmet({ contentSecurityPolicy: NODE_ENV === 'production', crossOriginResourcePolicy: { policy: 'cross-origin' } }))`,
  placed right after `NestFactory.create`, before `useStaticAssets`/CORS.

## 2. Boot-time `NODE_ENV` assertion

- New `common/utils/assert-known-node-env.ts`, exporting
  `assertKnownNodeEnv(env: string | undefined)` — pure function, no
  side effects beyond throwing, so it's testable without invoking
  `bootstrap()`'s real `NestFactory.create()`/`app.listen()` chain.
- `main.ts`'s `bootstrap()` calls it first, before anything else.
- New `assert-known-node-env.spec.ts`: 6 cases.

## 3. Throttle redesign

- `auth.resolver.ts`: re-add `@Throttle()` on `login`/`verifyTotpLogin`
  (20/60s), `requestOtp`/`forgotPassword` (10/60s, tighter — cost-bearing
  sends), and `register` (10/60s, **new** — never had one).

## Verification plan

See `TP067`.
