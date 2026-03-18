# Staff Management — Feature Suggestions

**Derived from:** [staff-test-results.md](../test-result/staff-test-results.md)  
**Test Plan Source:** [staff-test-plan.md](../test-plan/staff-test-plan.md)  
**Date:** 2026-03-16  
**Tested by:** Antigravity AI Browser Agent

> The Staff module is the best-performing module tested so far — 19/23 test cases passed. Only 3 failures, all navigation-related (broken onClick handlers for Add and Edit buttons). The form UX, filters, tabs, preview card, password meter, deactivation flow, and unsaved-changes detection all work perfectly.

---

## 🔴 Critical Bug Fixes

### SUG-STAFF-001 — Fix: "Add Staff Member" Button Not Navigating
**Triggered by:** TC-STAFF-007 (BUG-STAFF-001)  
**File:** `src/pages/staff/index.jsx`  
**Root Cause:** The "Add Staff Member" button's `onClick` calls `navigate('/staff/new')` but the navigation isn't firing. Most likely cause: `useNavigate` is not imported/used at the top level of the component — if the button is rendered in a sub-component or the navigate instance is stale.  
**Fix:**
```jsx
// In src/pages/staff/index.jsx — ensure useNavigate is at the top:
import { useNavigate } from 'react-router-dom';

export default function StaffPage() {
  const navigate = useNavigate(); // ← must be here, not inside a sub-component

  return (
    // ...
    <Button
      variant="contained"
      startIcon={<AddRoundedIcon />}
      onClick={() => navigate('/staff/new')}  // ← confirm this line exists
      sx={{ background: 'linear-gradient(135deg, #00858F 0%, #006D77 100%)' }}
    >
      Add Staff Member
    </Button>
  );
}
```
**If the button is inside a child component, pass navigate as a prop:**
```jsx
// Parent:
<StaffActionsBar onAdd={() => navigate('/staff/new')} />
// Child:
<Button onClick={onAdd}>Add Staff Member</Button>
```
**Priority:** 🔴 Critical — primary action on the staff list is unreachable without direct URL entry  
**Effort:** Very Low (5 min — locate the button element and verify `navigate` call)

---

### SUG-STAFF-002 — Fix: Edit Pencil Icon Not Navigating from Staff Table Row
**Triggered by:** TC-STAFF-008 (BUG-STAFF-002)  
**File:** `src/pages/staff/index.jsx` — table row Actions column  
**Root Cause:** The pencil icon's `onClick` in the table Actions column is calling `navigate('/staff/edit/' + staff.id)` but a parent element may be preventing the click from reaching it, or the same stale `navigate` issue from BUG-STAFF-001.  
**Fix:**
```jsx
// In the DataGrid or TableRow renderCell for Actions column:
<Tooltip title="Edit Staff Member">
  <IconButton
    onClick={(e) => {
      e.stopPropagation(); // prevent row click from interfering
      navigate(`/staff/edit/${row.id}`);
    }}
    sx={{ color: '#006D77' }}
  >
    <EditRoundedIcon />
  </IconButton>
</Tooltip>
```
**Also verify the Deactivate icon works (it navigates internally via dialog — confirmed PASS in TC-STAFF-022).**  
**Priority:** 🔴 Critical — all staff editing requires direct URL entry  
**Effort:** Very Low (10 min — add explicit navigate call to icon onClick)

---

## 🟡 UX Improvements

### SUG-STAFF-003 — Tune Password Strength Thresholds
**Triggered by:** TC-STAFF-015 (BUG-STAFF-004)  
**File:** `src/pages/staff/new.jsx` — `pwdStrength` calculation  
**Observation:** "Abc123!!" (8 chars, uppercase + lowercase + digit + special) shows as "Fair" instead of "Strong". For a healthcare application, a common password like this should score at least "Good" or "Strong".  
**Suggestion:**
```js
// Current likely logic (too strict):
const calcStrength = (pwd) => {
  let score = 0;
  if (pwd.length >= 8)  score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score; // max 5
};

// Labels: 0-1="Weak", 2="Fair", 3="Good", 4="Strong", 5="Very Strong"

// Suggested adjustment — reward meeting all 4 character class criteria:
// 0-1 = Weak, 2 = Fair, 3 = Good, 4-5 = Strong
// "Abc123!!" → uppercase✓ + digit✓ + special✓ + length≥8✓ = score 4 → Strong ✅
```
**Priority:** 🟢 Low  
**Effort:** Very Low (2 min — adjust scoring thresholds)

---

### SUG-STAFF-004 — Email Field Should Be Required in Validation
**Triggered by:** TC-STAFF-014 (Email did not show "Required" error during automated testing)  
**File:** `src/pages/staff/new.jsx` — `validate()` function  
**Observation:** Email is a critical field but did not show a required error when left blank in TC-STAFF-014. Healthcare staff must have a valid email for system notifications and login.  
**Fix:**
```js
const validate = () => {
  const newErrors = {};
  if (!form.name.trim())  newErrors.name  = 'Full name is required';
  if (!form.email.trim()) newErrors.email = 'Email is required';
  else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Enter a valid email address';
  if (!form.phone.trim()) newErrors.phone = 'Phone number is required';
  if (!form.role)         newErrors.role  = 'Role is required';
  if (!form.department)   newErrors.department = 'Department is required';
  if (!form.password)     newErrors.password   = 'Password is required';
  if (form.password && form.password !== form.confirmPassword)
    newErrors.confirmPassword = 'Passwords do not match';
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```
**Priority:** 🟡 Medium  
**Effort:** Very Low (5 min)

---

### SUG-STAFF-005 — "Deactivate" Button Available from Staff List (Not Just Edit Page)
**Triggered by:** TC-STAFF-001 (list row observation)  
**Observation:** The deactivate icon exists in the staff list table (Actions column) but when clicked it does nothing — the deactivation confirmation dialog only works from inside the `/staff/edit/:id` page. Having the deactivate icon in the list but not wiring it up is confusing.  
**Suggestion:**
- Either: wire the deactivate icon in the list to open the same `Dialog` locally with that staff member's data
- Or: remove the deactivate icon from the list and only keep it on the edit page (simpler)
- **Preferred:** Keep icon in list for power users, but clicking it opens an inline confirmation `Popover`:
  > 🔴 Deactivate Sara Johnson?  
  > [Cancel] [Yes, Deactivate]

```jsx
const [deactivateTarget, setDeactivateTarget] = useState(null);

// In table Actions cell:
<IconButton onClick={(e) => { e.stopPropagation(); setDeactivateTarget(row); }}>
  <PersonOffRoundedIcon />
</IconButton>

// Popover or Dialog bound to deactivateTarget:
<Dialog open={!!deactivateTarget} onClose={() => setDeactivateTarget(null)}>
  <DialogTitle>Deactivate {deactivateTarget?.name}?</DialogTitle>
  <DialogActions>
    <Button onClick={() => setDeactivateTarget(null)}>Cancel</Button>
    <Button color="error" onClick={handleDeactivate}>Yes, Deactivate</Button>
  </DialogActions>
</Dialog>
```
**Priority:** 🟡 Medium  
**Effort:** Low (30 min)

---

### SUG-STAFF-006 — Staff List: Add Sort Column Headers
**Triggered by:** TC-STAFF-001 (table observation)  
**Observation:** The staff table has rich filter/search capabilities but no column sorting. Admins often want to sort by Name A–Z, by Role, or by Start Date (newest hires first).  
**Suggestion:**
- Add `sortable` headers on: Name, Role, Department, Start Date, Status
- Clicking a header sorts ascending; clicking again sorts descending; clicking a third time resets
- Show a sort indicator arrow (↑↓) on the active sort column
- Default sort: Name A–Z

```js
const [sortBy, setSortBy]   = useState('name');
const [sortDir, setSortDir] = useState('asc');

const sortedStaff = [...filteredStaff].sort((a, b) => {
  const val = sortDir === 'asc' ? 1 : -1;
  return a[sortBy] > b[sortBy] ? val : -val;
});
```
**Priority:** 🟢 Low  
**Effort:** Low (45 min)

---

### SUG-STAFF-007 — Staff Detail View (Read-Only Profile Page)
**Triggered by:** TC-STAFF-001 (no view-only page for staff)  
**Observation:** Clicking a staff row on the list navigates to the edit page directly. There is no read-only "Staff Profile" page. Manager-level users might not have edit permissions but still need to view staff details. Also, the direct navigation to edit on row-click can cause accidental edits.  
**Suggestion:**
- Add a `/staff/:id` read-only detail page (separate from `/staff/:id/edit`)
- Row click → detail page. Edit icon → edit page.
- Detail page sections: Profile header, Contact info, Role & Department, Schedule/Availability, Shift history

**Priority:** 🟢 Low  
**Effort:** Medium (new page, but much of the layout can be reused from edit page)

---

### SUG-STAFF-008 — Bulk Status Update from Staff List
**Triggered by:** TC-STAFF-005 / TC-STAFF-006 (tabs observation)  
**Observation:** The "Others" tab shows On Leave and Inactive staff. A common admin workflow: return multiple staff members from leave to active status at once (e.g., after a holiday break).  
**Suggestion:**
- Enable row checkboxes (`checkboxSelection={true}` if using DataGrid, or manual checkboxes in a regular table)
- Show a floating action bar when rows are selected:
  - "Activate selected (N)" → sets status = 'active'
  - "Mark as On Leave (N)"
  - "Export selected"

**Priority:** 🟢 Low  
**Effort:** High

---

## Summary Table

| ID | Suggestion | Category | Priority | Effort |
|----|-----------|----------|----------|--------|
| SUG-STAFF-001 | Fix "Add Staff Member" button onClick navigation | 🐛 Bug Fix | 🔴 Critical | Very Low |
| SUG-STAFF-002 | Fix Edit pencil icon onClick navigation in table | 🐛 Bug Fix | 🔴 Critical | Very Low |
| SUG-STAFF-003 | Tune password strength scoring thresholds | 🐛 Bug Fix | 🟢 Low | Very Low |
| SUG-STAFF-004 | Make Email required in validation + add format check | 🐛 Bug Fix | 🟡 Medium | Very Low |
| SUG-STAFF-005 | Wire deactivate icon in list to confirmation dialog | ✨ UX | 🟡 Medium | Low |
| SUG-STAFF-006 | Sortable column headers on staff table | ✨ UX | 🟢 Low | Low |
| SUG-STAFF-007 | Add read-only Staff Detail page (separate from edit) | 🚀 Feature | 🟢 Low | Medium |
| SUG-STAFF-008 | Bulk status update from staff list (checkboxes) | 🚀 Feature | 🟢 Low | High |

---

## What's Working Well ✅

The staff module has excellent UX despite the navigation bugs:

| Feature | Status |
|---------|--------|
| Live preview card (avatar initials, role chip, dept) | ✅ Reactive, no delay |
| Password strength meter | ✅ Works (threshold needs minor tuning) |
| Password match validation | ✅ Correct error message |
| Unsaved changes detection | ✅ Amber chip appears on any field change |
| Save Changes disabled by default | ✅ `disabled={!hasChanges}` works |
| Deactivation confirmation dialog | ✅ Dialog with correct name, deactivation fires correctly |
| Unknown staff ID redirect | ✅ Error snackbar + redirect to list |
| Active/Others tabs | ✅ Correct counts and filtering |
| Department chips | ✅ Teal highlight, correct filtering |
| Search (name + role) | ✅ Case-insensitive, debounced |
| KPI cards | ✅ Correct counts from mock data |

## Quick Wins

1. **SUG-STAFF-001 + SUG-STAFF-002** — Two navigate call fixes, ~15 min total — unblocks the entire user journey
2. **SUG-STAFF-004** — 5 lines in `validate()` — adds email required/format check
3. **SUG-STAFF-003** — 2 lines — tune strength threshold to feel right for users
