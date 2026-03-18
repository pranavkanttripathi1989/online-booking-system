# Settings Page — Test Results

**Feature:** Settings (5-tab local-state settings page)  
**Test Plan:** [settings-test-plan-not-done.md](../test-plan/core/settings-test-plan-not-done.md)  
**Source File:** `frontend/src/pages/settings/index.jsx` (328 lines)  
**Route:** `/settings`  
**Executed:** 2026-03-17  
**Tester:** Antigravity AI (Live Browser Testing + Source Review)  
**Environment:** `http://localhost:3001` as Admin User — **100% local state, NO backend required**  
**Total Cases:** 21 | **Edge Cases:** 6

---

## Summary

| Status | Count |
|--------|-------|
| ✅ PASS | 15 |
| ❌ FAIL (Bug Confirmed) | 6 |
| ⏭ SKIPPED | 0 |

> All 6 FAIL results are **pre-documented known bugs** in the test plan. No new unexpected failures.  
> Page is fully functional for all read-only and local-state interactions.

---

## Screenshots

![Settings Profile Tab](file:///Users/pranavkanttripathi/.gemini/antigravity/brain/3064dd61-17bb-423a-8714-98b350a1ea98/.system_generated/click_feedback/click_feedback_1773746461419.png)
*Profile tab: Avatar "AU", First Name="Admin", Last Name="User", Email disabled, camera icon visible, all 5 tabs rendered.*

![Notifications Tab](file:///Users/pranavkanttripathi/.gemini/antigravity/brain/3064dd61-17bb-423a-8714-98b350a1ea98/.system_generated/click_feedback/click_feedback_1773746893330.png)
*Notifications tab: 7-row table with Email, SMS, In-App toggles, "Save Preferences" button.*

---

## General

---

### TC-SET-01 — Page Load

| | |
|---|---|
| **Expected** | Title "Settings — MediBook"; h4 "Settings"; Profile tab default; 5 tabs visible |
| **Actual** | ✅ Document title **"Settings — MediBook"** (via react-helmet-async, line 75). h4 **"Settings"** with subtitle "Manage your account, notifications, and preferences" visible (lines 78–79). **Profile** tab default-selected (blue underline indicator). 5 tabs rendered: **Profile, Account & Security, Notifications, Appearance, Clinic** — all with icons (EditRounded, LockRounded, NotificationsRounded, PaletteRounded, BusinessRounded). No console errors. |
| **Status** | ✅ **PASS** |
| **Source** | Line 48: `useState(0)` — Profile tab (index 0) default. Line 86: `variant="scrollable" scrollButtons="auto"`. |

---

## Profile Tab

---

### TC-SET-02 — Profile Tab: Avatar Initials From Auth User

| | |
|---|---|
| **Expected** | Avatar shows first+last initial of `user.name`; First Name + Last Name pre-filled |
| **Actual** | ✅ Avatar shows **"AU"** (Admin User → first initial "A" + last initial "U"). First Name = **"Admin"**, Last Name = **"User"** pre-filled from `user.name.split(' ')`. |
| **Status** | ✅ **PASS** |
| **Source** | Line 52: `useState(user?.name?.split(' ')[0] ?? 'Admin')`. Line 53: `.slice(1).join(' ') ?? 'User'`. Line 109: `(firstName[0] ?? '') + (lastName[0] ?? '')`. |

---

### TC-SET-03 — Profile Tab: Save Button Shows Success Alert, Auto-Dismisses

| | |
|---|---|
| **Input** | Click "Save Changes" button |
| **Expected** | Green "Changes saved successfully!" alert; auto-dismisses after 2.5s |
| **Actual** | ✅ Green MUI Alert severity="success": **"Changes saved successfully!"** appeared immediately. Alert auto-dismissed after ~2.5 seconds. |
| **Status** | ✅ **PASS** |
| **Source** | Line 68: `handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500) }`. Line 82: `{saved && <Alert severity="success">Changes saved successfully!</Alert>}`. |

---

### TC-SET-04 — Profile Tab: Email Field Disabled

| | |
|---|---|
| **Expected** | Email field disabled, not editable; helper text "Change email in Account tab" |
| **Actual** | ✅ Email field shows **"admin@medibook.dev"**, greyed out, not focusable. Helper text **"Change email in Account tab"** shown below. Typing in field: **no input accepted**. |
| **Status** | ✅ **PASS** |
| **Source** | Line 127: `<TextField label="Email" value={user?.email ?? ''} disabled helperText="Change email in Account tab" />`. |

---

### TC-SET-05 — Profile Tab: Address Fields Optional

| | |
|---|---|
| **Input** | Leave Street Address, City, State, ZIP empty; click "Save Changes" |
| **Expected** | Save succeeds; no required validation |
| **Actual** | ✅ Green success alert shown. No validation errors. Address fields are uncontrolled (no `required` prop, no state binding). |
| **Status** | ✅ **PASS** |
| **Source** | Lines 147–150: Address TextFields have no `required` attribute and use `defaultValue` (uncontrolled). |

---

### TC-SET-06 — Profile Tab: Camera Icon (Documented Bug)

| | |
|---|---|
| **Expected** | File picker opens; **KNOWN BUG: no onClick handler** |
| **Actual** | ❌ Clicking camera icon: **nothing happens**. No file picker, no dialog, no error. |
| **Status** | ❌ **FAIL — Bug Confirmed** |
| **Source** | Lines 111–113: `<IconButton size="small" sx={{ position: 'absolute', bottom: 0, right: 0, ... }}><CameraAltRoundedIcon /></IconButton>` — **no `onClick` prop**. Note: caption text "Click to change photo" at line 115 is misleading. |
| **Additional Bug** | Caption text says "Click to change photo" but the only clickable element (camera icon) has no handler. Mismatch between label and functionality. |

---

## Account & Security Tab

---

### TC-SET-07 — Account & Security: Password Fields Visible

| | |
|---|---|
| **Input** | Click "Account & Security" tab |
| **Expected** | 3 password fields, Update Password button, 2FA toggle, 3 sessions, Danger Zone |
| **Actual** | ✅ All sections confirmed: **Change Password** (3 fields: Current Password, New Password, Confirm New Password — all `type="password"`), **"Update Password"** outlined button. **2FA section** with "Enable 2FA (TOTP)" switch. **Active Sessions** (3 sessions per spec). **Danger Zone** (red border box, "Deactivate Account" button). |
| **Status** | ✅ **PASS** |

---

### TC-SET-08 — Update Password: No Validation (Documented Bug)

| | |
|---|---|
| **Input** | Leave all password fields empty; click "Update Password" |
| **Expected** | **KNOWN BUG:** No validation, no toast, nothing happens |
| **Actual** | ❌ Clicking "Update Password" with empty fields: **nothing happens**. No error alert, no success alert, no mutation fired. |
| **Status** | ❌ **FAIL — Bug Confirmed** |
| **Source** | Line 173: `<Button variant="outlined">Update Password</Button>` — **no `onClick` prop**. No validation logic wired. Compare to Profile tab which has `onClick={handleSave}`. |

---

### TC-SET-09 — 2FA Toggle

| | |
|---|---|
| **Input** | Click "Enable 2FA (TOTP)" switch |
| **Expected** | Switch toggles in local state; no backend call |
| **Actual** | ✅ Switch toggled from **OFF → ON**. No backend call or dialog fired. Switch state reflects click immediately. |
| **Status** | ✅ **PASS** |
| **Note** | Switch is completely disconnected from a `checked` state — uses MUI `Switch` internal state only (uncontrolled). Line 181: `<Switch color="success" />` — no `checked` or `onChange` prop. |

---

### TC-SET-10 — Active Sessions Display

| | |
|---|---|
| **Expected** | 3 sessions: Chrome/macOS (Current, no Revoke), Safari/iPhone (Revoke), Edge/Windows (Revoke) |
| **Actual** | ✅ **Session 1:** "Chrome on macOS" · "Mumbai, IN" · "Active now" → **"Current" chip** (primary blue) · **No Revoke button**. **Session 2:** "Safari on iPhone" · "Delhi, IN" · "2 hours ago" → **Revoke** button (error/red outlined). **Session 3:** "Edge on Windows" · "London, UK" · "5 days ago" → **Revoke** button. Session 1 has primary.main blue border; others have divider border. |
| **Status** | ✅ **PASS** |
| **Source** | Lines 39–43: `MOCK_SESSIONS` array. Line 197: `{!s.current && <Button color="error">Revoke</Button>}`. |

---

### TC-SET-11 — Revoke Session Button (Documented Bug)

| | |
|---|---|
| **Input** | Click "Revoke" on Safari or Edge session |
| **Expected** | **KNOWN BUG:** Nothing happens |
| **Actual** | ❌ Clicking both Revoke buttons: **nothing happens**. Sessions remain in place. No mutation, no dialog, no feedback. |
| **Status** | ❌ **FAIL — Bug Confirmed** |
| **Source** | Line 197: `<Button size="small" color="error" variant="outlined">Revoke</Button>` — **no `onClick` prop**. |

---

### TC-SET-12 — Deactivate Account Button (Documented Bug)

| | |
|---|---|
| **Input** | Click "Deactivate Account" in Danger Zone |
| **Expected** | **KNOWN BUG:** Nothing happens (no confirm dialog, no handler) |
| **Actual** | ❌ Clicking "Deactivate Account": **nothing happens**. No dialog, no navigation, no mutation. |
| **Status** | ❌ **FAIL — Bug Confirmed** |
| **Source** | Line 207: `<Button variant="outlined" color="error" startIcon={<DeleteRoundedIcon />}>Deactivate Account</Button>` — **no `onClick` prop**. |

---

## Notifications Tab

---

### TC-SET-13 — Notifications Tab: 7 Events Rendered

| | |
|---|---|
| **Expected** | Table with exactly 7 event rows; Email, SMS, In-App toggles per row |
| **Actual** | ✅ **7 rows confirmed**: New appointment booked, Appointment reminder (24h), Appointment cancelled, New message received, New review posted, Payment received, System announcements. Table header: EVENT, EMAIL, SMS, IN-APP. All green/grey switches visible per NOTIF_ROWS defaults. |
| **Status** | ✅ **PASS** |
| **Screenshot** | `click_feedback_1773746893330.png` (Notifications tab screenshot) |
| **Source** | Lines 28–36: `NOTIF_ROWS` array with 7 objects. Line 231: `<Switch checked={row[ch]} onChange={() => toggleNotif(i, ch)} />`. |

---

### TC-SET-14 — Notifications: Toggle a Channel

| | |
|---|---|
| **Input** | Click SMS toggle for "Appointment reminder (24h)" |
| **Expected** | Switch flips OFF; click again → flips ON |
| **Actual** | ✅ SMS toggle for row index 1 (Appointment reminder) flipped from **ON → OFF**. Second click: **OFF → ON**. Local state updated via `toggleNotif(idx, channel)`. No error. |
| **Status** | ✅ **PASS** |
| **Source** | Lines 69–71: `toggleNotif = (idx, channel) => setNotifs(prev => prev.map((r, i) => i === idx ? { ...r, [channel]: !r[channel] } : r))`. |

---

### TC-SET-15 — Notifications: Save Preferences

| | |
|---|---|
| **Input** | Click "Save Preferences" |
| **Expected** | Green alert; no console error; no backend call |
| **Actual** | ✅ Green **"Changes saved successfully!"** alert appeared. No console errors. No network call (local state only). Alert auto-dismissed after 2.5s. |
| **Status** | ✅ **PASS** |
| **Source** | Line 239: `onClick={handleSave}` — same `handleSave` shared by all Save buttons. |

---

## Appearance Tab

---

### TC-SET-16 — Appearance: Theme Selection (Documented Bug)

| | |
|---|---|
| **Input** | Click "🌙 Dark" radio |
| **Expected** | Radio selected; **KNOWN BUG:** actual UI theme not applied |
| **Actual** | ❌ Dark radio became **selected** (radio filled, border changed to primary.main). However, the **UI did NOT switch to dark mode** — background remains white, text remains dark. Theme not connected to ThemeContext. |
| **Status** | ❌ **FAIL — Bug Confirmed** |
| **Source** | Lines 253–259: `RadioGroup value={themeMode} onChange={(e) => setThemeMode(e.target.value)}` — `themeMode` local state not connected to MUI `ThemeProvider` or theme context. |

---

### TC-SET-17 — Appearance: Font Size Slider

| | |
|---|---|
| **Input** | Drag slider to XL (value=3) |
| **Expected** | "Aa" preview text increases in size; marks SM/MD/LG/XL |
| **Actual** | ✅ Slider has marks: **SM (0), MD (1), LG (2), XL (3)**. Default is **LG (value=2)**. Moving to XL: **"Aa" preview** text visibly increased (from `${12 + 2*2}=16px` to `${12 + 3*2}=18px`). |
| **Status** | ✅ **PASS** |
| **Source** | Line 267: `fontSize: '${12 + fontSize * 2}px'` on "Aa" text. Line 268: Slider marks with SM/MD/LG/XL. |

---

### TC-SET-18 — Appearance: Accent Color Selection

| | |
|---|---|
| **Input** | Click green circle (#0F9D58) |
| **Expected** | Selected circle has ring; only one selected at a time |
| **Actual** | ✅ **7 color circles** visible (blue, green, purple, red, yellow, cyan, grey). Clicking green #0F9D58: **ring/shadow applies** to green circle; blue loses ring. Only one accent active. |
| **Status** | ✅ **PASS** |
| **Source** | Line 276: `border: accent === c ? '3px solid ${c}' : '3px solid transparent'`, `outline: accent === c ? '2px solid #fff' : 'none'`, `boxShadow: accent === c ? '0 0 0 3px ${c}55' : 'none'`. |
| **Note** | Accent color state change has no visual effect on the app's actual theme — same disconnection as TC-SET-16. |

---

### TC-SET-19 — Appearance: Compact + RTL Toggles (Documented Bug)

| | |
|---|---|
| **Input** | Toggle "Compact Mode" and "RTL Layout" switches |
| **Expected** | Switches toggle; **KNOWN BUG:** UI not affected |
| **Actual** | ❌ Both switches toggled ON/OFF correctly (local state). However, **UI layout did NOT change** — padding/spacing unchanged for Compact Mode; text direction unchanged for RTL Layout. |
| **Status** | ❌ **FAIL — Bug Confirmed** |
| **Source** | Lines 284–285: `checked={compact}` and `checked={rtl}` with `onChange` — state updates correctly. But neither `compact` nor `rtl` state is passed to any layout provider or CSS. |

---

## Clinic Tab

---

### TC-SET-20 — Clinic Tab: Static Form Fields

| | |
|---|---|
| **Input** | Click "Clinic" tab; view fields; click "Save Clinic Settings" |
| **Expected** | All Clinic fields with correct defaults; save shows green alert |
| **Actual** | ✅ Fields with defaults: Clinic Name **"MediCare Clinic"**, Contact Phone **"+1 555-100-0000"**, Contact Email **"admin@medicareclinic.com"**, Timezone dropdown (default **IST**, options: UTC/IST/EST/PST/CET/GST), Address **"123 Health Avenue, Medical District, MH 400001"**, Currency dropdown (default **USD**, options: USD/EUR/GBP/INR/AED), Default Slot Duration **"30"** (type=number). All fields editable. "Save Clinic Settings" → green alert shown. |
| **Status** | ✅ **PASS** |
| **Note** | All Clinic fields use `defaultValue` (uncontrolled) — their values are lost on page reload. No controlled state for clinic settings. |

---

## TC-SET-21 — Tab Scrollability on Mobile

| | |
|---|---|
| **Expected** | `variant="scrollable"` — scroll arrows on small screens |
| **Actual** | ✅ Source-verified: Line 86: `variant="scrollable" scrollButtons="auto"`. On full desktop (1440px), all 5 tabs visible without scrolling. On mobile/small viewport, horizontal scroll with arrows would appear. |
| **Status** | ✅ **PASS (source-verified)** |

---

## Edge Cases

| # | Edge Case | Result | Status |
|---|-----------|--------|--------|
| **E1** | First Name cleared (empty) | Line 109: `(firstName[0] ?? '') + (lastName[0] ?? '')` → empty string → avatar shows blank. No crash. | ✅ Source-verified |
| **E2** | Bio > 500 chars | Line 141: `<TextField multiline>` — no `inputProps={{ maxLength }}`. Accepts unlimited input. | ✅ Source-verified |
| **E3** | Tab switch with unsaved changes | Changes in Profile form lost when switching tabs — React re-renders, but state is actually preserved (`firstName` etc. stay in component state). **Edge case description is partially wrong** — state IS preserved across tab switches. | ⚠️ Plan slightly inaccurate |
| **E4** | Page reload | `useState` initializes from `user` context. All customizations lost. | ✅ Source/live-confirmed |
| **E5** | `user.name` undefined | Lines 52–53: `?? 'Admin'` / `?? 'User'` defaults applied. | ✅ Source-verified |
| **E6** | Clinic Currency set to GBP | `defaultValue="USD"` → select GBP → local state in DOM (uncontrolled). Lost on reload. | ✅ Source-verified |

---

## Observations

| # | Observation | Impact |
|---|-------------|--------|
| **OBS-1** | Camera icon caption says "Click to change photo" but has no handler. Caption creates false expectation. | 🔴 High UX confusion |
| **OBS-2** | `2FA Switch` is completely uncontrolled (no `checked` or `onChange` prop) — state is browser-internal, not React. It doesn't even use local state. | 🟡 Medium |
| **OBS-3** | Clinic tab fields use `defaultValue` (uncontrolled) — saving calls `handleSave` but reads no field values. Nothing actually gets saved. | 🔴 High — misleading UX |
| **OBS-4** | Date of Birth field (`type="date"`) has no `value` or `onChange` — fully uncontrolled. Typing a date doesn't update any state. | 🟡 Medium |
| **OBS-5** | Gender select uses `defaultValue` (uncontrolled) — same as Clinic fields: changes not captured by React state. | 🟡 Medium |
| **OBS-6** | All 5 Save/Save Preferences/Save Appearance/Save Clinic buttons call the same `handleSave()` — no distinction between what was saved. | 🟢 Low |
