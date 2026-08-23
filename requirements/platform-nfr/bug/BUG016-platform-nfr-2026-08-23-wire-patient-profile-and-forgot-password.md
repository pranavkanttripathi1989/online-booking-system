---
id: BUG016
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ035
related: [BUG009, BUG015]
---

# BUG016 — Two more fabricated pages wired to real data; a real gap found and closed along the way

Second slice of `project-plans/06-execution-plan.md` P2.1's remaining 4
fabricated pages. `patients/detail.jsx` is deliberately excluded from this
slice — see "What this does not close".

## 1. `patient/Profile.jsx` showed the same fake "Emma Wilson" to every patient

Every logged-in patient, regardless of who they actually were, saw an
identical hardcoded profile: DOB `1990-04-12`, a London address, a UK phone
number, "Penicillin"/"Latex" allergies, "Hypertension"/"Asthma" conditions,
and a fake Bupa Health insurance policy — none of it real, none of it
theirs. `seedFromAuth()` only ever overwrote 3 of 8 identity fields
(firstName/lastName/email) from the real logged-in user, leaving DOB,
phone, address, gender always fake. The notification-preference toggles
were pure local state, never persisted anywhere.

### The real gap this exposed: patients had no way to learn their own patient id

`AuthUserType` (the `me` query's return type) exposed `clinician` for a
linked clinician account, but had no equivalent `patient` field — a logged-in
patient had no way to discover their own `patient_id` to query the real,
already-self-scoped `patient(id)` field with. Added a `PatientInfoType`
(`id`, `full_name`) and a `patient` field on `AuthUserType`, populated in
`auth.service.ts`'s `buildAuthUser()` exactly mirroring the existing
`clinician` lookup (including the soft-delete check). `ME_QUERY` updated to
request it.

### The real gap this exposed: `updatePatient` had no patient-self-service path at all

`patients.resolver.ts`'s `updatePatient` mutation was gated to
`manager/admin/super_admin/clinician/staff/receptionist` only — a patient
could never edit their own profile through the real backend, at all,
regardless of the frontend. Checked `patients.service.ts`'s `update()`
first: it already calls `findOne(id, user)` before writing, which already
throws `NotFoundException` for a patient caller passing any id other than
their own `patient_id` — the self-scoping was already correct and already
tested. The only missing piece was the resolver's role gate. Added
`'patient'` to the `@Auth()` list — no new scoping logic needed, since
`update()`'s existing delegation to `findOne()` already covers it.

### Fix

- `backend/src/auth/entities/user.entity.ts`: added `PatientInfoType`,
  `AuthUserType.patient`.
- `backend/src/auth/auth.service.ts`: `buildAuthUser()` now resolves
  `patient` from `userProfile.patient_id`, same pattern as `clinician`.
- `backend/src/patients/patients.resolver.ts`: added `'patient'` to
  `updatePatient`'s `@Auth()` list.
- `frontend/src/graphql/queries.js`: `ME_QUERY` now requests
  `patient { id full_name }`.
- `pages/patient/Profile.jsx`: rewritten against the real `patient(id)`
  query (via `me.patient.id`) and the real `updatePatient` mutation for
  Personal Information; the real `myNotificationPreferences`/
  `updateMyNotificationPreferences` contract (same one `settings/index.jsx`
  already uses) for Notification Preferences. Dropped `bloodType` (no
  backing column exists on `Patients` at all) and the structured
  allergies/conditions chip editors and the Insurance section (no
  structured backend for any of these — see "What this does not close").
  Medical notes now read/write the real, single free-text
  `Patients.notes` field instead.
- An account with no linked `patient_id` (both seeded demo patient/clinician
  accounts are in this state) now sees an honest "not linked to a patient
  record yet" message instead of fake data.

## 2. `auth/forgot-password.jsx` never called the real backend

`handleSubmit` did `await new Promise(r => setTimeout(r, 1200))` then always
showed "Check your inbox" — the real, already-existing `@Public()
forgotPassword` mutation was never called, for any real user, ever. Fixed
to call it directly; the UI still shows the same generic success message
regardless of outcome (matching the resolver's own deliberate
non-enumeration design — the fix must not leak account existence either).

## 3. `Settings/NotificationTemplates.jsx` — dead code, deleted

Confirmed via repo-wide grep it has zero importers/routes. The real feature
it names shipped elsewhere, under `REQ011`, as `admin/EmailTemplates.jsx`
(routed at `/admin/email-templates`, wired to the real `email-templates`
domain) — this file was never that implementation, just an unused mock
draft left behind.

## Verification

- Live GraphQL: logged in as the demo patient account, temporarily linked to
  a real `Patients` row (reverted after) — confirmed `me.patient.id`
  resolves, `patient(id)` read succeeds, `updatePatient` self-update
  succeeds, and updating a *different* patient's id as the same caller is
  rejected with `NotFoundException` (fails closed, matches the codebase's
  established "not found, not forbidden" pattern).
- `forgotPassword` called live against the real backend, returns
  `{success: true}`.
- Backend: 665/665 unit tests pass (5 new: 3 for `buildAuthUser`'s new
  `patient` resolution, 2 for `updatePatient`'s self-service path).
  `tsc --noEmit` clean. `eslint` on touched files clean.
- Frontend: `eslint .` — 169 warnings (down from 177, ratchet lowered
  accordingly), 0 errors. `npm test` 63/63 pass. `npm run build` succeeds.

See `TR063`.

## What this does not close

- **`patients/detail.jsx` is not wired** — audited and found to be a
  1,000-line page with 8 tabs, most of which (letters, patient membership,
  intake questionnaires, document storage, a communication log, related
  accounts, structured allergy/diagnosis records) have zero backend at all
  and correspond to genuinely separate, already-logged PRD requirements
  (`REQ020` clinical-records, chiefly). Fully wiring it is not a bug-fix-
  sized change; only its `TableContainer` fix landed in `BUG015`. Left open,
  explicitly, rather than half-wired.
- **No structured allergy/condition/insurance model exists.** `patient/Profile.jsx`'s
  Medical Notes section is now real but free-text only — the same gap
  `patients/detail.jsx` has. Tracked under the same `REQ020`/insurance-claims
  (`REQ031`) requirements, not re-logged here.
- **No e2e coverage added** for either newly-wired page — verified via
  direct GraphQL calls, backend unit tests, and frontend lint/build/unit
  tests, not a live Playwright pass. A future regression on either flow
  would only be caught at the unit/manual level.
- Did not audit whether other role-specific profile-style pages have the
  same "fake seed data not fully overwritten by the real logged-in user"
  pattern — scoped to the two pages explicitly in `06-execution-plan.md`
  2.1's list.
