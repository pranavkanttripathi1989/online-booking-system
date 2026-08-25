---
id: REQ058
type: improvement
feature: messaging
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ024
related: [REQ024, REQ050, REQ014, REQ020]
---

# Department/branch-scoped threads, attachments, and canned replies

## Source

`REQ024`'s own P1 remainder — `REQ050` already shipped shared-inbox
assignment and the SLA timer (`assigned_to_user_id`/`sla_due_at`); this
slice builds the two stories `REQ050` explicitly left open:
`US-MSG-01` (department/branch-scoped threads, file attachments) and
`US-MSG-03` (canned replies). `US-MSG-04` (auto-responder) and
`US-MSG-05` (clinical-record linkage) remain out of scope, per `REQ024`'s
own doc — not silently dropped.

## User stories

**US-MSG-01** (`FR-MSG-06`, P1) — As staff, I want 1:1/group threads
scoped to my branch/department, with file attachments, so that I can
coordinate with the right people without noise from other departments.

- Acceptance criteria: only department members (or an Org Admin) see a
  department-scoped group thread; messages support file attachments.

**US-MSG-03** (`FR-MSG-07`, P1) — As staff, I want canned replies, so
that I can respond to common questions quickly.

- Acceptance criteria: inserting a saved canned reply populates the
  compose body, editable before send.

## Design decision — create-time membership, not read-time visibility

The literal acceptance criterion ("only department members... see a
department-scoped group thread") could be read as a dynamic rule
re-evaluated on every read. Building it that way would mean changing
`threads()`'s own long-standing invariant — "the caller sees a thread iff
they are an explicit `MessageParticipants` row" — into something more
permissive, for every thread in the system, scoped or not. That's a much
larger blast radius than this story needs. Instead: creating a
department- or clinic-scoped thread auto-adds every resolvable member as
an explicit participant at create time. `threads()`/`thread()` are
**completely unchanged** by this slice — zero regression risk to every
thread that existed before it. The "or Org Admin" half of the AC is
covered by a new, separate oversight query
(`departmentThreads(departmentId)`, manager+ gated) that lists every
thread for a department regardless of the caller's own participation,
rather than folding admin access into the participant-based model.

## Data-model impact

- `MessageThreads` gains `thread_type` (default `'staff_internal'` — every
  thread created by this module before this slice was already,
  functionally, internal staff messaging; `'patient_clinic'` is the
  still-P1 `US-MSG-05`-adjacent story, not built here),
  `department_id`/`clinic_id` (both nullable — an unscoped thread, the
  default, behaves exactly as before).
- New `MessageAttachments` (one row per file, attached to a specific
  `message_id`, not the thread — matches how a real chat attachment
  works). Reuses `encounters/attachments.controller.ts`'s exact upload
  pattern (multer in-memory, magic-byte signature allow-list for
  jpg/png/pdf, manual bearer verify) via a new sibling REST controller,
  rather than widening `Attachments`' own hard-required, single-purpose
  `encounter_id` FK — every other FK in this schema is single-purpose the
  same way.
- New `CannedReplies` (org-scoped, staff-authored).

## Member resolution for auto-add

A department's members are resolved via `Clinicians.department_id` →
`UserProfiles.clinician_id` (the login-identity-to-domain-entity mapping
this codebase already uses everywhere else, e.g. the JWT's own
`clinician_id` claim). A branch-wide (clinic-scoped, no specific
department) thread's members are resolved directly via
`UserProfiles.clinic_id`. Both fields already existed on `UserProfiles`
before this slice — no new column needed for member resolution itself.

## Out of scope (deferred, not silently dropped)

`US-MSG-04` (emergency-notice/auto-responder), `US-MSG-05` (clinical-
record linkage — a message optionally entering the patient's clinical
record, flagged); non-clinician staff (e.g. `'staff'` role) department
membership — the resolution above only works for a clinician caller's own
`Clinicians.department_id`, since no non-clinician staff-to-department
assignment exists anywhere in this schema yet (a real, honest gap, not a
bug — such a caller still sees any scoped thread they were explicitly
added to, or any branch-wide thread via their own `UserProfiles.clinic_id`);
frontend UI (backend-only, per this batch's confirmed direction — canned-
reply insertion and file-attachment compose UI are both frontend work).
