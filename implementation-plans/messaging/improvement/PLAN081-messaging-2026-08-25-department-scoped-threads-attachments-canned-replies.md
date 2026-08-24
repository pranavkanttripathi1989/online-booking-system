---
id: PLAN081
type: improvement
feature: messaging
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ058
related: [REQ024, REQ050]
---

# PLAN081 — Implementation plan: department/branch-scoped threads, attachments, and canned replies

## Scope

`REQ058` (`US-MSG-01`/`US-MSG-03`, `REQ024`'s own P1 remainder) — the
final slice of this 8-slice batch.

## Research findings that shaped the design

`MessageThreads` had no `department_id`/`thread_type`/scoping concept at
all before this slice — genuinely new. `Attachments` (the encounters
domain's own attachment model) has a hard-required, single-purpose
`encounter_id` FK, not a polymorphic shape — confirmed no reusable
generic attachment table exists, so `MessageAttachments` is a new model,
not a widened existing one. `Departments` (`REQ014`) already exists
cleanly with `clinic_id`/`client_org_id`, and `Clinicians.department_id`
already exists (nullable) — both reused directly, no schema change needed
for member resolution beyond the new columns on `MessageThreads` itself.
`UserProfiles.clinic_id`/`.clinician_id` (both pre-existing, nullable)
were the load-bearing discovery: they're what makes "resolve every user
in department X" or "every user at clinic Y" a real, single-query
operation rather than something requiring new schema.

## Design

`resolveScopedMemberUserIds(departmentId?, clinicId?)`
(`messages.service.ts`, private): department path queries
`Clinicians.department_id` → `UserProfiles.clinician_id`; clinic path
queries `UserProfiles.clinic_id` directly. `createThread()` calls this
once, unions the result with the caller's own explicit
`participant_ids`, and creates the thread with `department_id`/
`clinic_id` set — `department_id` given always derives `clinic_id` from
that department's own row (`departmentsService.assertDepartmentInScope()`,
reused verbatim — the same Hard Rule 6 cross-domain FK check
`services.service.ts` already uses for its own `department_id` input); a
separately-supplied `clinic_id` is only honoured when no department was
given.

`departmentThreads(departmentId)` (new query, `manager`/`admin`/
`super_admin` gated) is the oversight path — lists every thread for a
department by direct `where: {department_id}`, with no participant check
at all, deliberately separate from `threads()`'s own unchanged
"caller-must-be-a-participant" query.

`MessageAttachments`: new sibling REST controller
(`message-attachments.controller.ts`) copying
`encounters/attachments.controller.ts`'s exact multer/signature/
manual-bearer-verify pattern (jpg/png/pdf allow-list, 10MB cap,
`/uploads/message-attachments/`), minus that controller's clinician-only
role check — any authenticated staff member can attach a file to a
message they're about to send; the real access check is in the paired
GraphQL mutation `createMessageAttachment`, which requires the caller to
already be a participant of the target message's own thread (mirroring
`sendMessage()`'s own check), matching the same two-step
upload-then-persist split `createEncounterAttachment` already
establishes.

`CannedReplies`: plain org-scoped CRUD, gated
`@Auth('staff','clinician','manager','admin','super_admin')` — excludes
`'patient'` deliberately, unlike `messageableContacts`/`threads` (which
stay open to every role): canned replies are a staff productivity tool,
not something a patient caller should see or manage.

`toGraphQL()` gained `thread_type`/`department_id`/`clinic_id` on the
thread shape, and each message's own `attachments` array (a new
`include: {attachments: true}` on the existing per-thread messages
query) — no new query, extending an existing one.

## Testing

`messages.service.spec.ts` — 20 new cases across four new describe
blocks: department/clinic scoping within `createThread` (cross-org
department rejected via `assertDepartmentInScope`, cross-org clinic
rejected, auto-add from a department, auto-add from a clinic,
deduplication against an already-explicit participant),
`departmentThreads` (cross-org rejected, lists regardless of the
caller's own participation), canned replies (org-scoped list, org-less
caller rejected on create, stamps the caller's own org/creator id,
cross-org update rejected without confirming existence, soft-delete),
and `createMessageAttachment` (nonexistent message, non-participant
caller rejected, happy path). All 18 pre-existing tests in this file
pass unchanged — the new constructor dependency (`DepartmentsService`)
needed a mock added to the existing spec's provider list, and the
existing strict-shape `createThread` assertion `toHaveBeenCalledWith(
{data: {client_org_id, last_message, last_activity}})` still passes
unchanged since the two new `department_id`/`clinic_id` keys are
`undefined` when omitted, which Jest's `toEqual`-based matching treats
as equal to their absence.

`cannedReplies` added to `matrix-coverage.int-spec.ts`'s `CASES` as a
second row on the already-covered `messages` domain (matching
`messageableContacts`'s own row) — real Postgres, real JWT, real guard
chain, with `allowedRoles` correctly excluding `'patient'` to match the
new `@Auth()` gate. `departmentThreads` was deliberately left unit-tested
only — it requires a `departmentId` argument the matrix's shared-query
shape isn't suited to the same way `cancellation-rules`' own no-required-
arg domains are, and its own cross-org rejection is already covered via
`assertDepartmentInScope`'s existing, separately-tested behaviour.

Full suite: backend unit — 80/80 suites, 1213/1213 tests (was 80/1198
after `REQ057`). `eslint`/`tsc --noEmit` clean.

## Out of scope (deferred, not silently dropped)

See `REQ058`'s own doc — `US-MSG-04`/`US-MSG-05`, non-clinician staff
department membership, frontend UI.
