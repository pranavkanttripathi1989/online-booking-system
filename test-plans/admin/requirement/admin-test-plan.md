---
id: TP001
type: test-plan
feature: admin
created: 2026-03-19
updated: 2026-03-24
status: approved
parent: unknown
related: [TR001, TS001]
---

# Admin Panel — Test Plan (Session 3 Final)

**Feature area:** `/src/pages/admin/`  
**Files:** `users/index.jsx`, `users/form.jsx`, `Organizations.jsx`, `Communications.jsx`, `Languages.jsx`, `Roles.jsx`, `ClinicianTypes.jsx`, `RoomTypes.jsx`, `Policies.jsx`, `EmailTemplates.jsx`, `layouts/AdminLayout.jsx`, `App.jsx`  
**Routes:** `/admin`, `/admin/users`, `/admin/users/new`, `/admin/users/:id/edit`, `/admin/organizations`, `/admin/roles`, `/admin/communications`, `/admin/policies`, `/admin/clinician-types`, `/admin/room-types`, `/admin/languages`, `/admin/email-templates`, `/forbidden`  
**Access:** Admin, Super Admin only  
**Updated:** 2026-03-24 — Session 3: added TC-ADMIN-023/024/025, edge cases E7–E11

---

## Mock Data Reference

| Page | Mock Data Source | Records |
|------|-----------------|---------|
| Users | `mockUsers` local const in `users/index.jsx` | 4 users |
| Roles | `MOCK_ROLES` catch fallback in `Roles.jsx` | 6 roles |
| Organizations | `MOCK_ORGS` catch fallback in `Organizations.jsx` | 3 orgs |
| Email Templates | `MOCK_EMAIL_TEMPLATES` catch fallback in `EmailTemplates.jsx` | 5 templates |
| Clinician Types | `MOCK_CLINICIAN_TYPES` catch fallback in `ClinicianTypes.jsx` | 4 types |
| Languages | `MOCK_LANGUAGES` catch fallback in `Languages.jsx` | 3 languages |
| Room Types | `MOCK_ROOM_TYPES` catch fallback in `RoomTypes.jsx` | 5 types (Session 3) |
| Audit Logs | Inline mock array in `users/index.jsx` | 3 entries |
| Communications | Hardcoded local data in `Communications.jsx` | 6 templates |
| Policies | Hardcoded local data in `Policies.jsx` | 4 tabs, 6 cards |

---

## Users & RBAC (`/admin/users`)

### TC-ADMIN-001 — Users list renders
**Steps:** Log in as Admin. Navigate to `/admin/users`.  
**Expected:** 4 mock users (Dr. Sarah Chen, Marcus Wright, Elena Rodriguez, James Wilson). Role chips color-coded. Admin sidebar visible. 

---

### TC-ADMIN-002 — Create new user
**Steps:** Click "Add User". Navigate to `/admin/users/new`. Fill Name, Email, Password, Role.  
**Expected:** Form renders: Account Details section (Name, Email, Password, Confirm Password), Roles multi-select. Offline → warning snackbar + navigate back.

---

### TC-ADMIN-003 — Edit user form pre-fills
**Steps:** Click pencil icon on Marcus Wright → `/admin/users/2/edit`.  
**Expected:** Name "Marcus Wright", Email "m.wright@healthsync.com" pre-filled via `MOCK_USER_STORE` offline. Online: `GET_USER_BY_ID` fills real data.

---

### TC-ADMIN-004 — /forbidden route
**Steps:** Navigate to `http://localhost:3001/forbidden`.  
**Expected:** Redirects to `/403`. "Access Forbidden" page shown.

---

### TC-ADMIN-015 — Admin sidebar visible
**Steps:** Log in → `/admin/users`. Observe left panel.  
**Expected:** "ADMIN CONSOLE" heading, 3 sections (Users & Access, System, Reference Data), 10 nav items. Active teal highlight + accent bar.

---

### TC-ADMIN-016 — Sidebar System navigation
**Steps:** Click Organizations, Policies, Communications, Email Templates.  
**Expected:** Each routes correctly. Active state updates.

---

### TC-ADMIN-017 — Sidebar Reference Data navigation  
**Steps:** Click Clinician Types, Room Types, Languages.  
**Expected:** All 3 navigate and show mock data.

---

## Organizations (`/admin/organizations`)

### TC-ADMIN-005 — Organizations list
**Steps:** Navigate to `/admin/organizations`. Wait 2s.  
**Expected:** 3 mock orgs (MediBook Main Clinic, Westside Health, Downtown Medical [inactive]). KPIs: 3/2/1.

---

### TC-ADMIN-006 — Create organization dialog
**Steps:** Click "Add Organization".  
**Expected:** Modal: Name*, Code*, Email*, address fields, Cancel + "Create Organization".

---

## Roles (`/admin/roles`)

### TC-ADMIN-007 — Roles list
**Steps:** Navigate to `/admin/roles`. Wait 2s.  
**Expected:** 6 roles: System Admin, Admin, Manager, Clinician, Receptionist, Patient.

---

### TC-ADMIN-008 — Create role
**Steps:** Click "Add Role". Fill Name "Coordinator".  
**Expected:** Inline form below button. Name required.

---

## Email Templates (`/admin/email-templates`)

### TC-ADMIN-009 — Templates list
**Steps:** Navigate to `/admin/email-templates`. Wait 2s.  
**Expected:** 5 templates with type chip, status chip, subject, `{{variable}}` chips.

---

### TC-ADMIN-010 — Edit email template
**Steps:** Click pencil on "Appointment Confirmation".  
**Expected:** Inline form: Subject pre-filled, Body monospace pre-filled. Save + Cancel.

---

## Communications (`/admin/communications`)

### TC-ADMIN-011 — Communications page
**Steps:** Navigate to `/admin/communications`.  
**Expected:** 3 tabs with 6 notification template toggles on Tab 1. Hardcoded — works offline.

---

## Policies (`/admin/policies`)

### TC-ADMIN-012 — Policies page
**Steps:** Navigate to `/admin/policies`.  
**Expected:** "Policies & Compliance" + "Save All Changes". 4 tabs, 6 editable cards on Tab 1.

---

## Clinician Types (`/admin/clinician-types`)

### TC-ADMIN-013 — Clinician types list
**Steps:** Navigate to `/admin/clinician-types`. Wait 2s.  
**Expected:** 4 types: General Practitioner, Cardiologist, Neurologist, Physiotherapist. Add Type inline form.

---

## Languages (`/admin/languages`)

### TC-ADMIN-014 — Languages list + toggle
**Steps:** Navigate to `/admin/languages`. Wait 2s.  
**Expected:** English (Active, Default, delete disabled), Spanish (Active), French (Inactive). Toggles interactive.

---

## Room Types (`/admin/room-types`)

### TC-ADMIN-018 — Room types list with mock data
**Steps:** Navigate to `/admin/room-types`. Wait 2s.  
**Expected:** 5 mock types: Consultation Room, Procedure Room, Video Suite, Waiting Area Annex (all Active), Therapy Room (Inactive). "Offline — showing demo room types" info banner.

---

## Audit Log

### TC-ADMIN-019 — Audit log tab renders
**Steps:** `/admin/users` → click "Audit Logs" tab.  
**Expected:** 3 mock entries with Timestamp, User, Action chip, Resource. Date pickers. Expand → JSON payload.

---

## Edge Cases & Regression Tests

### TC-ADMIN-020 — Search clears and re-shows all users
**Steps:** Type "sarah" → clear search.  
**Expected:** All 4 return. "Showing 4 of 4 users".

---

### TC-ADMIN-021 — Search by role name
**Steps:** Type "Clinician" in search.  
**Expected:** Only users with Clinician role visible.

---

### TC-ADMIN-022 — Edit user cancel
**Steps:** `/admin/users/:id/edit` → click Cancel.  
**Expected:** Navigate back to `/admin/users` without saving.

---

## Session 3 New Test Cases

### TC-ADMIN-023 — /admin redirect to /admin/users (Session 3)
**Steps:** Navigate to `http://localhost:3001/admin`.  
**Expected:** Auto-redirect to `/admin/users`. Users list rendered. No 404.  
**Fix:** `<Route path="/admin" element={<Navigate to="/admin/users" replace />}` in App.jsx.

---

### TC-ADMIN-024 — Audit Log opens via URL param ?tab=2 (Session 3)
**Steps:** Navigate to `http://localhost:3001/admin/users?tab=2`.  
**Expected:** Page opens on "Audit Logs" tab directly (NOT "Users Directory").  
**Fix:** `useSearchParams()` + lazy `useState` init from `?tab=` param.

---

### TC-ADMIN-025 — Room Types form (offline) (Session 3)
**Steps:** Navigate to `/admin/room-types`. Click "Add Room Type".  
**Expected:** Inline form appears: Name (required), Description (multiline), Create + Cancel buttons. Offline info banner visible above form.

---

## Edge Cases

| # | Edge Case | Expected |
|---|-----------|----------|
| E1 | Backend offline: all 7 Apollo pages | Mock data renders. No blank page. No crash. |
| E2 | Search empty, filter by role | `filteredUsers` all displayed. Role dropdown filters independently. |
| E3 | Edit user ID not in `MOCK_USER_STORE` | Form loads blank. No crash. |
| E4 | Navigate to `/admin/users?tab=99` | `Math.min(t, 2)` caps to 2 (Audit Logs). No crash. |
| E5 | Navigate to `/admin/users?tab=abc` | `isNaN` check → defaults to tab 0. |
| E6 | Room Types "Add" form in mock mode | Submit fires mutation → catches → `setFormError` shown. MOCK_ROOM_TYPES unchanged. |
| E7 | Create user form: empty submit | Required field validation triggered for all empty required fields. |
| E8 | Roles page with long description | Row text wraps correctly. No overflow. |
| E9 | Email template with many variables | Variable chips wrap in flexbox. No overflow. |
| E10 | Languages English delete button | Delete disabled (grey, non-interactive). English row protected. |
| E11 | Sidebar active state on nested route | `/admin/users/new` → "Users & RBAC" sidebar item still highlighted (startsWith match). |

---

## Session Summary

| Session | TCs | Status |
|---------|-----|--------|
| Session 1 (2026-03-16) | 14 | 1 PASS, 11 FAIL, 1 PARTIAL, 1 SKIP |
| Session 2 (2026-03-18) | +8 (TC-015 to 022) | 22 TC: 21 PASS, 1 PARTIAL |
| Session 3 (2026-03-24) | +3 (TC-023 to 025) | **25 PASS, 0 PARTIAL, 0 FAIL** ✅ |
