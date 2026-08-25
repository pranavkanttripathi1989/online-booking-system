---
id: REQ065
type: improvement
feature: appointments
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ018
related: []
---

# REQ065 — Dependant self-scoping for prescriptions and test results

## Source

`CLAUDE.md`'s own "Picking this up on another machine" / "What's still
open" note on `REQ018`'s own residue: a dependant's self-scope was
widened for `patients.service.ts` (profile view) and
`appointments.service.ts` (booking) only when family/dependant profiles
shipped (`REQ018`'s P0 subset, 2026-08-24). `prescriptions.service.ts`'s
`patientPrescriptions`, `test-results.service.ts`, and `messages.service.ts`
were flagged as still restricting a `'patient'` caller to exactly their
own `patient_id`, not their dependants' too — logged as real,
security-sensitive follow-on work per domain, not a single mechanical
find-and-replace.

## Current-state gap (re-verified before starting, not assumed)

**`prescriptions.service.ts`** — `loadPrescriptionForUser()` (backing
`prescription()`) and `patientPrescriptions()` both compared
`prescription.patient_id !== (user.patient_id ?? '__no_patient_link__')`
directly — a patient caller viewing a dependant's prescription (e.g. a
child's antibiotic course) was rejected with `NotFoundException`, even
though the same caller can already view that dependant's profile and
book appointments for them (`REQ018`'s own P0 scope).

**`test-results.service.ts`** — `findAll()`'s `where` clause and
`findOne()`'s post-fetch check both used the identical strict-equality
pattern. Same gap: a dependant's lab results were unreachable by the
patient managing their care.

**`messages.service.ts`** — re-verified, and this domain turns out **not
actionable the same way**. Message access is scoped by
`MessageParticipants.user_id` (the caller's own `UserProfiles.id`), not
by any `patient_id` field — `MessageThreads`/`Messages` have no
`patient_id` column in the schema at all. A dependant `Patients` row has
no linked login of its own (`patients.service.ts`'s own comment:
"dependants have no login/contact of their own this slice"), so there is
no `user_id` to scope a dependant's messages by — nothing to widen here
without first deciding a genuinely new product concept (should a parent
see messages "about" a dependant at all, and how would that even be
represented without a login for the dependant to be a participant
under). This is a real open question, not a bug fix — logged as a new
`context/open-questions.md` entry rather than force-fitting a mechanical
widening that doesn't apply to this domain's data model.

## What shipped

`prescriptions.service.ts` and `test-results.service.ts` both now inject
`PatientsService` and call its existing, already-tested
`ownAndDependantPatientIds(user)` (built for exactly this purpose during
`REQ018`) instead of a strict `patient_id` equality check — the same
"own or dependant" definition already used by `patients.service.ts` and
`appointments.service.ts`, not a re-derived one.

## User stories

- As a patient managing a dependant's care (e.g. a parent for a minor
  child), I can view that dependant's prescriptions and lab results
  through the same account I use for my own, without a separate login.

## Acceptance criteria (Given/When/Then)

- **Given** a patient caller with a linked dependant, **when** they
  request the dependant's prescription (`prescription`/
  `patientPrescriptions`) or test result (`testResults`/`testResult`),
  **then** it is returned, not rejected.
- **Given** the same caller requesting a prescription/result belonging to
  neither themself nor a configured dependant, **then** it is still
  rejected with the existing `NotFoundException` — the widening adds
  dependant ids to the allow-list, it does not remove the check.
- **Given** an unlinked patient account (no `patient_id`), **then**
  `ownAndDependantPatientIds`'s own `'__no_patient_link__'` sentinel
  still fails closed, matching every other consumer of that helper.

## Traceability

`REQ018` (US-BOOK-02, family/dependant profiles) — this closes two of
the three domains its own residue note flagged. No new `FR-*` scope —
security-hardening completion for an already-specified feature.
