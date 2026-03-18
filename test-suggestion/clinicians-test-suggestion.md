# Clinicians — Feature Suggestions

**Derived from:** [clinicians-test-results.md](../test-result/clinicians-test-results.md)  
**Test Plan Source:** [clinicians-test-plan.md](../test-plan/clinicians-test-plan.md)  
**Date:** 2026-03-16  
**Tested by:** Antigravity AI Browser Agent

> Suggestions derived from real observations during clinicians test execution (15 test cases). Clinicians module has the highest number of critical failures — 9/15 failed.

---

## 🔴 Critical Bug Fixes

### SUG-CLIN-001 — Fix: React Hook Form Not Wired to MUI TextFields (Create & Edit)
**Triggered by:** TC-CLIN-009, TC-CLIN-010 (BUG-CLIN-005)  
**Files:** `src/pages/clinicians/CreateClinicianPage.jsx`, `src/pages/clinicians/EditClinicianPage.jsx`  
**Root Cause:** MUI `TextField` requires its `ref` to be passed via the `inputRef` prop (or via `Controller`). If bare `register` is spread with `{...register('email')}` but the `TextField` doesn't forward `ref` correctly, React Hook Form never receives the typed value. The field reads as empty → "Required" fires even after typing.  
**Fix — use `Controller` from RHF with MUI:**
```jsx
// ❌ BROKEN — bare register doesn't work on MUI TextField:
<TextField {...register('email')} label="Email" />

// ✅ CORRECT — use Controller:
import { useForm, Controller } from 'react-hook-form';

<Controller
  name="email"
  control={control}
  rules={{ required: 'Email is required' }}
  render={({ field, fieldState }) => (
    <TextField
      {...field}
      label="Email"
      error={!!fieldState.error}
      helperText={fieldState.error?.message}
    />
  )}
/>
```
**Or use `inputRef` shorthand:**
```jsx
const { ref, ...rest } = register('email', { required: true });
<TextField {...rest} inputRef={ref} label="Email" />
```
Apply same pattern to all fields: First Name, Last Name, Phone, Specialisation, License Number.  
**Priority:** 🔴 Critical — creates and edits cannot be submitted at all  
**Effort:** Medium (1–2 hr — refactor all form fields in create + edit pages)

---

### SUG-CLIN-002 — Fix: Edit Clinician Form Blank When Backend Offline (No Mock Fallback)
**Triggered by:** TC-CLIN-011 (BUG-CLIN-006)  
**File:** `src/pages/clinicians/EditClinicianPage.jsx`  
**Root Cause:** `EditClinicianPage` calls `useQuery(GET_CLINICIAN, { variables: { id } })`. With backend offline, query never resolves — `loading` stays `true` forever, `data` is `undefined`, `useEffect(() => reset({...}), [data])` never fires. Result: blank form.  
**Fix — add mock data fallback (same pattern as PatientDetailPage):**
```js
import { MOCK_CLINICIANS } from '../../mocks/store';

const { data, loading } = useQuery(GET_CLINICIAN, {
  variables: { id },
  fetchPolicy: 'cache-and-network',
});

// Resolve from live data OR mock store
const clinician =
  data?.clinician ??
  MOCK_CLINICIANS.find(c => c.id === id || c.id === `clin-${id}`);

useEffect(() => {
  if (clinician) {
    reset({
      first_name: clinician.first_name ?? clinician.user?.first_name,
      last_name:  clinician.last_name  ?? clinician.user?.last_name,
      email:      clinician.email      ?? clinician.user?.email,
      phone:      clinician.phone_number,
      specialization: clinician.specialization,
      license_number: clinician.license_number,
    });
  }
}, [clinician, reset]);

if (loading && !clinician) return <ClinicianFormSkeleton />;
if (!clinician) return <NotFoundState />;
```
**Priority:** 🔴 Critical — edit is completely broken in dev/mock mode  
**Effort:** Low (30 min — mirrors PatientDetailPage mock fallback)

---

### SUG-CLIN-003 — Fix: Clinician Portal Pages Render Blank (/clinician/*)
**Triggered by:** TC-CLIN-013, TC-CLIN-014, TC-CLIN-015 (BUG-CLIN-007)  
**Files:** `src/pages/clinician/dashboard.jsx`, `src/pages/clinician/calendar.jsx`, `src/pages/clinician/availability.jsx`  
**Root Cause:** Two likely causes:
1. The clinician portal pages check `user.role === 'CLINICIAN'` and return `null` / nothing when the current session role is `ADMIN` (since we're logged in as admin in dev mode)
2. The pages use `useQuery` hooks that await the backend and have no mock data fallback, causing them to render empty forever.  
**Fix Option A — Remove role guard during development:**
```js
// In each portal page, temporarily comment role guard:
// if (user?.role !== 'CLINICIAN') return null; // ← causes blank in admin mode
```
**Fix Option B — Add mock data + conditional render:**
```js
// clinician/dashboard.jsx
const MOCK_CLINICIAN_DASHBOARD = {
  todayAppointments: 8,
  patientsSeen: 142,
  totalRevenue: 3200,
  appointments: MOCK_APPOINTMENTS.slice(0, 5),
};

const dashboardData = data?.clinicianDashboard ?? MOCK_CLINICIAN_DASHBOARD;
```
Apply matching mock fallback to `/clinician/calendar` and `/clinician/availability`.  
**Priority:** 🔴 Critical — entire clinician portal (3 pages) is inaccessible  
**Effort:** Low per page (add mock fallback + remove blocking role guard)

---

## 🟡 Filter & Data Fixes

### SUG-CLIN-004 — Fix: Search Bar Not Connected to Clinician Grid Filter
**Triggered by:** TC-CLIN-002 (BUG-CLIN-002)  
**File:** `src/pages/clinicians/index.jsx`  
**Root Cause:** The search input state (`searchTerm`) is not applied in the filter function that produces the displayed clinician array.  
**Fix:**
```js
const [searchTerm, setSearchTerm] = useState('');
const [debouncedSearch] = useDebounce(searchTerm, 300);

const filteredClinicians = useMemo(() => {
  let result = clinicians;
  if (debouncedSearch) {
    const q = debouncedSearch.toLowerCase();
    result = result.filter(c =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      c.specialization?.toLowerCase().includes(q)
    );
  }
  if (activeStatus !== 'all') {
    result = result.filter(c =>
      c.status?.toLowerCase() === activeStatus.toLowerCase()
    );
  }
  if (selectedClinic) {
    result = result.filter(c => c.clinic_id === selectedClinic);
  }
  return result;
}, [clinicians, debouncedSearch, activeStatus, selectedClinic]);
```
**Priority:** 🟡 High — basic search is non-functional  
**Effort:** Very Low (< 20 min — same pattern as patients module which works correctly)

---

### SUG-CLIN-005 — Fix: Active/Inactive Status Toggle Not Filtering Grid
**Triggered by:** TC-CLIN-004 (BUG-CLIN-004)  
**File:** `src/pages/clinicians/index.jsx`  
**Root Cause:** `activeStatus` state is updated when the toggle is clicked but not used in the rendered clinician array (same root cause as BUG-CLIN-002).  
**Fix:** Included in the `filteredClinicians` useMemo in SUG-CLIN-004 above. The status check on line 14 (`c.status?.toLowerCase() === activeStatus.toLowerCase()`) handles this.  
**Priority:** 🟡 High  
**Effort:** Very Low (covered by SUG-CLIN-004 fix)

---

### SUG-CLIN-006 — Fix: Clinician Cards Missing Specialization, Clinic & Rating
**Triggered by:** TC-CLIN-001 (BUG-CLIN-001)  
**File:** `src/pages/clinicians/index.jsx` — card template  
**Root Cause:** The clinician card component renders `c.name`, `c.status` but the fields `c.specialization`, `c.clinic_name`, and `c.rating` are either not present in the mock data object or are accessed with the wrong property key.  
**Fix — audit mock data shape vs card template:**
```js
// Ensure MOCK_CLINICIANS has the expected fields:
const MOCK_CLINICIANS = [
  {
    id: 'clin-1',
    first_name: 'Sarah',
    last_name: 'Mitchell',
    full_name: 'Dr. Sarah Mitchell',
    specialization: 'General Practice',    // ← must exist
    clinic_name: 'MediBook Main Clinic',   // ← must exist (or clinic.name)
    rating: 4.8,                           // ← must exist
    status: 'active',
    // ...
  },
];

// In ClinicianCard.jsx — use correct field names:
<Typography>{clinician.specialization ?? 'No specialization'}</Typography>
<Typography>{clinician.clinic_name ?? clinician.clinic?.name ?? '—'}</Typography>
<Rating value={clinician.rating ?? 0} readOnly />
```
**Priority:** 🟡 High — cards look empty and unprofessional  
**Effort:** Low (30 min — data shape audit + template field names)

---

## 🚀 Missing Features

### SUG-CLIN-007 — Add Specialization Filter Dropdown
**Triggered by:** TC-CLIN-003 (BUG-CLIN-003)  
**File:** `src/pages/clinicians/index.jsx`  
**Observation:** The test plan expects a Specialization filter but only a Clinic dropdown exists. Specialization is a primary way staff search for clinicians (e.g., "find me a cardiologist available today").  
**Suggestion:**
```jsx
const [selectedSpec, setSelectedSpec] = useState('');
const SPECIALIZATIONS = [...new Set(clinicians.map(c => c.specialization).filter(Boolean))];

<TextField
  select size="small" label="Specialization"
  value={selectedSpec}
  onChange={(e) => setSelectedSpec(e.target.value)}
  sx={{ minWidth: 160 }}
>
  <MenuItem value="">All Specializations</MenuItem>
  {SPECIALIZATIONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
</TextField>
```
Add `selectedSpec` to the `filteredClinicians` useMemo:
```js
if (selectedSpec) result = result.filter(c => c.specialization === selectedSpec);
```
**Priority:** 🟡 Medium  
**Effort:** Low (30 min — same pattern as clinic filter)

---

### SUG-CLIN-008 — "Book with This Clinician" Button on Clinician Detail
**Triggered by:** TC-CLIN-006 (detail page observation)  
**Observation:** The clinician detail page shows profile, schedule, bio, and education — but there is no direct action to book an appointment with this clinician. A "Book Appointment" CTA is the most logical action after reviewing a clinician's profile.  
**Suggestion:**
- Add a **"Book Appointment"** primary button in the clinician detail header actions (next to "Edit Clinician")
- Clicking navigates to `/appointments/new?clinicianId=clin-1&step=2` — skipping Step 1 (clinic selection) and pre-selecting this clinician in Step 2 of the booking wizard
- On mobile, this becomes a floating action button (teal gradient, calendar `+` icon)

**Priority:** 🟡 Medium  
**Effort:** Low (navigate with params — booking wizard already supports pre-selection state)

---

### SUG-CLIN-009 — Clinician Detail: Next Available Slot Widget
**Triggered by:** TC-CLIN-007 (schedule observation)  
**Observation:** The schedule tab shows weekly availability percentages, but there is no "Next Available" callout — the most useful info for a receptionist booking an appointment.  
**Suggestion:**
- Add a **"Next Available"** chip at the top of the detail page header:
  - `🟢 Next available: Today, 2:00 PM`
  - `🟡 Next available: Tomorrow, 9:00 AM`
  - `🔴 No slots this week`
- Derived from upcoming appointments vs availability slots in the mock data

**Priority:** 🟢 Low  
**Effort:** Low

---

### SUG-CLIN-010 — Clinician Portal: Role-Aware Login Redirect
**Triggered by:** TC-CLIN-013 (BUG-CLIN-007)  
**Observation:** There is currently no way to test the clinician portal without modifying code, since there is no login page flow that sets `role = 'CLINICIAN'`. The portal pages are permanently invisible in the current dev setup.  
**Suggestion:**
- On the Login page, add a **"Sign in as Clinician (Demo)"** quick-login button (below the regular form)
- It sets `user.role = 'CLINICIAN'` and `user.id = 'clin-1'` in the auth mock store
- Redirects to `/clinician/dashboard`
- Similarly add "Sign in as Admin (Demo)" and "Sign in as Manager (Demo)" buttons
- These quick-login buttons only show in `NODE_ENV === 'development'`

**Priority:** 🟡 Medium  
**Effort:** Low (1 hr — add to existing mock auth setup)

---

### SUG-CLIN-011 — Clinician Availability: Visual Weekly Grid (Not Just a Form)
**Triggered by:** TC-CLIN-015 (availability page blank)  
**Observation:** The test plan expects a "weekly availability form with day checkboxes and time slots". Even when fixed (BUG-CLIN-007), a plain checkbox form is a poor UX for managing scheduling. Clinics in practice need a visual schedule builder.  
**Suggestion:**
- Replace the plain form with a **96-cell week grid** (7 days × 24 hourly slots)
- Cells are toggleable — click to mark as *Available* (teal) or *Unavailable* (gray)
- Drag to select multiple hours at once
- Show existing appointments as non-editable blue blocks
- Save button submits the availability matrix as a structured object

**Priority:** 🟢 Low  
**Effort:** High (new component)

---

## Summary Table

| ID | Suggestion | Category | Priority | Effort |
|----|-----------|----------|----------|--------|
| SUG-CLIN-001 | Fix RHF + MUI TextField wiring in create/edit forms | 🐛 Bug Fix | 🔴 Critical | Medium |
| SUG-CLIN-002 | Add mock data fallback to EditClinicianPage | 🐛 Bug Fix | 🔴 Critical | Low |
| SUG-CLIN-003 | Fix clinician portal pages (role guard + mock data) | 🐛 Bug Fix | 🔴 Critical | Low |
| SUG-CLIN-004 | Connect search bar to clinician grid filter | 🐛 Bug Fix | 🟡 High | Very Low |
| SUG-CLIN-005 | Connect Active/Inactive toggle to clinician grid | 🐛 Bug Fix | 🟡 High | Very Low |
| SUG-CLIN-006 | Fix clinician card missing specialization/clinic/rating | 🐛 Bug Fix | 🟡 High | Low |
| SUG-CLIN-007 | Add Specialization filter dropdown to clinicians list | 🚀 Feature | 🟡 Medium | Low |
| SUG-CLIN-008 | "Book with This Clinician" button on detail page | 🚀 Feature | 🟡 Medium | Low |
| SUG-CLIN-009 | "Next Available" slot callout on clinician detail header | ✨ UX | 🟢 Low | Low |
| SUG-CLIN-010 | Role-aware demo login buttons on Login page | ✨ UX | 🟡 Medium | Low |
| SUG-CLIN-011 | Visual weekly availability grid builder (drag-select) | 🚀 Feature | 🟢 Low | High |

---

## Quick Wins (Low Effort, High Impact)

1. **SUG-CLIN-004 + SUG-CLIN-005** — One `filteredClinicians` useMemo using existing state variables — fixes both search and status filter in ~20 min
2. **SUG-CLIN-002** — Copy mock fallback from PatientDetailPage to EditClinicianPage — 30 min, unblocks all edit tests
3. **SUG-CLIN-006** — Audit mock data property names vs card template field access — 30 min, makes all 6 cards look complete
4. **SUG-CLIN-010** — Role-aware demo login buttons — 1 hr, makes the entire clinician portal testable without code changes
