# Admin Panel — Test Plan (Updated Post-Implementation)

**Feature area:** `/src/pages/admin/`  
**Files:** `users/index.jsx`, `users/form.jsx`, `Organizations.jsx`, `Communications.jsx`, `Languages.jsx`, `Roles.jsx`, `ClinicianTypes.jsx`, `RoomTypes.jsx`, `Policies.jsx`, `EmailTemplates.jsx`, `layouts/AdminLayout.jsx`  
**Routes tested:** `/admin/users`, `/admin/users/new`, `/admin/users/:id/edit`, `/admin/organizations`, `/admin/roles`, `/admin/communications`, `/admin/policies`, `/admin/clinician-types`, `/admin/room-types`, `/admin/languages`, `/admin/email-templates`, `/forbidden`  
**Access:** Admin, Super Admin only  
**Updated:** 2026-03-18 — added TC-ADMIN-015 through TC-ADMIN-022 based on suggestions

---

## Users & RBAC (`/admin/users`)

### TC-ADMIN-001 — Users list renders
**Prompt:**
> Log in as Admin. Navigate to `http://localhost:3001/admin/users`.
> Assert: table of all system users with Name, Email, Role chip, Status chip, Last Login, Actions (Edit, Deactivate). At least 4 mock users visible.

**Expected:** Mock user list (Dr. Sarah Chen, Marcus Wright, Elena Rodriguez, James Wilson). Role chips are color-coded. Admin sidebar visible on left.

---

### TC-ADMIN-002 — Create new user (admin user form)
**Prompt:**
> Click "Add User" button. Navigate to `/admin/users/new`.
> Fill: Full Name "New Admin", Email "newadmin@clinic.com", Password "Admin1234!", assign role "Admin" from dropdown. Click "Create User".
> Assert: Success snackbar "User created successfully" appears. Navigate back to `/admin/users`.
> If backend offline: Assert warning snackbar "User 'New Admin' created (mock mode — backend offline)" appears.

**Expected:** CREATE_USER_MUTATION fires. Snackbar fires and navigates. Offline fallback graceful.

---

### TC-ADMIN-003 — Edit user form pre-fills existing data
**Prompt:**
> On `/admin/users`, click the pencil edit icon on Marcus Wright's row.
> Assert: URL changes to `/admin/users/2/edit`. Full Name field pre-filled "Marcus Wright", Email field pre-filled "m.wright@healthsync.com".

**Expected:** When backend offline: MOCK_USER_STORE lookup fills the form. When online: GET_USER_BY_ID query fills with real data.

---

### TC-ADMIN-004 — Non-admin access to admin page blocked
**Prompt:**
> Navigate to `http://localhost:3001/forbidden`.
> Assert: page shows "Access Forbidden" / 403 content. URL is /403 or /forbidden.

**Expected:** RoleGuard blocks non-admin access. `/forbidden` route alias redirects to `/403`.

---

## Sidebar Navigation (New — SUG-ADMIN-008)

### TC-ADMIN-015 — Admin sidebar visible on all admin pages
**Prompt:**
> Log in as Admin. Navigate to `/admin/users`.
> Assert: Left sidebar visible with "ADMIN CONSOLE" heading and 3 sections: "USERS & ACCESS", "SYSTEM", "REFERENCE DATA".
> Click "Languages" in sidebar → Assert URL changes to `/admin/languages`. Sidebar highlights "Languages".
> Click "Roles" in sidebar → Assert URL changes to `/admin/roles`.

**Expected:** Sidebar present on every `/admin/*` page. Active item highlighted with teal color + accent bar.

---

### TC-ADMIN-016 — Admin sidebar sub-section navigation — System
**Prompt:**
> From any admin page, click: Organizations, Policies, Communications, Email Templates one by one.
> Assert: each click navigates to correct URL and sidebar item becomes active.

**Expected:** All 4 System section items navigate correctly.

---

### TC-ADMIN-017 — Admin sidebar sub-section navigation — Reference Data
**Prompt:**
> From any admin page, click: Clinician Types, Room Types, Languages.
> Assert: each click navigates to correct URL and renders content.

**Expected:** All 3 Reference Data items navigate and show mock data.

---

## Organizations (`/admin/organizations`)

### TC-ADMIN-005 — Organizations list with mock data
**Prompt:**
> Navigate to `/admin/organizations`. Wait 2s for Apollo timeout.
> Assert: 3 mock organizations visible (MediBook Main Clinic, Westside Health Center, Downtown Medical Group). KPI cards show Total/Active/Inactive counts.

**Expected:** `MOCK_ORGS` fallback kicks in on Apollo error. No "Failed to fetch" error banner.

---

### TC-ADMIN-006 — Create organization dialog
**Prompt:**
> Click "Add Organization". Assert: modal dialog opens with fields: Name, Code/Slug, Contact Email, City, country, Active toggle.

**Expected:** Dialog opens with all required fields. Name, Code, Email are marked required.

---

## Roles (`/admin/roles`)

### TC-ADMIN-007 — Default roles listed with mock data
**Prompt:**
> Navigate to `/admin/roles`. Wait 2s.
> Assert: 6 mock roles visible (System Admin, Admin, Manager, Clinician, Receptionist, Patient). Each has description, active toggle, created date.

**Expected:** `MOCK_ROLES` renders. No "No roles defined yet" empty state.

---

### TC-ADMIN-008 — Create custom role
**Prompt:**
> Click "Add Role". Fill Name "Coordinator", Description "Appointment coordinator role". Save.
> Assert: inline form validates. Success snackbar (requires backend) OR role added locally.

**Expected:** Inline form appears below button. Name + Description fields required.

---

## Email Templates (`/admin/email-templates`)

### TC-ADMIN-009 — Templates list with mock data
**Prompt:**
> Navigate to `/admin/email-templates`. Wait 2s.
> Assert: 5 mock templates visible: Appointment Confirmation, Appointment Reminder, Appointment Cancellation, Password Reset, Welcome Email.
> Assert: each template card shows type chip, active status chip, subject line, and `{{variable}}` chips.

**Expected:** `MOCK_EMAIL_TEMPLATES` renders with full template cards.

---

### TC-ADMIN-010 — Edit email template (inline)
**Prompt:**
> Click the pencil edit icon on "Appointment Confirmation" template.
> Assert: inline edit form opens. Subject field pre-filled. Body textarea (monospace) pre-filled. Save Template and Cancel buttons visible.

**Expected:** Pre-fill uses existing template data from `MOCK_EMAIL_TEMPLATES[0]`.

---

## Communications (`/admin/communications`)

### TC-ADMIN-011 — Communications page
**Prompt:**
> Navigate to `/admin/communications`.
> Assert: "Communications" heading. 3 tabs: Notification Templates, Global Settings, Send Test Message.
> Assert Tab 1 shows 6 notification template toggles.

**Expected:** Hardcoded local data renders (no Apollo). Always works.

---

## Policies (`/admin/policies`)

### TC-ADMIN-012 — Policies page
**Prompt:**
> Navigate to `/admin/policies`.
> Assert: "Policies & Compliance" heading + "Save All Changes" button. 4 tabs: Booking Policies, Security & Privacy, GDPR & Compliance, Cancellation Rules.
> Assert Tab 1 shows 6 editable policy cards.

**Expected:** Hardcoded local data renders. Always works.

---

## Clinician Types (`/admin/clinician-types`)

### TC-ADMIN-013 — Clinician types list and create
**Prompt:**
> Navigate to `/admin/clinician-types`. Wait 2s.
> Assert: 4 types visible: General Practitioner, Cardiologist, Neurologist, Physiotherapist.
> Click "Add Type", type "Rheumatologist", click Save.
> Assert: success snackbar OR new type appears in list.

**Expected:** `MOCK_CLINICIAN_TYPES` renders. Add form opens inline.

---

## Languages (`/admin/languages`)

### TC-ADMIN-014 — Languages list and toggle
**Prompt:**
> Navigate to `/admin/languages`. Wait 2s.
> Assert: 3 languages: English (Active + "Default" chip, delete disabled), Spanish (Active), French (Inactive).
> Toggle French to Active. Assert: toggle switches state.

**Expected:** `MOCK_LANGUAGES` renders. Toggle is interactive UI (no backend needed to toggle).

---

## Room Types (`/admin/room-types`) — New TC

### TC-ADMIN-018 — Room types list (known limitation)
**Prompt:**
> Navigate to `/admin/room-types`. Wait 2s.
> Assert: either mock room types render OR empty state "No room types configured".

**Expected (current):** Empty state — `RoomTypes.jsx` does not yet have mock fallback (NEW-ADMIN-001).  
**Expected (after fix):** Mock types like "Consultation Room", "Procedure Room".

---

## Audit Log (already exists as Tab 3 of Users page)

### TC-ADMIN-019 — Audit Log tab renders
**Prompt:**
> Navigate to `/admin/users`. Click "Audit Logs" tab.
> Assert: audit log entries visible with Timestamp, Action, User columns. Filter dropdowns for Action type. Expand a log entry to see JSON payload.

**Expected:** Mock audit logs render. Filter chips (CREATE/UPDATE/DELETE/READ) clickable.

---

## Edge Cases & Regression Tests

### TC-ADMIN-020 — Search clears and re-shows all users
**Prompt:**
> On `/admin/users`, type "sarah" in search. User count drops to 1. Clear search field.
> Assert: all 4 users return. Pagination shows "Showing 4 of 4".

**Expected:** `filteredUsers` correctly re-includes all users on empty search.

---

### TC-ADMIN-021 — Search by role name
**Prompt:**
> Type "Clinician" in the search field on `/admin/users`.
> Assert: only users with Clinician role remain.

**Expected:** `filteredUsers` useMemo filters on `roles[].name`.

---

### TC-ADMIN-022 — Edit user cancel navigates back
**Prompt:**
> Navigate to `/admin/users/:id/edit` for any user. Click "Cancel" button.
> Assert: navigates back to `/admin/users` without saving.

**Expected:** Cancel button calls `navigate('/admin/users')` — no mutation fired.
