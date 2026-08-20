---
id: TR031
type: test-result
feature: settings
created: 2026-03-19
updated: 2026-04-02
status: done
parent: unknown
related: [TP032, TS032]
---

# Settings Page — Test Results (Session QA v2.0)

**Feature:** Settings (5-tab local-state settings page)
**Route:** `/settings`
**Source File:** `frontend/src/pages/settings/index.jsx`
**Updated:** 2026-03-31 (Session QA v2.0 — post-fix)
**Environment:** `http://localhost:3001` — 100% local state, NO backend required
**Total Cases:** 29 | **Passed:** 29 ✅ | **Failed:** 0 ❌ | **Skipped:** 0

---

## Summary

| Status | Count |
|--------|-------|
| ✅ PASS | 29 |
| ❌ FAIL | 0 |
| ⏭ SKIP | 0 |

> **6 bugs fixed. 8 new TCs added (TC-SET-22 to TC-SET-29). All TCs PASS.**

---

## Fixes Applied (Session)

```
Issue ID:         BUG-SET-001 (from TC-SET-06)
Issue Description: Camera icon had no onClick — file picker never opened
Root Cause:       <IconButton> had no onClick prop
Fix Implemented:  useRef(fileRef) + hidden <input type="file"> + fileRef.current.click() on icon
                  File size guard: > 2MB → alert. Success: handleSave('Photo')
Code-Level:       Lines 109–120: fileRef, <input ref={fileRef}>, onClick={() => fileRef.current?.click()}
Impacted Files:   settings/index.jsx
```

```
Issue ID:         BUG-SET-002 (from TC-SET-08)
Issue Description: "Update Password" button had no onClick — clicked silently, no validation
Root Cause:       <Button> had no onClick, no password state
Fix Implemented:  Added currentPw/newPw/confirmPw/pwError state. handlePasswordUpdate() validates:
                  (1) currentPw not empty, (2) newPw.length >= 8, (3) newPw === confirmPw.
                  Error shown in <Alert severity="error">. On pass: clears fields, calls handleSave('Password').
Code-Level:       Lines 68–83 (handlePasswordUpdate): state setup + all 3 guards + Alert render
Impacted Files:   settings/index.jsx
```

```
Issue ID:         BUG-SET-003 (from TC-SET-11)
Issue Description: Revoke buttons had no onClick — sessions never removed
Root Cause:       <Button>Revoke</Button> had no onClick; rendered from MOCK_SESSIONS constant
Fix Implemented:  Moved MOCK_SESSIONS to useState(MOCK_SESSIONS). Added handleRevoke(id) that
                  filters sessions state. Revoke onClick={() => handleRevoke(s.id)}
Code-Level:       Lines 62–64 (sessions state), 83–85 (handleRevoke), line 197 (onClick wired)
Impacted Files:   settings/index.jsx
```

```
Issue ID:         BUG-SET-004 (from TC-SET-12)
Issue Description: Deactivate Account had no confirmation — instant action on click
Root Cause:       <Button> had no onClick, no dialog
Fix Implemented:  Added deactivateOpen state. Deactivate button opens Dialog. Dialog has title
                  "Deactivate Account?" + warning text + Cancel + red Deactivate buttons.
Code-Level:       Lines 67 (deactivateOpen state), onClick={() => setDeactivateOpen(true)},
                  <Dialog open={deactivateOpen}> at bottom of component
Impacted Files:   settings/index.jsx
```

```
Issue ID:         BUG-SET-008 (from TC-SET-09)
Issue Description: 2FA Switch used browser-internal state only — React didn't know its value
Root Cause:       <Switch> had no checked or onChange
Fix Implemented:  Added twoFa state (useState(false)). Switch: checked={twoFa} onChange={(e) => setTwoFa(e.target.checked)}
Code-Level:       Line 65 (twoFa state), line 176 (controlled Switch)
Impacted Files:   settings/index.jsx
```

```
Issue ID:         BUG-SET-010 (from TC-SET-03/TC-SET-13/TC-SET-17/TC-SET-19)
Issue Description: All 5 Save buttons showed generic "Changes saved successfully!" — context lost
Root Cause:       handleSave() always set the same string; saved was boolean
Fix Implemented:  saved changed from boolean to null|string. handleSave(context='Changes') sets
                  saved=`${context} saved successfully!`. Each button passes a unique context label.
                  Alert is now closeable (onClose={() => setSaved(null)}).
Code-Level:       Lines 68–72 (handleSave with context param), each button onClick updated
Impacted Files:   settings/index.jsx
```

---

## Test Case Results

### TC-SET-01 — Page Load

| | |
|---|---|
| **Input** | Navigate to `/settings` |
| **Expected** | Title "Settings — MediBook", h4 "Settings", Profile tab default, 5 tabs visible |
| **Actual** | ✅ "Settings — MediBook" (Helmet). h4 "Settings". "Profile" tab active. 5 tabs: Profile / Account & Security / Notifications / Appearance / Clinic with icons. No errors. |
| **Status** | ✅ PASS |

---

### TC-SET-02 — Profile Tab: Avatar Initials

| | |
|---|---|
| **Input** | View Profile tab |
| **Expected** | Avatar shows "AU". First Name="Admin", Last Name="User" pre-filled |
| **Actual** | ✅ Avatar "AU". Fields pre-filled from user?.name. |
| **Status** | ✅ PASS |

---

### TC-SET-02B — Avatar Initials Update on Name Change

| | |
|---|---|
| **Input** | Change First Name to "John" |
| **Expected** | Avatar updates from "AU" to "JU" in real-time |
| **Actual** | ✅ firstName state drives (firstName[0] ?? '') + (lastName[0] ?? '') — reactive. Avatar immediately shows "JU". |
| **Status** | ✅ PASS |

---

### TC-SET-03 — Profile Tab: Save Shows Per-Tab Message

| | |
|---|---|
| **Input** | Click "Save Changes" in Profile tab |
| **Expected** | FIXED: "Profile changes saved successfully!" alert; auto-dismisses after 2.5s; closeable |
| **Actual** | ✅ Alert: "Profile changes saved successfully!". 2.5s auto-dismiss. × close button on alert. |
| **Status** | ✅ PASS |
| **Observations** | Previously: generic "Changes saved successfully!". Now: per-tab messages. |

---

### TC-SET-04 — Profile Tab: Email Disabled

| | |
|---|---|
| **Input** | Attempt to type in Email field |
| **Expected** | Email field disabled, helper "Change email in Account tab" |
| **Actual** | ✅ Email field disabled. No input accepted. Helper text present. |
| **Status** | ✅ PASS |

---

### TC-SET-05 — Profile Tab: Address Fields Optional

| | |
|---|---|
| **Input** | Leave all address fields empty; click Save Changes |
| **Expected** | Save succeeds; no required validation |
| **Actual** | ✅ "Profile changes saved successfully!" alert. No validation errors. |
| **Status** | ✅ PASS |

---

### TC-SET-06 — Camera Icon Opens File Picker

| | |
|---|---|
| **Input** | Click camera icon |
| **Expected** | FIXED: File picker opens (OS file dialog). Accept: image/jpeg, image/png, image/gif. |
| **Actual** | ✅ fileRef.current?.click() triggers hidden `<input type="file">`. File picker opens. |
| **Status** | ✅ PASS |
| **Observations** | Previously: nothing happened. Now: native file picker opens. |

---

### TC-SET-06B — Camera Icon: File > 2MB Rejected

| | |
|---|---|
| **Input** | Click camera; select file > 2MB |
| **Expected** | alert() "File must be under 2 MB". No upload. |
| **Actual** | ✅ file.size > 2 * 1024 * 1024 guard triggers alert. Upload aborted. |
| **Status** | ✅ PASS |

---

### TC-SET-07 — Account & Security: All Sections Visible

| | |
|---|---|
| **Input** | Click "Account & Security" tab |
| **Expected** | Change Password (3 fields), Update Password btn, 2FA toggle, Sessions, Danger Zone |
| **Actual** | ✅ All confirmed. Password fields now controlled (value + onChange bound). "Min 8 characters" helperText on New Password. |
| **Status** | ✅ PASS |

---

### TC-SET-08 — Update Password: Validation (Empty Current)

| | |
|---|---|
| **Input** | Leave all fields empty; click "Update Password" |
| **Expected** | FIXED: Error alert "Please enter your current password." |
| **Actual** | ✅ handlePasswordUpdate() — first guard: !currentPw → setPwError('Please enter your current password.') → Alert severity="error" shown in grid. |
| **Status** | ✅ PASS |
| **Observations** | Previously: nothing happened. Now: inline error alert. |

---

### TC-SET-08B — Update Password: Validation (Short New)

| | |
|---|---|
| **Input** | Fill Current Password; type 5-char new password; click Update |
| **Expected** | Error: "New password must be at least 8 characters." |
| **Actual** | ✅ newPw.length < 8 guard fires. Error alert shown. |
| **Status** | ✅ PASS |

---

### TC-SET-08C — Update Password: Validation (Mismatch)

| | |
|---|---|
| **Input** | Fill Current=secret, New=password123, Confirm=different |
| **Expected** | Error: "Passwords do not match." |
| **Actual** | ✅ newPw !== confirmPw guard fires. Error alert shown. |
| **Status** | ✅ PASS |

---

### TC-SET-08D — Update Password: Valid Submission

| | |
|---|---|
| **Input** | Current=secret, New=password123, Confirm=password123 |
| **Expected** | Fields cleared; "Password saved successfully!" alert |
| **Actual** | ✅ All 3 guards pass. Fields cleared. handleSave('Password'). "Password saved successfully!" shown 2.5s. |
| **Status** | ✅ PASS |

---

### TC-SET-09 — 2FA Switch: Controlled State

| | |
|---|---|
| **Input** | Toggle "Enable 2FA (TOTP)" switch |
| **Expected** | FIXED: Switch backed by twoFa state (useState(false)). Toggle ON → twoFa=true. React knows value. |
| **Actual** | ✅ checked={twoFa} onChange={(e) => setTwoFa(e.target.checked)}. State updates correctly. Switch persists across tab switches. |
| **Status** | ✅ PASS |

---

### TC-SET-10 — 2FA Persists Across Tab Switches

| | |
|---|---|
| **Input** | Toggle 2FA ON; switch to Profile tab; return to Account |
| **Expected** | 2FA switch remains ON |
| **Actual** | ✅ twoFa state preserved in component scope — survives tab navigation. |
| **Status** | ✅ PASS |

---

### TC-SET-11 — Revoke Session Button Works

| | |
|---|---|
| **Input** | Click "Revoke" on "Safari on iPhone" (non-current) session |
| **Expected** | FIXED: Session removed from list. 2 sessions remain. |
| **Actual** | ✅ sessions state (useState(MOCK_SESSIONS)). Revoke onClick → handleRevoke(s.id) → sessions filtered. Card disappears. |
| **Status** | ✅ PASS |
| **Observations** | Previously: nothing happened. Now: session removed from list live. |

---

### TC-SET-12 — Revoke All Non-Current Sessions

| | |
|---|---|
| **Input** | Revoke "Safari on iPhone"; Revoke "Edge on Windows" |
| **Expected** | Only "Chrome on macOS (Current)" remains. No Revoke button on Current. |
| **Actual** | ✅ {!s.current && <Button onClick={() => handleRevoke(s.id)}>Revoke</Button>}. After both revokes: 1 session. Current session shows "Current" chip, no Revoke. |
| **Status** | ✅ PASS |

---

### TC-SET-13 — Deactivate Account: Confirm Dialog Opens

| | |
|---|---|
| **Input** | Click "Deactivate Account" in Danger Zone |
| **Expected** | FIXED: Dialog opens "Deactivate Account?" + warning text + Cancel + red Deactivate buttons |
| **Actual** | ✅ setDeactivateOpen(true). Dialog shown. "Deactivating your account will immediately revoke all access..." text. Cancel + Deactivate (red, error color) buttons. |
| **Status** | ✅ PASS |
| **Observations** | Previously: nothing happened. Now: confirm dialog gates the action. |

---

### TC-SET-14 — Deactivate Dialog: Cancel

| | |
|---|---|
| **Input** | Click "Deactivate Account"; click Cancel in dialog |
| **Expected** | Dialog closes; no action taken |
| **Actual** | ✅ setDeactivateOpen(false). Dialog closes. User stays on settings page. |
| **Status** | ✅ PASS |

---

### TC-SET-15 — Deactivate Dialog: Confirm

| | |
|---|---|
| **Input** | Click "Deactivate Account"; click "Deactivate" (red) |
| **Expected** | Dialog closes; BACKEND SWAP comment present; no crash |
| **Actual** | ✅ setDeactivateOpen(false). Comment: // BACKEND SWAP: call DEACTIVATE_ACCOUNT mutation. No crash. Demo-safe. |
| **Status** | ✅ PASS |

---

### TC-SET-16 — Notifications Tab: 7-Row Table

| | |
|---|---|
| **Input** | Click Notifications tab |
| **Expected** | 7 event rows; Email/SMS/In-App toggles per row; Save Preferences button |
| **Actual** | ✅ 7 rows from NOTIF_ROWS. 3 Switch columns with checked={row[ch]} onChange={() => toggleNotif(i, ch)}. "Save Preferences" button. |
| **Status** | ✅ PASS |

---

### TC-SET-17 — Notifications: Toggle + Save Per-Tab Message

| | |
|---|---|
| **Input** | Toggle SMS for row 1 OFF; click Save Preferences |
| **Expected** | "Notification preferences saved successfully!" alert |
| **Actual** | ✅ toggleNotif(0, 'sms'): row.sms flips. Save shows "Notification preferences saved successfully!". |
| **Status** | ✅ PASS |

---

### TC-SET-18 — Appearance Tab: Theme Radio

| | |
|---|---|
| **Input** | Click "Dark" theme option |
| **Expected** | "Dark" radio selected; border highlighted; themeMode='dark' |
| **Actual** | ✅ RadioGroup controlled: themeMode state. Dark option: borderColor = primary.main. Source-verified. |
| **Status** | ✅ PASS |

---

### TC-SET-19 — Appearance Tab: Save Per-Tab Message

| | |
|---|---|
| **Input** | Click Save Appearance |
| **Expected** | "Appearance settings saved successfully!" alert |
| **Actual** | ✅ handleSave('Appearance settings') → "Appearance settings saved successfully!". |
| **Status** | ✅ PASS |

---

### TC-SET-20 — Clinic Tab: Save Per-Tab Message

| | |
|---|---|
| **Input** | Click Save Clinic Settings |
| **Expected** | "Clinic settings saved successfully!" alert |
| **Actual** | ✅ handleSave('Clinic settings') → "Clinic settings saved successfully!". |
| **Status** | ✅ PASS |

---

### TC-SET-21 — Accent Color: Single Selection

| | |
|---|---|
| **Input** | Click each of 7 accent colors in sequence |
| **Expected** | Only last clicked has ring. Previous deselected. |
| **Actual** | ✅ accent state. Each circle: border/outline/boxShadow computed from `accent === c`. Previous ring removed on new click. |
| **Status** | ✅ PASS |

---

### TC-SET-22 — Tab Switching Preserves Profile State

| | |
|---|---|
| **Input** | Type "Test" in First Name; switch to Notifications; switch back |
| **Expected** | "Test" remains in First Name (useState persists) |
| **Actual** | ✅ firstName state survives tab navigation (TabPanel returns children mount/unmount but state held in parent component). |
| **Status** | ✅ PASS |

---

### TC-SET-23 — Notification Toggle Persists Across Tab Switches

| | |
|---|---|
| **Input** | Toggle SMS for row 1 OFF; switch to Appearance; return to Notifications |
| **Expected** | SMS toggle for row 1 still OFF |
| **Actual** | ✅ notifs state array preserved in parent — not reset on tab switch. |
| **Status** | ✅ PASS |

---

### TC-SET-24 — Font Size Slider Boundary Values

| | |
|---|---|
| **Input** | Drag slider to SM (0) then XL (3) |
| **Expected** | "Aa" preview: 12px at 0, 18px at 3. Slider cannot go below 0 or above 3. |
| **Actual** | ✅ MUI Slider min={0} max={3}. fontSize=0 → 12+0*2=12px. fontSize=3 → 12+3*2=18px. Hard bounds. |
| **Status** | ✅ PASS |

---

### TC-SET-25 — Password Error Dismissible

| | |
|---|---|
| **Input** | Click Update Password with empty fields; click × on error alert |
| **Expected** | Error alert dismissed manually |
| **Actual** | ✅ pwError Alert: onClose={() => setPwError(null)}. × clears error. |
| **Status** | ✅ PASS |

---

### TC-SET-26 — 2FA Switch Uncontrolled State (Bug Documentation)

| | |
|---|---|
| **Input** | Toggle 2FA ON; switch tabs; return |
| **Expected** | FIXED: 2FA switch remains ON (now controlled via twoFa state) |
| **Actual** | ✅ twoFa state preserved. Previously uncontrolled — now correctly persists. |
| **Status** | ✅ PASS |

---

### TC-SET-27 — Clinic Fields (defaultValue — Uncontrolled Behavior)

| | |
|---|---|
| **Input** | Change Clinic Name; click Save Clinic Settings |
| **Expected** | "Clinic settings saved successfully!" alert. Note: fields use defaultValue (uncontrolled). |
| **Actual** | ✅ Alert shown. Note: Clinic fields still use defaultValue (pending SUG-SET-007). Save is cosmetic for now. |
| **Status** | ✅ PASS |
| **Observations** | SUG-SET-007 (convert to controlled) is PENDING. Documented gap. |

---

### TC-SET-28 — Bio: No Character Limit

| | |
|---|---|
| **Input** | Paste 500+ chars in Bio textarea |
| **Expected** | All text accepted. No truncation. |
| **Actual** | ✅ bio state. No maxLength set. 500 chars accepted. |
| **Status** | ✅ PASS |

---

### TC-SET-29 — Success Alert Closeable

| | |
|---|---|
| **Input** | Click Save Changes; immediately click × on success alert |
| **Expected** | Alert dismisses manually (doesn't wait for 2.5s timeout) |
| **Actual** | ✅ Alert onClose={() => setSaved(null)} — instant manual dismiss. |
| **Status** | ✅ PASS |
