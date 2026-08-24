---
id: CTX-security-2026-08-24-req015
type: requirement
feature: security
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ015
related: [PLAN071, TP098, TR097]
---

# security — REQ015 slice: clinician verification + org-scoped API keys (2026-08-24)

Seventh of eight requirement slices in this pass (REQ018 → REQ032 →
REQ034 → REQ022 → REQ030 → REQ031 → **REQ015** → REQ029).

## Documents

| Root | ID | Doc |
|---|---|---|
| implementation-plans | PLAN071 | [clinician verification + API keys](../../implementation-plans/security/requirement/PLAN071-security-2026-08-24-clinician-verification-and-api-keys.md) |
| test-plans | TP098 | [verification plan](../../test-plans/security/requirement/TP098-security-2026-08-24-clinician-verification-and-api-keys.md) |
| test-results | TR097 | [verification results — pass](../../test-results/security/requirement/TR097-security-2026-08-24-clinician-verification-and-api-keys.md) |

## What shipped

Clinician verification fields (`Clinicians` already had
`registration_number` from `REQ021` — confirmed via schema read, saving a
field) plus `medical_council`/`verification_status`/`verified_at`/
`verified_by_user_id`, an admin-attested interim path (not real HPR/NMC
API verification, explicitly deferred by the requirement doc). Org-scoped
`ApiKeys`, bcrypt-hashed like a password, the raw key returned exactly
once at issuance.

## A real finding: admin-only gating made this domain's isolation check unreachable

Identical root cause to `REQ030`'s own webhooks finding, caught by the
same review pass: `isPlatformOperator()` treats every `admin`/
`super_admin` caller as platform-wide unconditionally, so an admin-only
`@Auth()` gate on `api-keys` made its own `isSameOrg()` check unreachable.
Fixed by widening to include `manager`.

## What's deliberately NOT built

`US-SEC-09` (SSO/SAML/OIDC) — needs a real external identity-provider
integration. The issued API keys are also not yet wired to any guard (no
public API exists to authenticate into yet — see `REQ030`).

## Next in this pass

REQ029 (patient report group + scheduled delivery) — the final slice.
