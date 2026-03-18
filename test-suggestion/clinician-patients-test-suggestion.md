# Clinician Patients — Test Suggestions

**Derived from:** [clinician-patients-test-results.md](../test-result/clinician-patients-test-results.md)  
**Source File:** `frontend/src/pages/clinician/Patients.jsx`  
**Date:** 2026-03-17

---

## 🔴 High Priority — Bug Fixes & Test Plan Corrections

### SUG-CLPAT-001 — Test Plan Correction: Active Count is 3, Not 2

**Problem:** TC-CLPAT-02 and TC-CLPAT-06 both state "Active = 2 patients" but the PATIENTS array has 3 patients with `status: 'active'`:  
- Emma Wilson (id:1)  
- Omar Hassan (id:2)  
- James Brown (id:4)

**Action:** Update the test plan:
- **TC-CLPAT-02**: Change "Active=2" → "Active=3"
- **TC-CLPAT-06**: Change "Shows 2 patients (Emma Wilson, James Brown)" → "Shows 3 patients (Emma Wilson, Omar Hassan, James Brown)"
- **Feature Overview**: Change "Active=2" → "Active=3"

**Priority:** 🔴 High (incorrect expected values causes false failures in CI)

---

### SUG-CLPAT-002 — Add Null Guard for Email (E4 Bug)

**Problem:** Line 27: `p.email.toLowerCase()` — if `email` is `undefined` or `null`, this throws `TypeError: Cannot read properties of undefined (reading 'toLowerCase')`. Entire page crashes to error state.

```js
// BEFORE (line 27):
const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase());

// AFTER — with null guards:
const matchSearch = !search ||
  (p.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
  (p.email ?? '').toLowerCase().includes(search.toLowerCase());
```

**Priority:** 🔴 High | **Effort:** 1 line

---

### SUG-CLPAT-003 — Pre-fill Patient in Book Appointment Navigation

**Problem:** Line 128: `onClick={() => navigate('/appointments/book')}` navigates to the booking wizard without any patient context. Clinician must re-select the patient from scratch.

**Fix:**
```jsx
onClick={() => navigate('/appointments/book', { state: { patientId: patient.id, patientName: patient.name } })}
```

Then in the booking wizard, read `useLocation().state.patientId` to pre-fill the patient field.

**Priority:** 🔴 High | **Effort:** 2 lines (plus wizard update)

---

## 🟡 Medium Priority — UX Improvements

### SUG-CLPAT-004 — Add Empty State for "No Results Found"

**Problem:** When search returns 0 results, the table body is simply empty. No "No patients found" message is shown. Users may think the page is broken.

**Fix:**
```jsx
{filtered.length === 0 && (
  <TableRow>
    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
      <Typography color="text.secondary">
        No patients match "{search}". Try a different name or email.
      </Typography>
    </TableCell>
  </TableRow>
)}
```

**Priority:** 🟡 Medium | **Effort:** 5 lines

---

### SUG-CLPAT-005 — Connect to Real Backend

**Problem:** Entire patient list is static mock data. Changes (new patients, status updates, visit counts) never reflect in the UI.

**Fix:**
```js
const GET_CLINICIAN_PATIENTS = gql`
  query GetClinicianPatients($clinicianId: ID!) {
    getClinicianPatients(clinicianId: $clinicianId) {
      id name dob email lastVisit totalVisits nextAppt condition status
    }
  }
`;
const { data } = useQuery(GET_CLINICIAN_PATIENTS, { variables: { clinicianId: user?.id }, skip: !user?.id });
const PATIENTS = data?.getClinicianPatients || MOCK_PATIENTS;
```

**Priority:** 🟡 Medium | **Effort:** Large

---

### SUG-CLPAT-006 — Sortable Table Columns

**Problem:** Table has no sorting capability. For a list used daily by clinicians, sorting by Last Visit, Next Appointment, or Name would be critical.

**Fix (simple date sort for Next Appointment):**
```js
const [sortBy, setSortBy] = useState(null);
const sorted = [...filtered].sort((a, b) => {
  if (!sortBy) return 0;
  if (sortBy === 'nextAppt') return (a.nextAppt || '9999') > (b.nextAppt || '9999') ? 1 : -1;
  // ... etc
});
```

Add `<TableSortLabel>` to column headers.

**Priority:** 🟡 Medium

---

## 🟢 Low Priority — UX Polish

### SUG-CLPAT-007 — Search Field Clear Button (X)

**Problem:** The `<SearchField>` component has an `X` clear button visible (confirmed in browser screenshots), but it might not reliably reset the state on all devices.

**Verify:** The `SearchField` component's clear button should call `setSearch('')`. Confirm the X button correctly resets `search` state.

**Priority:** 🟢 Low

---

### SUG-CLPAT-008 — Patient Avatar: Initials Fallback vs Gravatar

**Problem:** Line 90: `<PatientAvatar firstName={patient.name.split(' ')[0]} lastName={patient.name.split(' ')[1]} email={patient.email} size="sm" />`. If patient name has no space (e.g., single-word name), `split(' ')[1]` returns `undefined`, leading to undefined `lastName`. Avatar initials would show only first initial.

**Fix:**
```js
const [firstName, ...rest] = patient.name.split(' ');
const lastName = rest.join(' ') || '';

<PatientAvatar firstName={firstName} lastName={lastName} email={patient.email} size="sm" />
```

**Priority:** 🟢 Low

---

### SUG-CLPAT-009 — Status Filter Count Badges

Show patient count in each filter chip:

```jsx
<Chip label={`Active (${PATIENTS.filter(p => p.status === 'active').length})`} ... />
```

So chips show: **All (5)**, **Active (3)**, **New (1)**, **Inactive (1)** — helps users at a glance.

**Priority:** 🟢 Low

---

## Test Plan Gaps & Additional Test Cases

### SUG-CLPAT-PLAN-001 — Add TC: Avatar Initials Correct

> **TC-CLPAT-01B** — Patient column avatar initials  
> Verify each PatientAvatar shows correct initials:  
> Emma Wilson → "EW", Omar Hassan → "OH", Lily Chen → "LC", James Brown → "JB", Sophie Müller → "SM".  
> Screenshot confirmed all 5 avatars visible with correct initials and teal background.

### SUG-CLPAT-PLAN-002 — Add TC: Book Action Has No Patient Pre-fill

> **TC-CLPAT-16B** — Booking wizard not pre-filled  
> Click CalendarMonthIcon on James Brown. Navigate to `/appointments/book`.  
> Verify: patient name field is NOT pre-filled with "James Brown".  
> This is a known UX gap — should be fixed per SUG-CLPAT-003.

### SUG-CLPAT-PLAN-003 — Add TC: Search is Case-Insensitive

> **TC-CLPAT-03B** — Case-insensitive name search  
> Type "EMMA" (all caps). Verify: Emma Wilson still found.  
> Type "emma wilson" (lowercase). Verify: Emma Wilson found.  
> Source: `.toLowerCase().includes(search.toLowerCase())` — confirmed case-insensitive.

### SUG-CLPAT-PLAN-004 — Add TC: Email Partial Match

> **TC-CLPAT-04B** — Partial email search  
> Type "email.com" in search. Expected: Emma Wilson, Omar Hassan, Lily Chen shown (all use @email.com). James Brown and Sophie Müller (use @mail.com) hidden.  
> Verify partial email matching works.

### SUG-CLPAT-PLAN-005 — Add TC: Hover Row Highlight

> **TC-CLPAT-17** — Table row hover  
> Source line 87: `<TableRow hover>`. Hover over any row. Verify background darkens slightly (MUI Table hover style).

### SUG-CLPAT-PLAN-006 — Add TC: "Sophie Müller" Unicode Name

> **TC-CLPAT-18** — Unicode name in search  
> Type "müller" (with ü — non-ASCII). Expected: Sophie Müller row appears.  
> Type "muller" (without ü). Expected: No match (JavaScript `includes` is byte-exact, no Unicode normalization). This may be a gap for international names.

### SUG-CLPAT-PLAN-007 — Add TC: Status Chip Capitalization

> **TC-CLPAT-14B** — Status chip text format  
> Source line 119: `textTransform: 'capitalize'`. Verify chip shows "Active" not "active" (CSS capitalize).  
> Confirmed visually in screenshot: status shows "Active", "New", "Inactive".

---

## Summary Table

| ID | Suggestion | Category | Priority |
|----|-----------|----------|----------|
| SUG-CLPAT-001 | Fix test plan Active count (2→3) | 📋 Test Plan Fix | 🔴 High |
| SUG-CLPAT-002 | Null guard for email search crash | 🐛 Bug Fix | 🔴 High |
| SUG-CLPAT-003 | Pre-fill patient in booking nav | ✨ UX | 🔴 High |
| SUG-CLPAT-004 | Empty state for no results | ✨ UX | 🟡 Medium |
| SUG-CLPAT-005 | Connect to real backend | 🔗 Integration | 🟡 Medium |
| SUG-CLPAT-006 | Sortable table columns | ✨ UX | 🟡 Medium |
| SUG-CLPAT-007 | Verify search clear button behaviour | 🧪 Test | 🟢 Low |
| SUG-CLPAT-008 | Single-word patient name avatar | 🐛 Visual | 🟢 Low |
| SUG-CLPAT-009 | Filter chip count badges | ✨ UX | 🟢 Low |

### Quick Wins (< 5 min):
- **SUG-CLPAT-002**: Add `?? ''` null-coalescing guard to email search (1 line)
- **SUG-CLPAT-004**: Add empty state in `<TableBody>` when `filtered.length === 0` (5 lines)
