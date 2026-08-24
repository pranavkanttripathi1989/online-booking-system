---
id: TP094
type: requirement
feature: compliance-dpdp
created: 2026-08-24
updated: 2026-08-24
status: approved
parent: REQ034
related: [PLAN067]
---

# TP094 — Test plan: consent capture + data-subject rights requests

Direct test-plan; suggestion stage skipped per `CLAUDE.md` step 4 — this
is a genuinely new domain, but it reuses two already-proven, already-tested
patterns verbatim (`PatientsService.ownAndDependantPatientIds` self-scope,
the append-only-audit-trail convention), so it doesn't meet the
"first-of-its-kind UX" bar the suggestion stage is reserved for.

## Unit — `consent.service.spec.ts`

| Case | Given | When | Then |
|---|---|---|---|
| TC-01 | A `'patient'`-role caller acting on an arbitrary `patient_id` | `updateConsent` | Rejected `BadRequestException`, no write |
| TC-02 | Same caller, their own record | `updateConsent` | Succeeds |
| TC-03 | Same caller, a genuine dependant's record | `updateConsent` | Succeeds |
| TC-04 | `granted: false` vs. `granted: true` | `updateConsent` | `revoked_at` stamped only when `false` |
| TC-05 | `requestDataRights` | | `sla_due_at` set in the future; `status` left to the schema default (`'pending'`), never set explicitly by the service |
| TC-06 | A cross-org rights request | `resolveRightsRequest` | Rejected, `RightsRequests.update` never called |
| TC-07 | A same-org request | `resolveRightsRequest(status:'completed', notes)` | Only `status`/`notes`/`resolved_at`/`resolved_by_user_id` are written — never a data-mutation side effect |

## Integration — tenancy matrix

| Case | Given | When | Then |
|---|---|---|---|
| TC-08 | New `consent` domain-case (`rightsRequests` — the domain's only no-args list query; `patientConsents` requires a `patient_id` arg that doesn't fit the matrix's generic shape) | `matrix-coverage.int-spec.ts` + `tenancy.int-spec.ts` | Both pass; role-gated to `manager`/`admin`/`super_admin` |

## Static / build + full-suite gates

| Case | Command | Expected |
|---|---|---|
| TC-09 | `npx tsc --noEmit` | Clean |
| TC-10 | `npx eslint` | 0 errors |
| TC-11 | `npm test` | All green |
| TC-12 | `npm run test:int` | All green |
