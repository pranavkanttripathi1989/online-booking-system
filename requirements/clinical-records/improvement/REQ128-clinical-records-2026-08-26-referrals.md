---
id: REQ128
type: improvement
feature: clinical-records
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ020
related: [PLAN168, TP188, TR188]
---

# REQ128 — Referrals (FR-EMR-10)

## Why this slice

`REQ020`'s own P1/P2 deferral list named "referrals" as unbuilt scope.
Confirmed still true before starting: no `Referrals` table or mutation
existed anywhere in the schema or resolvers. Checked
`pages/patients/detail.jsx`'s "Letters" tab first, since its own empty
state explicitly mentions "Referral letters" — that tab is entirely
`useState`-local (`context/open-questions.md` #13, one of five sub-
features on that page deliberately left unbuilt pending a separate user
decision) and covers generic clinical correspondence with a Draft →
Pending Review → Approved workflow, a different concept from FR-EMR-10's
own "refer this patient to another specialty/clinician from within a
consultation." Left that page untouched and scoped this slice to the
EMR module where FR-EMR-10 actually lives, matching `REQ127`'s own
encounter-centric precedent exactly.

## User story

As a clinician in a consultation, I can refer the patient to another
specialty or a specific in-org clinician, record the reason and
urgency, and see every referral I've made for this encounter.

## Acceptance criteria

- **Given** an open (unsigned) encounter, **when** a clinician refers
  the patient with a specialty, reason, and optional urgency,
  **then** a `Referrals` row is created with `status: 'pending'`.
- **Given** a locked (signed) encounter, **when** a referral is
  attempted, **then** it is rejected with the same "signed and can no
  longer be edited" message every other clinical-content mutation on a
  locked encounter uses.
- **Given** no named clinician, **then** the referral still succeeds —
  a referral to a specialty in general (e.g. "referring out of
  network") is a valid outcome, not an error.
- **Given** a named `referred_to_clinician_id`, **when** that clinician
  belongs to a different org than the caller, **then** the referral is
  rejected (Hard Rule 6 — a caller-supplied FK is validated against the
  caller's own org before write, not trusted as-is).
- **Given** no `urgency` supplied, **then** it defaults to `'routine'`.
- **Given** an encounter with referrals, **when** it is fetched,
  **then** `referrals` on the response includes every referral tied to
  it, oldest first.

## In scope

- `Encounters.createReferral` mutation (clinician-only, matching every
  other clinical-content write on this domain).
- `encounter.referrals` field.
- A "Referrals" section on `EncounterWorkspace.jsx`, mirroring the
  existing Diagnoses/Investigations sections' UI exactly.

## Deliberately out of scope

- `pages/patients/detail.jsx`'s own "Letters" tab — a different,
  broader, still-paused feature (`context/open-questions.md` #13); not
  touched or conflated with this slice's own `Referrals` table.
- Referral status transitions beyond creation (`scheduled` /
  `completed` / `declined` exist as valid `status` values on the
  schema, matching the requirement's own lifecycle language, but no
  mutation to advance them was built this slice — the referring
  clinician's own workflow ends at "referral made"; tracking what
  happens next belongs to whichever staff/clinician handles the
  receiving side, out of this slice's scope).
- Any real inter-org or inter-facility referral routing/notification —
  this is a record of intent on the referring encounter, not a message
  sent anywhere.
