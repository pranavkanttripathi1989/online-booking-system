# Settings Page — Test Plan (v2.0)

**Module:** Settings (`/settings`)
**Source:** `frontend/src/pages/settings/index.jsx`
**Updated:** 2026-03-31 (Session QA v2.0)
**Tabs:** Profile | Account & Security | Notifications | Appearance | Clinic

---

## Feature Overview

5-tab settings page. All state is local (no backend required). Profile: firstName/lastName/phone/bio controlled; address uncontrolled (defaultValue). Account: password controlled+validated; 2FA controlled; sessions state with revoke; deactivate confirm dialog. Notifications: 7×3 toggle table. Appearance: theme radio, font slider, accent color, compact/RTL toggles. Clinic: defaultValue fields (pending controlled conversion).

---

## 1. Page Load & Tab Navigation

### TC-SET-01 — Page load
**Steps:** Navigate to `/settings`.
**Expected:** "Settings — MediBook" (Helmet). h4 "Settings". "Profile" tab active. 5 tabs with icons.

### TC-SET-22 — Tab switching preserves Profile state
**Steps:** Type "John" in First Name. Switch to Notifications. Switch back.
**Expected:** "John" remains in First Name (useState lives in parent, survives tab switch).

### TC-SET-23 — Notification toggle persists across tab switches
**Steps:** Toggle SMS for row 1 OFF. Switch to Appearance. Return to Notifications.
**Expected:** SMS row 1 still OFF (notifs state preserved in parent).

---

## 2. Profile Tab

### TC-SET-02 — Avatar initials from auth user
**Steps:** View Profile tab.
**Expected:** Avatar "AU" (Admin User). First Name="Admin", Last Name="User" pre-filled.

### TC-SET-02B — Avatar initials update on name change
**Steps:** Change First Name to "John".
**Expected:** Avatar updates to "JU" in real-time (reactive initials computation).

### TC-SET-03 — Save per-tab message: Profile
**Steps:** Click "Save Changes".
**Expected:** "Profile changes saved successfully!" green alert. Auto 2.5s. × closeable.

### TC-SET-04 — Email field disabled
**Steps:** Attempt to type in Email field.
**Expected:** Field disabled. Helper "Change email in Account tab". No input accepted.

### TC-SET-05 — Address fields optional
**Steps:** Leave all 4 address fields empty; click Save Changes.
**Expected:** Alert shown. No validation errors.

### TC-SET-28 — Bio: No character limit
**Steps:** Paste 500+ chars in Bio textarea.
**Expected:** All accepted. No truncation (no maxLength).

### TC-SET-06 — Camera icon opens file picker
**Steps:** Click camera icon on Avatar.
**Expected:** OS file picker opens. Accept: jpeg/png/gif.

### TC-SET-06B — Camera icon: file > 2MB rejected
**Steps:** Select file > 2MB.
**Expected:** alert("File must be under 2 MB"). No upload.

---

## 3. Account & Security Tab

### TC-SET-07 — All sections visible
**Steps:** Click Account & Security tab.
**Expected:** Change Password (3 controlled fields, "Min 8 characters" helpText). 2FA toggle. 3 sessions. Danger Zone.

### TC-SET-08 — Update Password: empty current
**Steps:** Leave all fields empty; click Update Password.
**Expected:** Error alert: "Please enter your current password."

### TC-SET-08B — Update Password: short new password
**Steps:** Fill Current=x; New=abc (5 chars); click Update.
**Expected:** Error: "New password must be at least 8 characters."

### TC-SET-08C — Update Password: mismatch
**Steps:** Current=x; New=password123; Confirm=different; click Update.
**Expected:** Error: "Passwords do not match."

### TC-SET-08D — Update Password: valid submission
**Steps:** Current=secret; New=password123; Confirm=password123; click Update.
**Expected:** Fields cleared. "Password saved successfully!" alert.

### TC-SET-25 — Password error dismissible
**Steps:** Trigger validation error; click × on error alert.
**Expected:** Error cleared immediately.

### TC-SET-14 — Update Password button (no handler previously)
**Steps:** Click Update Password with empty current field.
**Expected:** Error shown (not silent — validated).

### TC-SET-09 — 2FA toggle: controlled state
**Steps:** Toggle "Enable 2FA (TOTP)" switch ON.
**Expected:** Switch backed by twoFa state. React knows value.

### TC-SET-10 — 2FA persists across tab switches
**Steps:** Toggle 2FA ON; switch to Profile; return.
**Expected:** 2FA switch remains ON.

### TC-SET-26 — 2FA controlled vs uncontrolled (regression)
**Steps:** Toggle 2FA ON; switch tabs; return.
**Expected:** Switch ON (was previously reverting — now fixed).

### TC-SET-11 — Revoke session
**Steps:** Click Revoke on "Safari on iPhone".
**Expected:** Session removed from list immediately.

### TC-SET-12 — Revoke all non-current sessions
**Steps:** Revoke "Safari on iPhone"; Revoke "Edge on Windows".
**Expected:** Only "Chrome on macOS (Current)" remains. No Revoke on Current.

### TC-SET-13 — Deactivate Account: opens confirm dialog
**Steps:** Click "Deactivate Account" in Danger Zone.
**Expected:** Dialog: "Deactivate Account?" + warning + Cancel + red Deactivate. Account NOT deactivated yet.

### TC-SET-14B — Deactivate dialog: Cancel
**Steps:** Open deactivate dialog; click Cancel.
**Expected:** Dialog closes. User stays on settings page.

### TC-SET-15 — Deactivate dialog: Confirm
**Steps:** Open dialog; click Deactivate.
**Expected:** Dialog closes. BACKEND SWAP comment. No crash.

---

## 4. Notifications Tab

### TC-SET-16 — 7-row notification table
**Steps:** Click Notifications tab.
**Expected:** 7 event rows; Email/SMS/In-App Switches per row.

### TC-SET-17 — Toggle + per-tab save
**Steps:** Toggle SMS for row 1 OFF; click Save Preferences.
**Expected:** Toggle reflects. "Notification preferences saved successfully!" alert.

---

## 5. Appearance Tab

### TC-SET-18 — Theme radio: controlled
**Steps:** Click "Dark" option.
**Expected:** "Dark" selected; border highlighted. themeMode='dark'.

### TC-SET-19 — Save per-tab message: Appearance
**Steps:** Click Save Appearance.
**Expected:** "Appearance settings saved successfully!" alert.

### TC-SET-21 — Accent color: single selection
**Steps:** Click each of 7 accent colors.
**Expected:** Only last clicked has ring/shadow. Others deselected.

### TC-SET-24 — Font size slider boundary values
**Steps:** Drag to SM (0) → XL (3).
**Expected:** "Aa" preview: 12px at 0, 18px at 3. Slider bounded [0, 3].

---

## 6. Clinic Tab

### TC-SET-20 — Save per-tab message: Clinic
**Steps:** Click Save Clinic Settings.
**Expected:** "Clinic settings saved successfully!" alert.

### TC-SET-27 — Clinic fields defaultValue (uncontrolled — documented)
**Steps:** Change Clinic Name; click Save Clinic Settings; navigate away; return.
**Expected:** Clinic Name resets to "MediCare Clinic" (defaultValue, not controlled state). Documents SUG-SET-007 gap.

---

## 7. Cross-Cutting

### TC-SET-29 — Success alert closeable
**Steps:** Click any Save button; immediately click × on alert.
**Expected:** Alert closes manually. Does not wait for 2.5s.

---

## Edge Cases

| # | Edge | Expected |
|---|------|----------|
| E1 | firstName="" (cleared) | Avatar shows "" (empty string — no crash) |
| E2 | Photo file > 2MB | alert("File must be under 2 MB"); upload aborted |
| E3 | Switch tab with unsaved profile form | State preserved (no data loss) — but no "unsaved changes" indicator (pending SUG-011) |
| E4 | All sessions revoked (only Current left) | 1 session shown, no Revoke button |
| E5 | Bio with 1000 characters | All accepted, no truncation |
| E6 | Revoke a session, then reload | Sessions reset to MOCK_SESSIONS (no persistence — MockStore not used for sessions) |
| E7 | New password matches current | No validation warning (pending enhancement) |
| E8 | Accent color = initial value (#1565C7) | Ring/shadow shown on first accent swatch on load |

---

## Total: 29 Test Cases + 8 Edge Cases
