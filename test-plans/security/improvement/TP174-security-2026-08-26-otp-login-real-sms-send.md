---
id: TP174
type: improvement
feature: security
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN154
related: [REQ114]
---

# TP174 — Test plan: wire OTP-login SMS to the real per-org provider registry

Skipping the test-suggestion stage per `CLAUDE.md`'s conditional rule —
additive wiring of an already-proven, already-tested provider-registry
call shape (`sendSms`/`sharePrescriptionViaWhatsapp`) into one more
call site.

## Cases

| # | Case | Expected |
|---|---|---|
| 1 | Registered phone, unregistered phone | Identical `{success: true}` response either way — TC-AUTH-API-011 unchanged |
| 2 | Registered phone, org has an active SMS provider | `getActiveConfigForOrg(org_id, 'sms')` called; `provider.send()` called with the real phone and a message containing the code |
| 3 | Registered phone, profile has no `client_org_id` | `getActiveConfigForOrg` never called; still `{success: true}` |
| 4 | Registered phone, org has no SMS provider configured | `provider.send()` never called; still `{success: true}` |
| 5 | Registered phone, `provider.send()` resolves `{sent: false}` | Still `{success: true}` — a delivery failure never surfaces to the caller |
| 6 (integration) | Real `AppModule` boot | `AuthService`'s new `NotificationProviderConfigService` dependency resolves cleanly (no DI error) — confirmed via a full `test:int` run |
