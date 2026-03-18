# Staff Management — Test Plan

**Feature area:** `/src/pages/staff/`  
**Files:** `index.jsx`, `new.jsx`, `edit.jsx`  
**Routes tested:** `/staff`, `/staff/new`, `/staff/edit/:id`  
**Mock data:** 8 staff members hardcoded in `index.jsx` and `edit.jsx`  
**Access:** Admin, Super Admin, Manager roles only

---

## 1. Staff List Page (`/staff`)

### TC-STAFF-001 — List renders 8 mock staff members
**Prompt:**  
> Log in as Admin. Navigate to `http://localhost:3001/staff`.  
> Assert: table shows 8 rows with columns: Staff Member (avatar + name + since date), Role chip, Department, Phone, Email, Status chip, Actions (Edit + Deactivate icons).

**Expected:** All 8 mock records visible. Role chips colored (teal, green, purple, etc.). Status chips (Active/On Leave/Inactive).

---

### TC-STAFF-002 — Search by name
**Prompt:**  
> On `/staff`, type "Sara" in the search field.  
> Assert: only "Sara Johnson" row visible. Other rows hidden.

**Expected:** Client-side filter on `name`, `role`, `dept` fields.

---

### TC-STAFF-003 — Search by role
**Prompt:**  
> Type "Nurse" in the search field.  
> Assert: only "Lisa Park" (Nurse) row visible.

**Expected:** Search matches `role` field. Case-insensitive comparison.

---

### TC-STAFF-004 — Department filter chip — Front Desk
**Prompt:**  
> On `/staff`, click the "Front Desk" department chip in the filter bar.  
> Assert: only Sara Johnson and Amy Chen (both Front Desk) are visible. Active chip turns teal.

**Expected:** `departmentFilter = 'Front Desk'` applied. Teal chip selection style.

---

### TC-STAFF-005 — Tab: Active only
**Prompt:**  
> Click the "Active (N)" tab.  
> Assert: only staff with status "active" shown. James Wilson (on_leave) and Patricia Brown (inactive) disappear.

**Expected:** `tab=1` filter: `s.status === 'active'` applied.

---

### TC-STAFF-006 — Tab: Others (non-active)
**Prompt:**  
> Click the "Others (N)" tab.  
> Assert: only James Wilson (on_leave) and Patricia Brown (inactive) shown.

**Expected:** `tab=2` filter: `s.status !== 'active'`.

---

### TC-STAFF-007 — Add Staff Member button is teal and navigates
**Prompt:**  
> On `/staff`, observe the "Add Staff Member" button color.  
> Assert: button is teal gradient (NOT blue). Click it — navigated to `/staff/new`.

**Expected:** Background is `linear-gradient(135deg, #00858F 0%, #006D77 100%)`. Navigation fires.

---

### TC-STAFF-008 — Edit (pencil) icon navigates to edit page
**Prompt:**  
> On `/staff`, click the teal pencil (EditRoundedIcon) on "Sara Johnson" row.  
> Assert: navigated to `/staff/edit/1`. Edit form loads with Sara Johnson's data pre-filled.

**Expected:** `navigate('/staff/edit/1')` fires. Edit page renders.

---

### TC-STAFF-009 — KPI cards show correct counts
**Prompt:**  
> On `/staff`, observe the 4 KPI cards.  
> Assert: "Total Staff" = 8, "Active" = 6, "On Leave" = 1, "Departments" = number of unique departments.

**Expected:** Counts derived from MOCK_STAFF array. Correct values shown.

---

## 2. Add Staff Page (`/staff/new`)

### TC-STAFF-010 — All form sections visible
**Prompt:**  
> Navigate to `/staff/new`.  
> Assert: page shows: left preview card (with "?" avatar, status selector), right form with sections: Personal Information, Contact Details, Role & Department, Login Credentials, Additional Notes.

**Expected:** Full two-column layout renders. FieldSection icons visible.

---

### TC-STAFF-011 — Live avatar preview updates with name
**Prompt:**  
> On `/staff/new`, type "John Smith" in the Full Name field.  
> Assert: the avatar on the left card immediately shows "JS" initials and the name "John Smith" below it.

**Expected:** `getInitials()` and `avatarColor()` functions reactive to `form.name` state.

---

### TC-STAFF-012 — Role and department update preview card
**Prompt:**  
> Select Role "Nurse" and Department "General Practice".  
> Assert: left preview card shows "Nurse" chip and "General Practice" text below the name.

**Expected:** Card reactively shows `form.role` as Chip and `form.department` as text.

---

### TC-STAFF-013 — Status selector changes highlight
**Prompt:**  
> Click "On Leave" in the status selector list.  
> Assert: "On Leave" row shows teal border, orange dot, checkmark. "Active" loses its teal border.

**Expected:** Visual status selector updates. `form.status` changes to `'on_leave'`.

---

### TC-STAFF-014 — Required fields validation
**Prompt:**  
> On `/staff/new`, click "Add Staff Member" without filling any fields.  
> Assert: error messages appear under: Full Name, Email, Phone, Role, Department, Password fields.

**Expected:** `validate()` function returns errors. `setErrors()` sets state. Fields show red helper text.

---

### TC-STAFF-015 — Password strength meter updates
**Prompt:**  
> Type "abc" in the Password field.  
> Assert: strength bar appears (red = "Weak"). Type "Abc123!!" — bar shows green "Strong".

**Expected:** `pwdStrength` computed from length + character classes. `LinearProgress` value and color update.

---

### TC-STAFF-016 — Passwords must match
**Prompt:**  
> Enter Password "Hello1234!" and Confirm Password "Hello9999!". Click Add Staff Member.  
> Assert: "Passwords do not match" error on the Confirm Password field.

**Expected:** `validate()` checks `form.password !== form.confirmPassword`. Error set.

---

### TC-STAFF-017 — Successful staff creation
**Prompt:**  
> Fill: Full Name "Test User", Email "test@clinic.com", Phone "+1 555-1234", Role "Receptionist", Department "Front Desk", Password "Pass1234!", Confirm "Pass1234!".  
> Click "Add Staff Member".  
> Assert: 900ms loading state, then green snackbar "Test User added to staff successfully!". Redirected to `/staff`.

**Expected:** Mock save completes. `enqueueSnackbar` fires. `navigate('/staff')` called.

---

## 3. Edit Staff Page (`/staff/edit/:id`)

### TC-STAFF-018 — Edit page loads with pre-filled data for Sara Johnson
**Prompt:**  
> Navigate to `/staff/edit/1`.  
> Assert: Full Name = "Sara Johnson", Role = "Receptionist", Department = "Front Desk", Email = "sara@healthsync.dev", Start Date = 2022-03-15.

**Expected:** `MOCK_STAFF.find(s => s.id === '1')` matches. All fields pre-filled.

---

### TC-STAFF-019 — "Unsaved changes" chip appears on edit
**Prompt:**  
> On `/staff/edit/1`, change the phone number to "+1 000-0000".  
> Assert: amber "Unsaved changes" chip appears in the page header. Save Changes button becomes enabled.

**Expected:** `hasChanges` computed as `JSON.stringify(form) !== JSON.stringify(original)`. Chip renders.

---

### TC-STAFF-020 — Save Changes disabled with no edits
**Prompt:**  
> On `/staff/edit/1`, do not change anything.  
> Assert: "Save Changes" button is greyed out (disabled).

**Expected:** `disabled={!hasChanges}` on the button.

---

### TC-STAFF-021 — Deactivate opens confirmation dialog
**Prompt:**  
> On `/staff/edit/1`, click "Deactivate Member" button.  
> Assert: a dialog appears saying "Sara Johnson will be marked as inactive". Confirm and Cancel buttons visible.

**Expected:** `Dialog` with `deactivateOpen=true`. Dialog text references staff member name.

---

### TC-STAFF-022 — Confirm deactivation redirects to staff list
**Prompt:**  
> In the deactivate confirm dialog, click "Yes, Deactivate".  
> Assert: warning snackbar "Sara Johnson has been deactivated". Redirect to `/staff`.

**Expected:** `handleDeactivate()` fires. 600ms delay. Snackbar + navigate.

---

### TC-STAFF-023 — Unknown staff ID redirects
**Prompt:**  
> Navigate to `/staff/edit/99999`.  
> Assert: error snackbar "Staff member not found". Redirect to `/staff`.

**Expected:** `MOCK_STAFF.find()` returns undefined. `navigate('/staff')` + snackbar error.
