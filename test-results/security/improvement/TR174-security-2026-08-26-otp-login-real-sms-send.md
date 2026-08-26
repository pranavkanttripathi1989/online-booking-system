---
id: TR174
type: improvement
feature: security
created: 2026-08-26
updated: 2026-08-26
status: done
parent: TP174
related: [PLAN154]
---

# TR174 — Test results: wire OTP-login SMS to the real per-org provider registry

## TP174 case outcomes

All 6 cases pass.

```
PASS src/auth/auth.service.spec.ts

Test Suites: 1 passed, 1 total
Tests:       52 passed, 52 total (4 new — cases 2-5; case 1 is the
                                    pre-existing test, unaffected)
```

Full backend suite:

```
Test Suites: 90 passed, 90 total
Tests:       1441 passed, 1441 total
```

`npx tsc --noEmit` — clean. `npx eslint src/auth/auth.service.ts
src/auth/auth.service.spec.ts` — 0 errors, 0 warnings.

Integration (case 6, real Postgres via `npm run test:int` from the
host):

```
Test Suites: 4 passed, 4 total
Tests:       387 passed, 387 total
```

Unchanged 387/387 confirms the real `AppModule` boots cleanly with
`AuthService`'s new `NotificationProviderConfigService` dependency —
no circular-import or DI-resolution issue from `NotificationsModule`
being `@Global()` rather than explicitly imported into `AuthModule`.

## No frontend change

The OTP-login GraphQL contract (`requestOtp`/`verifyOtp`'s arguments
and return shape) is completely unchanged — only the backend's own
send mechanism changed, from a `console.log` stub to a real provider
call. No frontend file needed touching.

## Live verification

Not performed against a real SMS provider account (none configured in
this dev environment) — an honestly logged gap, matching this
session's own established pattern for provider-dependent slices
(`REQ109`). The mocked-provider unit coverage (cases 2-5) exercises
the exact call shape a real provider would receive.
