---
id: PLAN037
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: BUG016
related: [TP064, TR063]
---

# PLAN037 — Wire patient/Profile.jsx and auth/forgot-password.jsx

No test-suggestions stage per `REQ013` Phase D — both pages wire against
already-existing real contracts (or a small, obvious extension of one).

## 1. Expose a patient's own `patient_id` via `me`

- `user.entity.ts`: `PatientInfoType { id, full_name }`; `AuthUserType.patient?: PatientInfoType`.
- `auth.service.ts`: `buildAuthUser()` resolves `patient` from
  `userProfile.patient_id`, mirroring the existing `clinician` lookup
  (including the `is_deleted` check).
- `graphql/queries.js`: `ME_QUERY` requests `patient { id full_name }`.

## 2. Allow patient self-service on `updatePatient`

- `patients.resolver.ts`: add `'patient'` to `updatePatient`'s `@Auth()`
  list. No service change — `update()` already calls `findOne()` first,
  which already self-scopes a `patient` caller to their own `patient_id`.

## 3. Rewrite `patient/Profile.jsx`

- Query `patient(id: user.patient.id)`, skip when unlinked, show an honest
  "not linked yet" message instead of fake data.
- Personal Information: real fields only (`first_name`, `last_name`,
  `email`, `phone`, `date_of_birth`, `gender`, `address`) via
  `updatePatient`. Dropped `bloodType` (no backing column).
- Medical Notes: real `notes` field, free text, read/write. Dropped the
  structured allergy/condition chip editors and the Insurance section
  entirely — no backend model for either.
- Notification Preferences: real `myNotificationPreferences`/
  `updateMyNotificationPreferences`, same contract `settings/index.jsx`
  already uses.

## 4. Wire `auth/forgot-password.jsx`

Replace the `setTimeout` fake with a real call to the existing `@Public()
forgotPassword` mutation. UI still shows the same generic success message
regardless of whether the email exists, matching the resolver's own
non-enumeration design.

## 5. Delete `Settings/NotificationTemplates.jsx`

Confirmed zero importers; the real feature it names shipped elsewhere as
`admin/EmailTemplates.jsx` under `REQ011`.

## Verification plan

See `TP064`.
