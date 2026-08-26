---
id: CTX-test-coverage-audit-2026-08-26-req141
type: improvement
feature: test-coverage-audit
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ141
related: [PLAN181, TP201, TR201]
---

# test-coverage-audit — REQ141: zod-schema test coverage, round 2 (2026-08-26)

Eighth slice of the next 10-slice batch (`project-plans/13-next-10-slice-batch.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ141 | [Zod-schema coverage round 2](../../requirements/test-coverage-audit/improvement/REQ141-test-coverage-audit-2026-08-26-zod-schema-coverage-round-2.md) |
| implementation-plans | PLAN181 | [implementation plan](../../implementation-plans/test-coverage-audit/improvement/PLAN181-test-coverage-audit-2026-08-26-zod-schema-coverage-round-2.md) |
| test-plans | TP201 | [verification plan](../../test-plans/test-coverage-audit/improvement/TP201-test-coverage-audit-2026-08-26-zod-schema-coverage-round-2.md) |
| test-results | TR201 | [verification results — pass](../../test-results/test-coverage-audit/improvement/TR201-test-coverage-audit-2026-08-26-zod-schema-coverage-round-2.md) |

## What shipped

`REQ132` named 7 zod-schema-using files with zero test coverage; this
slice picks the 2-3 highest-risk. Real, new coverage for `admin/
Roles.jsx` (RBAC role creation) and `clinicians/CreateClinicianPage.jsx`
(clinician-record creation) — 11 new tests total, covering each file's
own zod validation rules and a real create-mutation round trip.

**A real finding before writing a single test for the third**:
`patients/index.jsx`'s own named zod schema (`newPatientSchema`) turned
out to belong to `AddPatientDialog`, which is genuinely dead code —
never rendered, never exported, and not the target of the page's own
real "Add Patient" button (which navigates to a separate, real
`CreatePatientPage.jsx`). Its `open` state (`addOpen`) had a setter
that was never called anywhere either — doubly unreachable. Deleted
rather than tested, matching `REQ132`'s own precedent for
`utils/dateUtils.js`. Its `onSubmit` also silently treated any mutation
failure as success — moot now, but the same bug class this codebase
has fixed repeatedly elsewhere (`BUG023`).

## Verification

Frontend: 11/11 new tests pass across both new test files. `eslint`
clean on all touched/new files. Full lint ratchet improved (1909 →
1906) from the dead-code removal. `npm run build` succeeds. No backend
change.
