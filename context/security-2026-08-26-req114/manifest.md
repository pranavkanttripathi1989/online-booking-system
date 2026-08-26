---
id: CTX-security-2026-08-26-req114
type: improvement
feature: security
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ114
related: [PLAN154, TP174, TR174]
---

# security — REQ114: wire OTP-login SMS to the real per-org provider registry (2026-08-26)

First slice of the next 10-slice batch (`project-plans/analysis/11-next-10-slice-batch.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ114 | [OTP-login real SMS send](../../requirements/security/improvement/REQ114-security-2026-08-26-otp-login-real-sms-send.md) |
| implementation-plans | PLAN154 | [implementation plan](../../implementation-plans/security/improvement/PLAN154-security-2026-08-26-otp-login-real-sms-send.md) |
| test-plans | TP174 | [verification plan](../../test-plans/security/improvement/TP174-security-2026-08-26-otp-login-real-sms-send.md) |
| test-results | TR174 | [verification results — pass](../../test-results/security/improvement/TR174-security-2026-08-26-otp-login-real-sms-send.md) |

## What shipped

`auth.service.ts#requestOtp`'s `console.log('[OTP STUB]...')` — flagged
repeatedly across this session's history (most recently `REQ109`) —
replaced with a real call through the already-proven
`NotificationProviderConfigService#getActiveConfigForOrg`/
`provider.send()` shape `sendSms`/`sharePrescriptionViaWhatsapp`
already use. An org-less profile or an org with no SMS provider
configured is skipped silently; a send failure is logged but never
surfaces to the caller — `{success: true}` in every branch, preserving
the existing anti-account-enumeration guarantee (TC-AUTH-API-011).

## Verification

Backend: 90/90 unit suites, 1441/1441 tests (4 new); `tsc --noEmit` and
`eslint` clean. Integration: 4/4 suites, 387/387 tests — confirms the
real `AppModule` boots cleanly with `AuthService`'s new dependency
(resolved via `NotificationsModule`'s existing `@Global()` export, no
`AuthModule` import change needed). No frontend change — the GraphQL
contract is unchanged. No live-provider verification (none configured
in this dev environment), an honestly logged gap.
