---
id: TR166
type: improvement
feature: messaging
created: 2026-08-26
updated: 2026-08-26
status: done
parent: TP166
related: [PLAN142]
---

# TR166 — Test results: non-clinician staff department membership

## TP166 case outcomes

All 6 cases pass. `staff.service.spec.ts` gained 2 new cases (valid
`departmentId` persists, cross-org rejected — required adding a
`DepartmentsService` mock provider to all 3 existing `TestingModule`
setups in this spec file, since the service now has a new constructor
dependency). `messages.service.spec.ts` gained 2 new cases (staff-only
department membership, no duplicate participant across both paths) —
the 2 pre-existing department/clinic auto-add tests confirmed still
passing unchanged.

```
PASS src/staff/staff.service.spec.ts
PASS src/messages/messages.service.spec.ts
PASS src/messages/messages.resolver.spec.ts
PASS src/departments/departments.service.spec.ts

Test Suites: 4 passed, 4 total
Tests:       90 passed, 90 total
```

`npx tsc --noEmit` — clean.

Frontend: `npx eslint` on `staff/new.jsx`/`staff/edit.jsx` — 0 errors
(89 pre-existing warnings, none new). Neither page had an existing test
suite to extend; the new Autocomplete fields follow this file's own
existing form-state patterns, verified via lint/typecheck for this
slice. One real bug caught and fixed during implementation, not by a
test: `edit.jsx`'s save handler initially sent `departmentId:
form.clinicalDepartment?.id || undefined` — under this backend's
documented partial-update convention (an omitted field means "leave
unchanged"), clearing the Autocomplete would have silently no-oped
rather than clearing the stored department, the exact footgun class
already documented for the quiet-hours "Clear" button bug. Fixed to
send an explicit `null` when cleared.

## Full backend suite

`npx jest --maxWorkers=2` (whole codebase) confirms zero regressions
from the `UserProfiles`/`Departments` schema change and the
`resolveScopedMemberUserIds` rewrite.
