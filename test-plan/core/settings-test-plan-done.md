# Settings Page — Test Plan

**Route:** `/settings`
**File:** `frontend/src/pages/settings/index.jsx`
**Status:** ⚠️ NOT DONE — Test has not been executed yet.

---

## Feature Overview

A tabbed settings page with 5 tabs: **Profile**, **Account & Security**, **Notifications**, **Appearance**, and **Clinic**. All saves are local-state only (no backend mutations wired). A `saved` alert flashes for 2.5s on clicking any Save button.

---

## Test Cases — General

### TC-SET-01 — Page Load
**Steps:** Navigate to `/settings`.
**Expected:**
- Title tag "Settings — MediBook".
- "Profile" tab selected by default.
- No errors in console.

---

### TC-SET-02 — Profile Tab: Avatar Initials from Auth User
**Steps:** Load page while authenticated.
**Expected:**
- Avatar shows initials derived from `user.name` (first + last initial).
- First Name and Last Name fields pre-filled from `user.name` split.

---

### TC-SET-03 — Profile Tab: Save Button Shows Success Alert
**Steps:** Edit First Name; click "Save Changes".
**Expected:**
- Green alert "Changes saved successfully!" appears at top.
- Alert auto-dismisses after 2.5s.

---

### TC-SET-04 — Profile Tab: Email Field is Disabled
**Steps:** Attempt to type in the Email field.
**Expected:**
- Field is `disabled`; no input accepted.
- Helper text "Change email in Account tab".

---

### TC-SET-05 — Profile Tab: All Address Fields Optional
**Steps:** Fill Name only; click Save.
**Expected:**
- Save succeeds; no validation error for address fields.

---

### TC-SET-06 — Profile Tab: Camera Icon (Photo Upload)
**Steps:** Click the camera icon on the avatar.
**Expected:**
- **BUG:** No file picker opens; the `IconButton` has no `onClick` handler wired. Enhancement needed.

---

### TC-SET-07 — Account & Security: Change Password Fields
**Steps:** Click "Account & Security" tab.
**Expected:**
- Three password fields: Current Password, New Password, Confirm New Password.
- All `type="password"`.
- "Update Password" button visible.

---

### TC-SET-08 — Account & Security: Update Password (No Validation)
**Steps:** Click "Update Password" without filling any fields.
**Expected:**
- **BUG:** No client-side validation; button submits with no feedback. Enhancement needed.

---

### TC-SET-09 — Account & Security: 2FA Toggle
**Steps:** Toggle "Enable 2FA (TOTP)" switch.
**Expected:**
- Switch state changes in local state.
- No backend call fired. (Enhancement: backend integration needed.)

---

### TC-SET-10 — Account & Security: Active Sessions Display
**Steps:** View the Active Sessions section.
**Expected:**
- 3 mock sessions listed: Chrome/macOS (Current), Safari/iPhone, Edge/Windows.
- Current session shows "Current" chip; no Revoke button.
- Other sessions have "Revoke" button.

---

### TC-SET-11 — Account & Security: Revoke Session
**Steps:** Click "Revoke" on a non-current session.
**Expected:**
- **BUG:** No `onClick` on Revoke button. Nothing happens. Enhancement needed.

---

### TC-SET-12 — Account & Security: Deactivate Account Button
**Steps:** Click "Deactivate Account".
**Expected:**
- **BUG:** No `onClick` handler. Nothing happens. Enhancement needed (should open confirm dialog + call backend).

---

### TC-SET-13 — Notifications Tab: Table Renders All 7 Events
**Steps:** Click "Notifications" tab.
**Expected:**
- Table with 7 event rows.
- Each row has Email, SMS, In-App toggles.

---

### TC-SET-14 — Notifications Tab: Toggle a Channel
**Steps:** Toggle the SMS switch for "Appointment reminder (24h)".
**Expected:**
- Switch state flips immediately (local state).
- Row updates to match new state.

---

### TC-SET-15 — Notifications Tab: Save Preferences
**Steps:** Toggle any switch; click "Save Preferences".
**Expected:**
- Success alert shown; no console error.
- **Note:** No backend call fired (local state only).

---

### TC-SET-16 — Appearance Tab: Theme Selection
**Steps:** Click "Appearance" tab; select "Dark" radio.
**Expected:**
- Radio button selected; `themeMode` updates to `'dark'`.
- **BUG:** Actual dark theme not applied to the UI (state not connected to theme context). Enhancement needed.

---

### TC-SET-17 — Appearance Tab: Font Size Slider
**Steps:** Drag the font size slider.
**Expected:**
- Preview "Aa" text increases/decreases in size.
- Slider marks: SM, MD, LG, XL.

---

### TC-SET-18 — Appearance Tab: Accent Color Selection
**Steps:** Click different color circles.
**Expected:**
- Selected circle gets box-shadow ring.
- Only one color selected at a time.

---

### TC-SET-19 — Appearance Tab: Compact Mode + RTL Toggles
**Steps:** Toggle Compact and RTL switches.
**Expected:**
- Switches toggle in local state.
- **BUG:** UI layout not actually affected. Enhancement needed.

---

### TC-SET-20 — Clinic Tab: Static Form Fields
**Steps:** Click "Clinic" tab.
**Expected:**
- Fields: Clinic Name (default "MediCare Clinic"), Contact Phone, Contact Email, Timezone dropdown, Address, Currency dropdown, Default Slot Duration.
- All fields editable.
- "Save Clinic Settings" fires the generic `handleSave` alert.

---

### TC-SET-21 — Tab Scrollability on Mobile
**Steps:** Resize to 320px width; view tabs.
**Expected:**
- Tabs are `variant="scrollable"` — horizontal scroll arrows appear.
- All 5 tabs accessible.

---

## Edge Cases

| # | Edge Case | Expected |
|---|-----------|----------|
| E1 | First Name cleared (empty string) | Avatar initials breakdown; avatar shows empty |
| E2 | Bio field > 500 chars | Accepted (no max length set on textarea) |
| E3 | Tab switch during unsaved changes | Changes lost (no unsaved-change guard) |
| E4 | Page reload | All state resets to defaults from `user` context |
| E5 | `user.name` is undefined/null | `firstName` = 'Admin', `lastName` = 'User' (defaults) |
| E6 | Clinic tab Currency set to GBP | Saved in local state only; no persistence |
