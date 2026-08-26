---
id: TP176
type: improvement
feature: platform-integrations
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN156
related: []
---

# TP176 — Test plan: enforce API keys with a real guard

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | Missing header rejected | Call the guard with no `X-API-Key` header | `UnauthorizedException`, `verify()` never called |
| 2 | Invalid/revoked key rejected | `verify()` returns `null` | `UnauthorizedException` |
| 3 | Valid key activates | `verify()` returns `{client_org_id}` | Guard returns `true`, `req.apiKeyOrgId` set to the resolved org id |
| 4 | Org-scoping is strict | `listAppointmentsForOrg('org-a')` | Prisma query filters `clinic.client_org_id: 'org-a'`, never a caller-supplied value |
| 5 | Date filter | `listAppointmentsForOrg('org-a', '2026-08-26')` | `appointment_time` bounded to that UTC calendar day |
| 6 | No PHI in response shape | A row with patient/product/clinician relations | Returned shape has no patient field — id, start time, duration, status, service name, clinician name only |
| 7 | Full suite regression | Backend unit + integration | 91/91 suites / 1447/1447 tests; integration 4/4 / 387/387 unchanged — confirms clean `AppModule` boot with the new controller/guard |
| 8 | Lint/typecheck clean | `eslint src/api-keys`, `tsc --noEmit` | 0 errors |
