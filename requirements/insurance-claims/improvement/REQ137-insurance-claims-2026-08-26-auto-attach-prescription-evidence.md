---
id: REQ137
type: improvement
feature: insurance-claims
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ131
related: [PLAN177, TP197, TR197]
---

# REQ137 — Auto-attach a claim's issued prescriptions as evidence (US-INS-06)

## Why this slice

`REQ131`'s own "Deliberately out of scope" section named this exact
story: *"Auto-attaching a signed prescription/diagnostics as claim
evidence (US-INS-06) — a real follow-on, not built this slice."*
Confirmed still true before starting: `grep -n "evidence\|Evidence"
backend/src/insurance/*.ts` had no hits, and `Claims` has no attachment/
evidence field or resolve path today.

## Scope, decided before starting

`REQ031`'s own doc names this story as "auto-attach a *signed*
prescription" — investigated what "signed" means on this domain first.
Unlike `Encounters` (which has a real `signed_at`/`locked` state
machine), a `Prescriptions` row has no separate signing step of its
own: `REQ021`'s original design and `REQ129`'s own doc both treat
`createPrescription` itself as the sign-off act ("issuing a script is a
clinical act"). So every `Prescriptions` row tied to a claim's
appointment already qualifies as evidence — there is no unsigned/draft
state to exclude.

Scoped to a **read-only resolve query**, not a new attachment-storage
subsystem: `Claims.appointment_id` → `Encounters` (1:1 via
`appointment_id @unique`) → `Prescriptions` (1:many via
`encounter_id`). No schema change, no new table.

## User story

As insurance-desk staff reviewing a claim, I want to see the
prescriptions issued during that claim's own appointment without
manually attaching or re-uploading anything, so the claim's supporting
evidence is always current and never requires a separate step to keep
in sync.

## Acceptance criteria

- **Given** a claim whose appointment has a real, signed-off
  encounter with prescriptions, **when** `claimEvidencePrescriptions` is
  queried, **then** it returns every prescription issued during that
  encounter, newest first, with drug names and items resolved (not raw
  ids).
- **Given** a claim whose appointment has no encounter yet (submitted
  ahead of the actual visit, or the patient never checked in), **then**
  the query returns an empty list, not an error.
- **Given** a caller without access to the claim (cross-org), **then**
  the query is rejected the same way `claim()` already is — reusing
  `loadClaimForUser`, not a second independent authorization check.

## In scope

- `PrescriptionsService#prescriptionsForEncounter(encounterId)` — a
  plain fetch + item/drug-name mapping, reusing the existing private
  `itemsToGraphQL` helper (no duplicated mapping logic).
- `InsuranceService#claimEvidencePrescriptions(claimId, user)` —
  access-controlled via the existing `loadClaimForUser`, then a single
  `encounters.findUnique({appointment_id})` lookup.
- `claimEvidencePrescriptions` query on `InsuranceResolver`, gated the
  same as `claims()`/`claim()` (`staff`, `manager`, `admin`,
  `super_admin`).

## Deliberately out of scope

- A frontend surface consuming this query — a natural next step (e.g.
  an "Evidence" section on a claims-desk detail view), not required to
  satisfy this story's own backend acceptance criteria; `manager/claims/
  index.jsx` (`REQ131`) is left unchanged this slice.
- Diagnostics/investigation-order evidence (`TestResults`) — `US-INS-06`
  names prescriptions specifically; a diagnostics equivalent is a
  separate, similarly-scoped follow-on, not bundled here.
- Manual attachment upload as a fallback for a claim with no encounter
  yet — the empty-list state is treated as legitimate, not a gap to
  paper over.
