# Patient Profile — Test Plan

**Route:** `/patient/profile`
**File:** `frontend/src/pages/patient/Profile.jsx`
**Status:** ⚠️ NOT DONE — Test has not been executed yet.

---

## Feature Overview

Patient's personal profile page (mock data only). Shows a left column avatar card with basic health info, and right column with 4 sections: Personal Information, Medical Information, Insurance, and Notification Preferences. Has view/edit toggle. Saving updates local state only (no backend mutations).

---

## Test Cases

### TC-PTPROF-01 — Page Load: View Mode
**Steps:** Navigate to `/patient/profile`.
**Expected:**
- Title "My Profile".
- "Edit Profile" button in header (right).
- Left column: avatar with initials "EW", name "Emma Wilson", email, "Patient" chip, Blood Type, DOB, Gender.
- Right columns: Personal Info, Medical Info, Insurance, Notifications visible.

---

### TC-PTPROF-02 — View Mode: Personal Information
**Steps:** View the Personal Information card.
**Expected:**
- Shows: First Name, Last Name, Email, Phone, DOB, Gender, Home Address — all in read-only text.

---

### TC-PTPROF-03 — View Mode: Allergies and Conditions Chips
**Steps:** View the Medical Information card.
**Expected:**
- Allergies: "Penicillin" (red outlined chip), "Latex" (red outlined chip).
- Conditions: "Hypertension" (warning outlined chip), "Asthma" (warning outlined chip).
- "+ Add" chips NOT shown in view mode.

---

### TC-PTPROF-04 — View Mode: Insurance Card
**Steps:** View the Insurance card.
**Expected:**
- Provider: "Bupa Health".
- Policy Number: "BP-2026-44812".
- Expires: "2027-01-01".

---

### TC-PTPROF-05 — View Mode: Notification Preferences
**Steps:** View the Notifications card in view mode.
**Expected:**
- 4 switches: Email, SMS, 24h Reminders, Newsletter.
- Switches are `disabled={!editing}` — not interactive in view mode.
- No visual feedback when clicking.

---

### TC-PTPROF-06 — Edit Mode: Toggle Switches Enabled
**Steps:** Click "Edit Profile".
**Expected:**
- `editing = true`.
- "Discard" and "Save Changes" buttons replace "Edit Profile".
- Notification switches are now interactive.

---

### TC-PTPROF-07 — Edit Mode: Personal Info Fields Editable
**Steps:** Click "Edit Profile"; view Personal Info card.
**Expected:**
- All fields become `TextField` inputs.
- Values pre-filled from local `draft` state (initially = `profile`).

---

### TC-PTPROF-08 — Edit Mode: Toggle Notification Switch
**Steps:** Toggle the "Newsletter" switch to ON.
**Expected:**
- `draft.notifications.newsletter` becomes `true`.
- Switch reflects new state immediately.

---

### TC-PTPROF-09 — Edit Mode: "+ Add" Chip for Allergies/Conditions
**Steps:** In edit mode, view Medical Information card.
**Expected:**
- "+ Add" chip appears after existing allergy and condition chips.
- **BUG:** No `onClick` handler on "+ Add" chip. Clicking does nothing. Enhancement needed.

---

### TC-PTPROF-10 — Save Changes: Updates Local State
**Steps:** Change First Name to "Emily"; click "Save Changes".
**Expected:**
- `profile` updated from `draft`.
- `editing = false`.
- Green success alert "Profile updated successfully!" flashes.
- Name at top of left card changes to "Emily Wilson".

---

### TC-PTPROF-11 — Save Changes: Alert Auto-Dismisses
**Steps:** Click "Save Changes".
**Expected:**
- Success alert disappears after 3 seconds.

---

### TC-PTPROF-12 — Discard Changes
**Steps:** Edit First Name; click "Discard".
**Expected:**
- `editing = false`; `draft` reset to current `profile`.
- Name reverts to original "Emma".
- No changes persisted.

---

### TC-PTPROF-13 — No Backend Mutation
**Steps:** Click Save Changes and monitor network tab.
**Expected:**
- No GraphQL mutation fired.
- All changes are local state only.

---

## Edge Cases

| # | Edge Case | Expected |
|---|-----------|----------|
| E1 | Clear First Name; Save | Avatar initials become "[undefined]" — no crash from `profile.firstName[0]` since empty string |
| E2 | Add condition (click + Add) | No handler — chip click does nothing |
| E3 | Edit DOB to invalid date | Text input — any string accepted; no date validation |
| E4 | All notification toggles turned off; Save | `draft.notifications` all false; persisted locally |
| E5 | Insurance fields | Not editable in edit mode (static display only) — Enhancement needed |
| E6 | Phone with international code format | Accepted as plain text; no format validation |
