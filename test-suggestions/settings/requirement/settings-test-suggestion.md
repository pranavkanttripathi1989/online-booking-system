---
id: TS032
type: test-suggestion
feature: settings
created: 2026-03-19
updated: 2026-04-02
status: done
parent: unknown
related: [TP032, TR031]
---

# Settings Page — Test Suggestions (v2.0)

**Module:** Settings (`/settings`) — `frontend/src/pages/settings/index.jsx`
**Updated:** 2026-03-31 (Session QA v2.0)

---

## 🔴 High Priority — COMPLETED (Session)

### SUG-SET-001 — Wire camera icon to file upload
```
Status: COMPLETED
Notes: Added fileRef (useRef). Hidden <input type="file" ref={fileRef} accept="image/jpeg,image/png,image/gif">.
       Camera IconButton onClick={() => fileRef.current?.click()}. aria-label="Change profile photo".
       SUG-SET-012 file size guard (2MB) also implemented in this fix.
Files: settings/index.jsx
```

### SUG-SET-002 — Password validation for Update Password
```
Status: COMPLETED
Notes: Added currentPw/newPw/confirmPw controlled state. handlePasswordUpdate() with 3 guards:
       (1) !currentPw → "Please enter your current password."
       (2) newPw.length < 8 → "New password must be at least 8 characters."
       (3) newPw !== confirmPw → "Passwords do not match."
       Errors shown in <Alert severity="error" onClose={...}>. On success: fields cleared, handleSave('Password').
Files: settings/index.jsx
```

### SUG-SET-003 — Wire Revoke session buttons
```
Status: COMPLETED
Notes: Moved MOCK_SESSIONS from const to useState(MOCK_SESSIONS). Added handleRevoke(id) that filters sessions.
       Revoke Button: onClick={() => handleRevoke(s.id)}.
Files: settings/index.jsx
```

### SUG-SET-004 — Add confirm dialog before Deactivate Account
```
Status: COMPLETED
Notes: Added deactivateOpen state. Deactivate btn onClick={() => setDeactivateOpen(true)}.
       <Dialog> with "Deactivate Account?" title, warning text, Cancel + red Deactivate buttons.
       Deactivate confirm: setDeactivateOpen(false) + BACKEND SWAP comment.
Files: settings/index.jsx
```

### SUG-SET-008 — Wire 2FA Switch to controlled state
```
Status: COMPLETED
Notes: Added twoFa state (useState(false)). Switch: checked={twoFa} onChange={(e) => setTwoFa(e.target.checked)}.
       2FA toggle now persists across tab switches.
Files: settings/index.jsx
```

---

## 🟡 Medium Priority — COMPLETED (Session)

### SUG-SET-010 — Per-tab success alert messages
```
Status: COMPLETED
Notes: saved changed from boolean to null|string. handleSave(context='Changes') uses context.
       Profile: "Profile changes saved successfully!", Password: "Password saved successfully!",
       Notifications: "Notification preferences saved successfully!",
       Appearance: "Appearance settings saved successfully!", Clinic: "Clinic settings saved successfully!".
       Alert now onClose-able (setSaved(null)).
Files: settings/index.jsx
```

### SUG-SET-012 — File size validation for photo upload (2MB)
```
Status: COMPLETED
Notes: Implemented as part of SUG-SET-001 file input onChange:
       if (file.size > 2 * 1024 * 1024) { alert('File must be under 2 MB'); return }
Files: settings/index.jsx
```

---

## 🔴 High Priority — Pending

### SUG-SET-005 — Connect theme mode to ThemeContext
```
Status: PENDING
Notes: themeMode state ('light'/'dark'/'system') is stored locally but not connected to a ThemeContext.
       Fix: call useTheme/ThemeContext setter with the selected mode.
Priority: High (feature: dark mode should actually apply)
```

### SUG-SET-006 — Connect Compact/RTL switches to layout
```
Status: PENDING
Notes: compact and rtl state booleans are stored but not applied to the app layout.
       Fix: pass through LayoutContext or CSS variables.
Priority: High
```

---

## 🟡 Medium Priority — Pending

### SUG-SET-007 — Convert Clinic fields to controlled state
```
Status: PENDING
Notes: Clinic tab fields use defaultValue (uncontrolled). Values are not captured on Save.
       Fix: Add clinicForm state (clinicName, contactPhone, contactEmail, timezone, address, currency, slotDuration).
Priority: Medium
```

### SUG-SET-009 — Persist notification preferences to backend
```
Status: PENDING
Notes: notifs state changes lost on page reload. Save currently calls handleSave() which only shows alert.
       Fix: Call UPDATE_NOTIFICATION_PREFERENCES mutation with notifs array.
Priority: Medium
```

---

## 🟢 Low Priority — Pending

### SUG-SET-011 — Unsaved changes indicator per tab
```
Status: PENDING
Notes: No visual indicator when user has unsaved changes and switches tabs.
       Fix: isDirty state per tab + <Chip label="Unsaved changes" color="warning" />.
Priority: Low
```

---

## New Suggestions (Session)

### SUG-SET-013 — Add photo avatar preview after file select
```
Status: PENDING
Notes: Camera icon fix (SUG-001) opens file picker and validates size, but does not update the avatar preview.
       Fix: setAvatarUrl(URL.createObjectURL(file)) and render <Avatar src={avatarUrl}> or initials fallback.
Priority: Medium
```

### SUG-SET-014 — Disable "Update Password" until all 3 fields filled
```
Status: PENDING
Notes: Better UX to disable the button rather than show an error after click.
       Fix: disabled={!currentPw || !newPw || !confirmPw}
Priority: Low
```

---

## Summary Table

| ID | Description | Status |
|----|-------------|--------|
| SUG-SET-001 | Camera icon → file picker | ✅ COMPLETED |
| SUG-SET-002 | Password validation | ✅ COMPLETED |
| SUG-SET-003 | Revoke session buttons | ✅ COMPLETED |
| SUG-SET-004 | Deactivate confirm dialog | ✅ COMPLETED |
| SUG-SET-005 | Connect theme to ThemeContext | ⏳ PENDING |
| SUG-SET-006 | Connect Compact/RTL to layout | ⏳ PENDING |
| SUG-SET-007 | Clinic fields controlled | ⏳ PENDING |
| SUG-SET-008 | 2FA controlled state | ✅ COMPLETED |
| SUG-SET-009 | Persist notifications to backend | ⏳ PENDING |
| SUG-SET-010 | Per-tab success messages | ✅ COMPLETED |
| SUG-SET-011 | Unsaved changes indicator | ⏳ PENDING |
| SUG-SET-012 | File size validation 2MB | ✅ COMPLETED |
| SUG-SET-013 | Avatar preview after file select | ⏳ PENDING (New) |
| SUG-SET-014 | Disable Update Password until filled | ⏳ PENDING (New) |
