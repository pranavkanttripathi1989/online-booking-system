---
id: PLAN236
type: bug
feature: frontend-platform
created: 2026-08-30
updated: 2026-08-30
status: done
parent: BUG061
related: [BUG061, TP256, TR256]
---

# PLAN236 — fix 7 remaining page-sweep integration gaps

## Scope

`frontend/src/pages/profile/index.jsx`,
`frontend/src/pages/patients/EditPatientPage.jsx`,
`frontend/src/pages/clinicians/EditClinicianPage.jsx`,
`frontend/src/App.jsx` (route regrouping),
`frontend/src/pages/finances/index.jsx`,
`frontend/src/pages/patients/index.jsx`,
`frontend/src/pages/test-results/index.jsx`,
`frontend/src/pages/patients/detail.jsx`. No backend change.

## Approach

1. **`profile/index.jsx`**: `load()`'s `else` branch (falsy
   `data.myProfile`, no thrown error) now sets a real error message
   instead of seeding `MOCK_PROFILE`. The view-mode render and "Edit
   Profile" button are both guarded on `profile` being truthy so a null
   profile can never reach `profile.first_name` etc.
2. **`patients/EditPatientPage.jsx`**: added `error` to the
   `PATIENT_DETAIL_QUERY` destructure; the mock-seeding branch now
   requires a genuine `fetchError`; a new `!form` (post-loading) branch
   renders a real "Patient not found" state instead of an infinite
   skeleton.
3. **`clinicians/EditClinicianPage.jsx`**: added `error` to the
   `CLINICS_QUERY` destructure; the `clinics` derivation now gates the
   `MockStore.getClinics()` fallback on that `error` instead of
   `.length`.
4. **`App.jsx`**: moved `/test-results` out of the shared
   manager/admin-only block into its own dedicated `RoleGuard` (`admin`,
   `super_admin`, `manager`, `clinician`, `staff`), matching the exact
   pattern already used for `/queue`/`/waiting-room`/`/manager/
   registries` for the identical narrower-than-backend gap class.
5. **`finances/index.jsx`, `patients/index.jsx`, `test-results/
   index.jsx`**: wrapped the 3 flagged `<Table>`s in `<TableContainer>`
   — `TableContainer` was already imported in all three files.
6. **`patients/detail.jsx`**: `addRelatedAccount`/`addConsultation`'s
   success toasts gained the `"(demo mode — not saved)"` suffix, making
   the code match what `context/open-questions.md #13` already claims
   is true of this page. `context/open-questions.md` was not edited —
   the fix makes its existing claim accurate rather than needing a
   correction.

## Testing

- New `patients/EditPatientPage.test.jsx` (2 tests): real patient
  renders real data; a genuine `patient: null` result shows "Patient
  not found", never `MOCK_EDIT_DEFAULT`'s fabricated fields.
- Existing `test-results/index.test.jsx` (5 tests) and
  `patients/detail.test.jsx` (24 tests) re-run to confirm no
  regression from the `TableContainer` wrap and the toast-text change
  respectively — both fully green.
- `profile/index.jsx`'s fix was not given a dedicated new test this
  slice — `GET_MY_PROFILE` is a large local (non-exported) `gql`
  literal with many nested nullable sub-objects, making an accurate
  `MockedProvider` mock non-trivial to build safely within this pass;
  verified instead via `eslint`, a full `npm run build`, and manual
  review of the guard logic. See Test Suggestions below.
- `clinicians/EditClinicianPage.jsx`'s fix likewise has no new
  dedicated test this slice (no pre-existing test file for the page) —
  verified via `eslint` and `npm run build`.

## Test suggestions (not built this slice)

A dedicated `profile/index.test.jsx` (exercising the real-data,
genuine-error, and genuine-null-result paths) and a
`clinicians/EditClinicianPage.test.jsx` (the same three-way DATA-13
split already established for `manager/clinics/edit.jsx`/
`admin/users/form.jsx`) both belong in a future, focused test-plan
slice.

See `TP256`/`TR256`.
