# Patients — Feature Suggestions

**Derived from:** [patients-test-results.md](../test-result/patients-test-results.md)  
**Test Plan Source:** [patients-test-plan.md](../test-plan/patients-test-plan.md)  
**Date:** 2026-03-16  
**Tested by:** Antigravity AI Browser Agent

> Suggestions derived from real observations during patients test execution (19 test cases). Bug-fix items (🔴/🟡) should be resolved before production.

---

## 🔴 Critical Bug Fixes

### SUG-PAT-001 — Fix: Patient Row Click → Wrong Detail Page (ID Mismatch)
**Triggered by:** TC-PAT-007 (BUG-PAT-001)  
**File:** `src/pages/patients/index.jsx` and/or `src/mocks/store.js`  
**Root Cause:** The patients table assigns IDs (1, 2, 3…) sequentially in the list component, but the mock store used by `PatientDetailPage` has a different ordering or different ID properties. Clicking row 1 (Alice Johnson) navigates to `/patients/1`, which resolves to "John Michael Doe" in the mock store.  
**Fix:**
```js
// In src/pages/patients/index.jsx — when building rows, use the mock store's actual .id:
const rows = MOCK_PATIENTS.map((p) => ({
  id: p.id,           // ← must match the id used in GET_PATIENT mock lookup
  first_name: p.first_name,
  last_name: p.last_name,
  ...
}));

// In click handler:
onClick={() => navigate(`/patients/${row.id}`)}

// In src/mocks/store.js — ensure the first patient has id: '1' or 'pat-1'
// and that the PatientDetailPage mock lookup uses the SAME id format.
```
**Priority:** 🔴 Critical — clicking any patient opens the wrong person's record  
**Effort:** Very Low (15 min — audit ID format alignment between list and store)

---

### SUG-PAT-002 — Fix: Edit Patient Page Stuck in Infinite Skeleton (Backend Offline)
**Triggered by:** TC-PAT-017, TC-PAT-018 (BUG-PAT-002)  
**File:** `src/pages/patients/EditPatientPage.jsx`  
**Root Cause:** `EditPatientPage` uses `useQuery(GET_PATIENT, { variables: { id } })` to pre-fill the form. When the backend is offline, the query never completes, keeping `loading: true` indefinitely. Unlike `PatientDetailPage`, this page has no mock data fallback.  
**Fix:**
```js
// In EditPatientPage.jsx, add the same mock fallback pattern used in detail page:
const { data, loading, error } = useQuery(GET_PATIENT, {
  variables: { id },
  fetchPolicy: 'cache-and-network',
});

// After the query, add a fallback to mock data if no real data returned after timeout:
const patient = data?.patient ?? MOCK_PATIENTS.find(p => p.id === id || p.id === parseInt(id));

// Show form only when patient is resolved (real OR mock):
if (loading && !patient) return <PatientFormSkeleton />;
if (!patient) return <NotFoundState />;

// Pre-fill RHF with either live or mock patient:
useEffect(() => {
  if (patient) {
    reset({
      first_name: patient.first_name,
      last_name: patient.last_name,
      email: patient.email,
      phone_number: patient.phone_number,
      date_of_birth: patient.date_of_birth,
      gender: patient.gender,
    });
  }
}, [patient, reset]);
```
**Priority:** 🔴 Critical — edit patients is completely broken in mock mode  
**Effort:** Low (30 min — copy mock fallback pattern from `PatientDetailPage`)

---

## 🟡 Validation Fixes

### SUG-PAT-003 — Fix: Email and Phone Not Marked as Required in Zod Schema
**Triggered by:** TC-PAT-011 (BUG-PAT-003)  
**File:** `src/pages/patients/CreatePatientPage.jsx` (and `EditPatientPage.jsx`)  
**Root Cause:** The zod schema for patient creation marks `email` and `phone_number` as optional strings, so empty values pass validation silently.  
**Fix:**
```js
// Current (too permissive):
const patientSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().optional(),           // ← allows empty
  phone_number: z.string().optional(),    // ← allows empty
  ...
});

// Fixed:
const patientSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  phone_number: z.string().min(7, 'Phone number is required'),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
});
```
**Priority:** 🟡 High — users can save patients without contact info  
**Effort:** Very Low (5 min — change `.optional()` to `.min(1)` + `.email()`)

---

### SUG-PAT-004 — Fix: No Frontend Validation for Invalid Email Format
**Triggered by:** TC-PAT-012 (BUG-PAT-004)  
**File:** Same as SUG-PAT-003 — same zod schema fix resolves both   
**Root Cause:** The email field lacks a `.email()` format validator, so "notanemail" passes the schema and the form tries to submit to the backend, which fails with a network error instead of showing an inline validation message.  
**Fix:** Covered by the `z.string().email('Enter a valid email address')` fix in SUG-PAT-003 above.  
**Priority:** 🟡 High — invalid emails bypass client-side check and fail silently  
**Effort:** Very Low (already covered in SUG-PAT-003)

---

### SUG-PAT-005 — Fix: Create/Edit Mutations Need Mock Success Fallback
**Triggered by:** TC-PAT-013, TC-PAT-014 (BUG-PAT-005)  
**File:** `src/pages/patients/CreatePatientPage.jsx`, `src/mocks/store.js`  
**Root Cause:** The create/update mutations fire real Apollo mutations that require the backend. The mock layer provides data for queries but has no mock response for mutations, so all saves fail with "Failed to fetch" in offline mode.  
**Fix Option A — Apollo MockedProvider mutation (testing pattern):**
```js
// Not applicable for runtime dev mode — use option B instead
```
**Fix Option B — Detect network error and show optimistic mock success:**
```js
const [createPatient] = useMutation(CREATE_PATIENT_MUTATION, {
  onCompleted: (data) => {
    enqueueSnackbar('Patient created successfully', { variant: 'success' });
    navigate('/patients');
  },
  onError: (err) => {
    if (err.message.includes('fetch') || err.networkError) {
      // Backend offline — simulate success in mock mode
      enqueueSnackbar('Patient saved (mock mode — backend offline)', { variant: 'warning' });
      navigate('/patients');
    } else {
      enqueueSnackbar(err.message, { variant: 'error' });
    }
  },
});
```
**Priority:** 🟡 High — in dev/demo mode, all creates and edits appear broken to stakeholders  
**Effort:** Low (30 min for both create and edit pages)

---

## 🟢 Missing Features & UX Improvements

### SUG-PAT-006 — Add Delete / Archive Patient Action
**Triggered by:** TC-PAT-015 / observation (BUG-PAT-006)  
**Observation:** There is no way to delete or archive a patient from either the list page or the detail page. Healthcare systems need deactivation capability for GDPR/regulatory compliance (patients who withdraw consent, duplicates, test patients, etc.).  
**Suggestion:**
- Add an **"Archive Patient"** option (not hard delete) accessible from:
  1. The detail page — a "⋮ More actions" menu next to Edit button: "Archive patient"
  2. The actions column in the list (add a third icon: `ArchiveRoundedIcon`) 
- Archiving sets `status: 'archived'` — patient disappears from listing by default
- Add a "Show archived" toggle on the patient list for admin users to view/restore archived patients
- Show a confirmation dialog: *"Archive Alice Johnson? She will no longer appear in active patient lists."*

```js
// In patients list, filter by default:
const activePatients = patients.filter(p => p.status !== 'archived');
```
**Priority:** 🟢 Low  
**Effort:** Medium

---

### SUG-PAT-007 — Patient Detail — Appointment History as Sortable/Filterable List
**Triggered by:** TC-PAT-015 (detail page observation)  
**Observation:** The appointment history section on the patient detail page shows appointment cards but they appear in a fixed order with no way to sort by date or filter by status.  
**Suggestion:**
- Add sort controls above the appointment history: "Newest first" / "Oldest first" (default: newest)
- Add a status filter chip strip above: All / Upcoming / Completed / Cancelled
- Show a count badge: "3 upcoming · 12 past appointments"
- Each appointment card should have a direct "View" button linking to `/appointments/appt-id`

**Priority:** 🟢 Low  
**Effort:** Low (the card list exists — just add sort/filter state above it)

---

### SUG-PAT-008 — Add Patient Form: Medical History / Notes Section
**Triggered by:** TC-PAT-010 (create form observation)  
**Observation:** The Add Patient form only captures contact and demographic information (name, email, phone, DOB, gender). Healthcare applications typically need a "Medical Notes" or "Allergies" field at creation time.  
**Suggestion:**
- Add a second section to the create/edit form titled "Medical Information":
  - **Allergies** — multi-select chip input (e.g., "Penicillin", "Latex", "Nuts") with free-text option
  - **Existing conditions** — free-text area: `z.string().optional()`
  - **Emergency Contact** — Name + Phone fields
- Add a step indicator or collapsible section to avoid an overwhelming single-page form

**Priority:** 🟢 Low  
**Effort:** Medium

---

### SUG-PAT-009 — Search Also Matches Email and Phone
**Triggered by:** TC-PAT-002 (search by name observation)  
**Observation:** The search field debounces and filters by patient name. However, receptionists often search by phone number or email (e.g., a patient calls in and gives their phone number first).  
**Suggestion:**
```js
// Extend the filter function to match name, email, and phone:
const filtered = patients.filter((p) => {
  const q = debouncedSearch.toLowerCase();
  return (
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
    p.email?.toLowerCase().includes(q) ||
    p.phone_number?.includes(q)
  );
});
```
- Update the search placeholder: "Search by name, email, or phone…"
- Add a subtle "search type" indicator when matching by email or phone (e.g., a small chip: "Matching by phone")

**Priority:** 🟡 Medium  
**Effort:** Very Low (3 lines of code in the filter function)

---

### SUG-PAT-010 — Paginated List: "Jump to Page" Input
**Triggered by:** TC-PAT-008 (pagination observation)  
**Observation:** With pagination working correctly (TC-PAT-008 PASS), a "Jump to page" input would help when managing very large patient lists (e.g., 500+ patients in a real clinic).  
**Suggestion:**
- Add a small text input after the page arrows: `Page [2] of 5`
- If the user types a page number and presses Enter, jump directly to that page
- Use MUI `TablePagination` with a custom `ActionsComponent`

**Priority:** 🟢 Low  
**Effort:** Low

---

### SUG-PAT-011 — Patient Avatar: Upload Profile Photo
**Triggered by:** TC-PAT-015 (detail page — initials-only avatar)  
**Observation:** The patient detail page shows a colored avatar with the patient's first initial. Clinicians using the app on a tablet often benefit from seeing a profile photo to confirm patient identity.  
**Suggestion:**
- Add a camera icon overlay on hover of the patient avatar on the detail and edit pages
- Clicking opens a file picker or drag-drop zone to upload a profile photo
- Store as a base64 or URL in the patient record (`profile_photo_url` field)
- Fall back to initials avatar if no photo uploaded

**Priority:** 🟢 Low  
**Effort:** High

---

## Summary Table

| ID | Suggestion | Category | Priority | Effort |
|----|-----------|----------|----------|--------|
| SUG-PAT-001 | Fix patient row → wrong detail ID mismatch | 🐛 Bug Fix | 🔴 Critical | Very Low |
| SUG-PAT-002 | Fix edit page infinite skeleton in offline/mock mode | 🐛 Bug Fix | 🔴 Critical | Low |
| SUG-PAT-003 | Mark Email & Phone as required in zod schema | 🐛 Bug Fix | 🟡 High | Very Low |
| SUG-PAT-004 | Add `.email()` format validator to zod schema | 🐛 Bug Fix | 🟡 High | Very Low |
| SUG-PAT-005 | Add mock success fallback for create/update mutations | 🐛 Bug Fix | 🟡 High | Low |
| SUG-PAT-006 | Archive/delete patient with confirmation dialog | 🚀 Feature | 🟢 Low | Medium |
| SUG-PAT-007 | Appointment history — sortable & filterable on detail page | ✨ UX | 🟢 Low | Low |
| SUG-PAT-008 | Add Patient form: Medical Info section (allergies, notes) | 🚀 Feature | 🟢 Low | Medium |
| SUG-PAT-009 | Extend search to match email and phone number | ✨ UX | 🟡 Medium | Very Low |
| SUG-PAT-010 | Pagination: "Jump to page" input for large lists | ✨ UX | 🟢 Low | Low |
| SUG-PAT-011 | Patient profile photo upload on detail/edit page | 🚀 Feature | 🟢 Low | High |

---

## Quick Wins (Low Effort, High Impact)

1. **SUG-PAT-001** — Fix the ID alignment between patient list rows and mock store (~15 min, fixes the most embarrassing UX bug)
2. **SUG-PAT-003 + SUG-PAT-004** — Two zod schema changes (`min(1)` + `.email()`) in 5 minutes, fixes both validation bugs
3. **SUG-PAT-009** — 3 extra lines in the search filter to support email/phone search — huge workflow improvement
4. **SUG-PAT-002** — Copy mock fallback from `PatientDetailPage` to `EditPatientPage` — unblocks the entire edit flow in dev mode
