# Patients — Test Cases

**Domain covers:** Patient CRUD (admin/manager list, detail, create, edit), patient self-scoping, structured JSON fields (`address_structured`, `phones`), the patient's own self-service profile (`/patient/profile`) and dashboard (`/patient/dashboard`), a clinician's scoped view of their own patients (`/clinician/patients`), and patient test-results (lab reports) viewing — both the staff-facing `/test-results` list and the per-patient "Test Results" tab on `/patients/:id`.
**Grounded in:** `schema.prisma` (`Patients`, `UserProfiles`, `Appointments`, `Reviews`), `context/frontend-contract-analysis.md §2/§8`, and real QA history: `test-plan/patients-test-plan.md`, `test-plan/patient-test-plan.md`, `test-plan/patient-profile-test-plan.md` + `test-plan/patient-portal/patient-profile-test-plan-done.md`, `test-plan/patient-dashboard-test-plan.md` + `test-plan/patient-portal/patient-dashboard-test-plan-done.md`, `test-plan/clinician-patients-test-plan.md`, `test-plan/test-results-page-test-plan.md`, and their `test-result/`/`test-suggestion/` counterparts.
**Key schema fact:** `Patients` has **no `client_org_id` or `clinic_id` column of its own** — tenant/row-level scoping for a patient record can only be derived indirectly, via `Appointments.clinic_id → Clinics.client_org_id` or `UserProfiles.patient_id`. This is a real design gap the backend must close deliberately (e.g. a resolver-level join, or a denormalized `client_org_id` added to `Patients`), not an oversight to silently work around — several API cases below exist specifically to pin this down.

---

## 1. Unit Test Cases

### TC-PAT-UNIT-001 — Patient full name is derived consistently for avatar initials
- **Priority:** Medium
- **Steps:** Call the initials-derivation helper with `{first_name: "Alice", last_name: "Johnson"}`, then with `{first_name: "", last_name: "Wilson"}`, then with `{first_name: null, last_name: null}`.
- **Expected Result:** Returns `"AJ"`, `"?W"` (not `"undefinedW"` or a thrown error), and `"?"` respectively.
- **Notes:** Grounded in `test-suggestion/patient-profile-test-suggestion.md` SUG-PTPROF-002 — the frontend previously had exactly this null-guard bug (`profile.firstName[0]` threw/produced `"undefinedW"`); the backend/shared utility must not regress it once it becomes a shared server-rendered concern (e.g. notification templates using patient initials).

### TC-PAT-UNIT-002 — `address_structured` JSON validator enforces India address shape
- **Priority:** High
- **Steps:** Validate `{line1: "12 MG Road", city: "Bengaluru", state: "Karnataka", pincode: "560001", country: "IN"}` and then `{line1: "12 MG Road", city: "Bengaluru", pincode: "56001"}` (4-digit pincode, missing `state`).
- **Expected Result:** First object passes. Second is rejected — pincode must be exactly 6 digits, `state` is required.
- **Notes:** Per CLAUDE.md, address is `{line1, line2, city, state, pincode, country}`, not a free-text string — the current frontend mock (`Profile.jsx` "Home Address" field, e.g. `"14 Maple Street, London, W1A 1AA"`) is a single flat string and must not be copied verbatim into the backend's validation shape.

### TC-PAT-UNIT-003 — `phones` JSON array validator enforces Indian mobile format
- **Priority:** High
- **Steps:** Validate `phones: [{countryCode: "+91", number: "9876543210"}]` and `phones: [{countryCode: "+91", number: "12345"}]`.
- **Expected Result:** First passes (10 digits, valid Indian mobile prefix). Second rejected (too short).
- **Notes:** Existing frontend validation only checked string length ≥ 7 chars (`test-plan/patients-test-plan.md` Edge E8: `"123456"` fails as "min 7 chars") with no country-aware format check — the backend must do better than the frontend's current approximation.

### TC-PAT-UNIT-004 — Email format validator matches the frontend's existing regex intent
- **Priority:** Medium
- **Steps:** Validate `"notanemail"`, `"a@b"`, `"alice@email.com"`.
- **Expected Result:** First rejected, second and third accepted — same acceptance boundary as the frontend's `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` (added to close `BUG-PAT-004`), so a value the UI would accept never gets silently re-rejected server-side.

### TC-PAT-UNIT-005 — Required-field validator matches `CreatePatientPage`'s current rule set
- **Priority:** High
- **Steps:** Validate a patient input with only `first_name`/`last_name` set (no email/phone/DOB/gender).
- **Expected Result:** Rejected — `email` and `phone` are required (per `BUG-PAT-003` fix); `date_of_birth` and `gender` are optional and must NOT block validation.

### TC-PAT-UNIT-006 — Age-from-DOB calculation matches the clinician-patients "age badge"
- **Priority:** Low
- **Steps:** Compute age for a DOB of `1985-03-12` against a fixed "today" of `2026-03-30`.
- **Expected Result:** Returns `41`. A `null`/missing DOB returns `null` (not `NaN`, not a thrown error) — matches `test-result/clinician-patients-test-results.md` TC-CLPAT-42 ("Null DOB → no chip rendered").

### TC-PAT-UNIT-007 — "Overdue" last-visit calculation threshold
- **Priority:** Low
- **Steps:** Compute overdue status for a patient with `status: 'active'` and `last_visit` 91 days ago, then one with `status: 'inactive'` and `last_visit` 200 days ago.
- **Expected Result:** First returns `true` (overdue). Second returns `false` — inactive patients never surface an "Overdue" badge (per `test-suggestion/clinician-patients-test-suggestion.md` NEW-CLPAT-019).

### TC-PAT-UNIT-008 — Test-result flag-to-color mapping has a safe fallback for unknown values
- **Priority:** Medium
- **Steps:** Resolve display color for flags `"normal"`, `"high"`, `"low"`, and an unrecognized value `"critical"`.
- **Expected Result:** Returns the four expected colors for the first three; returns a defined grey fallback (not `undefined`) for `"critical"` — regression for `BUG-TRES-003`, where an unmapped flag produced the literal invalid CSS string `"undefined18"`.

### TC-PAT-UNIT-009 — Patient search-matching logic normalizes diacritics
- **Priority:** Medium
- **Steps:** Run the name-matching function with query `"al-hassan"` against a patient record `"Fatima Al-Hassan"`.
- **Expected Result:** Matches — confirms Unicode-normalization behavior fixed in the clinician-patients list (earlier session had a known failure searching `"muller"` against `"Müller"`; later session fixed it via diacritic-stripping normalization, per `test-plan/clinician-portal/clinician-patients-test-plan-done.md` TC-CLPAT-18/22).

### TC-PAT-UNIT-010 — CSV export row-builder escapes and quotes fields correctly
- **Priority:** Low
- **Steps:** Build a CSV row for a patient whose `condition` field contains a comma (e.g. `"Diabetes, Type 2"`).
- **Expected Result:** The field is wrapped in double quotes in the output row so the comma is not misparsed as a column boundary — matches the intent of `test-result/clinician-patients-test-results.md` TC-CLPAT-44's "double-quote escaped" CSV values.

### TC-PAT-UNIT-011 — Outstanding-balance display rule only flags positive balances
- **Priority:** Low
- **Steps:** Compute the balance-chip visibility for a patient with `outstanding_balance = 120` and one with `outstanding_balance = 0`.
- **Expected Result:** First returns "show warning chip", second returns "no chip" — matches `test-plan/patient-test-plan.md` TC-PT-29 (Sophie Turner, `balance=0`, shows no chip).

---

## 2. Backend/API Test Cases

*Run against a real Postgres test database + the actual GraphQL schema, not mocks.*

### TC-PAT-API-001 — `patients` query returns only the calling org's patients, scoped through appointments
- **Priority:** Critical
- **Preconditions:** Org 1 has Patient A (with an appointment at an Org 1 clinic); Org 2 has Patient B (appointment at an Org 2 clinic). Both orgs' managers are seeded.
- **Steps:** Log in as Org 1's manager, call `patients` (list query).
- **Expected Result:** Patient B never appears in the result set — proven via the `Appointments.clinic_id → Clinics.client_org_id` join, since `Patients` itself carries no org identifier. This is the direct backend fix for the schema gap noted above; if this resolver naively selects from `Patients` with no join/filter, it leaks cross-tenant data.

### TC-PAT-API-002 — A patient with no appointments yet is still visible to the org that created them
- **Priority:** High
- **Preconditions:** A brand-new patient record created via `createPatient` by an Org 1 manager, with zero appointments.
- **Steps:** Log in as the Org 1 manager, call `patients`.
- **Expected Result:** The new patient appears in the list — proves the scoping mechanism isn't purely appointment-derived (which would make freshly-created patients invisible to their own org before their first booking); the resolver must use whatever ownership signal `createPatient` records (e.g. `created_by_org_id` or the first `UserProfiles` link), not solely the appointments join from TC-PAT-API-001.

### TC-PAT-API-003 — `patient(id)` enforces patient-self row-level scoping
- **Priority:** Critical
- **Preconditions:** Patient A and Patient B both exist with logged-in `UserProfiles` accounts.
- **Steps:** Log in as Patient A's own account, query `patient(id: <PatientB.id>)`.
- **Expected Result:** Rejected or returns null — never Patient B's record. (Same pattern as `TC-AUTH-API-008`; re-verified here at the domain level since `Patients` is the table in question.)

### TC-PAT-API-004 — `createPatient` requires `first_name`, `last_name`, `email`, `phone`
- **Priority:** High
- **Steps:** Call `createPatient` omitting `email`.
- **Expected Result:** Rejected with a field-level validation error naming `email` — matches the frontend's current required-field set (`BUG-PAT-003`), so the backend doesn't silently accept a patient it can never notify by email.

### TC-PAT-API-005 — `createPatient` persists `address_structured` and `phones` as JSON, not flattened strings
- **Priority:** High
- **Steps:** Call `createPatient` with `address_structured: {line1, line2, city, state, pincode, country}` and `phones: [{countryCode, number}]`.
- **Expected Result:** The stored row's `address_structured`/`phones` round-trip exactly as submitted on a subsequent `patient(id)` query — confirms the Prisma `Json` columns aren't being lossy-serialized (e.g. dropping `line2` when empty, or coercing the array to a single object).

### TC-PAT-API-006 — `updatePatient` cannot be used by one clinic/org to modify another org's patient
- **Priority:** Critical
- **Preconditions:** Patient A belongs to Org 1 (via an Org 1 appointment).
- **Steps:** Log in as an Org 2 manager, call `updatePatient(id: <PatientA.id>, ...)`.
- **Expected Result:** Rejected with FORBIDDEN/NOT_FOUND; verify via a subsequent read that no field on Patient A changed.

### TC-PAT-API-007 — A clinician can only fetch patients they have an appointment relationship with
- **Priority:** Critical
- **Preconditions:** Clinician C1 has at least one appointment with Patient A; Clinician C1 has never seen Patient B (same org, different clinician).
- **Steps:** Log in as C1, query `myPatients` (or equivalent clinician-scoped patient list), then attempt `patient(id: <PatientB.id>)` directly.
- **Expected Result:** `myPatients` never includes Patient B; the direct `patient(id)` lookup for Patient B is rejected or null. **This case has no equivalent in the existing frontend QA history** — `test-suggestion/clinician-patients-test-suggestion.md` explicitly defers "connect to real backend" (SUG-CLPAT-005) and the current `/clinician/patients` page runs entirely off a static 5-patient mock array with no cross-clinician boundary ever exercised. This must be a new, backend-only test — do not assume any existing frontend behavior proves this today.

### TC-PAT-API-008 — `me`-scoped patient query returns only the logged-in patient's own record
- **Priority:** Critical
- **Preconditions:** Patient A is logged in via their own `UserProfiles` account (`patient_id` set).
- **Steps:** Call whatever query backs `/patient/profile` (e.g. `myPatientProfile`).
- **Expected Result:** Returns exactly Patient A's `Patients` row, resolved from the JWT's `patient_id` claim — with no `patientId` argument accepted on the query at all (same principle as `TC-AUTH-API-005`'s `me` query).

### TC-PAT-API-009 — Deleting/deactivating a patient is a soft delete, not a hard delete
- **Priority:** High
- **Steps:** Call the archive/delete mutation for a patient with existing appointment history, then query `patients` (list) and `patient(id)` (direct) afterward.
- **Expected Result:** `is_deleted` is set `true`; the patient is excluded from the default `patients` list but a direct `patient(id)` lookup (e.g. from an existing appointment detail) still resolves the record rather than 404ing — preserves historical appointment/review integrity. Grounded in `test-suggestion/patients-test-suggestion.md` SUG-PAT-006 ("Archive/Delete Patient" — flagged as a GDPR-relevant gap, still pending on the frontend; this is the backend contract it will need once built.

### TC-PAT-API-010 — Test-result values are only exposed once `status = 'completed'`
- **Priority:** High
- **Preconditions:** A test-result record exists with `status: 'processing'` and populated `values`.
- **Steps:** Query the test result's detail (patient-facing or staff-facing).
- **Expected Result:** The `values` array is withheld/empty while `status !== 'completed'`, regardless of caller role — matches the frontend's existing gating rule (`test-plan/test-results-page-test-plan.md` TC-TRES-11/12: "Results not yet available" shown for `processing`/`pending`, gated purely by completion status, not by role). Confirms the backend enforces the same gate the UI currently fakes client-side.

### TC-PAT-API-011 — A patient can only view their own test results, not another patient's
- **Priority:** Critical
- **Preconditions:** Patient A and Patient B each have a completed test result.
- **Steps:** Log in as Patient A, query the test-results list/detail scoped to "my results", attempt direct lookup of Patient B's result ID.
- **Expected Result:** Patient A's list never includes Patient B's result; direct lookup by ID is rejected/null. **Ungrounded in current frontend history** — the only test-results UI tested so far (`/test-results`) is explicitly a "clinical staff" list with zero patient-self-service view or per-patient auth boundary in any of the reviewed QA docs; this is new spec, not a regression of existing behavior.

### TC-PAT-API-012 — Cursor/offset pagination on `patients` is stable under concurrent creates
- **Priority:** Medium
- **Steps:** Fetch page 1 of `patients` (page size 10), then create a new patient, then fetch page 2.
- **Expected Result:** Page 2 does not duplicate or skip a record relative to page 1's boundary — validates the pagination contract the frontend's `TablePagination` (`"1–10 of 15"` style counts, per `TC-PAT-008`) depends on.

---

## 3. Functional / E2E Test Cases

*Full frontend + backend journeys, run via Playwright against a running backend (not mocks).*

### TC-PAT-E2E-001 — Manager creates a patient and immediately sees them in the list
- **Priority:** Critical
- **Steps:** Log in as manager, go to `/patients/new`, fill required fields (first/last name, email, phone), submit, then land on `/patients`.
- **Expected Result:** The new patient appears in the list without a page reload (cache update or refetch) — the real-backend equivalent of the currently mocked `"Patient created (demo mode)"` snackbar flow (`BUG-PAT-005`), now backed by an actual `createPatient` mutation and list refetch.

### TC-PAT-E2E-002 — Created patient's detail page shows the exact data just submitted
- **Priority:** High
- **Steps:** Create a patient with a distinctive name and DOB, click through to their detail page.
- **Expected Result:** Detail page renders the submitted name/DOB/etc. — directly closes the historical `BUG-PAT-001` failure mode (list row navigated to the correct ID but detail showed a hardcoded "John Michael Doe" default because the mock detail lookup didn't cover that ID). With a real backend this class of bug (ID lookup miss) must be structurally impossible, not just patched with more mock entries.

### TC-PAT-E2E-003 — Editing a patient persists across navigation and reload
- **Priority:** High
- **Steps:** Edit an existing patient's phone number, save, navigate away to `/patients`, then back to the same patient's detail page (full reload).
- **Expected Result:** Updated phone number is shown after reload — proves the update was persisted server-side, not just optimistic local UI state (the current mock mode's `.catch()`-driven "success" path never actually reaches a database).

### TC-PAT-E2E-004 — Patient logs in and sees only their own profile data, never another patient's
- **Priority:** Critical
- **Preconditions:** Two seeded patient accounts, Patient A and Patient B, with different profile data.
- **Steps:** Log in as Patient A, navigate to `/patient/profile`.
- **Expected Result:** All displayed fields (name, DOB, allergies, insurance) belong to Patient A — this closes the real data-inconsistency bug found in QA (`test-result/patient-profile-test-results.md` OBS-1: the topbar showed the real logged-in auth user "Alice Thompson" while the profile page body showed an unrelated hardcoded mock "Emma Wilson"). With a real backend query behind the page, this class of drift becomes impossible by construction.

### TC-PAT-E2E-005 — Patient profile edits actually persist server-side
- **Priority:** High
- **Steps:** Log in as a patient, edit First Name and an allergy, save, log out, log back in.
- **Expected Result:** Changes are still present after re-login — this is the acceptance bar that retires `TC-PTPROF-013`'s current (mock-mode-correct) assertion "no GraphQL mutation fires on save"; once the backend exists, a *lack* of a network call on save would itself be the bug.

### TC-PAT-E2E-006 — Clinician sees only their own assigned patients on their patients page
- **Priority:** Critical
- **Preconditions:** Clinician C1 has appointments with 3 patients; Clinician C2 (same org) has appointments with 2 different patients.
- **Steps:** Log in as C1, navigate to `/clinician/patients`.
- **Expected Result:** Exactly C1's 3 patients are listed, KPI "Total" reads 3, and none of C2's patients appear anywhere (list, search results, or CSV export) — this is the real-backend version of a scenario the current mock-mode QA suite (`test-plan/clinician-patients-test-plan.md`) never actually exercises, since it runs off one static 5-patient array shared by any logged-in clinician.

### TC-PAT-E2E-007 — Clinician's "View Patient" action opens the correct shared patient record
- **Priority:** High
- **Steps:** As a clinician, click the eye icon on a specific patient row in `/clinician/patients`.
- **Expected Result:** Navigates to `/patients/pt-<id>` and shows that exact patient's data — regression guard for `BUG-004` (clinician list → detail ID mismatch, previously fell back to the "John Michael Doe" default).

### TC-PAT-E2E-008 — Booking an appointment from the clinician's patient list pre-fills the wizard correctly
- **Priority:** Medium
- **Steps:** As a clinician, click the "Book" calendar icon next to a patient, proceed through the booking wizard.
- **Expected Result:** The wizard opens with that clinician and patient pre-selected, not a "Clinician not found" error — regression guard for `BUG-005`.

### TC-PAT-E2E-009 — Ordering a lab test appears in both the KPI counts and the results table
- **Priority:** Medium
- **Steps:** From `/test-results`, click "Order Test", fill patient name + test type, submit.
- **Expected Result:** A new row appears in the table with `status: pending`, and the "Total"/"Pending" KPI counts both increment by 1 — real-backend equivalent of the mock behavior added in `SUG-TRES-008` (previously the dialog was a pure no-op).

### TC-PAT-E2E-010 — Downloading a completed test result produces a real, retrievable file
- **Priority:** Medium
- **Steps:** Open a completed test result's detail dialog, click "Download PDF".
- **Expected Result:** A file downloads with the result's actual values. **Note for backend design:** the current mock implementation downloads a synthesized `.txt` file despite the "Download PDF" label (`SUG-TRES-001`) — this E2E case should be re-scoped once real PDF generation exists; until then, treat "downloads a file containing the correct values" as the acceptance bar, not literal PDF format.

### TC-PAT-E2E-011 — A patient cannot browse to another patient's detail page by guessing the URL
- **Priority:** Critical
- **Preconditions:** Patient A is logged in; Patient B's ID is known/guessable.
- **Steps:** As Patient A, manually navigate the browser to a patient-detail-equivalent route for Patient B (if patients have any self-service detail route beyond `/patient/profile`, e.g. a shared appointment detail).
- **Expected Result:** Forbidden/redirected — never renders Patient B's data, even momentarily.

---

## 4. Frontend Test Cases

*Component/page-level, run against the existing mock store (`frontend/src/mocks/`) — these should pass today, independent of backend readiness.*

### Patients (Admin/Manager) — List, Detail, Create, Edit

### TC-PAT-FE-001 — List search matches name, email, and phone
- **Priority:** Medium
- **Steps:** On `/patients`, type a fragment of a patient's phone number (digits only, ignoring dashes/spaces) into the search box.
- **Expected Result:** Matching patient(s) shown — confirms `SUG-PAT-009` ("Search Also Matches Email and Phone", marked DONE): search now loosely matches `p.phone` in addition to name/email.

### TC-PAT-FE-002 — A–Z filter combined with gender filter uses AND logic
- **Priority:** Medium
- **Steps:** Select the "Male" gender toggle, then click the "B" alphabet chip.
- **Expected Result:** Only male patients whose name starts with "B" are shown (e.g. Bob Smith) — regression for `test-plan/patients-test-plan.md` TC-PAT-006.

### TC-PAT-FE-003 — Row ID always resolves to the matching detail record (BUG-PAT-001 regression)
- **Priority:** Critical
- **Steps:** Click each of patient rows with IDs `'3'` through `'15'` in turn, verifying the detail page each time.
- **Expected Result:** Every row navigates to a detail page showing that row's actual name — never falls through to the `"John Michael Doe"` default. This is the single most-regressed bug in this domain's QA history (`BUG-PAT-001`, fixed by expanding `MOCK_PATIENTS_DETAIL` to all 15 numeric IDs) — worth testing exhaustively, not just spot-checking ID `'1'`.

### TC-PAT-FE-004 — Create-patient form validates email format and required fields together
- **Priority:** High
- **Steps:** On `/patients/new`, leave Email blank and enter `"notanemail"` for a second attempt, submitting each time.
- **Expected Result:** First attempt shows "Required" under Email; second shows "Invalid email address" — both `BUG-PAT-003` and `BUG-PAT-004` regressions in one flow.

### TC-PAT-FE-005 — Create-patient form succeeds offline via the mock `.catch()` fallback
- **Priority:** Medium
- **Steps:** With the backend simulated offline, fill all required fields on `/patients/new` and click "Save Patient".
- **Expected Result:** A `"Patient created (demo mode)"` snackbar appears and the page navigates to `/patients` — regression for `BUG-PAT-005` (previously showed a raw "Failed to fetch" error with no fallback).

### TC-PAT-FE-006 — Edit page never gets stuck on a permanent skeleton offline
- **Priority:** High
- **Steps:** With the backend offline, navigate directly to `/patients/1/edit`.
- **Expected Result:** The form renders pre-filled with `MOCK_EDIT_PATIENTS['1']` data within a normal load — never a permanent skeleton. Regression for `BUG-PAT-002`/`BUG-PT-001` (root cause: an early `useEffect` return on `!data?.patient` left `fetching=false` with the form never seeded).

### TC-PAT-FE-007 — Unsaved-changes guard blocks silent navigation away from Create/Edit
- **Priority:** Medium
- **Steps:** Start filling `/patients/new`, then click the back arrow or attempt to close the tab.
- **Expected Result:** A confirmation prompt (`window.confirm`/`beforeunload`) appears before navigating away — per `SUG-PAT-013`/`SUG-PT-013` (DONE): dirty-state detection compares the form to its initial/seeded values.

### TC-PAT-FE-008 — Detail page's Test Results tab gates the "View Result" button by status
- **Priority:** Medium
- **Steps:** On a patient's detail page, open the "Test Results" tab; note which cards show a "View Result" button vs. a pending chip.
- **Expected Result:** Only completed tests show "View Result" (opens a dialog with status/ordered-by/date); the pending test (e.g. "Allergy Panel") shows a pending chip instead — regression for `SUG-PAT-013`/`SUG-PT-003` (previously the button had no `onClick` at all).

### TC-PAT-FE-009 — Documents tab "Upload Document" actually adds a visible entry
- **Priority:** Low
- **Steps:** On the Documents tab (empty state), click "Upload Document" and select a file.
- **Expected Result:** The empty state is replaced by the uploaded file appearing in a local list — regression for `SUG-PAT-014`/`SUG-PT-004` (previously a no-op button despite `cursor: pointer` styling).

### TC-PAT-FE-010 — Unknown patient ID never crashes the detail page
- **Priority:** Medium
- **Steps:** Navigate to `/patients/99999`.
- **Expected Result:** Renders the `MOCK_PATIENT_DEFAULT` fallback ("John Michael Doe") with no console error or blank screen — this is intentionally-preserved fallback behavior (`TC-PAT-030`), not a bug, and must not regress when real IDs are introduced.

### Patient Self-Service Profile (`/patient/profile`)

### TC-PAT-FE-011 — "+ Add" chip for allergies/conditions is wired to an inline input
- **Priority:** High
- **Steps:** Click "Edit Profile", then click the "+ Add" chip under Allergies, type "Peanuts", press Enter.
- **Expected Result:** A new "Peanuts" chip appears and the inline input closes — regression for a confirmed **FAIL** in `test-result/patient-profile-test-results.md` (TC-PTPROF-09: the chip had `cursor: pointer` styling but no `onClick` at all, "false-advertising interactivity"). Fixed via `SUG-PTPROF-001`.

### TC-PAT-FE-012 — Avatar initials never render "undefined" when First Name is cleared
- **Priority:** High
- **Steps:** Enter edit mode, clear the First Name field entirely, save.
- **Expected Result:** Avatar shows `"?W"` (guarded fallback), never `"undefinedW"` — regression for the null-guard bug documented in OBS-2/`SUG-PTPROF-002`.

### TC-PAT-FE-013 — Insurance fields become editable in edit mode
- **Priority:** Medium
- **Steps:** Click "Edit Profile", then click into the Insurance Provider field.
- **Expected Result:** Provider/Policy/Expires all convert to `TextField`s and accept edits — regression for `SUG-PTPROF-003` (previously these 3 fields stayed static `Typography` even in edit mode, a confirmed enhancement gap in QA).

### TC-PAT-FE-014 — Profile is seeded from the authenticated user, not an unrelated hardcoded mock
- **Priority:** High
- **Steps:** Log in as a specific demo patient account, navigate to `/patient/profile`, compare the name shown here against the name shown in the top navbar.
- **Expected Result:** Both show the same name — regression for the real data-inconsistency bug in OBS-1 (topbar showed the logged-in "Alice Thompson" while the profile body showed hardcoded "Emma Wilson"), fixed via `SUG-PTPROF-004`'s `seedFromAuth()`.

### TC-PAT-FE-015 — Saving shows a success alert that auto-dismisses, and no network call fires
- **Priority:** Low
- **Steps:** Edit any field, click "Save Changes", then watch the network panel and the alert for ~4 seconds.
- **Expected Result:** Green "Profile updated successfully!" alert appears and disappears after ~3 seconds (`setTimeout(...,3000)`); no GraphQL request is ever sent — this is today's *correct* mock-mode behavior (`TC-PTPROF-013`), which should be explicitly re-verified as no-longer-correct once a real `updateMyProfile` mutation exists (see `TC-PAT-E2E-005`).

### TC-PAT-FE-016 — Discard reverts to the last-saved state, not to blank/defaults
- **Priority:** Medium
- **Steps:** Edit First Name and open the allergy inline-input, then click "Discard".
- **Expected Result:** Name reverts to the last-saved value, and the inline allergy input closes without leaving partial text — covers both `TC-PTPROF-012` and `TC-PTPROF-019`.

### TC-PAT-FE-017 — Phone field rejects malformed input on save
- **Priority:** Medium
- **Steps:** In edit mode, enter `"abc"` into the Phone field, click "Save Changes".
- **Expected Result:** Save is blocked with an inline error under Phone; correcting the field clears the error without needing to re-enter other fields — per `SUG-PTPROF-013`'s `PHONE_RE = /^\+?[0-9()\- ]{7,20}$/`.

### Patient Dashboard (`/patient/dashboard`)

### TC-PAT-FE-018 — Dashboard shows a warning (not a crash) when no user is logged in
- **Priority:** High
- **Steps:** Navigate to `/patient/dashboard` without an authenticated session.
- **Expected Result:** Renders `<Alert severity="warning">Please log in to view your dashboard.</Alert>` — no exception, no blank page.

### TC-PAT-FE-019 — Greeting text changes with time of day
- **Priority:** Low
- **Steps:** Mock the system clock to 09:00, 14:00, and 20:00 in turn, reloading the dashboard each time.
- **Expected Result:** Shows "Good morning", "Good afternoon", "Good evening" respectively — regression for `BUG-PTDASH-003` (previously a hardcoded "Good morning" string regardless of actual time).

### TC-PAT-FE-020 — Cancelling an appointment from the dashboard requires confirmation and updates the list
- **Priority:** High
- **Steps:** Click "Cancel" on an upcoming appointment card, then click "Yes, Cancel" in the confirmation dialog.
- **Expected Result:** The dialog closes and the appointment disappears from the upcoming list in mock mode (via the `cancelledIds` set) — regression for `BUG-PTDASH-001` (buttons previously had no handlers at all) plus `SUG-PTDASH-012`'s optimistic-removal behavior. Clicking "Keep Appointment" instead must leave the card untouched.

### TC-PAT-FE-021 — A null `clinician` on an appointment never crashes the "Your Doctors" sidebar
- **Priority:** High
- **Steps:** Inject a mock upcoming appointment with `clinician: null` alongside normal appointments.
- **Expected Result:** No crash; that appointment is excluded from the deduplicated "Your Doctors" list (`.filter(a => a.clinician?.id)`) — regression for `BUG-PTDASH-007`.

### TC-PAT-FE-022 — Recent Activity feed is capped at 5 items even with more mock notifications
- **Priority:** Low
- **Steps:** Seed 8 mock notifications, load the dashboard.
- **Expected Result:** Exactly 5 are rendered (`notifications.slice(0, 5)`) — regression for `BUG-PTDASH-006`.

### Clinician's View of Own Patients (`/clinician/patients`)

### TC-PAT-FE-023 — "View Patient" always opens the correct patient, never the default fallback
- **Priority:** Critical
- **Steps:** From `/clinician/patients`, click the eye icon on each of the 5 mock patients (`pt-1`…`pt-5`) in turn.
- **Expected Result:** Each opens `/patients/pt-<n>` showing that specific patient's real name — regression for `BUG-004` (previously fell back to "John Michael Doe" for any ID beyond the first couple of mock entries, the same root-cause pattern as `BUG-PAT-001`).

### TC-PAT-FE-024 — Booking from the patient list never hits a "clinician not found" error
- **Priority:** High
- **Steps:** Click the "Book Appointment" calendar icon on any patient row.
- **Expected Result:** The booking wizard opens with a valid mock clinician (Dr. Sarah Mitchell) pre-selected and visible time slots — regression for `BUG-005` (previously errored when the wizard was reached without a `:clinicianId` route param).

### TC-PAT-FE-025 — Search + status-filter chips combine with AND logic and reset pagination
- **Priority:** Medium
- **Steps:** Set the filter chip to "Active", then type a search term that matches only an "Inactive" patient.
- **Expected Result:** Zero results with the contextual empty-state message and a "Clear filters" button that resets both search and filter chip together (not just one) — per `TC-CLPAT-10`/`TC-CLPAT-21`.

### TC-PAT-FE-026 — CSV export respects the currently applied filter, not the full patient set
- **Priority:** Low
- **Steps:** Set the filter chip to "Active" (3 of 5 patients), click "Export CSV".
- **Expected Result:** The downloaded file contains exactly the 3 filtered rows, not all 5 — per `test-result/clinician-patients-test-results.md` TC-CLPAT-44.

### TC-PAT-FE-027 — "Overdue" badge only appears for active/new patients past the threshold, never inactive ones
- **Priority:** Low
- **Steps:** Compare an "Active" patient whose last visit was 95 days ago against an "Inactive" patient whose last visit was 200 days ago.
- **Expected Result:** Only the active patient shows the "Overdue" badge — per `NEW-CLPAT-019`.

### Test Results (Lab Reports)

### TC-PAT-FE-028 — Result dialog withholds values for non-completed tests
- **Priority:** High
- **Steps:** Open the detail dialog for a `processing` result and a `pending` result in turn.
- **Expected Result:** Both show "Results not yet available" with no values table and no "Download PDF" button — per `TC-TRES-11`/`TC-TRES-12`; this status-based gate is the only access control currently exercised anywhere in this feature (there is no role-based gate tested at all — see `TC-PAT-API-011`, which is new, ungrounded spec for the backend).

### TC-PAT-FE-029 — Unknown flag value renders a safe grey fallback, not broken CSS
- **Priority:** Medium
- **Steps:** Inject a mock result value with `flag: 'critical'` (not in the known `normal`/`high`/`low` set), open its dialog.
- **Expected Result:** Renders a defined grey chip (`#64748B`) with no `"undefined18"` background-color artifact and no console error — regression for `BUG-TRES-003`.

### TC-PAT-FE-030 — Ordering a test updates the table and KPI counts immediately
- **Priority:** Medium
- **Steps:** Click "Order Test", fill Patient Name + Test Type, submit.
- **Expected Result:** A new `pending`-status row appears at the top of the table and both "Total" and "Pending" KPI counts increment by 1 — per `SUG-TRES-008` (the dialog previously closed with no visible effect on the table/counts at all).

### TC-PAT-FE-031 — "Clear Filters" only appears when a filter is actually active
- **Priority:** Low
- **Steps:** Load `/test-results` with no filters set, observe the filter bar; then set a search term and observe again.
- **Expected Result:** No "Clear Filters" button in the first case; it appears once any of search/type/status is non-default, and clicking it resets all three together — per `UX-TRES-004`.
