---
id: REQ060
type: improvement
feature: security
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ015
related: []
---

# REQ060 — Clinician verification UI

## Source

`project-plans/analysis/08-integration-gap-analysis.md` finding A-4 — a fresh sweep
cross-checking every backend GraphQL operation against real frontend
usage. Closes real, already-shipped backend capability from `REQ015`'s
own P0 scope that never got frontend UI.

## Current-state gap

`backend/src/clinicians/clinicians.resolver.ts:58` —
`updateClinicianVerification(id, status)`, gated `admin`/`super_admin`
only (verification is an identity-trust decision, a step above ordinary
roster management). Real, tested. `clinician.entity.ts`'s
`verification_status`/`verified_at`/`registration_number`/
`medical_council` fields exist on the schema, but nothing under
`frontend/src` ever displayed `verification_status` or called
`updateClinicianVerification` — confirmed zero matches outside the
backend. `REQ015`'s "admin-attested interim path" for clinician
verification had a mutation with no way to reach it.

## What shipped

`pages/clinicians/detail.jsx`'s hero section gained:

- A verification-status `Chip` (verified/pending/rejected/unverified,
  color-coded) next to the existing clinician-type chip.
- A registration-number/medical-council caption line, when either is set.
- Verify/Reject buttons, visible only to an `admin`/`super_admin` caller
  (`useAuth().user.roles`, matching the resolver's own gate — not just
  hidden client-side as the only control), shown while the clinician is
  neither verified nor rejected.
- A "Re-open for review" action once verified/rejected, resetting to
  `pending` — covers a real correction path (a wrong click, a lapsed
  registration) without needing direct DB access.

## User stories

- As an admin, I can see at a glance whether a clinician's registration
  has been verified, and mark it verified or rejected from their profile.
- As a manager or any non-admin caller, I can see the same status but
  have no action to change it — matching the backend's own trust gate.

## Acceptance criteria (Given/When/Then)

- **Given** an admin on a pending clinician's detail page, **when** they
  click Verify, **then** the real `updateClinicianVerification` mutation
  fires, the chip updates to "verified", and Verify/Reject are replaced
  by "Re-open for review".
- **Given** a manager (not admin/super_admin) on the same page, **then**
  no Verify/Reject/Re-open action is rendered at all.
- **Given** a mutation failure (e.g. a stale session), **then** the real
  error message is shown via a snackbar, not a silent no-op.

## Traceability

`REQ015` (US-SEC-07, admin-attested interim verification path) — this
closes the frontend half; the backend mutation and schema fields already
shipped. No new `FR-*` scope — UI completion for already-specified
backend capability, matching this project's established
"backend created, frontend not integrated" gap-fix pattern.
