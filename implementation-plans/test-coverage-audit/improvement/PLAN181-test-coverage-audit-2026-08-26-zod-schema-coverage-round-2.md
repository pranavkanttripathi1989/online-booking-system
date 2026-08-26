---
id: PLAN181
type: improvement
feature: test-coverage-audit
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ141
related: [TP201, TR201]
---

# PLAN181 — Implementation plan: zod-schema test coverage, round 2

## Change

**`frontend/src/pages/patients/index.jsx`**: removed the dead
`newPatientSchema` zod object and `AddPatientDialog` component in full
(comment header through closing brace), plus the now-fully-unused
imports (`useForm`, `Controller` from `react-hook-form`, `zodResolver`,
`z`, `CREATE_PATIENT_MUTATION`) and the dead `addOpen`/`setAddOpen`
state and now-unused `MenuItem` import. `MergePatientsDialog` and its
own `MERGE_PATIENTS_MUTATION` import are untouched — confirmed live
(rendered at the page's own line 621 pre-edit).

**`frontend/src/pages/admin/Roles.test.jsx`** (new): `MockedProvider`
with page-local re-declared `GET_ROLES_DATA`/`CREATE_ROLE` gql
documents (matching this file's own AST for exact-match, same
convention as `manager/claims/index.test.jsx`). Five cases: real-data
rendering; empty state; `roleSchema`'s `min(2)` validation blocking
submit (`getAllByRole('button', {name: 'Add Role'})[0]` disambiguates
the header button from `EmptyState`'s own identically-labelled action
button, both present when the role list is empty); the
no-permissions-selected warning renders but doesn't block; a full
create round trip asserting the exact mutation `input` (name,
description, `is_active`, `permission_ids` from `togglePermission`'s
own state) and the new role appearing after refetch. `Role Name`'s
label text includes a rendered required-asterisk span, so
`findByLabelText` needed a regex (`/^Role Name/`) — same fix
`reset-password.test.jsx` already established for an identical MUI
required-field quirk.

**`frontend/src/pages/clinicians/CreateClinicianPage.test.jsx`** (new):
imports the real canonical `CLINICS_QUERY`/`CLINICIAN_TYPES_QUERY`/
`SERVICES_QUERY`/`CLINICIANS_QUERY`/`CREATE_CLINICIAN_MUTATION` from
`graphql/{queries,mutations}.js` directly (not page-local re-declared —
matching `appointments/edit.test.jsx`'s own precedent for pages
consuming the canonical dialect). Six cases: real clinics power the
assignment dropdown; `clinicianSchema`'s required-field validation;
its email-format validation; the `.refine()` rule requiring a
"covering for" clinician once `is_locum` is toggled on; a full create
round trip; a real mutation failure surfaces via `enqueueSnackbar`
error, not a fake success. Needed `HelmetProvider` (the page renders
`<Helmet>`, which throws `TypeError: Cannot read properties of
undefined (reading 'add')` from `react-helmet-async`'s internal
dispatcher without one — not obvious from the error message itself,
found by reading the full stack trace) and a deterministic
`container.querySelector('#mui-component-select-clinic_ids')` for the
multi-select (MUI's own generated id from the Controller field's
`name`) since `getByLabelText`/`getByRole(..., {name})` don't reliably
resolve this Select's accessible name — the same known MUI quirk
`06-frontend-architecture-and-mobile.md` §7 already documents for a
Select once it can hold a value.

## Testing

`npx jest src/pages/admin/Roles.test.jsx
src/pages/clinicians/CreateClinicianPage.test.jsx`: 11/11 tests pass (all
new). `npx eslint` on all three touched/new files: 0 errors, only
pre-existing unrelated warnings on `patients/index.jsx` (18, down from
21 before this slice — the dead-code deletion also removed 3
`no-unused-vars` warnings). Full `npm run lint`: 1906 problems (0
errors), down from 1909 — the ratchet only ever needs to hold or drop,
and this slice dropped it. `npm run build` succeeds.

No backend change this slice.

## Documentation

`REQ141` (this requirement, includes the dead-code finding), `PLAN181`
(this plan), `TP201`/`TR201` (verification), a context bundle, and
index updates across all five doc roots plus the `test-coverage-audit`
feature README.
