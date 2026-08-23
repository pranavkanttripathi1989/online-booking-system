---
id: TP073
type: improvement
feature: organizations
created: 2026-08-23
updated: 2026-08-23
status: approved
parent: REQ041
related: [PLAN046, TR072]
---

# TP073 — Verification for head-office branch designation

## Per-item contract

| ID | Case | Expected |
|---|---|---|
| TC-01 | `setHeadOffice()` on an org-linked clinic | Any other primary in the same org unset first, then this one set |
| TC-02 | `setHeadOffice()` on an org-less clinic | No unset step — other org-less clinics untouched |
| TC-03 | `setHeadOffice()` from a cross-tenant caller | Rejected `NotFoundException`, no `update`/`updateMany` call |
| TC-04 | Two clinics in the same org both set `is_primary=true` directly at the DB layer (bypassing the service entirely) | Rejected by the partial unique index |
| TC-05 | Two org-less clinics both `is_primary=true` | Allowed — NULL is distinct from NULL in the index |
| TC-06 | Full backend suite + `tsc --noEmit` + `eslint` | Clean |
| TC-07 | Frontend: mock-data clinic rows | Never show the head-office badge/action (`is_primary` is `undefined`, not `false`) |
| TC-08 | Frontend full Jest suite | No regression |
| TC-09 | Live: switch head office between two real clinics in the same real org | Confirmed via direct `psql` inspection before and after |

## How this was checked

TC-01–03 via Jest unit tests in `clinics.service.spec.ts` against a mocked
`PrismaService`. TC-04–05, TC-09 via live `psql`/GraphQL calls against the
real dev database — an actual attempted constraint violation, not a unit
assertion, since a partial unique index's actual enforcement can only be
proven against a real database engine. TC-06 via the backend container's
own `npx jest --maxWorkers=2`, `npx tsc --noEmit`, `npx eslint`. TC-07 via
code inspection (`toCardClinic`'s `is_primary: c.is_primary` passthrough,
strict `=== false` gate on the action button). TC-08 via the frontend
container's `npm test -- --watchAll=false`.
