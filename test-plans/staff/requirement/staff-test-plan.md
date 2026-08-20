---
id: TP033
type: test-plan
feature: staff
created: 2026-03-19
updated: 2026-04-02
status: approved
parent: unknown
related: [TR032, TS033]
---

# Staff Module — Test Plan (v2.0)

**Module:** Staff Management (`/staff`, `/staff/new`, `/staff/edit/:id`)
**Source:** `staff/index.jsx` · `staff/new.jsx` · `staff/edit.jsx`
**Updated:** 2026-03-31 (Session QA v2.0)

---

## Feature Overview

Staff management system for the clinic. Staff list (8 mock members) with search/filter/tabs, add staff form with validation + password strength meter, edit staff form with unsaved changes detection and deactivate flow. All mock data is inline. No backend required.

---

## 1. Staff List — Page Load & Layout

### TC-STAFF-01 — Page load
**Steps:** Navigate to `/staff`.
**Expected:** "Staff Management" h4. Subtitle shows activeCount + total. "Add Staff Member" button. 4 KPI cards. Search + dept chip filter. Tabs: All(8)/Active(6)/Others(2). Table 8 rows.

### TC-STAFF-22 — Status chip colors
**Steps:** View status chips in All tab.
**Expected:** Active=green (#E6F4EA/#137333). On Leave=yellow (#FEF7E0/#8A4700). Inactive=gray (#F8F9FA/#5F6368).

### TC-STAFF-23 — Role color chips
**Steps:** View role chips in table.
**Expected:** Each role has distinct color per ROLE_COLORS map (Receptionist=blue, Nurse=purple, etc.).

---

## 2. Search & Filters

### TC-STAFF-03 — Search by name
**Steps:** Type "Sara".
**Expected:** Sara Johnson only.

### TC-STAFF-04 — Search by role
**Steps:** Type "Nurse".
**Expected:** Lisa Park only.

### TC-STAFF-07 — Department filter chip
**Steps:** Click "Front Desk" chip.
**Expected:** Sara Johnson + Amy Chen (2 rows). Chip highlighted.

### TC-STAFF-08 — Empty state
**Steps:** Search = "XYZ".
**Expected:** "No staff members found" centered in table.

### TC-STAFF-26 — Search + tab combined
**Steps:** Tab=Active; search "chen".
**Expected:** Amy Chen only (active + name match).

---

## 3. Tabs

### TC-STAFF-05 — Active tab
**Steps:** Click "Active (6)".
**Expected:** Sara, Mark, Lisa, Amy, Robert, Kevin (6 rows).

### TC-STAFF-06 — Others tab
**Steps:** Click "Others (2)".
**Expected:** James Wilson (On Leave) + Patricia Brown (Inactive).

---

## 4. Navigation

### TC-STAFF-09 — Row click navigates to edit
**Steps:** Click Sara Johnson row.
**Expected:** Navigate to /staff/edit/1.

### TC-STAFF-10 — Edit icon navigates (no row propagation)
**Steps:** Click pencil icon on Sara.
**Expected:** Navigate to /staff/edit/1. Row onClick does NOT double-fire (e.stopPropagation).

### TC-STAFF-11 — Add Staff button
**Steps:** Click "Add Staff Member".
**Expected:** Navigate to /staff/new.

---

## 5. Deactivate from List

### TC-STAFF-12 — Deactivate icon opens dialog
**Steps:** Click PersonOff icon on Sara Johnson.
**Expected:** Dialog opens "Deactivate Staff Member". Row onClick does NOT fire.

### TC-STAFF-13 — Deactivate confirm
**Steps:** Click "Yes, Deactivate".
**Expected:** Snackbar "Sara Johnson has been deactivated" (warning). Dialog closes.

---

## 6. Add Staff Form (/staff/new)

### TC-STAFF-14 — Validation: all empty submit
**Steps:** Navigate to /staff/new; click "Add Staff Member" without filling any field.
**Expected:** 6 errors: Full name /, Email /, Phone /, Role /, Department /, Password /.

### TC-STAFF-15 — Email format validation
**Steps:** Enter email = "notanemail"; click save.
**Expected:** "Invalid email address" shown under email.

### TC-STAFF-16 — Password mismatch
**Steps:** Password="Abc123!!", Confirm="Different".
**Expected:** "Passwords do not match".

### TC-STAFF-17 — Password too short
**Steps:** Password="abc".
**Expected:** "Minimum 8 characters".

### TC-STAFF-18 — Password strength: Strong
**Steps:** Enter "Abc123!!".
**Expected:** Strength="Strong" (#006D77 bar). Has uppercase+digit+special+length≥8.

### TC-STAFF-19 — Password strength: Weak
**Steps:** Enter "abc".
**Expected:** Strength="Weak" (red bar). No criteria met.

### TC-STAFF-20 — Live preview card
**Steps:** Fill name="Hannah Lee", role=Nurse, dept=Radiology, email=h@h.com.
**Expected:** Avatar initials "HL", role chip, dept, email shown in left preview card reactively.

### TC-STAFF-21 — Successful submit
**Steps:** Fill all required fields correctly; click save.
**Expected:** LinearProgress bar. 900ms delay. Snackbar "{name} added to staff successfully!" (success). Navigate to /staff.

### TC-STAFF-24 — Back arrow
**Steps:** Click back arrow on /staff/new.
**Expected:** Navigate to /staff.

### TC-STAFF-25 — Cancel button
**Steps:** Fill partial form; click Cancel.
**Expected:** Navigate to /staff. No data saved.

---

## 7. Edit Staff Form (/staff/edit/:id)

### TC-STAFF-27 — Edit page loads with pre-filled data
**Steps:** Navigate to /staff/edit/1.
**Expected:** Form pre-filled with Sara Johnson's data. "Unsaved changes" chip hidden.

### TC-STAFF-28 — Unsaved changes chip
**Steps:** Edit any field on edit page.
**Expected:** "Unsaved changes" amber chip appears. Save Changes button enabled (hasChanges=true).

### TC-STAFF-29 — Save Changes disabled by default
**Steps:** Load edit page without changing anything.
**Expected:** Save Changes button: disabled. hasChanges=false on load.

### TC-STAFF-30 — Deactivate from edit page
**Steps:** Click "Deactivate" red button on edit page.
**Expected:** Dialog opens with staff name. "Yes, Deactivate" marks as inactive + navigate to /staff.

---

## Edge Cases

| # | Edge | Expected |
|---|------|----------|
| E1 | Search + dept filter both active | Intersection of both filters applied |
| E2 | Navigate to /staff/edit/999 (unknown ID) | Error snackbar + redirect to /staff |
| E3 | Submit empty email="" in Add form | "Email is required" (required check before format check) |
| E4 | Submit email="a@b" (no TLD) | "Invalid email address" (regex fails) |
| E5 | Password strength: "password" (all lowercase 8 chars) | Score 1 (Weak) — no uppercase/digit/special |
| E6 | Password strength: "Pass123" (< 8 chars) | Score 2 (Fair) — has uppercase+digit, length 7 |
| E7 | Combined search + tab: Others tab + search "inactive" | Filters independently via matchSearch + matchStatus |
| E8 | Deactivate dialog: click Cancel | Dialog closes, no snackbar, staff row unchanged |

---

## Total: 30 Test Cases + 8 Edge Cases
