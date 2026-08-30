---
id: BUG061
type: bug
feature: frontend-platform
created: 2026-08-30
updated: 2026-08-30
status: done
parent: null
related: [PLAN236, TP256, TR256]
---

# BUG061 — 7 integration gaps in the remaining page sweep (profile/patients/clinicians/test-results/App routing)

## How it was found

Fourth and final slice of the "check all fronend page and fix the
backend and fronend intgartionn gap" audit — every remaining page
directory under `frontend/src/pages/` not covered by the `manager/`
(`BUG058`), `admin/` (`BUG060`), or `patient/`+`clinician/` (`BUG059`)
slices: `public/`, `auth/`, `appointments/`, `calendar/`, `clinicians/`,
`dashboard/`, `finances/`, `messages/`, `notifications/`, `onboarding/`,
`patients/`, `prescriptions/`, `profile/`, `queue/`, `reviews/`,
`settings/`, `share/`, `staff/`, `test-results/`, `video/`,
`waiting-room/`, `errors/`, `tasks/`, `booking/`.

## What was found and fixed

1. **DATA-13 — `profile/index.jsx`'s `load()`**: a real, successful
   `myProfile: null` result (never a legitimate state for one's own
   authenticated profile) was treated the same as a genuine network
   error, silently rendering `MOCK_PROFILE`'s fabricated identity.
   Fixed to show a real error banner (with retry) instead, and guarded
   the view/edit render against a null `profile` so the page cannot
   crash on `profile.first_name` etc.
2. **DATA-13 + missing not-found guard —
   `patients/EditPatientPage.jsx`**: identical gap to `admin/users/
   form.jsx`'s `EditUserPage` (`BUG060`) — a falsy `data.patient` fired
   the mock fallback and seeded the form regardless of whether it was a
   real error or a genuine "no such patient" result, with **no
   not-found guard at all**, so the page showed an infinite skeleton
   while quietly running on a fabricated default. A save from there
   would overwrite whichever real patient the id belongs to. Fixed to
   gate mock on a genuine `error` only, and added a real "Patient not
   found" state.
3. **DATA-13 — `clinicians/EditClinicianPage.jsx`'s clinics
   multi-select**: `clinicsData?.clinics?.length ? ... : MockStore
   .getClinics()` fired on a genuinely empty real result (an org with
   zero configured clinics), not just an error. Fixed to gate on
   `error`.
4. **SEC-18 — `/test-results` route narrower than backend `@Auth`**:
   gated `admin`/`super_admin`/`manager` only; `test-results.resolver
   .ts`'s `orderTest` allows `clinician`/`staff` too, and its own
   `testResults`/`testResult` queries carry no `@Auth` restriction at
   all. Fixed with a dedicated `RoleGuard` block (matching the existing
   `/queue`/`/waiting-room` precedent for the identical gap class).
5. **RES-3 — 3 missing `<TableContainer>` wraps**: the cash-drawer
   breakdown table in `finances/index.jsx`, the merge-duplicate-patients
   comparison table in `patients/index.jsx`, and the result-detail
   dialog table in `test-results/index.jsx`.
6. **Inconsistent demo-mode disclosure — `patients/detail.jsx`'s
   "Related Accounts" and "Medical History" tabs**: both are already a
   documented, deliberate, user-decision-pending gap
   (`context/open-questions.md #13` — a local-`useState`-only feature
   pending a real backend decision). That open question's own text
   claims "the page's `(demo mode)` toasts already disclose this
   locally" — true for the sibling `sendCommunication` toast, but NOT
   true for `addRelatedAccount`'s ("Related account added") or
   `addConsultation`'s ("Consultation record added"), both of which
   claimed unconditional real success. Fixed to say
   `"... (demo mode — not saved)"`, matching what the open question
   already asserts is the page's convention — **not** a new backend
   build, per the existing, still-open decision in `#13`.

## Not fixed this slice (correctly out of scope)

`tasks/index.jsx` remains the one fully-fabricated page with no
backend domain — already documented, not a new finding. Every other
page in this slice's scope (`public/*`, `auth/*`, `appointments/*`,
`calendar/*`, `dashboard/*`, `messages/*`, `notifications/*`,
`onboarding/*`, `prescriptions/*`, `queue/*`, `reviews/*`, `settings/*`,
`share/*`, `staff/*`, `video/*`, `waiting-room/*`, `errors/*`,
`booking/*`) confirmed clean.

See `PLAN236`/`TP256`/`TR256`.
