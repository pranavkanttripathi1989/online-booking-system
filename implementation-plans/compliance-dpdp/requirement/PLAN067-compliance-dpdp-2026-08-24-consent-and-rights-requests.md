---
id: PLAN067
type: requirement
feature: compliance-dpdp
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ034
related: []
---

# PLAN067 — Implementation plan: consent capture + data-subject rights requests

## Scope

DPDP P0: purpose-specific, individually-withdrawable consent capture and a
data-subject-rights request queue (access/correction/erasure). Explicitly
NOT in scope: `DisclosureLog`, `RetentionPolicies`, the breach-response
runbook (P1/P2, or process rather than code per the requirement doc), and
any automated erasure/correction execution.

## Design decision — request+review, never instant self-service deletion

Read before designing: `account.service.ts` already has
`myDataExport(user)` (REQ012, real GDPR Art.20 JSON export) and
`deactivateMyAccount(user)` (soft-deactivation, not erasure) — no erasure
concept exists anywhere yet. This codebase's universal `is_deleted`
soft-delete convention only *hides* rows, it does not anonymize or purge
PII, so it cannot satisfy a real erasure right as-is.

The requirement doc's own Open Questions section states the actual tension
directly: churn-data retention (~90 days) versus clinical-record statutory
retention minimums, and requires erasure to "respect any legal-hold
override... with a clear explanation... rather than a silent refusal."
A healthcare app cannot let a patient erase a record still under statutory
retention automatically. `RightsRequests` is therefore a **request queued
for admin review** — `status` starts `pending`; an admin applies the
actual outcome by hand via `resolveRightsRequest`, which is itself a
status change (`approved | rejected | completed`) with an audit trail
(`resolved_at`, `resolved_by_user_id`, `notes`), never a data-mutation
trigger. Automating the erasure/correction action itself is explicitly out
of this slice's scope — the code's job here is capturing and SLA-tracking
the request (a 30-day default response window, a reasonable default, not a
specific cited statute), not performing an automated purge.

`Consents` is a separate, append-only table (one row per grant/revoke
event, not an upsert-in-place) — a DPDP consent audit trail needs to show
*when* consent was withdrawn, not just the current state.

Both tables reuse `REQ018`'s own dependant-aware patient self-scope
pattern (`PatientsService.ownAndDependantPatientIds`) — a `'patient'`-role
caller may act on their own record or a genuine dependant's, never an
arbitrary `patient_id` (Hard Rule 6's bug class, built correctly from day
one on a brand-new domain rather than retrofitted).

## Files touched

- `backend/prisma/schema.prisma` — new `Consents`, `RightsRequests` models.
- `backend/src/consent/` (new module) — `module/resolver/service`,
  `dto/consent.input.ts`, `entities/consent.entity.ts`.
- No frontend UI in this slice — the GraphQL surface (`patientConsents`,
  `updateConsent`, `requestDataRights`, `rightsRequests`,
  `resolveRightsRequest`) is real and tested; a patient-facing "Privacy &
  Consent" settings panel and a staff-facing rights-request review queue
  page are deliberately deferred, logged as open.

## GraphQL contract

Patient-facing: `patientConsents(patient_id)`, `updateConsent(input)`,
`requestDataRights(input)` — gated `patient, staff, manager, admin,
super_admin` (self-scoped for a patient caller). Staff-facing:
`rightsRequests(status)`, `resolveRightsRequest(id, input)` — gated
`manager, admin, super_admin`.

## Test plan

See `TP094`.

## Test results

See `TR093`.
