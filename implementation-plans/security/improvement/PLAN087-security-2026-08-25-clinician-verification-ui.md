---
id: PLAN087
type: improvement
feature: security
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ060
related: []
---

# PLAN087 — Implementation plan for clinician verification UI

Technical implementation plan for `REQ060`. No backend change —
`updateClinicianVerification` and every field it reads already exist and
are already tested.

## Backend facts confirmed before designing the UI

- `updateClinicianVerification(id, status)` — `@Auth('admin',
  'super_admin')` only, not `manager`. The frontend gate must match this
  exactly (checked via `useAuth().user.roles`), or a manager would see a
  button whose mutation always 403s.
- `ClinicianType.verification_status`/`verified_at` already selected by
  `CLINICIAN_FIELDS` fragment? No — confirmed absent, so the fragment in
  `frontend/src/graphql/queries.js` needed extending (additive,
  backward-compatible: `registration_number`, `medical_council`,
  `verification_status`, `verified_at`).
- No enum validation on `status` server-side beyond whatever
  `clinicians.service.ts`'s `updateVerification` accepts — confirmed it
  accepts `'verified'`/`'rejected'`/`'pending'` (the third used by this
  slice's own "re-open for review" action, not in the original finding's
  suggested scope but a natural, low-risk addition matching the same
  mutation).

## Frontend — `frontend/src/pages/clinicians/detail.jsx`

- `graphql/queries.js`'s `CLINICIAN_FIELDS` fragment extended with
  `registration_number`, `medical_council`, `verification_status`,
  `verified_at`.
- New inline `UPDATE_CLINICIAN_VERIFICATION` mutation (this domain
  already has other new-mutation precedent shipped inline rather than in
  the shared `mutations.js`, matching `05-cross-cutting-conventions.md`'s
  guidance for a page-scoped addition to an established page).
- `isVerifier = user?.roles?.some(r => ['admin','super_admin'].includes(r.name))`
  — computed once, gates every verification action's render, not just
  its enabled state (an admin-only action rendered-but-disabled for a
  manager would be worse UX than not rendering it, and this codebase's
  own convention elsewhere is to not render actions a role can never
  succeed at).
- `setVerification(status)` calls the mutation, `enqueueSnackbar`s the
  result (success or the real server error message), and `refetch()`s —
  matching the established snackbar-on-every-mutation convention from
  `REQ020`'s own BUG020 lesson (never let a mutation fail silently).

## Testing (see `TP114`)

- New `frontend/src/pages/clinicians/detail.test.jsx`: status chip and
  registration details render; Verify/Reject hidden for a non-verifier
  role; a successful verify updates the chip and shows the success
  snackbar; a mutation error surfaces via a snackbar.
- e2e coverage added to `frontend/e2e/gap-analysis-a4-a8.spec.js`
  (shared fixture file for this whole A-4–A-8 batch): admin verifies the
  real seeded clinician, confirms the chip and "Re-open for review"
  action, reverts to `pending` for repeatable runs.

## What this does not close

No bulk-verification list (e.g. an admin "pending verifications" queue
across all clinicians) — out of scope for this finding, and no backend
query exists to back one yet; logged as a possible future slice, not
silently dropped.
