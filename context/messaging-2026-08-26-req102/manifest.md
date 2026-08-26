---
id: CTX-messaging-2026-08-26-req102
type: improvement
feature: messaging
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ102
related: [PLAN142, TP166, TR166]
---

# messaging — REQ102: non-clinician staff department membership (2026-08-26)

Slice of the reconciled 14-slice batch (`project-plans/10-next-14-slice-batch-reconciled.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ102 | [non-clinician department membership](../../requirements/messaging/improvement/REQ102-messaging-2026-08-26-non-clinician-department-membership.md) |
| implementation-plans | PLAN142 | [implementation plan](../../implementation-plans/messaging/improvement/PLAN142-messaging-2026-08-26-non-clinician-department-membership.md) |
| test-plans | TP166 | [verification plan](../../test-plans/messaging/improvement/TP166-messaging-2026-08-26-non-clinician-department-membership.md) |
| test-results | TR166 | [verification results — pass](../../test-results/messaging/improvement/TR166-messaging-2026-08-26-non-clinician-department-membership.md) |

## What shipped

New `UserProfiles.department_id_ref` FK to `Departments` (migration
`20260826171000_userprofiles_department_ref`), deliberately separate
from the existing free-text `department` administrative label. New
`departmentId` field on `Staff`/`CreateStaffInput`/`UpdateStaffInput`,
validated via the existing `DepartmentsService.assertDepartmentInScope`
(Hard Rule 6). `messages.service.ts#resolveScopedMemberUserIds()` now
unions clinician-derived and staff-derived department members (removing
a pre-existing early-return that skipped the staff lookup entirely when
a department had zero clinicians). New "Clinical Department" Autocomplete
field on `staff/new.jsx` and `staff/edit.jsx`.

## Verification

4/4 backend suites, 90/90 tests, `tsc --noEmit` clean. Frontend lint
clean (0 errors). One real bug found and fixed during implementation:
`edit.jsx`'s save handler would have silently no-oped a "clear
department" action under this backend's partial-update convention —
fixed to send an explicit `null`.
