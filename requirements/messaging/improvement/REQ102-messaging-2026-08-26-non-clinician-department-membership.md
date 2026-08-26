---
id: REQ102
type: improvement
feature: messaging
created: 2026-08-26
updated: 2026-08-26
status: in-progress
parent: REQ058
related: [REQ014]
---

# REQ102 — Non-clinician staff department membership for message-thread auto-participant-add

## Why this slice

`REQ058` built department-scoped message threads with a create-time
auto-participant-add rule (`messages.service.ts#resolveScopedMemberUserIds`):
when a thread is created against a department, every **clinician** whose
`Clinicians.department_id` matches is added as a participant automatically.
Non-clinician staff (front-desk, pharmacy, finance, IT, security) have no
way to be added — `resolveScopedMemberUserIds` only ever looks at
`Clinicians.department_id`, never at anything on `UserProfiles` (the
model staff accounts are actually stored as — this codebase has no
separate `Staff` table, `staff/*.jsx` is `UserProfiles` scoped to
non-clinician/non-patient roles per its own schema comment).

Investigation found this is sharper than "staff have no department
concept at all" — `UserProfiles` already has a `department` column, but
it is a **free-text string** filled from a hardcoded frontend dropdown
(`frontend/src/pages/staff/{edit,new}.jsx`'s own `DEPARTMENTS` constant:
`['Front Desk', 'Management', 'General Practice', 'Laboratory',
'Finance', 'IT & Systems', 'Security', 'Pharmacy', 'Radiology']`) — an
**administrative** label, completely disconnected from the real
`Departments` Prisma entity (`REQ014`'s "specialty grouping for
clinicians/services" — clinical departments like Cardiology or
Orthopedics, org/clinic-scoped, admin-created via `/admin/departments`).
These are two distinct concepts that happen to share the English word
"department": one describes what team a staff member works in
day-to-day, the other describes a clinical specialty a message thread
can be scoped to. Conflating them would be wrong — a front-desk staffer
whose administrative `department` is "Front Desk" should still be
independently assignable to the *clinical* Cardiology department's
message threads if that's the coordination role they actually perform
(e.g. handling Cardiology-specific scheduling queries).

## Decision (Hard Rule 10 — logged, not silently assumed)

Add a **new**, separate nullable `department_id` FK on `UserProfiles`
pointing at the real `Departments` table, used exclusively for
message-thread (and any future department-scoped feature) membership.
The existing free-text `department` column is left untouched — it keeps
serving its current administrative-label purpose in `staff/index.jsx`'s
filter chips and `staff/edit.jsx`/`staff/new.jsx`'s form, with zero
behavior change. The two fields are allowed to disagree (e.g.
`department: "Front Desk"`, `department_id` → Cardiology) — that is the
intended, correct state, not a data-quality bug to reconcile.

## User story

As an org admin, I want to assign a non-clinician staff member (e.g. a
pharmacy or front-desk team member) to one or more clinical departments,
so that when a department-scoped message thread is created, that staff
member is automatically included as a participant the same way a
department's own clinicians already are.

## Acceptance criteria

- **Given** a staff member has been assigned to Department X, **when** a
  new message thread is created scoped to Department X, **then** that
  staff member is added as a participant automatically, identically to
  how a Department-X clinician already is.
- **Given** a staff member has NOT been assigned to any department,
  **when** a department-scoped thread is created for any department,
  **then** that staff member is NOT auto-added.
- **Given** a staff member is assigned to Department X in Org A,
  **when** an admin in Org B attempts to assign that same staff member
  to a department that belongs to Org B, **then** the assignment is
  rejected (Hard Rule 6 cross-org FK validation) — a staff member's
  department assignment must belong to the same org as their own
  `client_org_id`.
- **Given** the existing `departmentThreads()` oversight query (any
  caller with department-management access can list every thread for a
  department regardless of their own participation), **when** this
  slice ships, **then** that query's behavior is unchanged — it already
  doesn't depend on participant membership.

## In scope

- New nullable `UserProfiles.department_id` FK → `Departments.id`.
- Admin UI: a "Clinical Department" field on `staff/edit.jsx` and
  `staff/new.jsx`, sourced from the real `departments` query (NOT the
  hardcoded `DEPARTMENTS` list), clearly labeled distinctly from the
  existing "Department" (administrative) field so an admin doesn't
  confuse the two.
- Extend `resolveScopedMemberUserIds()` to union clinician-derived
  participant ids with staff members whose `UserProfiles.department_id`
  matches.

## Deliberately out of scope

- Any change to the existing free-text `UserProfiles.department` field,
  its frontend dropdown, or any data migration reconciling the two
  concepts.
- Multi-department membership (a staff member assigned to more than one
  clinical department at once) — this slice ships a single nullable FK,
  matching `Clinicians.department_id`'s own single-department precedent
  exactly; a genuine multi-department need would be its own future slice
  with a join table.
- Any change to `departmentThreads()`'s own oversight-query semantics.
